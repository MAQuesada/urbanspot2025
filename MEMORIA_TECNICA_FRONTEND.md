# Technical Documentation - UrbanSpot Frontend

## 1. Technologies Used

### 1.1 Languages and Frameworks

- **TypeScript 5.2+**: Main programming language, chosen for its static typing, better development experience, and early error detection.
- **Angular 17.0+**: Modern and complete web framework for building SPA (Single Page Applications). Selected for:
  - Architecture based on reusable components
  - Robust dependency injection system
  - Advanced routing with lazy loading
  - Reactive state management with RxJS
  - Support for standalone applications (without NgModules)
  - Powerful CLI for scaffolding and build
- **RxJS 7.8+**: Library for reactive programming and asynchronous data handling through Observables.

### 1.2 Libraries and Tools

- **Leaflet 1.9.4**: Open-source JavaScript library for interactive maps.
  - **Technical decision**: Leaflet was chosen over Google Maps for being open-source, lightweight, and not requiring expensive API keys. It provides complete functionality for displaying POIs on a map.
- **Angular Forms**: System of reactive and template-driven forms for user input management.
- **Angular Router**: Routing system with component lazy loading to optimize initial performance.

### 1.3 External Cloud Services

- **AWS S3**: Image storage (POIs and photos).
  - URL: `https://urbanspot-bucket-2025.s3.eu-central-1.amazonaws.com/`
  - Images are served directly from S3 via public URLs.
- **MongoDB Atlas**: NoSQL database (indirect access through backend API).

### 1.4 Containers and Deployment

- **Docker**: Application containerization to ensure consistency across environments.
- **Docker Compose**: Service orchestration and environment variable management.
- **Nginx**: Lightweight web server to serve the Angular application in production.
  - **Technical decision**: Nginx is more efficient than Node.js for serving static files and has better performance in production.

### 1.5 Development Tools

- **Angular CLI**: Command-line tool for development, build, and testing.
- **Node.js 20+**: Runtime environment for development and project build.

---

## 2. Technical Description of the Web Application

### 2.1 System Architecture

The application follows a **component and service architecture** with clear separation of responsibilities:

```
┌─────────────────────────────────────────┐
│      Angular Application (SPA)          │
│  (Components, Routing, Guards)          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Service Layer                   │
│  (ApiService, AuthService)              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      HTTP Client (RxJS Observables)     │
│  (REST API Communication)               │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Backend API (FastAPI)              │
│  (REST Endpoints)                       │
└─────────────────────────────────────────┘
```

### 2.2 Design Pattern: Services and Components

**One of the most important architectural decisions** is the separation between **presentation components** and **business logic services**.

#### 2.2.1 `ApiService` Service

The `ApiService` service (`app/services/api.service.ts`) centralizes all communication with the backend API:

**Responsibilities**:

- Configuration loading from `config.json` (generated at runtime by Docker)
- HTTP header management (including `X-API-Key`)
- Methods for all CRUD operations (POIs, photos, users, ratings)
- HTTP error handling
- Configuration validation before making requests

**Key features**:

- **Dynamic configuration**: `config.json` is generated at runtime from environment variables, allowing different configurations without rebuild.
- **API Key injection**: The API key is automatically injected into all HTTP headers.
- **Observables**: All operations return RxJS Observables for asynchronous handling.

**Benefits of this decision**:

- **Centralization**: Single point of configuration for all API calls
- **Maintainability**: API changes are reflected in one place
- **Testability**: Easy to mock the service for testing
- **Reusability**: All components use the same service

#### 2.2.2 `AuthService` Service

The `AuthService` service (`app/services/auth.service.ts`) manages authentication state:

**Responsibilities**:

- User login and registration
- User storage in `localStorage`
- User session management
- Change notification via RxJS Subject
- ID normalization (`_id` → `id`)

**Key features**:

- **Persistence**: User is saved in `localStorage` to maintain session between reloads
- **Reactivity**: Uses `Subject` to notify changes to subscribed components
- **Normalization**: Converts MongoDB `_id` to `id` for frontend consistency
- **Automatic update**: `refreshUser()` method to update user points

**Benefits**:

- **Global state**: User is available throughout the application
- **Synchronization**: Changes automatically propagate to all components
- **Persistence**: Session is maintained between page reloads

