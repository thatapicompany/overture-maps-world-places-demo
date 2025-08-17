'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import TopBar from '@/components/TopBar'
import MapView from '@/components/MapView'
import { overtureClient } from '@/lib/overture'
import { DEFAULT_API_KEY, DEFAULT_SEARCH_RADIUS, DEFAULT_RESULT_LIMIT, STORAGE_KEYS } from '@/lib/config'
import type { Category, Brand, GeoJSON } from '@/lib/types'
import maplibregl from 'maplibre-gl'

export default function Home() {
  // State management
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [places, setPlaces] = useState<GeoJSON | null>(null)
  const [placeCount, setPlaceCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 })
  const [radius, setRadius] = useState(2000)
  const [limit, setLimit] = useState(DEFAULT_RESULT_LIMIT)
  const [autoSearch, setAutoSearch] = useState(true)
  
  // Refs
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)

  // Helper function to extract error message
  const getErrorMessage = (error: any): string => {
    // Handle OvertureAPIError from the client
    if (error?.name === 'OvertureAPIError') {
      // If the error has response data with a message, use that
      if (error?.response?.message) {
        return error.response.message
      }
      // Otherwise use the error message itself
      return error.message
    }
    // Handle HTTP response errors
    if (error?.response?.data?.message) {
      return error.response.data.message
    }
    // Handle general error objects
    if (error?.message) {
      return error.message
    }
    // Handle string errors
    if (typeof error === 'string') {
      return error
    }
    return 'An unexpected error occurred'
  }

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  // Load categories when API key or map center changes
  useEffect(() => {
    if (apiKey && mapCenter) {
      loadCategories()
    }
  }, [apiKey, mapCenter])

  // Load brands when selected categories change
  useEffect(() => {
    if (apiKey && selectedCategories?.length > 0) {
      loadBrands()
    }
  }, [apiKey, selectedCategories])

  // Auto-search when map moves (if enabled)
  useEffect(() => {
    if (autoSearch && mapRef.current && apiKey) {
      const timeoutId = setTimeout(() => {
        handleShowPlaces()
      }, 1000) // Wait 1 second after map stops moving
      
      return () => clearTimeout(timeoutId)
    }
  }, [mapCenter, autoSearch, apiKey])

  const loadInitialData = async () => {
    try {
      // Load saved state from localStorage
      const savedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY)
      const savedCategories = localStorage.getItem(STORAGE_KEYS.SELECTED_CATEGORIES)
      const savedBrand = localStorage.getItem(STORAGE_KEYS.SELECTED_BRAND)

      if (savedApiKey) {
        setApiKey(savedApiKey)
      }
      if (savedCategories) {
        setSelectedCategories(JSON.parse(savedCategories))
      }
      if (savedBrand) {
        setSelectedBrand(savedBrand)
      }
    } catch (error) {
      console.warn('Failed to load saved state:', error)
    }
  }

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const categoriesData = await overtureClient.getCategories(apiKey, {
        lat: mapCenter.lat,
        lng: mapCenter.lng,
        radius
      })
      
      setCategories(categoriesData)
    } catch (error) {
      console.error('Failed to load categories:', error)
      setError(`Failed to load categories: ${getErrorMessage(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const loadBrands = async () => {
    try {
      const brandsData = await overtureClient.getBrands(apiKey, {
        lat: mapCenter.lat,
        lng: mapCenter.lng,
        radius,
        categories: selectedCategories
      })
      
      setBrands(brandsData)
    } catch (error) {
      console.error('Failed to load brands:', error)
      // Don't show error for brands loading as it's less critical
    }
  }

  const handleShowPlaces = async () => {
    if (!mapRef.current) return

    try {
      setIsLoading(true)
      setError(null)

      const center = mapRef.current.getCenter()
      const placesData = await overtureClient.getPlacesByCenter(apiKey, {
        lat: center.lat,
        lng: center.lng,
        radius,
        limit,
        categories: selectedCategories?.length > 0 ? selectedCategories.join(',') : undefined,
        brand_name: selectedBrand || undefined
      })

      setPlaces(placesData)
      setPlaceCount(placesData.features.length)
    } catch (error) {
      console.error('Failed to load places:', error)
      setError(`Failed to load places: ${getErrorMessage(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius)
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
  }

  const handleClearResults = () => {
    setPlaces(null)
    setPlaceCount(0)
    if (popupRef.current) {
      popupRef.current.remove()
      popupRef.current = null
    }
  }

  const handlePlaceClick = (feature: any) => {
    if (!mapRef.current) return

    // Remove existing popup
    if (popupRef.current) {
      popupRef.current.remove()
    }

    // Create new popup
    const coordinates = feature.geometry.coordinates.slice()
    const popupContent = `
      <div class="p-4 text-gray-900">
        <h3 class="font-semibold mb-2 text-gray-900">${feature.properties.names?.primary || feature.properties.ext_name||'Unknown Place'}</h3>
        <textarea 
          class="w-full h-32 p-2 border border-gray-300 rounded text-xs font-mono text-gray-900 bg-white" 
          readonly
        >${JSON.stringify(feature.properties, null, 2)}</textarea>
      </div>
    `

    popupRef.current = new maplibregl.Popup()
      .setLngLat(coordinates)
      .setHTML(popupContent)
      .addTo(mapRef.current)
  }

  const handleMapLoad = useCallback((map: maplibregl.Map) => {
    mapRef.current = map
  }, [])

  const handleMapMove = useCallback((center: { lat: number; lng: number }) => {
    setMapCenter(center)
  }, [])

  const handleApiKeyChange = (newApiKey: string) => {
    setApiKey(newApiKey)
    // Clear existing data when API key changes
    setPlaces(null)
    setPlaceCount(0)
    setError(null)
  }

  const handleCategoriesChange = (newCategories: string[]) => {
    setSelectedCategories(newCategories)
    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_CATEGORIES, JSON.stringify(newCategories))
    } catch (error) {
      console.warn('Failed to save categories to localStorage:', error)
    }
  }

  const handleBrandChange = (newBrand: string | null) => {
    setSelectedBrand(newBrand)
    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_BRAND, newBrand || '')
    } catch (error) {
      console.warn('Failed to save brand to localStorage:', error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Error display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => setError(null)}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <span className="sr-only">Dismiss</span>
            ×
          </button>
        </div>
      )}

      {/* Top bar controls */}
      <TopBar
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoriesChange={handleCategoriesChange}
        brands={brands}
        selectedBrand={selectedBrand}
        onBrandChange={handleBrandChange}
        radius={radius}
        onRadiusChange={handleRadiusChange}
        limit={limit}
        onLimitChange={handleLimitChange}
        autoSearch={autoSearch}
        onAutoSearchChange={setAutoSearch}
        onShowPlaces={handleShowPlaces}
        placeCount={placeCount}
        onClearResults={handleClearResults}
        isLoading={isLoading}
      />

      {/* Map view */}
      <div className="flex-1 relative">
        <MapView
          onMapLoad={handleMapLoad}
          onMapMove={handleMapMove}
          places={places}
          onPlaceClick={handlePlaceClick}
          radius={radius}
          center={mapCenter}
        />
      </div>
    </div>
  )
}
