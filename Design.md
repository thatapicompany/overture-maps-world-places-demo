

Build a production-ready single-page app I can deploy to **Vercel** that uses **Next.js 14 (App Router)** + **TypeScript**, **MapLibre GL JS** for the map, and **Tailwind CSS** for styling.

## Core behavior

1. **Map**

   * Full-screen **MapLibre GL** map.
   * Initial view: **New York City** (lat `40.7128`, lng `-74.0060`, zoom `12`).
   * Remember last viewport in `localStorage` and restore on reload.

2. **Top bar controls**

   * Sticky top bar with:

     * **API Key input** (text input). Default to `DEMO-API-KEY`. Persist in `localStorage`. All API calls must use the current value.
     * **“Categories” Select** (multi-select).
     * **“Brands” Select** (single select).
     * Centered primary button: **“Show places here”**.
   * Populate **Categories** and **Brands** **from the OvertureMapsAPI using the official OpenAPI spec at `https://api.overturemapsapi.com/api-docs.json`**. Resolve the exact endpoints/params from the spec at build-time (hardcode paths) in a small client library (`lib/overture.ts`).

3. **Dynamic Brand filtering**

   * The **Brands** options must be filtered by:

     * **Current country at the map center**, and
     * The currently selected **Category** (if any).
   * Implementation:

     * When the map stops moving (debounced \~400ms) or when Categories change, recompute the brand list.
     * Determine the **country code** for the current map center using an Overture endpoint from the OpenAPI spec (e.g., **reverse geocoding** or administrative areas lookup). Parse an ISO country code from the response. If both ISO-2 and ISO-3 are available, prefer ISO-2.
     * Call the **Brands** endpoint with appropriate query params to filter by **country** and **category** as supported by the spec (e.g., `country`, `categories`, etc.). If the spec expects different parameter names, follow the spec exactly.
     * Show loading spinners and empty/error states.

4. **Fetch & render places**

   * When **“Show places here”** is clicked:

     * Read center via `map.getCenter()`.
     * Build a request to the **Places** endpoint (per spec, e.g., `GET /places`) with:

       * `lat`, `lng`, `radius`, `limit`, `format=geojson`
       * Optional filters:

         * `categories` (CSV of selected category IDs/keys),
         * `brand_name` (selected Brand).
     * Header: `x-api-key: <current API key from the input>`.
     * Configurable constants for `radius` (default **1500** meters) and `limit` (default **200**).
     * Show a loading overlay while fetching.
   * Render returned **GeoJSON** as a **source + circle/symbol layer**.
   * On pin click, open a **Popup** with:

     * Place name (if available) as a title.
     * A read-only `<textarea>` containing `JSON.stringify(feature.properties, null, 2)`.

5. **UX & components**

   * Components:

     * `TopBar.tsx` (API key input, selects, button, result count, clear button)
     * `MapView.tsx` (MapLibre map)
     * `Select.tsx` (reusable, searchable, accessible)
   * Show total “**X places**” after results load.
   * “**Clear results**” action resets the layer/source and count.
   * Responsive on mobile (top bar stacks; button stays obvious).
   * Keyboard accessibility + focus states.

6. **Project setup**

   * Next.js App Router with `app/page.tsx` (client component for map).
   * Tailwind for layout.
   * **Typed client** in `lib/overture.ts`:

     * `getCategories(apiKey: string): Promise<Category[]>`
     * `getBrands(params: { apiKey: string; countryCode?: string; categories?: string[] }): Promise<Brand[]>`
     * `getCountryCodeFor({ lat, lng, apiKey }): Promise<string | undefined>` (uses an Overture reverse-geocode/admin endpoint per the spec)
     * `getPlacesByCenter(params: { apiKey: string; lat: number; lng: number; categories?: string[]; brandName?: string; radius?: number; limit?: number; format?: 'geojson' }): Promise<GeoJSON>`
   * Use **Zod** to validate API responses (be tolerant; surface errors non-destructively).
   * Environment variables:

     * `NEXT_PUBLIC_OVERTURE_API_BASE=https://api.overturemapsapi.com`
     * No hardcoded API key in code—**read from the input**, with `DEMO-API-KEY` as default if empty.
   * Handle CORS (browser fetch with `x-api-key` header).

7. **Testing & DX**

   * `/README.md` including:

     * Local dev instructions.
     * Vercel env setup (only the base URL is env; API key is user-input).
     * Example curl calls.
   * **Playwright** e2e test:

     * Page renders with top bar, API key input prefilled with `DEMO-API-KEY`.
     * Mocks for categories/brands fetching; selects populate.
     * Simulate map center, click “Show places here”, mock places response, and assert a map source/layer is added and the counter updates.

8. **Security & perf**

   * Never crash on bad/missing API responses—show inline errors.
   * Debounce map-move and button clicks.
   * Lightweight logging to `console` in dev (request URL, ms).

## Implementation details & assumptions (follow the spec)

* **Use the OpenAPI doc** at `https://api.overturemapsapi.com/api-docs.json` to confirm:

  * Exact paths and query params for:

    * **Categories** (e.g., `/places/categories`),
    * **Brands** (e.g., `/places/brands`),
    * **Places** (e.g., `/places` with `format=geojson`),
    * **Reverse geocoding / admin lookup** to get a country code from `lat/lng`.
  * If the spec exposes a dedicated **country** param for brands (e.g., `country=US`) and **categories** (e.g., `categories=food,coffee`), use those names exactly.
  * If country code is delivered as a property in reverse geocoding response, parse it and pass through.
* **Pin rendering**: start with a simple circle layer; include clustering if `limit` is large (optional flag/constant).
* **Persisted state**:

  * API key, selected categories/brand, and last viewport in `localStorage`.

## Files to produce

* `app/layout.tsx`, `app/page.tsx`
* `components/TopBar.tsx`, `components/MapView.tsx`, `components/Select.tsx`
* `lib/overture.ts`
* `styles/globals.css` (Tailwind)
* `tailwind.config.ts`, `postcss.config.js`
* `package.json`, `tsconfig.json`, `next.config.js`
* `README.md`
* `tests/e2e/app.spec.ts`

## Acceptance criteria

* Loads centered on NYC with a visible top bar.
* **API Key input** defaults to `DEMO-API-KEY`, can be edited; updates are used immediately for all calls.
* **Categories** and **Brands** are fetched from Overture.
  **Brands list auto-filters** by current map-center **country** and selected **Category** (if any).
* Clicking **“Show places here”** fetches places at map center (respecting category/brand filters) and renders pins. Count appears.
* Clicking a pin opens a popup with a JSON textarea of the feature’s properties.
* Errors are shown non-destructively. App remains interactive.
* Ready to deploy on **Vercel**.