'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import TopBar from '@/components/TopBar'
import MapView from '@/components/MapView'
import { overtureClient } from '@/lib/overture'
import { DEFAULT_API_KEY, DEFAULT_SEARCH_RADIUS, DEFAULT_RESULT_LIMIT, STORAGE_KEYS } from '@/lib/config'
import type { Category, Brand, Place } from '@/lib/types'
import maplibregl from 'maplibre-gl'

export default function Home() {
  // State management
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['pharmacy'])
  const [selectedBrand, setSelectedBrand] = useState<string | null>('Walgreens')
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [placeCount, setPlaceCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 })
  const [radius, setRadius] = useState(2000)
  const [limit, setLimit] = useState(DEFAULT_RESULT_LIMIT)
  const [autoSearch, setAutoSearch] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
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
    if (autoSearch && mapRef.current && apiKey && !isInitialLoad) {
      const timeoutId = setTimeout(() => {
        handleShowPlaces()
      }, 1000) // Wait 1 second after map stops moving
      
      return () => clearTimeout(timeoutId)
    }
  }, [mapCenter, autoSearch, apiKey, isInitialLoad])

  // Initial places search after categories and brands are loaded
  useEffect(() => {
    if (isInitialLoad && categories.length > 0 && brands.length > 0 && mapRef.current && apiKey) {
      const timeoutId = setTimeout(() => {
        handleShowPlaces()
        setIsInitialLoad(false)
      }, 500) // Small delay to ensure everything is ready
      
      return () => clearTimeout(timeoutId)
    }
  }, [categories, brands, isInitialLoad, apiKey])

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
      setPlaceCount(placesData.length)
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

  const handlePlaceClick = (place: Place) => {
    console.log('Place clicked:', place)
    if (!mapRef.current) return

    // Remove existing popup
    if (popupRef.current) {
      popupRef.current.remove()
    }
    // Create new popup
    const coordinates = place.geometry.coordinates as [number, number]
    
    // Extract the information we want to display
    console.log('Place names object:', place.properties.names)
    const placeName = place.properties.names?.primary || place.properties.ext_name || 'Unknown Place'
    console.log('Extracted place name:', placeName)
    const confidence = place.properties.confidence ? `${Math.round(place.properties.confidence * 100)}%` : 'N/A'
    const category = place.properties.categories?.primary || 'N/A'
    const brand = place.properties.brand?.names?.primary || 'N/A'
    const address = place.properties.addresses?.[0]?.freeform || 
                   `${place.properties.addresses?.[0]?.locality || ''} ${place.properties.addresses?.[0]?.region || ''}`.trim() || 
                   'N/A'
    
    const popupContent = `
      <div class="p-4 text-gray-900 min-w-128">
        <h3 class="font-semibold mb-3 text-gray-900 text-lg">${placeName}</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-left">
            <span class="font-medium text-gray-600">Confidence:&nbsp;</span>
            <span class="text-gray-900">${confidence}</span>
          </div>
          <div class="flex justify-left">
            <span class="font-medium text-gray-600">Category:&nbsp;</span>
            <span class="text-gray-900"> ${category}</span>
          </div>
          <div class="flex justify-left">
            <span class="font-medium text-gray-600">Brand:&nbsp;</span>
            <span class="text-gray-900"> ${brand}</span>
          </div>
          <div class="flex flex-col">
            <span class="font-medium text-gray-600 mb-1">Address:</span>
            <span class="text-gray-900 text-xs">${address}</span>
          </div>
          <div class="flex flex-col">
            <span class="font-medium text-gray-600 mb-1">GERS ID:</span>
            <span class="text-gray-900 text-xs">${place.properties.id}</span>
          </div>
        </div>
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
