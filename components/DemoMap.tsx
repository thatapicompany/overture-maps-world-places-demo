'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export interface DemoMapProps {
  center: { lat: number; lng: number }
  zoom?: number
  pitch?: number
  onReady: (map: maplibregl.Map) => void
  onMoveEnd?: (center: { lat: number; lng: number }) => void
  heightOffset?: number
}

/**
 * Shared MapLibre wrapper for the demo pages: OSM raster base style,
 * navigation controls, debounced moveend callback. Pages add their own
 * sources/layers via the map instance passed to onReady.
 */
export default function DemoMap({ center, zoom = 14, pitch = 0, onReady, onMoveEnd, heightOffset = 150 }: DemoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [, setLoaded] = useState(false)

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 22 }],
      },
      center: [center.lng, center.lat],
      zoom,
      pitch,
      attributionControl: true,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.on('load', () => {
      setLoaded(true)
      onReady(map)
    })

    map.on('moveend', () => {
      const c = map.getCenter()
      onMoveEnd?.({ lat: c.lat, lng: c.lng })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height: `calc(100vh - ${heightOffset}px)` }}
    />
  )
}
