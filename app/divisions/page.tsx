'use client'

import { useCallback, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import DemoMap from '@/components/DemoMap'
import Footer from '@/components/Footer'
import { overtureClient } from '@/lib/overture'
import { useApiKey, getErrorMessage } from '@/lib/demo-shared'

const ADMIN_LEVELS = [
  { value: '', label: 'Any level' },
  { value: '0', label: '0 — Country' },
  { value: '1', label: '1 — Region / State' },
  { value: '2', label: '2 — County' },
  { value: '3', label: '3+ — Local' },
]

export default function DivisionsDemo() {
  const [apiKey] = useApiKey()
  const [name, setName] = useState('New York')
  const [adminLevel, setAdminLevel] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingGeometry, setIsLoadingGeometry] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  const search = useCallback(async () => {
    if (!name || name.length < 2) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await overtureClient.getDivisions(apiKey, {
        name,
        admin_level: adminLevel || undefined,
        limit: 25,
        include_geometry: false,
      })
      setResults(data)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setIsLoading(false)
    }
  }, [apiKey, name, adminLevel])

  const showDivision = useCallback(async (division: any) => {
    const map = mapRef.current
    if (!map) return
    setSelectedId(division.id)
    setIsLoadingGeometry(true)
    setError(null)
    try {
      // Search results are metadata-only; fetch the full polygon by ID.
      const full = await overtureClient.getDivisionById(apiKey, division.id)
      if (map.getLayer('division-fill')) map.removeLayer('division-fill')
      if (map.getLayer('division-line')) map.removeLayer('division-line')
      if (map.getSource('division')) map.removeSource('division')
      if (!full?.geometry) {
        setError('This division has no geometry upstream (a known Overture data gap for some country-level records).')
        return
      }
      map.addSource('division', {
        type: 'geojson',
        data: { type: 'Feature', geometry: full.geometry, properties: {} },
      })
      map.addLayer({ id: 'division-fill', type: 'fill', source: 'division', paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.15 } })
      map.addLayer({ id: 'division-line', type: 'line', source: 'division', paint: { 'line-color': '#1D4ED8', 'line-width': 2 } })

      const bbox = division.bbox || full.bbox
      if (bbox) {
        map.fitBounds([[bbox.xmin, bbox.ymin], [bbox.xmax, bbox.ymax]], { padding: 40, duration: 800 })
      }
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setIsLoadingGeometry(false)
    }
  }, [apiKey])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-semibold text-gray-900">Divisions Explorer</h1>
          <p className="text-xs text-gray-500">Search 1M+ administrative areas by name, filter by <code className="bg-gray-100 px-1 rounded">admin_level</code>, click to load the boundary polygon.</p>
          {error && <div className="mt-1 text-sm text-red-700">{error}</div>}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <div className="w-full md:w-96 border-r border-gray-200 bg-white overflow-y-auto" style={{ maxHeight: 'calc(100vh - 190px)' }}>
          <div className="p-3 space-y-2 sticky top-0 bg-white border-b border-gray-100">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Search by name, e.g. Westminster"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <select
                value={adminLevel}
                onChange={(e) => setAdminLevel(e.target.value)}
                className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
              >
                {ADMIN_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <button
                onClick={search}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? '…' : 'Search'}
              </button>
            </div>
          </div>
          <ul>
            {results.map((d: any) => (
              <li
                key={d.id}
                onClick={() => showDivision(d)}
                className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-blue-50 ${selectedId === d.id ? 'bg-blue-50' : ''}`}
              >
                <div className="font-medium text-gray-900 text-sm">{d.properties?.primary_name || d.properties?.names?.primary || d.id}</div>
                <div className="text-xs text-gray-500">
                  {d.properties?.subtype}
                  {d.properties?.admin_level !== undefined && d.properties?.admin_level !== null ? ` · admin level ${d.properties.admin_level}` : ''}
                  {d.properties?.country ? ` · ${d.properties.country}` : ''}
                  {d.properties?.region ? ` (${d.properties.region})` : ''}
                </div>
              </li>
            ))}
            {results.length === 0 && !isLoading && (
              <li className="px-4 py-6 text-sm text-gray-500 text-center">Search for a country, region, county or city.</li>
            )}
          </ul>
        </div>

        <div className="flex-1 relative">
          {isLoadingGeometry && (
            <div className="absolute top-2 left-2 z-10 bg-white rounded-md shadow px-3 py-2 text-sm">Loading boundary…</div>
          )}
          <DemoMap
            center={{ lat: 40.7128, lng: -74.006 }}
            zoom={9}
            heightOffset={190}
            onReady={(map) => { mapRef.current = map }}
          />
        </div>
      </div>
      <Footer />
    </div>
  )
}
