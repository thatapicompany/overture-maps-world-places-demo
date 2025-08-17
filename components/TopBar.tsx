'use client'

import { useState, useEffect } from 'react'
import Select, { SelectOption } from './Select'
import { STORAGE_KEYS, DEFAULT_API_KEY } from '@/lib/config'
import type { Category, Brand } from '@/lib/types'

export interface TopBarProps {
  apiKey: string
  onApiKeyChange: (key: string) => void
  categories: Category[]
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  brands: Brand[]
  selectedBrand: string | null
  onBrandChange: (brand: string | null) => void
  radius: number
  onRadiusChange: (radius: number) => void
  autoSearch: boolean
  onAutoSearchChange: (autoSearch: boolean) => void
  placeCount: number
  onShowPlaces: () => void
  onClearResults: () => void
  isLoading: boolean
}

export default function TopBar({
  apiKey,
  onApiKeyChange,
  categories,
  selectedCategories,
  onCategoriesChange,
  brands,
  selectedBrand,
  onBrandChange,
  onShowPlaces,
  placeCount,
  onClearResults,
  isLoading,
  radius,
  onRadiusChange,
  autoSearch,
  onAutoSearchChange
}: TopBarProps) {
  const [localRadius, setLocalRadius] = useState(radius)

  // Sync localRadius with prop
  useEffect(() => {
    setLocalRadius(radius)
  }, [radius])

  // Debounce radius change
  useEffect(() => {
    if (localRadius !== radius) {
      const timeout = setTimeout(() => {
        onRadiusChange(localRadius)
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [localRadius])
  const [localApiKey, setLocalApiKey] = useState(apiKey)

  // Convert categories to select options
  const categoryOptions: SelectOption[] = categories.map(cat => ({
    value: cat.primary,
    label: `${cat.primary} (${cat?.ext_counts?.places || cat?.counts?.places || 0} places)`
  }))

  // Convert brands to select options
  const brandOptions: SelectOption[] = brands.map(brand => ({
    value: brand.names.primary,
    label: brand.names.primary
  }))

  // Handle API key changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localApiKey !== apiKey) {
        onApiKeyChange(localApiKey)
        // Save to localStorage
        try {
          localStorage.setItem(STORAGE_KEYS.API_KEY, localApiKey)
        } catch (error) {
          console.warn('Failed to save API key to localStorage:', error)
        }
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [localApiKey, apiKey, onApiKeyChange])

  // Load API key from localStorage on mount
  useEffect(() => {
    try {
      const savedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY)
      if (savedApiKey) {
        setLocalApiKey(savedApiKey)
      }
    } catch (error) {
      console.warn('Failed to load API key from localStorage:', error)
    }
  }, [])

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 py-4">
          {/* API Key Input */}
          <div className="w-full lg:w-64">
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              id="api-key"
              type="text"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder={DEFAULT_API_KEY}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          {/* Categories Select */}
          <div className="w-full lg:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categories
            </label>
            <Select
              options={categoryOptions}
              value={selectedCategories}
              onChange={(value) => onCategoriesChange(value as string[])}
              placeholder="Select categories..."
              multiple={true}
              searchable={true}
              disabled={isLoading}
            />
          </div>


          {/* Brands Select */}
          <div className="w-full lg:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brands
            </label>
            <Select
              options={brandOptions}
              value={selectedBrand}
              onChange={(value) => onBrandChange(value as string)}
              placeholder="Select brand..."
              multiple={false}
              searchable={true}
              disabled={isLoading}
            />
          </div>

          {/* Radius Input */}
          <div className="w-full lg:w-40 flex flex-col justify-end">
            <label htmlFor="radius-input" className="block text-sm font-medium text-gray-700 mb-1">
              Radius (meters)
            </label>
            <input
              id="radius-input"
              type="number"
              min={100}
              max={10000}
              step={100}
              value={localRadius}
              onChange={e => setLocalRadius(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              disabled={isLoading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <button
              onClick={onShowPlaces}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </div>
              ) : (
                'Show places here'
              )}
            </button>

            {placeCount > 0 && (
              <button
                onClick={onClearResults}
                className="px-4 py-2 bg-gray-500 text-white font-medium rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Clear results
              </button>
            )}
          </div>

          {/* Auto-Search Checkbox */}
          <div className="flex items-center">
            <label className="flex items-center text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSearch}
                onChange={(e) => onAutoSearchChange(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              Auto-Search when moving map
            </label>
          </div>

          {/* Place Count */}
          {placeCount > 0 && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">{placeCount}</span>
              <span className="ml-1">places found</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
