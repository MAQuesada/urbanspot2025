# Technical Documentation - UrbanSpot Backend

## 1. Technologies Used

### 1.1 Languages and Frameworks

- **Python 3.11**: Main programming language, chosen for its clear syntax, robust ecosystem, and excellent support for asynchronous development.
- **FastAPI 0.104+**: Modern, high-performance web framework for building REST APIs. Selected for:
  - Automatic generation of interactive documentation (Swagger/OpenAPI)
  - Native support for asynchronous operations
  - Automatic data validation with Pydantic
  - High performance comparable to Node.js and Go
- **Uvicorn**: High-performance ASGI server for running the FastAPI application.

### 1.2 Database and Storage

- **MongoDB Atlas**: Cloud NoSQL database for storing:
  - Users and their credentials
  - Points of interest (POIs)
  - Photographs (metadata)
  - Ratings
  - Scoring and gamification system
  
  **Technical decision**: MongoDB was chosen for its flexibility in handling JSON documents, horizontal scalability, and its ability to store nested data structures without rigid schemas.

- **Motor 3.3+**: Official asynchronous MongoDB driver for Python, enabling non-blocking operations.

- **AWS S3**: Object storage service for photographs and multimedia files.
  
  **Technical decision**: S3 was selected for its high availability, automatic scalability, and reduced costs for static file storage. Integration through `boto3` enables efficient file management.

### 1.3 Security and Authentication

- **Passlib with bcrypt**: Library for secure password hashing.
  - **Technical decision**: bcrypt is a robust hashing algorithm that includes automatic salt and is resistant to brute force attacks. The 72-byte limitation is explicitly handled in validation.

- **API Key Authentication**: Authentication system based on API Key through `X-API-Key` header.
  - **Technical decision**: Implemented as a basic security measure to protect endpoints. In production, implementing full OAuth 2.0 is recommended (currently prepared in configuration but not implemented).

### 1.4 Validation and Serialization

- **Pydantic 2.5+**: Library for data validation and serialization.
  - Automatic type validation
  - Email validation, geographic coordinates, etc.
  - Automatic JSON serialization

### 1.5 Containers and Deployment

- **Docker**: Application containerization to ensure consistency across environments.
- **Docker Compose**: Service orchestration and environment variable management.
- **UV**: Modern and fast Python package manager, used in the Dockerfile build process.

### 1.6 External Cloud Services

- **MongoDB Atlas**: Managed cloud database
  - URL: `https://www.mongodb.com/cloud/atlas`
  - Connection via URI: `mongodb+srv://...`

- **AWS S3**: Object storage
  - URL: `https://aws.amazon.com/s3/`
  - Configurable region (default: `us-east-1`)

---

## 2. Technical Description of the Web Application

### 2.1 System Architecture

The application follows a **layered architecture** with clear separation of responsibilities:

```
┌─────────────────────────────────────────┐
│         FastAPI Application             │
│  (Routes, Middleware, Dependencies)     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│         Service Layer                    │
│  (Business Logic, Gamification)          │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Storage Abstraction Layer          │
│  (Protocols: DataDB, FileDB)            │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼──────┐      ┌───────▼───────┐
│ MongoDB  │      │   AWS S3      │
│  Atlas   │      │  (Storage)    │
└──────────┘      └───────────────┘
```

### 2.2 Design Pattern: Protocols (Interfaces)

**One of the most important architectural decisions** is the use of **protocols (abstract interfaces)** to abstract database and file storage implementations.

#### 2.2.1 `DataDB` Protocol

The `DataDB` protocol (`app/utils/protocols.py`) defines an abstract interface for database operations:

```python
class DataDB(ABC):
    async def connect() -> None
    async def disconnect() -> None
    async def create(collection, document) -> Dict
    async def read_one(collection, filter_dict) -> Optional[Dict]
    async def read_many(collection, filter_dict, skip, limit, sort_dict) -> List[Dict]
    async def update_one(collection, filter_dict, update_dict) -> bool
    async def delete_one(collection, filter_dict) -> bool
    async def aggregate(collection, pipeline) -> List[Dict]
```

