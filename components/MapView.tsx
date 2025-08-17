'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DEFAULT_MAP_CENTER, STORAGE_KEYS } from '@/lib/config'
import type { Place } from '@/lib/types'

export interface MapViewProps {
  onMapLoad: (map: maplibregl.Map) => void
  onMapMove: (center: { lat: number; lng: number }) => void
  places: Place[] | null
  onPlaceClick: (place: Place) => void
  showRadius?: boolean
  radius?: number
  center?: { lat: number; lng: number }
}

export default function MapView({ onMapLoad, onMapMove, places, onPlaceClick, showRadius, radius, center }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  // Show radius circle
  useEffect(() => {
    if (!map.current || !isMapLoaded || !radius || !center) return

    const mapInstance = map.current
    // Remove previous radius layer/source if exists
    if (mapInstance.getLayer('radius-circle')) {
      mapInstance.removeLayer('radius-circle')
    }
    if (mapInstance.getSource('radius-circle')) {
      mapInstance.removeSource('radius-circle')
    }

    // Add GeoJSON source for circle
    const circleGeoJSON = createCircle(center.lng, center.lat, radius)
    mapInstance.addSource('radius-circle', {
      type: 'geojson',
      data: circleGeoJSON
    })
    mapInstance.addLayer({
      id: 'radius-circle',
      type: 'fill',
      source: 'radius-circle',
      paint: {
        'fill-color': '#3B82F6',
        'fill-opacity': 0.1
      }
    })
    mapInstance.addLayer({
      id: 'radius-circle-outline',
      type: 'line',
      source: 'radius-circle',
      paint: {
        'line-color': '#3B82F6',
        'line-width': 2,
        'line-opacity': 0.6
      }
    })

    return () => {
      if (mapInstance.getLayer('radius-circle')) mapInstance.removeLayer('radius-circle')
      if (mapInstance.getLayer('radius-circle-outline')) mapInstance.removeLayer('radius-circle-outline')
      if (mapInstance.getSource('radius-circle')) mapInstance.removeSource('radius-circle')
    }
  }, [radius, center, isMapLoaded])

  // Helper to create a circle polygon as GeoJSON
  function createCircle(lng: number, lat: number, radiusMeters: number, points = 64) {
    const coords = []
    const earthRadius = 6378137
    for (let i = 0; i <= points; i++) {
      const angle = (i * 360) / points
      const rad = (angle * Math.PI) / 180
      const dx = radiusMeters * Math.cos(rad)
      const dy = radiusMeters * Math.sin(rad)
      const newLng = lng + (dx / (earthRadius * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI)
      const newLat = lat + (dy / earthRadius) * (180 / Math.PI)
      coords.push([newLng, newLat])
    }
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      },
      properties: {}
    }
  }

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
    if (places && places.length > 0) {
      // Convert Place[] to GeoJSON format for map display
      const geojson = {
        type: 'FeatureCollection' as const,
        features: places.map(place => ({
          type: 'Feature' as const,
          id: place.id,
          geometry: place.geometry,
          properties: place.properties
        }))
      }

      // Add GeoJSON source
      mapInstance.addSource('places', {
        type: 'geojson',
        data: geojson
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
          // Find the original Place object from the clicked feature
          const clickedFeature = e.features[0]
          const originalPlace = places.find(p => p.id === clickedFeature.properties.id)
          if (originalPlace) {
            onPlaceClick(originalPlace)
          }
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
        style={{ height: 'calc(100vh - 180px)' }}
      />
    </div>
  )
}