#### 2.2.3 Components

Components follow the **Smart/Dumb Components** pattern:

- **Smart Components**: Contain business logic and communicate with services
  - `MapComponent`: Manages map and POI creation
  - `ProfileComponent`: Displays user profile and statistics
  - `PoiDetailComponent`: POI details with complete functionality
  - `PoiListComponent`: Paginated list of all POIs
  - `RankingComponent`: Leaderboard

- **Dumb Components**: Pure presentation components (if any)

### 2.3 User Interface Design

#### 2.3.1 Navigation Structure

The application uses **Angular Router** with the following routes:

```
/                    → Redirects to /map
/login               → Login component
/register           → Registration component
/map                 → Interactive map with POIs
/pois                → List of all POIs
/poi/:id             → Details of a specific POI
/profile/:id         → User profile
/ranking             → Global user ranking
```

**Features**:

- **Lazy Loading**: All components are loaded on demand to optimize initial bundle
- **Guards**: `authGuard` protects routes that require authentication
- **Automatic redirection**: Unauthenticated users are redirected to `/login`

#### 2.3.2 Main Components

##### **AppComponent** (`app.component.ts`)

- Root component of the application
- Contains navbar with navigation and user state
- Manages navbar visibility according to route
- Subscribes to user updates to reflect changes in real time

##### **MapComponent** (`components/map/map.component.ts`)

- Displays interactive map using Leaflet
- Loads all POIs from API with pagination (batches of 1000)
- Allows creating new POIs by clicking on the map
- Custom markers according to POI tags
- Navigation to POI details when clicking on marker

##### **PoiListComponent** (`components/poi-list/poi-list.component.ts`)

- Paginated list of all POIs in card format
- Loads all POIs with automatic pagination
- Navigation to POI details when clicking on card
- Responsive design with grid

##### **PoiDetailComponent** (`components/poi-detail/poi-detail.component.ts`)

- Displays complete POI details
- Gallery of photos associated with the POI
- Functionality to upload new photos
- Rating system (POI and photos) with 1-10 dropdowns
- Edit and delete POI (only if user is the author)
- Delete photos (only if user is the author)

##### **ProfileComponent** (`components/profile/profile.component.ts`)

- Displays complete user profile
- Statistics: total points, POIs created, photos uploaded
- List of POIs created by the user with links to details
- List of photos uploaded by the user with links to POIs
- Paginated data loading to handle large volumes

##### **RankingComponent** (`components/ranking/ranking.component.ts`)

- Global user ranking table
- Ordered by `total_score` descending
- Displays name, email, and total points

##### **LoginComponent** and **RegisterComponent**

- Authentication and registration forms
- Field validation
- Automatic redirection after successful login/registration

### 2.4 State Management

#### 2.4.1 User State

- **Storage**: `localStorage` with key `currentUser`
- **Synchronization**: `AuthService` notifies changes via `Subject`
- **Update**: Automatically updated after operations (create POI, upload photo, rate)

#### 2.4.2 Component State

- Each component manages its own local state
- Data is loaded from API in `ngOnInit()`
- Components update reactively when data changes

