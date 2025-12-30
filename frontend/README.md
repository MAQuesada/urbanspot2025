# UrbanSpot Frontend

Angular frontend application for UrbanSpot.

## Development

### Prerequisites

- Node.js 20+ and npm
- Angular CLI: `npm install -g @angular/cli`

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create `src/environments/environment.ts` with:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:8000',
     apiKey: 'your-api-key-here'
   };
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

   The app will be available at `http://localhost:4200`

## Production Build

```bash
npm run build
```

The built files will be in `dist/urbanspot/browser/`

## Docker

The frontend is containerized using Docker with nginx. See the root `docker-compose.yml` for running with the backend.

## Features

- User authentication (login/register)
- Interactive map with POIs using Leaflet
- POI creation and management
- Photo upload and gallery
- Rating system for POIs and photos
- User profiles with gamification scores
- Global ranking

## API Integration

All API calls are made through the `ApiService` which automatically includes the API key in headers. The API URL and key are configured via environment variables.