**Current implementation**: `MongoDBDataDB` (`app/utils/mongodb_storage.py`)

**Benefits of this decision**:

- **Decoupling**: Business logic does not depend specifically on MongoDB
- **Interchangeability**: Can switch to PostgreSQL, Firestore, DynamoDB, etc., without modifying services
- **Testability**: Easy to create mocks for testing
- **Maintainability**: Changes in database implementation do not affect the rest of the code

#### 2.2.2 `FileDB` Protocol

The `FileDB` protocol defines an interface for file storage:

```python
class FileDB(ABC):
    async def upload_file(file_content, file_name, content_type, folder) -> str
    async def delete_file(file_url) -> bool
    async def get_file_url(file_path) -> str
```

**Current implementation**: `S3FileDB` (`app/utils/s3_storage.py`)

**Benefits**:

- **Flexibility**: Can switch to Google Cloud Storage, Azure Blob Storage, or local storage without touching business logic
- **Consistency**: Same interface regardless of provider
- **Scalability**: Easy to migrate to another service if S3 does not meet requirements

#### 2.2.3 `Storage` Class

The `Storage` class (`app/utils/storage.py`) acts as a **facade** that combines both abstractions:

```python
class Storage:
    def __init__(self, file_db: FileDB, data_db: DataDB):
        self.file_db = file_db
        self.data_db = data_db
```

**Design decision**: This class centralizes access to both storage systems, simplifying dependency injection in services.

### 2.3 Database Design

#### 2.3.1 MongoDB Collections

The `urbanspot` database contains the following collections:

##### **Collection: `users`**

```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique)",
  "hashed_password": "string",
  "poi_score": "int (default: 0)",
  "photo_score": "int (default: 0)",
  "total_score": "int (default: 0)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Recommended indexes**:

- `email`: unique
- `total_score`: for efficient ranking

##### **Collection: `pois`**

```json
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "latitude": "float (-90 to 90)",
  "longitude": "float (-180 to 180)",
  "tags": ["string"],
  "image_url": "string (S3 URL)",
  "author_id": "string (ref users._id)",
  "rating_count": "int (default: 0)",
  "average_rating": "float (0-10, default: 0.0)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Recommended indexes**:

- `author_id`: for searches by author
- `tags`: for filtering by tags
- `{latitude, longitude}`: geospatial index for proximity searches (future)

##### **Collection: `photos`**