### 2.5 Folder Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── app.component.ts          # Root component and navbar
│   │   ├── app.config.ts             # Application configuration
│   │   ├── app.routes.ts             # Route definition
│   │   ├── components/               # Application components
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── map/
│   │   │   ├── poi-list/
│   │   │   ├── poi-detail/
│   │   │   ├── profile/
│   │   │   └── ranking/
│   │   ├── guards/                   # Route guards
│   │   │   └── auth.guard.ts
│   │   ├── models/                   # TypeScript interfaces
│   │   │   ├── user.model.ts
│   │   │   ├── poi.model.ts
│   │   │   ├── photo.model.ts
│   │   │   └── rating.model.ts
│   │   └── services/                 # Business logic services
│   │       ├── api.service.ts
│   │       └── auth.service.ts
│   ├── assets/                        # Static files
│   │   └── config.json               # Generated at runtime by Docker
│   ├── environments/                  # Environment configuration
│   │   └── environment.ts
│   ├── index.html                     # Main HTML
│   └── styles.css                     # Global styles
├── Dockerfile                         # Multi-stage build
├── entrypoint.sh                     # Script to generate config.json
├── nginx.conf                        # Nginx configuration
├── package.json                      # npm dependencies
└── angular.json                      # Angular CLI configuration
```

---

## 3. Implemented Functionality

### 3.1 Authentication and Registration

#### 3.1.1 User Registration

- Registration form with validation
- Fields: name, email, password
- Email and password validation
- Automatic redirection to map after registration
- User storage in `localStorage`

#### 3.1.2 Login

- Login form with email and password
- Credential validation against API
- Session storage in `localStorage`
- Automatic redirection to map after login

#### 3.1.3 Session Management

- Session persistence between page reloads
- Automatic user points update
- Logout with session cleanup
- Route protection with `authGuard`

### 3.2 POI Visualization

#### 3.2.1 Interactive Map

- Leaflet map centered on Málaga (by default)
- Loads all POIs from API with pagination
- Custom markers according to POI tags
- Popups with basic POI information
- Navigation to details when clicking on marker or popup
- Coordinate display when clicking on map

#### 3.2.2 POI List

- List view with cards for each POI
- Paginated loading of all POIs (batches of 1000)
- Information displayed: name, description, image, rating
- Navigation to details when clicking on card
- Responsive design with grid

#### 3.2.3 POI Details

- Complete POI information
- Main POI image
- Author information
- Average rating and number of ratings
- Gallery of associated photos
- Geographic location (coordinates)

### 3.3 POI Creation and Management

#### 3.3.1 Create POI

- Creation form from map
- Location selection by clicking on map
- Fields: name, description, tags, image
- Required field validation
- Image upload via FormData
- Automatic user points update
- Automatic navigation to created POI details

#### 3.3.2 Edit POI

- Edit form visible only if user is the author
- Editable fields: name, description, tags
- Field validation
- Real-time update after saving

#### 3.3.3 Delete POI

- Delete button visible only if user is the author
- Confirmation before deleting
- POI and associated resources deletion
- Redirection to map after deletion
- Automatic user points update

### 3.4 Photo Management

#### 3.4.1 Upload Photo

- Upload form from POI details
- Fields: description (optional), image file
- Required file validation
- Upload via FormData
- Automatic gallery update
- Automatic user points update

#### 3.4.2 View Photos

- Photo gallery in POI details
- Modal display when clicking on photo
- Information for each photo: description, rating, author
- Links to POI from photos in user profile

#### 3.4.3 Delete Photo

- Delete button visible only if user is the author
- Confirmation before deleting
- Automatic gallery update

### 3.5 Rating System

#### 3.5.1 Rate POI

- Rating dropdown (1-10)
- Selected rating validation
- Rating submission to API
- Automatic POI rating update
- Automatic user points update

#### 3.5.2 Rate Photo

- Rating dropdown (1-10) for each photo
- Selected rating validation
- Rating submission to API
- Automatic photo rating update
- Automatic user points update

### 3.6 User Profile

#### 3.6.1 Profile Information

- User name and email
- Total points, POIs created, photos uploaded
- Automatic real-time points update

#### 3.6.2 Created POIs

- List of all POIs created by the user
- Paginated loading to handle large volumes
- Links to details of each POI
- Information: name, description, image, rating

#### 3.6.3 Uploaded Photos

- List of all photos uploaded by the user
- Loading from all POIs with pagination
- Links to associated POI of each photo
- Information: description, rating, associated POI

### 3.7 Global Ranking

#### 3.7.1 Leaderboard

- List of users ordered by `total_score`
- Information: name, email, total points
- Loading from API with configurable limit

### 3.8 Navigation and UX

#### 3.8.1 Navbar

- Application logo (image from S3)
- Navigation links: Map, POI List, Ranking
- Link to authenticated user profile
- User information: name and total points
- Logout button
- Automatic hiding on login/registration pages

#### 3.8.2 Automatic Update

- User points are automatically updated after:
  - Creating POI
  - Uploading photo
  - Rating POI
  - Rating photo
  - Deleting POI
- Synchronization via RxJS Subject

---

## 4. Communication with Developed API and External API URLs

### 4.1 Backend API Used

The frontend consumes the **REST API developed in FastAPI** (backend). All endpoints require authentication via `X-API-Key` header. The API base URL and API Key are configured via `config.json`, generated at runtime by Docker from environment variables:

```json
{
  "apiUrl": "http://localhost:8000",
  "apiKey": "your-api-key-here"
}
```

**Technical decision**: This dynamic configuration allows different environments (development, production) without the need to rebuild the application.

### 4.2 External API URLs Used

#### 4.2.1 AWS S3

- **Storage URL**: `https://urbanspot-bucket-2025.s3.eu-central-1.amazonaws.com/`
- **Usage**:
  - POI images: `{bucket}/pois/{filename}`
  - Photo images: `{bucket}/photos/{filename}`
  - Application logo: `{bucket}/20251230_002924_e880896d.png`
