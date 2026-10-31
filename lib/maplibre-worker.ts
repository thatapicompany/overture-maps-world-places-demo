import * as maplibregl from 'maplibre-gl'

// maplibre-gl 6 loads its worker from a file next to its own module. Next.js
// bundles maplibre into a chunk, so that file isn't there and every map fails
// with "Worker failed to load". Point maplibre at the worker as an emitted asset.
if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl(
    new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href,
  )
}
