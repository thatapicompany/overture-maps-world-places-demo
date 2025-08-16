// API Response Types based on OpenAPI specification

export interface Category {
  primary: string
  ext_counts: {
    places: number
    brands: number
  }
}

export interface Brand {
  names: {
    primary: string
    common?: Record<string, string>
    rules?: Array<{
      variant: string
      value: string
    }>
  }
}

export interface PlaceGeometry {
  type: string
  coordinates: [number, number]
}

export interface PlaceProperties {
  id: string
  version: number
  sources: Array<{
    property: string
    dataset: string
    record_id: string
    update_time?: string
    confidence?: number
  }>
  names: {
    primary: string
    common?: any
    rules?: any
  }
  categories: {
    primary: string
    alternate?: string[]
  }
  confidence: number
  websites?: string[]
  socials?: string[]
  emails?: string[]
  phones?: string[]
  brand?: {
    names: {
      primary: string | null
      common?: any
      rules?: any
    }
    wikidata?: string | null
  }
  addresses?: Array<{
    freeform?: string | null
    locality?: string | null
    postcode?: string | null
    region?: string | null
    country?: string | null
  }>
  ext_name?: string
}

export interface Place {
  id: string
  type: string
  geometry: PlaceGeometry
  properties: PlaceProperties
}

export interface Country {
  country: string
  ext_counts: {
    places: number
    brands: number
  }
}

// API Request Types
export interface GetPlacesParams {
  lat?: number
  lng?: number
  radius?: number
  limit?: number
  format?: 'json' | 'csv' | 'geojson'
  includes?: string[]
  country?: string
  source?: string
  brand_wikidata?: string
  brand_name?: string
  min_confidence?: number
  categories?: string
}

export interface GetBrandsParams {
  lat?: number
  lng?: number
  radius?: number
  limit?: number
  format?: 'json' | 'csv' | 'geojson'
  includes?: string[]
  country?: string
  categories?: string[]
}

export interface GetCategoriesParams {
  lat?: number
  lng?: number
  radius?: number
  limit?: number
  format?: 'json' | 'csv' | 'geojson'
  includes?: string[]
  country?: string
}

// GeoJSON Types
export interface GeoJSONFeature {
  type: 'Feature'
  geometry: PlaceGeometry
  properties: PlaceProperties
}

export interface GeoJSON {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}