- **Access**: Public URLs, images are served directly from S3

#### 4.2.2 Leaflet CDN

- **CSS**: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css`
- **Usage**: Styles for the interactive map
- **Note**: Leaflet is installed as an npm dependency, but styles are loaded from CDN in `index.html`

#### 4.2.3 MongoDB Atlas

- **Indirect access**: Through the backend API
- **Usage**: Data storage (users, POIs, photos, ratings)
- **No direct connection** from the frontend for security

---

## 5. Installation and Deployment Instructions

### 5.1 Prerequisites

- **Docker** and **Docker Compose** installed
- **Node.js 20+** (only for local development, not necessary in Docker)
- Environment variables configured

### 5.2 Local Configuration (Development)

#### 5.2.1 Dependency Installation

```bash
cd frontend
npm install
```

#### 5.2.2 Environment Variable Configuration

Create `src/assets/config.json` file manually (only for local development):

```json
{
  "apiUrl": "http://localhost:8000",
  "apiKey": "your-api-key-here"
}
```

**Note**: In Docker, this file is automatically generated from environment variables.

#### 5.2.3 Development Execution

```bash
npm start
```

The application will be available at `http://localhost:4200`

### 5.3 Docker Deployment

#### 5.3.1 Configuration in `docker-compose.yml`

The frontend is configured via environment variables:

```yaml
frontend:
  build: ./frontend
  ports:
    - "80:80"
  environment:
    - API_URL=http://backend:8000
    - API_KEY=your-api-key-here
  depends_on:
    - backend
```

#### 5.3.2 Build and Execution

```bash
# From project root
docker-compose build frontend
docker-compose up -d frontend
```

#### 5.3.3 Build Process

1. **Stage 1 (Builder)**:
   - Installs npm dependencies
   - Compiles Angular application
   - Generates static files in `dist/urbanspot/browser`

2. **Stage 2 (Production)**:
   - Copies compiled files to Nginx image
   - Configures Nginx to serve the application
   - Executes `entrypoint.sh` to generate `config.json`

#### 5.3.4 `entrypoint.sh` Script

The `entrypoint.sh` script executes when starting the container and:

1. Reads `API_URL` and `API_KEY` environment variables
2. Generates `config.json` in `/usr/share/nginx/html/assets/`
3. Starts Nginx

### 5.4 Nginx Configuration

The `nginx.conf` file configures Nginx to:

- Serve Angular static files
- Redirect all routes to `index.html` (SPA routing)
- Configure security headers
- Configure gzip compression

---

## 6. Solution Limitations and Future Improvements

### 6.1 Current Limitations

#### 6.1.1 Authentication

- **Limitation**: No JWT token or refresh token management
- **Impact**: Session is maintained only in `localStorage`, vulnerable to XSS
- **Risk**: If `localStorage` is compromised, the attacker has full access

#### 6.1.2 File Validation

- **Limitation**: Real MIME type of images is not validated in the frontend
- **Impact**: Possible upload of malicious files
- **Risk**: Security and unnecessary storage

#### 6.1.3 File Size

- **Limitation**: No explicit file size limit in the frontend
- **Impact**: Possible upload of very large files
- **Risk**: Performance issues and storage costs

#### 6.1.4 Frontend Pagination

- **Limitation**: Pagination is handled by loading all data in batches
- **Impact**: For large volumes, many data are loaded in memory
- **Risk**: Degraded performance with many POIs/photos

#### 6.1.5 Error Handling

- **Limitation**: Basic error handling, mainly with `alert()`
- **Impact**: Non-optimal user experience
- **Risk**: Critical errors may not be handled adequately

#### 6.1.6 Global State

- **Limitation**: No global state management (Redux, NgRx)
- **Impact**: Duplicated state between components
- **Risk**: Data inconsistencies

