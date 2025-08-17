import { z } from 'zod'
import { OVERTURE_API_BASE, API_ENDPOINTS } from './config'
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
  }).optional()
})

const PlaceGeometrySchema = z.object({
  type: z.string(),
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
    confidence: z.number().optional()
  })),
  names: z.object({
    primary: z.string().nullable().optional(),
    common: z.any().nullable().optional(),
    rules: z.any().nullable().optional()
  }),
  categories: z.object({
    primary: z.string().nullable().optional(),
    alternate: z.array(z.string()).optional()
  }).nullable().optional(),
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
  ext_name: z.string().optional()
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

class OvertureClient {
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
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          url.searchParams.set(key, value.join(','))
        } else {
          url.searchParams.set(key, String(value))
        }
      }
    })

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
}

// Export singleton instance
export const overtureClient = new OvertureClient()

// Export types for convenience
export type { Category, Brand, Place, Country, GeoJSON }
export { OvertureAPIError }