```json
{
  "_id": "ObjectId",
  "poi_id": "string (ref pois._id)",
  "author_id": "string (ref users._id)",
  "image_url": "string (S3 URL)",
  "description": "string (optional)",
  "rating_count": "int (default: 0)",
  "average_rating": "float (0-10, default: 0.0)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Recommended indexes**:

- `poi_id`: to get photos of a POI
- `author_id`: for user statistics

##### **Collection: `ratings`**

```json
{
  "_id": "ObjectId",
  "user_id": "string (ref users._id)",
  "target_type": "string ('poi' | 'photo')",
  "target_id": "string (ref pois._id or photos._id)",
  "score": "int (0-10)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Recommended indexes**:

- `{target_type, target_id}`: compound, to get ratings of an element
- `{user_id, target_type, target_id}`: unique compound, to avoid duplicates

#### 2.3.2 Database Design Decisions

1. **NoSQL over SQL**: MongoDB allows schema flexibility and horizontal scalability without complex migrations.

2. **ID References**: IDs are stored as strings instead of ObjectId references to simplify JSON serialization.

3. **Controlled Denormalization**: `rating_count` and `average_rating` are stored in POIs and photos to avoid expensive calculations on each query.

4. **Automatic Timestamps**: `created_at` and `updated_at` are automatically managed in the `DataDB` protocol.

### 2.4 Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Configuration with Pydantic Settings
│   ├── models/              # Pydantic models
│   │   ├── user.py
│   │   ├── poi.py
│   │   ├── photo.py
│   │   └── rating.py
│   ├── routes/              # API endpoints
│   │   ├── users.py
│   │   ├── pois.py
│   │   ├── photos.py
│   │   └── ratings.py
│   ├── services/            # Business logic
│   │   ├── user_service.py
│   │   ├── poi_service.py
│   │   ├── photo_service.py
│   │   ├── rating_service.py
│   │   └── gamification.py
│   └── utils/               # Utilities and abstractions
│       ├── protocols.py     # DataDB and FileDB protocols
│       ├── storage.py       # Storage class
│       ├── mongodb_storage.py
│       ├── s3_storage.py
│       ├── dependencies.py
│       ├── auth.py
│       └── security.py
├── pyproject.toml           # Dependencies and configuration
└── README.md
```

---

## 3. Implemented Functionality

### 3.1 User Management

#### 3.1.1 User Creation (`POST /users/`)

- **Purpose**: Register new users in the system
- **Validations**:
  - Unique email
  - Password minimum 6 characters
  - Password maximum 72 bytes (bcrypt limitation)
  - Valid email (Pydantic validation)
- **Process**:
  1. Validate input data
  2. Verify email does not exist
  3. Hash password with bcrypt
  4. Create user with scores initialized to 0
  5. Return user (without password)

#### 3.1.2 Authentication (`POST /users/authenticate`)

- **Purpose**: Verify credentials and obtain user information
- **Process**:
  1. Search user by email
  2. Verify password with bcrypt
  3. Return user if valid, 401 if not

#### 3.1.3 Get User (`GET /users/{user_id}`)

- **Purpose**: Obtain basic information of a user
- **Usage**: To display profiles, POI author, etc.

#### 3.1.4 User Profile (`GET /users/{user_id}/profile`)

- **Purpose**: Obtain complete profile with contribution statistics
- **Additional information**:
  - Number of POIs created
  - Number of photos uploaded
  - Number of ratings given
  - Scores by category

#### 3.1.5 Global Ranking (`GET /users/ranking/global`)

- **Purpose**: Obtain user ranking ordered by `total_score`
- **Parameters**:
  - `limit`: Maximum number of users (1-1000, default: 100)
- **Usage**: Leaderboard for gamification

### 3.2 POI Management (Points of Interest)

#### 3.2.1 Create POI (`POST /pois/`)

- **Purpose**: Create a new point of interest
- **Parameters**:
  - `name`: POI name
  - `description`: Description
  - `latitude`: Latitude (-90 to 90)
  - `longitude`: Longitude (-180 to 180)
  - `author_id`: Creator user ID
  - `tags`: Tags separated by commas (optional)
  - `image`: Image file (multipart/form-data)
- **Process**:
  1. Validate geographic coordinates
  2. Upload image to S3 (`pois/` folder)
  3. Get image URL
  4. Create POI in MongoDB
  5. **Award 20 points** to the author (gamification)
  6. Return created POI

#### 3.2.2 List POIs (`GET /pois/`)

- **Purpose**: Obtain list of POIs with pagination and filtering
- **Parameters**:
  - `skip`: Number of records to skip (pagination)
  - `limit`: Maximum records (1-1000, default: 100)
  - `tags`: Filter by tags (comma-separated)
- **Order**: By creation date (newest first)

#### 3.2.3 Get POI (`GET /pois/{poi_id}`)

- **Purpose**: Obtain complete details of a POI
- **Additional information**:
  - Author name
  - Number of associated photos

#### 3.2.4 Update POI (`PUT /pois/{poi_id}`)

- **Purpose**: Modify information of an existing POI
- **Updatable fields**: name, description, tags, latitude, longitude
- **Note**: Main image cannot be changed (would require new endpoint)

#### 3.2.5 Delete POI (`DELETE /pois/{poi_id}`)

- **Purpose**: Delete a POI and its associated resources
- **Process**:
  1. Delete all associated photos (from DB and S3)
  2. Delete main POI image (from S3)
  3. Delete POI from database
  4. **Note**: Ratings are maintained (for historical statistics)

### 3.3 Photo Management

#### 3.3.1 Upload Photo (`POST /photos/`)

- **Purpose**: Add a new photograph to an existing POI
- **Parameters**:
  - `poi_id`: POI ID
  - `author_id`: User ID
  - `description`: Optional description
  - `image`: Image file
- **Process**:
  1. Verify POI exists
  2. Upload image to S3 (`photos/` folder)
  3. Create photo record in MongoDB
  4. **Award 5 points** to the author (gamification)
  5. Return created photo

#### 3.3.2 Get Photos of a POI (`GET /photos/poi/{poi_id}`)

- **Purpose**: Obtain all photos associated with a POI
- **Usage**: Display photo gallery in the frontend

#### 3.3.3 Get Photo (`GET /photos/{photo_id}`)

- **Purpose**: Obtain details of a specific photo
- **Information**: Includes rating statistics

#### 3.3.4 Delete Photo (`DELETE /photos/{photo_id}`)

- **Purpose**: Delete a photo
- **Process**:
  1. Delete file from S3
  2. Delete record from database

### 3.4 Rating System

#### 3.4.1 Create Rating (`POST /ratings/`)

- **Purpose**: Rate a POI or a photo
- **Validations**:
  - User cannot rate their own contributions
  - User cannot rate the same element twice
  - Score between 0 and 10
- **Process**:
  1. Verify element (POI/photo) exists
  2. Verify user is not the author
  3. Verify no previous rating exists
  4. Create rating
  5. Recalculate `rating_count` and `average_rating` of the element
  6. **Award 1 point** to the user who rates
  7. **Check bonus**: If `average_rating > 7`, award 10 additional points to the author

#### 3.4.2 Get Rating (`GET /ratings/{rating_id}`)

- **Purpose**: Obtain information of a specific rating

#### 3.4.3 Delete Rating (`DELETE /ratings/{rating_id}`)

- **Purpose**: Delete a rating
- **Process**:
  1. Delete rating
  2. Recalculate statistics of the rated element

### 3.5 Gamification System

The `GamificationService` manages point assignment:

- **Create POI**: +20 points (`poi_score`)
- **POI with rating > 7**: +10 additional points (`poi_score`)
- **Upload photo**: +5 points (`photo_score`)
- **Photo with rating > 7**: +10 additional points (`photo_score`)
- **Give rating**: +1 point (not accumulated in subtotals, only in `total_score`)

**Design decision**: Points are updated asynchronously after each action, maintaining real-time consistency.

---

## 4. Developed API Description

### 4.1 API Endpoints

#### **Base URL**: `http://localhost:8000` (development) or according to deployment

#### 4.1.1 User Endpoints (`/users`)

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|---------------|
| POST | `/users/` | Create new user | API Key |
| POST | `/users/authenticate` | Authenticate user | API Key |
| GET | `/users/{user_id}` | Get user | API Key |
| GET | `/users/{user_id}/profile` | Get complete profile | API Key |
| GET | `/users/ranking/global` | User ranking | API Key |

#### 4.1.2 POI Endpoints (`/pois`)

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|---------------|
| POST | `/pois/` | Create POI (with image) | API Key |
| GET | `/pois/` | List POIs (with filters) | API Key |
| GET | `/pois/{poi_id}` | Get detailed POI | API Key |
| PUT | `/pois/{poi_id}` | Update POI | API Key |
| DELETE | `/pois/{poi_id}` | Delete POI | API Key |

#### 4.1.3 Photo Endpoints (`/photos`)

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|---------------|
| POST | `/photos/` | Upload photo to a POI | API Key |
| GET | `/photos/poi/{poi_id}` | Get photos of a POI | API Key |
| GET | `/photos/{photo_id}` | Get detailed photo | API Key |
| DELETE | `/photos/{photo_id}` | Delete photo | API Key |

#### 4.1.4 Rating Endpoints (`/ratings`)

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|---------------|
| POST | `/ratings/` | Create rating | API Key |
| GET | `/ratings/{rating_id}` | Get rating | API Key |
| DELETE | `/ratings/{rating_id}` | Delete rating | API Key |

#### 4.1.5 General Endpoints

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|---------------|
| GET | `/` | API information | No |
| GET | `/health` | Health check | No |
| GET | `/docs` | Swagger documentation | No |
| GET | `/redoc` | ReDoc documentation | No |

### 4.2 Authentication

All endpoints (except `/`, `/health`, `/docs`, `/redoc`) require authentication via **API Key**.

**Required header**:

```
X-API-Key: your-api-key-here
```

**Configuration**: The API Key is defined in the `API_KEY` environment variable.

### 4.3 Interactive Documentation

FastAPI automatically generates interactive documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

### 4.4 External API URLs Used

#### 4.4.1 MongoDB Atlas

- **Connection URL**: Configured via `MONGODB_URI` environment variable
- **Format**: `mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`
- **Documentation**: <https://www.mongodb.com/docs/atlas/>

#### 4.4.2 AWS S3

- **Storage endpoint**: `https://{bucket-name}.s3.{region}.amazonaws.com/{key}`
- **Configurable region**: Default `us-east-1`
- **Documentation**: <https://docs.aws.amazon.com/s3/>

**Note**: No additional external REST APIs are used. The system is self-contained except for storage services.

---

## 5. Installation and Deployment Instructions

### 5.1 Prerequisites

- **Docker** and **Docker Compose** installed
- Account on **MongoDB Atlas** (free tier available)
- Account on **AWS** with S3 access (or compatible storage service)
- Environment variables configured

### 5.2 MongoDB Atlas Configuration

The MongoDB Atlas configuration process involves:

1. Creating an account on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Creating a cluster (free tier available)
3. Creating a database user
4. Configuring IP whitelist (0.0.0.0/0 for development, specific IP for production)
5. Obtaining the connection string:

   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```

### 5.3 AWS S3 Configuration

The AWS S3 configuration process involves:

1. Creating an AWS account (if not available)
2. Creating an S3 bucket:
   - Globally unique name
   - Preferred region (e.g., `us-east-1`)
   - Configure public access permissions if required
3. Creating an IAM user with S3 permissions:
   - Policy: `AmazonS3FullAccess` (or more restrictive permissions)
   - Obtain Access Key ID and Secret Access Key

### 5.4 Local Configuration

1. **Clone or download the project**

2. **Create `.env` file in the project root**:

   ```env
   # App Configuration
   LOG_LEVEL=INFO
   SECRET_KEY=your-very-secure-secret-key-here
   API_KEY=your-api-key-for-authentication

   # MongoDB Atlas Configuration
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/urbanspot?retryWrites=true&w=majority
   MONGODB_DATABASE=urbanspot

   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your-access-key-id
   AWS_SECRET_ACCESS_KEY=your-secret-access-key
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=your-bucket-name
   ```

3. **Build and run with Docker Compose**:

   ```bash
   # Build the image
   docker-compose build

   # Start the container
   docker-compose up -d

   # View logs
   docker-compose logs -f backend
   ```

4. **Verify it works**:
   - API: <http://localhost:8000>
   - Health check: <http://localhost:8000/health>
   - Documentation: <http://localhost:8000/docs>

---

## 6. Solution Limitations and Future Improvements

### 6.1 Current Limitations

#### 6.1.1 Authentication

- **Limitation**: Authentication system based solely on API Key
- **Impact**: No session management, JWT tokens, or complete OAuth 2.0
- **Risk**: If the API Key is compromised, all access is at risk

#### 6.1.2 File Validation

- **Limitation**: Real MIME type of images is not validated, only the header
- **Impact**: Possible upload of malicious files disguised as images
- **Risk**: Security and unnecessary storage

#### 6.1.3 File Size

- **Limitation**: No explicit file size limit
- **Impact**: Possible excessive S3 storage consumption
- **Risk**: High costs and performance issues

#### 6.1.4 Geographic Search

- **Limitation**: No proximity-based geographic search
- **Impact**: Cannot find POIs near a location
- **Risk**: Limited functionality for mobile application

#### 6.1.5 Pagination

- **Limitation**: Basic pagination with `skip` and `limit`
- **Impact**: Inefficient for large data volumes
- **Risk**: Degraded performance with many records

#### 6.1.6 Cache

- **Limitation**: No caching system implemented
- **Impact**: All queries go directly to MongoDB
- **Risk**: Latency and MongoDB Atlas costs

#### 6.1.7 Rate Limiting

- **Limitation**: No request limit per user/IP
- **Impact**: Vulnerable to brute force attacks or abuse
- **Risk**: Security and service availability

### 6.2 Future Improvements

#### 6.2.1 Authentication and Authorization

- [ ] Implement **complete OAuth 2.0** (Google, GitHub, etc.)
- [ ] Implement **JWT tokens** for sessions
- [ ] **Refresh token** system

#### 6.2.2 Validation and Security

- [ ] Real MIME type validation of files (magic bytes)
- [ ] File size limit (e.g., 10MB per image)
- [ ] **Image sanitization** (resize, compress)
- [ ] **Rate limiting** per user/IP
- [ ] **HTTPS** mandatory in production

#### 6.2.3 Search Features

- [ ] **Geographic search** by proximity (MongoDB 2dsphere indexes)
- [ ] **Full-text search** in names and descriptions
- [ ] **Advanced filters** (date range, rating range, etc.)
- [ ] **Cursor-based pagination** instead of skip/limit

#### 6.2.4 Performance and Scalability

- [ ] **Caching system** (Redis) for frequent queries
- [ ] **CDN** to serve images from S3
- [ ] **Optimized indexes** in MongoDB
- [ ] **Optimized connection pooling**
- [ ] **Response compression** (gzip)

#### 6.2.5 Monitoring and Observability

- [ ] **Structured logging** (JSON logs)
- [ ] **Metrics** (Prometheus, Grafana)
- [ ] **Distributed tracing** (OpenTelemetry)
- [ ] **Alerts** for errors and high latency
- [ ] **Advanced health checks** (verify DB, S3, etc.)

#### 6.2.6 Additional Features

- [ ] **Notifications** when a POI/photo receives a rating
- [ ] **Reporting system** for inappropriate content
- [ ] **Content moderation** (admin can delete/edit)
- [ ] **Change history** (audit)
- [ ] **Data export** (JSON, CSV)
- [ ] **Statistics API** (most rated POIs, most active users, etc.)

#### 6.2.7 Architecture

- [ ] **Job queue** (Celery, RQ) for asynchronous tasks
- [ ] **WebSockets** for real-time updates
- [ ] **Microservices** if the system grows (separate gamification, notifications, etc.)
- [ ] **Event sourcing** for complete audit

#### 6.2.8 Testing

- [ ] **Unit tests** for services
- [ ] **Integration tests** for endpoints
- [ ] **E2E tests** for complete flows
- [ ] **Code coverage** > 80%

---

## 7. Conclusions

The UrbanSpot backend has been developed following **solid design principles**, especially through the use of **protocols (interfaces)** that allow changing database and storage implementations without affecting business logic. This architecture facilitates:

- **Maintainability**: Code organized in clear layers
- **Scalability**: Easy to migrate to other cloud services
- **Testability**: Interfaces allow simple mocks
- **Extensibility**: New features integrate easily

The current solution covers all basic requirements of the case study, with a functional gamification system, complete management of POIs, photos and ratings, and a well-documented REST API. The proposed future improvements would allow taking the system to an enterprise production level.