#### 6.1.7 Cache

- **Limitation**: No caching system for API data
- **Impact**: All requests go directly to the API
- **Risk**: Latency and unnecessary resource consumption

#### 6.1.8 Image Optimization

- **Limitation**: Images are displayed at full size
- **Impact**: Slow loading on slow connections
- **Risk**: Poor user experience

#### 6.1.9 Search and Filters

- **Limitation**: No search for POIs by name or description
- **Impact**: Difficult to find specific POIs
- **Risk**: Limited functionality

#### 6.1.10 Responsive Design

- **Limitation**: Basic responsive design
- **Impact**: Non-optimal experience on mobile devices
- **Risk**: Limited usability on mobile

### 6.2 Future Improvements

#### 6.2.1 Authentication and Security

- [ ] Implement **JWT tokens** with refresh tokens
- [ ] **HttpOnly cookies** to store tokens
- [ ] **CSRF protection** for forms
- [ ] **Input sanitization** to prevent XSS
- [ ] **Content Security Policy (CSP)** headers

#### 6.2.2 File Validation and Security

- [ ] Real MIME type validation (magic bytes)
- [ ] File size limit (e.g., 10MB)
- [ ] Image preview before upload
- [ ] Image compression before upload
- [ ] Automatic resizing of large images

#### 6.2.3 State Management

- [ ] Implement **NgRx** or **Akita** for global state
- [ ] API data cache
- [ ] Optimistic updates for better UX
- [ ] Persistent state between sessions

#### 6.2.4 Search and Filtering Features

- [ ] **Full-text search** of POIs by name/description
- [ ] **Advanced filters**: by tags, rating, date
- [ ] **Geographic search**: POIs near location
- [ ] **Sorting**: by date, rating, name
- [ ] **Real-time search** with debounce

#### 6.2.5 Performance Optimization

- [ ] **Image lazy loading** (intersection observer)
- [ ] **Virtual scrolling** for large lists
- [ ] **Service Workers** for offline cache
- [ ] More aggressive **code splitting**
- [ ] Optimized **tree shaking**
- [ ] **Asset compression** (gzip, brotli)

#### 6.2.6 UX Improvements

- [ ] **Toast notifications** instead of `alert()`
- [ ] **Loading skeletons** during data loading
- [ ] **Error boundaries** for error handling
- [ ] Elegant **modal confirmations**
- [ ] **Visual feedback** for all actions
- [ ] **Dark mode**

#### 6.2.7 Additional Features

- [ ] **Favorites**: Mark POIs as favorites
- [ ] **Share POIs**: Shareable links
- [ ] **Comments**: Comment system on POIs
- [ ] **Notifications**: Push notifications for events
- [ ] **Heat map**: POI density visualization
- [ ] **Routes**: Create routes between POIs
- [ ] **Export data**: Download POIs in JSON/CSV

#### 6.2.8 Testing

- [ ] **Unit tests** for services and components
- [ ] **Integration tests** for complete flows
- [ ] **E2E tests** with Cypress or Playwright
- [ ] **Code coverage** > 80%
- [ ] **Accessibility tests** (a11y)

#### 6.2.9 Accessibility

- [ ] Complete **ARIA labels**
- [ ] Complete **keyboard navigation**
- [ ] **Screen reader** compatible
- [ ] **Color contrast** WCAG AA
- [ ] Adequate **focus management**

#### 6.2.10 Internationalization

- [ ] **i18n** (Angular i18n) for multiple languages
- [ ] **Date formatting** according to locale
- [ ] **Number formatting** according to locale

---

## 7. Conclusions

The UrbanSpot frontend has been developed following **modern architecture principles** with Angular, using **reusable components**, **centralized services**, and **advanced routing**. The separation between presentation components and business logic services facilitates:

- **Maintainability**: Organized and easy to understand code
- **Scalability**: Easy to add new features
- **Testability**: Services and components can be tested independently
- **Reusability**: Centralized services avoid code duplication

The current solution covers all basic requirements of the case study, providing a complete user interface for managing POIs, photos, ratings, and viewing rankings. Integration with the backend via REST API is robust and dynamic configuration via `config.json` allows flexibility in different environments.

The proposed future improvements would allow taking the application to an enterprise production level, improving security, performance, accessibility, and user experience.
