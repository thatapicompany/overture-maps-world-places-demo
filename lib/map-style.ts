import type * as maplibregl from 'maplibre-gl'

/**
 * OSM raster base map, desaturated and softened so data drawn on top (pins,
 * footprints, boundaries) stands out. Full-colour OSM has green parks and
 * orange roads that swallow green and amber pins.
 */
export const BASE_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-saturation': -0.85,
        'raster-contrast': -0.2,
        'raster-brightness-min': 0.12,
      },
    },
  ],
}

/**
 * Add (or replace) a pin layer: a solid circle with a white ring, over a soft
 * dark halo so it reads on both light and dark parts of the map.
 */
export function addPinLayer(
  map: maplibregl.Map,
  id: string,
  source: string,
  color: maplibregl.DataDrivenPropertyValueSpecification<string> | string,
  radius = 8,
): void {
  const halo = `${id}-halo`
  if (map.getLayer(id)) map.removeLayer(id)
  if (map.getLayer(halo)) map.removeLayer(halo)
  map.addLayer({
    id: halo,
    type: 'circle',
    source,
    paint: {
      'circle-radius': radius + 4,
      'circle-color': '#0F172A',
      'circle-opacity': 0.3,
      'circle-blur': 0.6,
    },
  })
  map.addLayer({
    id,
    type: 'circle',
    source,
    paint: {
      'circle-radius': radius,
      'circle-color': color as any,
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-width': 2.5,
    },
  })
}

/** Remove a pin layer added with addPinLayer, and its halo. */
export function removePinLayer(map: maplibregl.Map, id: string): void {
  if (map.getLayer(id)) map.removeLayer(id)
  if (map.getLayer(`${id}-halo`)) map.removeLayer(`${id}-halo`)
}
