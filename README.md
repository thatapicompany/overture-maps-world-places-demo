# Overture Maps World Places Demo

An interactive map application that uses the Overture Maps API to search and display places around the world. Built with Next.js 14, TypeScript, MapLibre GL JS, and Tailwind CSS.

## Features

- **Interactive Map**: Full-screen MapLibre GL JS map with OpenStreetMap tiles
- **API Integration**: Direct integration with Overture Maps API
- **Dynamic Filtering**: Filter places by categories and brands
- **Country-based Brand Filtering**: Brands and categories automatically update based on map location and selected categories
- **Place Search**: Search for places at the current map center with configurable radius and result limit
- **GeoJSON Rendering**: Places displayed as interactive markers on the map
- **Click Popups**: Click on places to view detailed information in JSON format
- **State Persistence**: Viewport, API key, and selections saved in localStorage
- **Responsive Design**: Mobile-friendly interface with responsive layout
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

### API Endpoints Used

The application uses the following Overture Maps API endpoints:

- **Categories**: `/places/categories` - Get available place categories
- **Brands**: `/places/brands` - Get brands filtered by country and category
- **Places**: `/places` - Get places by location with filters
- **Countries**: `/places/countries` - Get country information for coordinates

### Configuration

Key configuration constants can be found in `lib/config.ts`:

- `DEFAULT_SEARCH_RADIUS`: 1500 meters
- `DEFAULT_RESULT_LIMIT`: 200 places
- `MAP_MOVE_DEBOUNCE_MS`: 400ms
- `DEFAULT_MAP_CENTER`: NYC (40.7128, -74.0060, zoom 12)
- `MAX_RESULT_LIMIT`: 25000 (enforced in UI)

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

## API Examples

### Get Categories
```bash
curl -H "x-api-key: DEMO-API-KEY" \
  "https://api.overturemapsapi.com/places/categories?lat=40.7128&lng=-74.0060&radius=1000&format=json"
```

### Get Brands
```bash
curl -H "x-api-key: DEMO-API-KEY" \
  "https://api.overturemapsapi.com/places/brands?lat=40.7128&lng=-74.0060&radius=1000&country=US&categories=food,retail&format=json"
```

### Get Places
```bash
curl -H "x-api-key: DEMO-API-KEY" \
  "https://api.overturemapsapi.com/places?lat=40.7128&lng=-74.0060&radius=1500&limit=200&format=geojson&categories=food&brand_name=Starbucks"
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


### Error Messages

- **API errors**: The app will display detailed error messages from the Overture Maps API, including demo account restrictions, invalid parameters, and more.
- **"Failed to load categories"**: Check API key, network connection, and map location
- **"Failed to load places"**: Verify coordinates, API parameters, and result limit
- **"No options found"**: Try adjusting the search radius, limit, or location

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
