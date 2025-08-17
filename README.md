# Overture Maps World Places Demo

An interactive map application that uses the Overture Maps API to search and display places around the world. Built with Next.js 14, TypeScript, MapLibre GL JS, and Tailwind CSS.

## Features

- **Interactive Map**: Full-screen MapLibre GL JS map with OpenStreetMap tiles
- **API Integration**: Direct integration with Overture Maps API using JSON format
- **Dynamic Filtering**: Filter places by categories and brands
- **Country-based Brand Filtering**: Brands and categories automatically update based on map location and selected categories
- **Place Search**: Search for places at the current map center with configurable radius (default: 2000m) and result limit (up to 25,000)
- **Auto-Search**: Optional automatic search when moving the map
- **Radius Visualization**: Always-visible radius circle on the map
- **JSON Rendering**: Places displayed as interactive markers with structured JSON data
- **Enhanced Popups**: Click on places to view detailed information including confidence scores, categories, brands, and addresses
- **State Persistence**: Viewport, API key, selections, and preferences saved in localStorage
- **Default Selections**: Auto-loads with pharmacy category and Walgreens brand for immediate results
- **Responsive Design**: Mobile-friendly interface with responsive layout and improved dropdown styling
- **Error Handling**: Graceful error handling with user-friendly messages, including detailed API error responses

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Map Library**: MapLibre GL JS
- **API Client**: Custom typed client with Zod validation
- **Testing**: Playwright for E2E tests

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Overture Maps API key (optional - demo key provided)

## Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd overture-maps-world-places-demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional)
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` and set:
   ```
   NEXT_PUBLIC_OVERTURE_API_BASE=https://api.overturemapsapi.com
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Getting Started

1. **API Key**: The application defaults to using `DEMO-API-KEY`. You can replace this with your own Overture Maps API key for production use.

2. **Map Navigation**: 
   - Use mouse to pan and zoom
   - Use the navigation controls in the top-right corner
   - The map remembers your last viewport position


3. **Categories**: 
   - Select one or more categories to filter places
   - Categories are loaded and refreshed based on the current map center and radius
   - Multi-select is supported

4. **Brands**: 
   - Select a brand to filter places
   - Brands automatically update based on the current map location and selected categories
   - Single select only

5. **Radius & Limit**:
   - Adjust the search radius (in meters) and result limit (up to 25,000) using the number inputs in the top bar
   - The radius circle is always visible on the map

6. **Auto-Search**:
   - Use the "Auto-Search when moving map" checkbox to enable or disable automatic place search after moving the map

7. **Searching Places**:
   - Click "Show places here" to search for places at the current map center, or let auto-search do it for you
   - Places will appear as blue markers on the map
   - The count of found places is displayed

8. **Viewing Place Details**:
   - Click on any place marker to view details
   - A popup will show the place name and JSON properties
   - Click "Clear results" to remove all places from the map

## Using the Overture Maps API

