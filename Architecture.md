# Architecture Overview

## Application Structure

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Map Library**: MapLibre GL JS
- **API Client**: Custom typed client with Zod validation
- **Testing**: Playwright for E2E tests
- **Deployment**: Vercel

### Core Architecture Components

#### 1. Frontend Components
```
components/
├── TopBar.tsx          # Main control interface
├── MapView.tsx         # MapLibre map container
└── Select.tsx          # Reusable select component
```

#### 2. API Client Layer
```
lib/
└── overture.ts         # Typed API client with methods:
    ├── getCategories()
    ├── getBrands()
    ├── getCountryCodeFor()
    └── getPlacesByCenter()
```

#### 3. Application Pages
```
app/
├── layout.tsx          # Root layout with Tailwind
└── page.tsx            # Main client component
```

#### 4. Configuration Files
```
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
├── tsconfig.json
└── package.json
```

## Data Flow Architecture

### 1. Initial Load Flow
```
App Load → Restore localStorage → Initialize Map → Fetch Categories → Populate UI
```

### 2. Map Interaction Flow
```
Map Move → Debounce (400ms) → Get Country Code → Filter Brands → Update Brand Select
```

### 3. Places Search Flow
```
Show Places Button → Get Map Center → Build API Request → Fetch Places → Render GeoJSON → Update Counter
```

### 4. State Management
- **Local Storage Persistence**: API key, viewport, selected categories/brand
- **Component State**: Loading states, error states, current selections
- **Map State**: Viewport, sources, layers

## API Integration Architecture

### Overture Maps API Endpoints
Based on OpenAPI spec at `https://api.overturemapsapi.com/api-docs.json`:

1. **Categories Endpoint**: `/places/categories`
   - Purpose: Get available place categories
   - Method: GET
   - Headers: `x-api-key`

2. **Brands Endpoint**: `/places/brands`
   - Purpose: Get brands filtered by country and category
   - Method: GET
   - Query Params: `country`, `categories`
   - Headers: `x-api-key`

3. **Places Endpoint**: `/places`
   - Purpose: Get places by location with filters
   - Method: GET
   - Query Params: `lat`, `lng`, `radius`, `limit`, `format=geojson`, `categories`, `brand_name`
   - Headers: `x-api-key`

4. **Reverse Geocoding Endpoint**: (TBD from spec)
   - Purpose: Get country code from lat/lng
   - Method: GET
   - Query Params: `lat`, `lng`
   - Headers: `x-api-key`

### API Client Design
```typescript
interface OvertureClient {
  getCategories(apiKey: string): Promise<Category[]>
  getBrands(params: { apiKey: string; countryCode?: string; categories?: string[] }): Promise<Brand[]>
  getCountryCodeFor({ lat, lng, apiKey }): Promise<string | undefined>
  getPlacesByCenter(params: { apiKey: string; lat: number; lng: number; categories?: string[]; brandName?: string; radius?: number; limit?: number; format?: 'geojson' }): Promise<GeoJSON>
}
```

## Map Architecture

### MapLibre GL JS Integration
- **Container**: Full-screen map in MapView component
- **Initial View**: NYC (40.7128, -74.0060, zoom 12)
- **Viewport Persistence**: localStorage with restore on load
- **Sources**: Dynamic GeoJSON source for places
- **Layers**: Circle/symbol layer for place markers
- **Interactions**: Click handlers for popups

### Map State Management
- **Viewport**: Center, zoom, bearing, pitch
- **Sources**: Places GeoJSON source
- **Layers**: Places markers layer
- **Popup**: Feature properties display

## Component Architecture

### TopBar Component
```typescript
interface TopBarProps {
  apiKey: string
  onApiKeyChange: (key: string) => void
  categories: Category[]
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  brands: Brand[]
  selectedBrand: string | null
  onBrandChange: (brand: string | null) => void
  onShowPlaces: () => void
  placeCount: number
  onClearResults: () => void
  isLoading: boolean
}
```

### MapView Component
```typescript
interface MapViewProps {
  onMapLoad: (map: Map) => void
  onMapMove: (center: { lat: number; lng: number }) => void
  places: GeoJSON | null
  onPlaceClick: (feature: any) => void
}
```

### Select Component
```typescript
interface SelectProps {
  options: Array<{ value: string; label: string }>
  value: string | string[] | null
  onChange: (value: string | string[] | null) => void
  placeholder: string
  multiple?: boolean
  searchable?: boolean
  disabled?: boolean
}
```

## Error Handling Architecture

### Error Boundaries
- **API Errors**: Non-destructive inline error display
- **Map Errors**: Graceful fallbacks
- **Validation Errors**: Zod schema validation with user feedback

### Loading States
- **Initial Load**: Skeleton/loading spinners
- **API Calls**: Button loading states, overlay indicators
- **Map Operations**: Debounced operations with visual feedback

## Performance Architecture

### Optimization Strategies
- **Debouncing**: Map movements (400ms), button clicks
- **Caching**: API responses in memory during session
- **Lazy Loading**: Components and heavy operations
- **Bundle Optimization**: Tree shaking, code splitting

### Monitoring
- **Development Logging**: Request URLs, response times
- **Error Tracking**: Console logging for debugging
- **Performance Metrics**: Load times, interaction responsiveness

## Security Architecture

### API Key Management
- **No Hardcoding**: API key only from user input
- **Default Value**: `DEMO-API-KEY` as fallback
- **Persistence**: localStorage with user consent
- **Validation**: Client-side validation before API calls

### CORS Handling
- **Browser Fetch**: Direct API calls with x-api-key header
- **Error Handling**: Graceful CORS error management

## Testing Architecture

### E2E Testing with Playwright
- **Test Scenarios**: Full user journey testing
- **Mocking**: API responses for consistent testing
- **Assertions**: UI state, map interactions, data flow

### Test Structure
```
tests/
└── e2e/
    └── app.spec.ts     # Main application tests
```

## Deployment Architecture

### Vercel Configuration
- **Environment Variables**: `NEXT_PUBLIC_OVERTURE_API_BASE`
- **Build Process**: Next.js optimized build
- **Static Assets**: Optimized for CDN delivery
- **API Routes**: None required (direct API calls)

### Environment Setup
- **Development**: Local development server
- **Production**: Vercel deployment with environment variables
- **Staging**: Preview deployments for testing

## Data Models

### Category Model
```typescript
interface Category {
  id: string
  name: string
  description?: string
}
```

### Brand Model
```typescript
interface Brand {
  id: string
  name: string
  country?: string
  categories?: string[]
}
```

### Place Model (GeoJSON Feature)
```typescript
interface Place {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: {
    name?: string
    category?: string
    brand?: string
    [key: string]: any
  }
}
```

## Configuration Constants

### Map Configuration
- **Default Center**: NYC (40.7128, -74.0060)
- **Default Zoom**: 12
- **Search Radius**: 1500 meters
- **Result Limit**: 200 places
- **Debounce Delay**: 400ms

### API Configuration
- **Base URL**: `https://api.overturemapsapi.com`
- **Default API Key**: `DEMO-API-KEY`
- **Request Format**: `geojson`
- **Timeout**: 30 seconds 