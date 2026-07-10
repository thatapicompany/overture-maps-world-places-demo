'use client'

import { useCallback, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import DemoMap from '@/components/DemoMap'
import Footer from '@/components/Footer'
import { overtureClient } from '@/lib/overture'
import { useApiKey, getErrorMessage } from '@/lib/demo-shared'
import type { Brand } from '@/lib/types'

export default function BrandsDemo() {
  const [apiKey] = useApiKey()
  const [brands, setBrands] = useState<Brand[]>([])
  const [selected, setSelected] = useState<Brand | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [placeCount, setPlaceCount] = useState<number | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  const loadBrands = useCallback(async () => {
    const map = mapRef.current
    if (!map) return
    setIsLoading(true)
    setError(null)
    try {
      const c = map.getCenter()
      const data = await overtureClient.getBrands(apiKey, { lat: c.lat, lng: c.lng, radius: 2000 })
      // Brands with Wikidata enrichment first, then by place count
      data.sort((a: any, b: any) => {
        const aScore = (a.ext_logo_url ? 1e9 : 0) + (a.counts?.places || 0)
        const bScore = (b.ext_logo_url ? 1e9 : 0) + (b.counts?.places || 0)
        return bScore - aScore
      })
      setBrands(data)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setIsLoading(false)
    }
  }, [apiKey])

  const showBrandPlaces = useCallback(async (brand: Brand) => {
    const map = mapRef.current
    if (!map) return
    setSelected(brand)
    setPlaceCount(null)
    try {
      const c = map.getCenter()
      const places = await overtureClient.getPlacesByCenter(apiKey, {
        lat: c.lat,
        lng: c.lng,
        radius: 2000,
        limit: 500,
        brand_wikidata: brand.wikidata || undefined,
        brand_name: brand.wikidata ? undefined : brand.names?.primary || undefined,
      })
      setPlaceCount(places.length)
      if (map.getLayer('brand-places-layer')) map.removeLayer('brand-places-layer')
      if (map.getSource('brand-places')) map.removeSource('brand-places')
      map.addSource('brand-places', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: places.map((p) => ({
            type: 'Feature' as const,
            geometry: p.geometry,
            properties: { name: p.properties.names?.primary || '' },
          })),
        },
      })
      map.addLayer({
        id: 'brand-places-layer',
        type: 'circle',
        source: 'brand-places',
        paint: {
          'circle-radius': 8,
          'circle-color': '#7C3AED',
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 2,
        },
      })
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }, [apiKey])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-semibold text-gray-900">Brand Explorer</h1>
          <p className="text-xs text-gray-500">Brands near the map centre with Wikidata logos, websites and parent organisations. Click a brand to map its locations.</p>
          {error && <div className="mt-1 text-sm text-red-700">{error}</div>}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Brand list */}
        <div className="w-full md:w-96 border-r border-gray-200 bg-white overflow-y-auto" style={{ maxHeight: 'calc(100vh - 190px)' }}>
          <div className="p-3 sticky top-0 bg-white border-b border-gray-100">
            <button
              onClick={loadBrands}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading…' : 'Load brands in this area'}
            </button>
          </div>
          <ul>
            {brands.map((brand: any, i) => (
              <li
                key={`${brand.wikidata || brand.names?.primary || i}`}
                onClick={() => showBrandPlaces(brand)}
                className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-blue-50 ${selected === brand ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {brand.ext_logo_url ? (
                    <img src={`${brand.ext_logo_url}?width=60`} alt="" className="h-8 w-8 object-contain flex-shrink-0" loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                  ) : (
                    <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                      {(brand.names?.primary || '?').slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{brand.names?.primary || 'Unnamed'}</div>
                    <div className="text-xs text-gray-500">
                      {brand.counts?.places} places
                      {brand.ext_industry ? ` · ${brand.ext_industry}` : ''}
                      {brand.ext_parent ? ` · part of ${brand.ext_parent}` : ''}
                    </div>
                    {brand.ext_website && (
                      <a href={brand.ext_website} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-blue-600 hover:underline truncate block">
                        {brand.ext_website}
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {brands.length === 0 && !isLoading && (
              <li className="px-4 py-6 text-sm text-gray-500 text-center">Move the map, then load brands.</li>
            )}
          </ul>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {selected && (
            <div className="absolute top-2 left-2 z-10 bg-white rounded-md shadow px-3 py-2 text-sm">
              <strong>{(selected as any).names?.primary}</strong>
              {placeCount !== null ? ` — ${placeCount} locations in view` : ' — loading…'}
            </div>
          )}
          <DemoMap
            center={{ lat: 40.7128, lng: -74.006 }}
            zoom={14}
            heightOffset={190}
            onReady={(map) => { mapRef.current = map; loadBrands() }}
          />
        </div>
      </div>
      <Footer />
    </div>
  )
}
