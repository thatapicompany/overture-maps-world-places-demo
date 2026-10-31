// Environment variables
export const OVERTURE_API_BASE = process.env.NEXT_PUBLIC_OVERTURE_API_BASE || 'https://api.overturemapsapi.com'

// Application constants
export const DEFAULT_API_KEY = 'DEMO-API-KEY'
export const DEFAULT_MAP_CENTER = { lat: 40.7128, lng: -74.0060, zoom: 12 }
export const DEFAULT_SEARCH_RADIUS = 1500 // meters
export const DEFAULT_RESULT_LIMIT = 200
export const MAP_MOVE_DEBOUNCE_MS = 400

/** Identical requests within this window are served from memory, not the API. */
export const RESPONSE_CACHE_TTL_MS = 10 * 60 * 1000

/** The public demo key: free, but only near the demo cities. */
export const isDemoKey = (key: string | null | undefined): boolean =>
  !key || key.trim() === '' || key.trim() === DEFAULT_API_KEY

// LocalStorage keys
export const STORAGE_KEYS = {
  API_KEY: 'overture_api_key',
  VIEWPORT: 'overture_viewport',
  SELECTED_CATEGORIES: 'overture_selected_categories',
  SELECTED_BRAND: 'overture_selected_brand',
} as const

// API endpoints (from OpenAPI spec)
export const API_ENDPOINTS = {
  CATEGORIES: '/places/categories',
  BRANDS: '/places/brands',
  PLACES: '/places',
  COUNTRIES: '/places/countries',
  BUILDINGS: '/buildings',
  DIVISIONS: '/divisions',
  ADDRESSES: '/addresses',
  TRANSPORTATION: '/transportation',
} as const
