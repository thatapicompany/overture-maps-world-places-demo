'use client'

import { useCallback, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import DemoMap from '@/components/DemoMap'
import Select from '@/components/Select'
import Footer from '@/components/Footer'
import { overtureClient } from '@/lib/overture'
import { useApiKey, getErrorMessage } from '@/lib/demo-shared'
import type { Place } from '@/lib/types'

// Taxonomy nodes under food_and_drink — the hierarchy-aware `taxonomy` filter
// matches every descendant of the selected node.
const FOOD_TAXONOMY_OPTIONS = [
  { value: 'food_and_drink', label: 'All food & drink' },
  { value: 'restaurant', label: 'Restaurants (all cuisines)' },
  { value: 'non_alcoholic_beverage_venue', label: 'Cafés & coffee' },
  { value: 'bar_and_night_life', label: 'Bars & nightlife' },
  { value: 'bakery_and_dessert', label: 'Bakeries & dessert' },
  { value: 'fast_food_restaurant', label: 'Fast food' },
  { value: 'pizza_restaurant', label: 'Pizza' },
  { value: 'sushi_restaurant', label: 'Sushi' },
]

export default function RestaurantsDemo() {
  const [apiKey] = useApiKey()
  const [taxonomy, setTaxonomy] = useState<string>('food_and_drink')
  const [openOnly, setOpenOnly] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)

  const search = useCallback(async (taxonomyValue: string, openOnlyValue: boolean) => {
    const map = mapRef.current
    if (!map) return
    setIsLoading(true)
    setError(null)
    try {
      const c = map.getCenter()
      const places = await overtureClient.getPlacesByCenter(apiKey, {
        lat: c.lat,
        lng: c.lng,
        radius: 1500,
        limit: 500,
        taxonomy: taxonomyValue,
        operating_status: openOnlyValue ? 'open' : undefined,
        enrichment_fields: 'brand',
      })
      setCount(places.length)
      renderPlaces(map, places)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setIsLoading(false)
    }
  }, [apiKey])

  const renderPlaces = (map: maplibregl.Map, places: Place[]) => {
    if (map.getLayer('food-layer')) map.removeLayer('food-layer')
    if (map.getSource('food')) map.removeSource('food')
    map.addSource('food', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: places.map((p) => ({
          type: 'Feature' as const,
          geometry: p.geometry,
          properties: {
            name: p.properties.names?.primary || '',
            category: p.properties.categories?.primary || '',
            taxonomyPath: p.properties.taxonomy?.hierarchy?.join(' › ') || '',
            status: p.properties.operating_status || '',
            brand: p.properties.brand?.names?.primary || '',
            logo: p.properties.ext_brand?.logo_url || '',
            website: p.properties.ext_brand?.website || '',
          },
        })),
      },
    })
    map.addLayer({
      id: 'food-layer',
      type: 'circle',
      source: 'food',
      paint: {
        'circle-radius': 7,
        'circle-color': ['case', ['==', ['get', 'status'], 'open'], '#16A34A', '#F59E0B'],
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 2,
        'circle-opacity': 0.85,
      },
    })
    map.on('click', 'food-layer', (e) => {
      const f = e.features?.[0]
      if (!f) return
      const props: any = f.properties
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup()
        .setLngLat((f.geometry as any).coordinates)
        .setHTML(`
          <div class="p-3 text-gray-900">
            <div class="flex items-center gap-2 mb-1">
              ${props.logo ? `<img src="${props.logo}?width=60" class="h-6 max-w-[60px] object-contain" onerror="this.style.display='none'"/>` : ''}
              <strong>${props.name}</strong>
            </div>
            <div class="text-sm text-gray-700">${props.category}</div>
            ${props.taxonomyPath ? `<div class="text-xs text-gray-500 mt-1">${props.taxonomyPath}</div>` : ''}
            ${props.status ? `<div class="text-xs mt-1 ${props.status === 'open' ? 'text-green-700' : 'text-red-700'}">${props.status.replace(/_/g, ' ')}</div>` : ''}
            ${props.website ? `<a href="${props.website}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-600 hover:underline">${props.website}</a>` : ''}
          </div>`)
        .addTo(map)
    })
    map.on('mouseenter', 'food-layer', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'food-layer', () => { map.getCanvas().style.cursor = '' })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <div>
            <h1 className="font-semibold text-gray-900">Restaurants &amp; Food</h1>
            <p className="text-xs text-gray-500">Hierarchy-aware <code className="bg-gray-100 px-1 rounded">taxonomy</code> filtering + <code className="bg-gray-100 px-1 rounded">operating_status</code></p>
          </div>
          <div className="w-64">
            <Select
              options={FOOD_TAXONOMY_OPTIONS}
              value={taxonomy}
              onChange={(v) => { const val = (v as string) || 'food_and_drink'; setTaxonomy(val); search(val, openOnly) }}
              placeholder="Taxonomy filter..."
              searchable={false}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(e) => { setOpenOnly(e.target.checked); search(taxonomy, e.target.checked) }}
              className="h-4 w-4 text-blue-600 rounded"
            />
            Open places only
          </label>
          <button
            onClick={() => search(taxonomy, openOnly)}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Searching…' : 'Search this area'}
          </button>
          {count !== null && <span className="text-sm text-gray-600">{count} results</span>}
        </div>
        {error && <div className="max-w-7xl mx-auto mt-2 text-sm text-red-700">{error}</div>}
      </div>

      <div className="flex-1">
        <DemoMap
          center={{ lat: 40.7128, lng: -74.006 }}
          zoom={15}
          heightOffset={210}
          onReady={(map) => { mapRef.current = map; search(taxonomy, openOnly) }}
        />
      </div>
      <Footer />
    </div>
  )
}
