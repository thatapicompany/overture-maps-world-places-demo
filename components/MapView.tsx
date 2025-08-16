'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DEFAULT_MAP_CENTER, STORAGE_KEYS } from '@/lib/config'
import type { GeoJSON } from '@/lib/types'

export interface MapViewProps {
  onMapLoad: (map: maplibregl.Map) => void
  onMapMove: (center: { lat: number; lng: number }) => void
  places: GeoJSON | null
  onPlaceClick: (feature: any) => void
}

export default function MapView({ onMapLoad, onMapMove, places, onPlaceClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (map.current) return // Initialize map only once

    if (!mapContainer.current) return

    // Restore viewport from localStorage or use default
    let initialViewport = DEFAULT_MAP_CENTER
    try {
      const savedViewport = localStorage.getItem(STORAGE_KEYS.VIEWPORT)
      if (savedViewport) {
        const parsed = JSON.parse(savedViewport)
        if (parsed.lat && parsed.lng && parsed.zoom) {
          initialViewport = parsed
        }
      }
    } catch (error) {
      console.warn('Failed to restore viewport from localStorage:', error)
    }

    // Initialize MapLibre GL JS map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      },
      center: [initialViewport.lng, initialViewport.lat],
      zoom: initialViewport.zoom,
      attributionControl: true
    })

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    // Handle map load
    map.current.on('load', () => {
      setIsMapLoaded(true)
      onMapLoad(map.current!)
    })

    // Handle map move with debouncing
    let moveTimeout: NodeJS.Timeout
    map.current.on('moveend', () => {
      if (!map.current) return

      const center = map.current.getCenter()
      onMapMove({ lat: center.lat, lng: center.lng })

      // Save viewport to localStorage
      try {
        const viewport = {
          lat: center.lat,
          lng: center.lng,
          zoom: map.current.getZoom()
        }
        localStorage.setItem(STORAGE_KEYS.VIEWPORT, JSON.stringify(viewport))
      } catch (error) {
        console.warn('Failed to save viewport to localStorage:', error)
      }
    })

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [onMapLoad, onMapMove])

  // Handle places data updates
  useEffect(() => {
    if (!map.current || !isMapLoaded) return

    const mapInstance = map.current

    // Remove existing places source and layer if they exist
    if (mapInstance.getSource('places')) {
      mapInstance.removeLayer('places-layer')
      mapInstance.removeSource('places')
    }

    // Add new places data if available
    if (places && places.features.length > 0) {
      // Add GeoJSON source
      mapInstance.addSource('places', {
        type: 'geojson',
        data: places
      })

      // Add circle layer for places
      mapInstance.addLayer({
        id: 'places-layer',
        type: 'circle',
        source: 'places',
        paint: {
          'circle-radius': 8,
          'circle-color': '#3B82F6',
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 2,
          'circle-opacity': 0.8
        }
      })

      // Add click handler for places
      mapInstance.on('click', 'places-layer', (e) => {
        if (e.features && e.features[0]) {
          onPlaceClick(e.features[0])
        }
      })

      // Change cursor on hover
      mapInstance.on('mouseenter', 'places-layer', () => {
        mapInstance.getCanvas().style.cursor = 'pointer'
      })

      mapInstance.on('mouseleave', 'places-layer', () => {
        mapInstance.getCanvas().style.cursor = ''
      })
    }
  }, [places, isMapLoaded, onPlaceClick])

  return (
    <div className="w-full h-full">
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ height: 'calc(100vh - 120px)' }}
      />
    </div>
  )
}
