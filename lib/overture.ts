import { z } from 'zod'
import { OVERTURE_API_BASE, API_ENDPOINTS, RESPONSE_CACHE_TTL_MS } from './config'
import type { 
  Category, 
  Brand, 
  Place, 
  Country, 
  GeoJSON,
  GetPlacesParams,
  GetBrandsParams,
  GetCategoriesParams
} from './types'

// Zod schemas for API response validation
const CategorySchema = z.object({
  primary: z.string(),
  counts: z.object({
    places: z.number(),
    brands: z.number()
  })
})

const BrandSchema = z.object({
  names: z.object({
    primary: z.string().nullable().optional(),
    common: z.record(z.string()).nullable().optional(),
    rules: z.array(z.object({
      variant: z.string(),
      value: z.string()
    })).nullable().optional()
  }),
  wikidata: z.string().nullable().optional(),
  counts: z.object({
    places: z.number(),
    brands: z.number()
  }).optional(),
  // Wikidata-sourced enrichment (CC0) — returned by default since API v0.2
  ext_wikidata_label: z.string().nullable().optional(),
  ext_logo_url: z.string().nullable().optional(),
  ext_website: z.string().nullable().optional(),
  ext_industry: z.string().nullable().optional(),
  ext_parent: z.string().nullable().optional()
}).passthrough() // Don't strip future additive API fields

const PlaceGeometrySchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()])
})

const PlacePropertiesSchema = z.object({
  id: z.string(),
  version: z.number(),
  sources: z.array(z.object({
    property: z.string(),
    dataset: z.string(),
    record_id: z.string(),
    update_time: z.string().optional(),
    confidence: z.number().optional(),
    license: z.string().nullable().optional()
  }).passthrough()),
  names: z.object({
    primary: z.string().nullable().optional(),
    common: z.any().nullable().optional(),
    rules: z.any().nullable().optional()
  }),
  categories: z.object({
    primary: z.string().nullable().optional(),
    alternate: z.array(z.string()).optional()
  }).nullable().optional(),
  basic_category: z.string().nullable().optional(),
  taxonomy: z.object({
    primary: z.string().nullable().optional(),
    hierarchy: z.array(z.string()).optional(),
    alternates: z.array(z.string()).optional()
  }).nullable().optional(),
  operating_status: z.string().nullable().optional(),
  confidence: z.number().optional(),
  websites: z.array(z.string()).optional(),
  socials: z.array(z.string()).optional(),
  emails: z.array(z.string()).optional(),
  phones: z.array(z.string()).optional(),
  brand: z.object({
    names: z.object({
      primary: z.string().nullable(),
      common: z.any().nullable().optional(),
      rules: z.any().nullable().optional()
    }),
    wikidata: z.string().nullable().optional()
  }).optional(),
  addresses: z.array(z.object({
    freeform: z.string().nullable().optional(),
    locality: z.string().nullable().optional(),
    postcode: z.string().nullable().optional(),
    region: z.string().nullable().optional(),
    country: z.string().nullable().optional()
  })).optional(),
  ext_name: z.string().optional(),
  ext_brand: z.object({
    label: z.string().nullable().optional(),
    logo_url: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    parent: z.string().nullable().optional()
  }).optional()
}).passthrough() // Allow additional properties that we haven't defined

const PlaceSchema = z.object({
  id: z.string(),
  geometry: PlaceGeometrySchema,
  properties: PlacePropertiesSchema
})

const CountrySchema = z.object({
  country: z.string(),
  counts: z.object({
    places: z.number(),
    brands: z.number()
  })
})

const GeoJSONFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: PlaceGeometrySchema,
  properties: PlacePropertiesSchema
})

const GeoJSONSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(GeoJSONFeatureSchema)
})

// API client class
class OvertureAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message)
    this.name = 'OvertureAPIError'
  }
}

/** What the explorer shows about the most recent request: the call itself and the plan headers. */
export interface RequestInfo {
  /** Full request URL, without the API key (keys travel in the x-api-key header). */
  url: string
  fromCache: boolean
  quotaRemaining: number | null
  quotaLimit: number | null
}

type RequestListener = (info: RequestInfo) => void

// Coordinates are rounded to 3 decimal places (about 100 m) so small pans
// reuse cached responses here and on the API side.
const roundCoord = (key: string, value: unknown): unknown =>
  (key === 'lat' || key === 'lng') && typeof value === 'number' ? Math.round(value * 1000) / 1000 : value

class OvertureClient {
  private cache = new Map<string, { at: number; data: unknown; quotaRemaining: number | null; quotaLimit: number | null }>()
  private listeners = new Set<RequestListener>()

  /** Subscribe to request events; returns an unsubscribe function. */
  onRequest(listener: RequestListener): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private emit(info: RequestInfo) {
    this.listeners.forEach((l) => l(info))
  }

  private baseUrl: string

