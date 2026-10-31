import * as maplibregl from 'maplibre-gl'
import type { Place } from './types'

/**
 * Zoom the map to the bounds of a set of places so every pin is in view.
 * A single place zooms to street level rather than the maximum zoom.
 * Returns false when there is nothing to fit.
 */
export function fitMapToPlaces(map: maplibregl.Map, places: Place[]): boolean {
  const coords = places
    .map((p) => p.geometry?.coordinates)
    .filter((c): c is [number, number] => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))
  if (coords.length === 0) return false

  const bounds = coords.reduce(
    (b, c) => b.extend(c),
    new maplibregl.LngLatBounds(coords[0], coords[0]),
  )
  // Wait a frame so layout changes from the same render (e.g. the API call
  // bar appearing above the map) are applied before measuring the viewport
  requestAnimationFrame(() => {
    map.resize()
    map.fitBounds(bounds, { padding: visiblePadding(map, 60), maxZoom: 17, duration: 800 })
  })
  return true
}

/**
 * Padding that keeps pins inside the part of the map visible in the window.
 * The map can extend below the fold (the page is taller than the viewport),
 * so pad by the hidden amount as well.
 */
function visiblePadding(map: maplibregl.Map, base: number): maplibregl.PaddingOptions {
  const rect = map.getContainer().getBoundingClientRect()
  const hiddenTop = Math.max(0, -rect.top)
  const hiddenBottom = Math.max(0, rect.bottom - window.innerHeight)
  const padding = { top: base + hiddenTop, bottom: base + hiddenBottom, left: base, right: base }
  // Fall back to plain padding if the visible area is too small to fit into
  if (padding.top + padding.bottom >= rect.height - 40) {
    return { top: base, bottom: base, left: base, right: base }
  }
  return padding
}
