'use client'

import { useCallback, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import DemoMap from '@/components/DemoMap'
import Footer from '@/components/Footer'
import { overtureClient } from '@/lib/overture'
import { useApiKey, getErrorMessage } from '@/lib/demo-shared'

const METERS_PER_FLOOR = 3.2

export default function BuildingsDemo() {
  const [apiKey] = useApiKey()
  const [count, setCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)

  const search = useCallback(async () => {
    const map = mapRef.current
    if (!map) return
    setIsLoading(true)
    setError(null)
    try {
      const c = map.getCenter()
      const buildings = await overtureClient.getBuildings(apiKey, { lat: c.lat, lng: c.lng, radius: 500, limit: 2000 })
      setCount(buildings.length)

      const features = buildings
        .filter((b: any) => b.geometry)
        .map((b: any) => ({
          type: 'Feature' as const,
          geometry: b.geometry,
          properties: {
            // Prefer measured height; fall back to floors × typical storey height
            height: b.properties?.height || (b.properties?.num_floors ? b.properties.num_floors * METERS_PER_FLOOR : 8),
            name: b.properties?.names?.primary || '',
            subtype: b.properties?.subtype || '',
            floors: b.properties?.num_floors || '',
            roof: b.properties?.roof_shape || '',
          },
        }))

      if (map.getLayer('buildings-3d')) map.removeLayer('buildings-3d')
      if (map.getSource('buildings')) map.removeSource('buildings')
      map.addSource('buildings', { type: 'geojson', data: { type: 'FeatureCollection', features } })
      map.addLayer({
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'buildings',
        paint: {
          'fill-extrusion-color': [
            'interpolate', ['linear'], ['get', 'height'],
            0, '#BFDBFE',
            30, '#3B82F6',
            100, '#1E3A8A',
          ],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-opacity': 0.85,
        },
      })
      map.on('click', 'buildings-3d', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p: any = f.properties
        popupRef.current?.remove()
        popupRef.current = new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="p-3 text-gray-900 text-sm">
              <strong>${p.name || 'Building'}</strong>
              <div class="text-xs text-gray-600 mt-1">
                ${p.subtype ? `${p.subtype} · ` : ''}${Math.round(p.height)}m${p.floors ? ` · ${p.floors} floors` : ''}${p.roof ? ` · ${p.roof} roof` : ''}
              </div>
            </div>`)
          .addTo(map)
      })
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setIsLoading(false)
    }
  }, [apiKey])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <div>
            <h1 className="font-semibold text-gray-900">3D Buildings</h1>
            <p className="text-xs text-gray-500">2.5B+ building footprints extruded with Overture <code className="bg-gray-100 px-1 rounded">height</code> / <code className="bg-gray-100 px-1 rounded">num_floors</code>. Drag with right mouse to tilt.</p>
          </div>
          <button
            onClick={search}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading…' : 'Load buildings here'}
          </button>
          {count !== null && <span className="text-sm text-gray-600">{count} buildings</span>}
        </div>
        {error && <div className="max-w-7xl mx-auto mt-2 text-sm text-red-700">{error}</div>}
      </div>

      <div className="flex-1">
        <DemoMap
          center={{ lat: 40.7128, lng: -74.006 }}
          zoom={16}
          pitch={55}
          heightOffset={210}
          onReady={(map) => { mapRef.current = map; search() }}
        />
      </div>
      <Footer />
    </div>
  )
}