  constructor(baseUrl: string = OVERTURE_API_BASE) {
    this.baseUrl = baseUrl
  }

  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, any> = {},
    apiKey: string,
    schema: z.ZodSchema<T>
  ): Promise<T> {
    const url = new URL(endpoint, this.baseUrl)
    
    // Add query parameters
    Object.entries(params).forEach(([key, raw]) => {
      const value = roundCoord(key, raw)
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          url.searchParams.set(key, value.join(','))
        } else {
          url.searchParams.set(key, String(value))
        }
      }
    })

    // Serve repeats from memory: on a personal key every API call counts
    // towards the monthly allowance, so exploring the same area twice
    // should not cost twice. The key is part of the cache key so switching
    // keys never shows another key's results.
    const cacheKey = `${apiKey}|${url.toString()}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.at < RESPONSE_CACHE_TTL_MS) {
      this.emit({ url: url.toString(), fromCache: true, quotaRemaining: cached.quotaRemaining, quotaLimit: cached.quotaLimit })
      return cached.data as T
    }

    const startTime = Date.now()
    
    try {
      const response = await fetch(url.toString(), {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      })

      const responseTime = Date.now() - startTime
      
      // Development logging
      if (process.env.NODE_ENV === 'development') {
        console.log(`API Request: ${url.toString()} (${responseTime}ms)`)
      }

      if (!response.ok) {
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`
        let errorData = null
        
        try {
          errorData = await response.json()
          if (errorData?.message) {
            errorMessage = errorData.message
          }
        } catch (e) {
          // If we can't parse the error response, use the default message
        }
        
        throw new OvertureAPIError(
          errorMessage,
          response.status,
          errorData
        )
      }

      const data = await response.json()

      const num = (h: string) => {
        const v = response.headers.get(h)
        return v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v)
      }
      const quotaRemaining = num('X-Quota-Remaining')
      const quotaLimit = num('X-Quota-Limit')
      this.cache.set(cacheKey, { at: Date.now(), data, quotaRemaining, quotaLimit })
      this.emit({ url: url.toString(), fromCache: false, quotaRemaining, quotaLimit })
      
      try {
        // Validate response with Zod
        const validatedData = schema.parse(data)
        return validatedData
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.warn('API response validation failed:', validationError.errors)
          // For Zod errors, try to return the raw data anyway for better UX
          // This allows the app to continue working even with minor validation issues
          console.warn('Attempting to use raw response data despite validation errors')
          console.warn('Raw data:', data)
          return data as T
        }
        throw validationError
      }
    } catch (error) {
      if (error instanceof OvertureAPIError) {
        throw error
      }
      
      throw new OvertureAPIError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async getCategories(
    apiKey: string,
    params: Omit<GetCategoriesParams, 'format'> = {}
  ): Promise<Category[]> {
    const response = await this.makeRequest<Category[]>(
      API_ENDPOINTS.CATEGORIES,
      { ...params, format: 'json' },
      apiKey,
      z.array(CategorySchema)
    )
    return response
  }

  async getBrands(
    apiKey: string,
    params: Omit<GetBrandsParams, 'format'> = {}
  ): Promise<Brand[]> {
    const response = await this.makeRequest<Brand[]>(
      API_ENDPOINTS.BRANDS,
      { ...params, format: 'json' },
      apiKey,
      z.array(BrandSchema)
    )
    return response
  }

  async getCountryCodeFor(
    lat: number,
    lng: number,
    apiKey: string
  ): Promise<string | undefined> {
    try {
      // Use the countries endpoint to get country information for the coordinates
      const countries = await this.makeRequest<Country[]>(
        API_ENDPOINTS.COUNTRIES,
        { lat, lng, radius: 1000, format: 'json' },
        apiKey,
        z.array(CountrySchema)
      )
      
      // Return the first country code found
      return countries[0]?.country
    } catch (error) {
      console.warn('Failed to get country code:', error)
      return undefined
    }
  }

  async getPlacesByCenter(
    apiKey: string,
    params: Omit<GetPlacesParams, 'format'> & { format?: 'json' | 'geojson' }
  ): Promise<Place[]> {
    const response = await this.makeRequest<Place[]>(
      API_ENDPOINTS.PLACES,
      { ...params, format: 'json' },
      apiKey,
      z.array(PlaceSchema)
    )
    return response
  }

  // The endpoints below return theme-specific shapes; demos consume them
  // loosely, so validate only that they're arrays/objects and pass through.
  async getBuildings(
    apiKey: string,
    params: { lat: number; lng: number; radius?: number; limit?: number }
  ): Promise<any[]> {
    return this.makeRequest<any[]>(API_ENDPOINTS.BUILDINGS, { ...params, format: 'json' }, apiKey, z.array(z.any()))
  }

  async getDivisions(
    apiKey: string,
    params: { name?: string; country?: string; subtype?: string; admin_level?: string; bbox?: string; lat?: number; lng?: number; radius?: number; limit?: number; include_geometry?: boolean }
  ): Promise<any[]> {
    return this.makeRequest<any[]>(API_ENDPOINTS.DIVISIONS, { ...params, format: 'json' }, apiKey, z.array(z.any()))
  }

  async getDivisionById(apiKey: string, id: string): Promise<any> {
    return this.makeRequest<any>(`${API_ENDPOINTS.DIVISIONS}/${encodeURIComponent(id)}`, {}, apiKey, z.any())
  }

  async getAddresses(
    apiKey: string,
    params: { lat: number; lng: number; radius?: number; limit?: number }
  ): Promise<any[]> {
    return this.makeRequest<any[]>(API_ENDPOINTS.ADDRESSES, { ...params, format: 'json' }, apiKey, z.array(z.any()))
  }

  async getTransportation(
    apiKey: string,
    params: { lat: number; lng: number; radius?: number; limit?: number }
  ): Promise<any[]> {
    return this.makeRequest<any[]>(API_ENDPOINTS.TRANSPORTATION, { ...params, format: 'json' }, apiKey, z.array(z.any()))
  }
}

// Export singleton instance
export const overtureClient = new OvertureClient()

// Export types for convenience
export type { Category, Brand, Place, Country, GeoJSON }
export { OvertureAPIError }