This demo showcases how to integrate with the [Overture Maps API](https://overturemapsapi.com). Here's what you need to know to use the API in your own projects:

### Authentication

The Overture Maps API uses API key authentication via the `x-api-key` header:

```bash
curl -H "x-api-key: YOUR-API-KEY" \
  "https://api.overturemapsapi.com/places?lat=40.7128&lng=-74.0060&radius=1500&format=json"
```

- **Demo Key**: Use `DEMO-API-KEY` for testing (limited usage)
- **Production**: Get your API key from [overturemapsapi.com](https://overturemapsapi.com)
- **Header**: Always include `x-api-key: YOUR-API-KEY` in requests

### Response Formats

The API supports multiple response formats via the `format` parameter:

#### JSON Format (Recommended)
```bash
# Returns array of Place objects - cleaner structure
curl -H "x-api-key: YOUR-API-KEY" \
  "https://api.overturemapsapi.com/places?lat=40.7128&lng=-74.0060&radius=1500&format=json"
```

**JSON Response Structure:**
```json
[
  {
    "id": "place-id",
    "geometry": {
      "type": "Point",
      "coordinates": [-74.0060, 40.7128]
    },
    "properties": {
      "names": {
        "primary": "Place Name"
      },
      "categories": {
        "primary": "retail"
      },
      "confidence": 0.95,
      "addresses": [
        {
          "freeform": "123 Main St, New York, NY"
        }
      ]
    }
  }
]
```

#### GeoJSON Format
```bash
# Returns GeoJSON FeatureCollection - good for mapping libraries
curl -H "x-api-key: YOUR-API-KEY" \
  "https://api.overturemapsapi.com/places?lat=40.7128&lng=-74.0060&radius=1500&format=geojson"
```

### Key API Endpoints

#### 1. Places Search
**Endpoint:** `GET /places`

**Common Parameters:**
- `lat`, `lng`: Coordinates (required)
- `radius`: Search radius in meters (default: 1000, max: 50000)
- `limit`: Max results (default: 100, max: 25000)
- `format`: Response format (`json` or `geojson`)
- `categories`: Filter by categories (comma-separated)
- `brand_name`: Filter by brand name
- `country`: Filter by country code

```bash
curl -H "x-api-key: YOUR-API-KEY" \
  "https://api.overturemapsapi.com/places?lat=40.7128&lng=-74.0060&radius=2000&limit=500&format=json&categories=food,retail&brand_name=Starbucks"
```

#### 2. Categories
**Endpoint:** `GET /places/categories`

Get available place categories for a location:

```bash
curl -H "x-api-key: YOUR-API-KEY" \
  "https://api.overturemapsapi.com/places/categories?lat=40.7128&lng=-74.0060&radius=5000&format=json"
```

#### 3. Brands
**Endpoint:** `GET /places/brands`

Get available brands filtered by location and categories:

```bash
curl -H "x-api-key: YOUR-API-KEY" \
  "https://api.overturemapsapi.com/places/brands?lat=40.7128&lng=-74.0060&radius=5000&categories=food&country=US&format=json"
```

#### 4. Countries
**Endpoint:** `GET /places/countries`

Get country information for coordinates:

```bash
curl -H "x-api-key: YOUR-API-KEY" \
  "https://api.overturemapsapi.com/places/countries?lat=40.7128&lng=-74.0060&format=json"
```

### Best Practices

1. **Use JSON Format**: Cleaner data structure, easier to work with
2. **Set Appropriate Limits**: Use reasonable radius and limit values to avoid large responses
3. **Handle Errors**: API returns detailed error messages with HTTP status codes
4. **Cache Results**: Consider caching responses for better performance
5. **Validate Responses**: Use schema validation (this demo uses Zod)

### Error Handling

The API returns structured error responses:

```json
{
  "error": "Invalid parameter",
  "message": "Radius must be between 1 and 50000 meters",
  "status": 400
}
```

Common HTTP status codes:
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (invalid API key)
- `429`: Rate Limited
- `500`: Server Error

### TypeScript Integration

This demo includes full TypeScript support with Zod validation. Key files:

- `lib/types.ts`: TypeScript interfaces for all API responses
- `lib/overture.ts`: Typed API client with validation
- Flexible schemas that handle optional/null values gracefully

### API Examples

### Configuration

Key configuration constants can be found in `lib/config.ts`:

- `DEFAULT_SEARCH_RADIUS`: 2000 meters (updated from 1500)
- `DEFAULT_RESULT_LIMIT`: 200 places
- `MAP_MOVE_DEBOUNCE_MS`: 400ms
- `DEFAULT_MAP_CENTER`: NYC (40.7128, -74.0060, zoom 12)
- `MAX_RESULT_LIMIT`: 25000 (enforced in UI)

### Recent Updates

**v2.0 Changes:**
- **JSON Format**: Switched from GeoJSON to JSON format for cleaner API responses
- **Enhanced UI**: Added radius input (default: 2000m), limit input, and auto-search toggle
- **Always-Visible Radius**: Radius circle now always shows on the map
- **Default Selections**: Auto-loads with pharmacy/Walgreens for immediate demo
- **Improved Popups**: Wider panels with better formatting for place information
- **Better Error Handling**: More detailed API error messages and validation
- **Type Safety**: Flexible Zod schemas that handle optional/null values gracefully

## Testing

### Run E2E Tests

```bash
npm test
```

### Run E2E Tests with UI

```bash
npm run test:ui
```

## Deployment

### Vercel Deployment

1. **Push to GitHub**: Ensure your code is pushed to a GitHub repository

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect Next.js

3. **Environment Variables**:
   - Add `NEXT_PUBLIC_OVERTURE_API_BASE=https://api.overturemapsapi.com` in Vercel dashboard
   - No other environment variables are required

4. **Deploy**: Vercel will automatically deploy your application

### Manual Build

```bash
npm run build
npm start
```

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main application page
│   └── test/              # Test pages
├── components/            # React components
│   ├── MapView.tsx        # MapLibre GL JS map component
│   ├── Select.tsx         # Reusable select component
│   └── TopBar.tsx         # Main control interface
├── lib/                   # Utility libraries
│   ├── config.ts          # Configuration constants
│   ├── overture.ts        # Overture API client
│   ├── types.ts           # TypeScript type definitions
│   └── test-api.ts        # API testing utilities
├── tests/                 # Test files
│   └── e2e/               # End-to-end tests
└── styles/                # Global styles
```

## Troubleshooting

### Common Issues

1. **Map not loading**: Check if MapLibre GL JS is properly installed
2. **API errors**: Verify your API key is correct and has proper permissions
3. **CORS errors**: The application makes direct API calls from the browser
4. **Performance issues**: Consider reducing the search radius or result limit
5. **Places not appearing**: Check if auto-search is enabled or manually click "Show places here"
6. **Popup text cut off**: Popups are now wider (min-w-80, max-w-96) to accommodate longer text

### Error Messages

- **API errors**: The app displays detailed error messages from the Overture Maps API, including demo account restrictions, invalid parameters, and more
- **"Failed to load categories"**: Check API key, network connection, and map location
- **"Failed to load places"**: Verify coordinates, API parameters, and result limit
- **"No options found"**: Try adjusting the search radius, limit, or location
- **Validation errors**: The app uses flexible Zod schemas that handle missing or null data gracefully

### API Response Formats

**If switching between JSON and GeoJSON formats:**
- JSON format returns an array of Place objects directly
- GeoJSON format returns a FeatureCollection with places in the features array
- This demo uses JSON format for cleaner data handling
- The MapView component converts JSON to GeoJSON internally for map visualization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues related to:
- **Overture Maps API**: Contact [Aden Forshaw](mailto:aden@thatapicompany.com)
- **Application**: Open an issue in this repository
