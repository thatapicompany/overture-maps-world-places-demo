'use client'

import { useCallback, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import DemoMap from '@/components/DemoMap'
import Footer from '@/components/Footer'
import { overtureClient } from '@/lib/overture'
import { useApiKey, getErrorMessage } from '@/lib/demo-shared'

interface SiteReport {
  lat: number
  lng: number
  radius: number
  placeCount: number
  openCount: number
  topCategories: [string, number][]
  topBrands: { name: string; places: number; logo?: string }[]
  addressCount: number
  roadSegments: number
}

export default function SiteSelectionDemo() {
  const [apiKey] = useApiKey()
  const [radius, setRadius] = useState(800)
  // Ref mirror so the map click handler (bound once at init) always sees the current radius
  const radiusRef = useRef(800)
  const [report, setReport] = useState<SiteReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)

  const analyse = useCallback(async (lat: number, lng: number, radiusM: number) => {
    setIsLoading(true)
    setError(null)
    try {
      // One composite view from four endpoints, in parallel
      const [places, brands, addresses, segments] = await Promise.all([
        overtureClient.getPlacesByCenter(apiKey, { lat, lng, radius: radiusM, limit: 2000 }),
        overtureClient.getBrands(apiKey, { lat, lng, radius: radiusM }),
        overtureClient.getAddresses(apiKey, { lat, lng, radius: radiusM, limit: 5000 }).catch(() => []),
        overtureClient.getTransportation(apiKey, { lat, lng, radius: radiusM, limit: 5000 }).catch(() => []),
      ])

      const categoryCounts = new Map<string, number>()
      let openCount = 0
      for (const p of places) {
        const cat = p.properties.categories?.primary
        if (cat) categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1)
        if (p.properties.operating_status === 'open') openCount++
      }

      const topBrands = (brands as any[])
        .filter((b) => b.names?.primary)
        .sort((a, b) => (b.counts?.places || 0) - (a.counts?.places || 0))
        .slice(0, 8)
        .map((b) => ({ name: b.names.primary, places: b.counts?.places || 0, logo: b.ext_logo_url ? `${b.ext_logo_url}?width=40` : undefined }))

      setReport({
        lat, lng, radius: radiusM,
        placeCount: places.length,
        openCount,
        topCategories: Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
        topBrands,
        addressCount: addresses.length,
        roadSegments: segments.length,
      })
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setIsLoading(false)
    }
  }, [apiKey])

  const handleMapClick = useCallback((map: maplibregl.Map, e: maplibregl.MapMouseEvent, radiusM: number) => {
    const { lat, lng } = e.lngLat
    markerRef.current?.remove()
    markerRef.current = new maplibregl.Marker({ color: '#DC2626' }).setLngLat([lng, lat]).addTo(map)
    analyse(lat, lng, radiusM)
  }, [analyse])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <div>
            <h1 className="font-semibold text-gray-900">Site Selection</h1>
            <p className="text-xs text-gray-500">Click anywhere on the map for an instant area report: places, brands, addresses and road network from four endpoints.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            Radius
            <select
              value={radius}
              onChange={(e) => { const r = parseInt(e.target.value, 10); setRadius(r); radiusRef.current = r }}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
            >
              <option value={400}>400m</option>
              <option value={800}>800m</option>
              <option value={1500}>1500m</option>
            </select>
          </label>
          {isLoading && <span className="text-sm text-gray-600">Analysing…</span>}
        </div>
        {error && <div className="max-w-7xl mx-auto mt-2 text-sm text-red-700">{error}</div>}
      </div>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <div className="flex-1 relative">
          <DemoMap
            center={{ lat: 40.7128, lng: -74.006 }}
            zoom={14}
            heightOffset={190}
            onReady={(map) => {
              mapRef.current = map
              map.on('click', (e) => handleMapClick(map, e, radiusRef.current))
            }}
          />
        </div>

        {/* Report panel */}
        <div className="w-full md:w-96 border-l border-gray-200 bg-white overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 190px)' }}>
          {!report ? (
            <div className="text-sm text-gray-500 text-center mt-8">Click a location on the map to generate an area report.</div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-gray-900">Area report</h2>
                <p className="text-xs text-gray-500">{report.lat.toFixed(4)}, {report.lng.toFixed(4)} · {report.radius}m radius</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 rounded-md p-3">
                  <div className="text-2xl font-semibold text-blue-800">{report.placeCount}</div>
                  <div className="text-xs text-gray-600">places ({report.openCount} confirmed open)</div>
                </div>
                <div className="bg-emerald-50 rounded-md p-3">
                  <div className="text-2xl font-semibold text-emerald-800">{report.addressCount}</div>
                  <div className="text-xs text-gray-600">addresses</div>
                </div>
                <div className="bg-amber-50 rounded-md p-3">
                  <div className="text-2xl font-semibold text-amber-800">{report.roadSegments}</div>
                  <div className="text-xs text-gray-600">road/rail segments</div>
                </div>
                <div className="bg-purple-50 rounded-md p-3">
                  <div className="text-2xl font-semibold text-purple-800">{report.topBrands.length}</div>
                  <div className="text-xs text-gray-600">top chains present</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">Top categories</h3>
                <ul className="space-y-1">
                  {report.topCategories.map(([cat, n]) => (
                    <li key={cat} className="flex justify-between text-sm">
                      <span className="text-gray-700">{cat}</span>
                      <span className="text-gray-500">{n}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">Chains in the area</h3>
                <ul className="space-y-1">
                  {report.topBrands.map((b) => (
                    <li key={b.name} className="flex items-center gap-2 text-sm">
                      {b.logo ? (
                        <img src={b.logo} alt="" className="h-5 w-5 object-contain" loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                      ) : <span className="h-5 w-5" />}
                      <span className="text-gray-700 flex-1 truncate">{b.name}</span>
                      <span className="text-gray-500">{b.places}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
