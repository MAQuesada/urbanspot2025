# UrbanSpot Backend

Backend API for UrbanSpot - Collaborative urban POI (Points of Interest) discovery platform.

## Technologies

- **FastAPI**: Modern and fast web framework for building APIs
- **Pydantic**: Data validation and configuration
- **Motor**: Async driver for MongoDB
- **Boto3**: AWS SDK for S3
- **aiohttp**: Async HTTP client for ImgBB API
- **bcrypt**: Password hashing library
- **UV**: Dependency and virtual environment manager

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Application entry point
│   ├── config.py               # Configuration with Pydantic Settings
│   ├── models/                 # Pydantic models
│   │   ├── user.py
│   │   ├── poi.py
│   │   ├── photo.py
│   │   └── rating.py
│   ├── routes/                 # API endpoints
│   │   ├── users.py
│   │   ├── pois.py
│   │   ├── photos.py
│   │   └── ratings.py
│   ├── services/               # Business logic
│   │   ├── user_service.py
│   │   ├── poi_service.py
│   │   ├── photo_service.py
│   │   ├── rating_service.py
│   │   └── gamification.py
│   └── utils/                  # Utilities
│       ├── protocols.py         # FileDB and DataDB protocols
│       ├── s3_storage.py        # S3 implementation
│       ├── imgbb_storage.py     # ImgBB implementation
│       ├── mongodb_storage.py   # MongoDB implementation
│       ├── dynamodb_storage.py  # DynamoDB implementation
│       ├── storage.py           # Storage class
│       ├── dependencies.py      # FastAPI dependencies
│       ├── auth.py              # API Key authentication
│       └── security.py          # Password hashing utilities
├── pyproject.toml              # Project configuration and dependencies
├── .env.example                # Environment variables example
└── README.md
```

## Installation

### Prerequisites

- Python 3.11 or higher
- UV installed (`pip install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`)

### Steps

1. **Create virtual environment with UV:**
   ```bash
   cd backend
   uv venv
   ```

2. **Activate the virtual environment:**
   ```bash
   # On macOS/Linux:
   source .venv/bin/activate
   
   # On Windows:
   .venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   uv pip install -e .
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your credentials:
   - MongoDB Atlas URI (or DynamoDB configuration)
   - File storage configuration (S3 or ImgBB)
   - API Key for authentication

## Configuration

### Environment Variables

Create a `.env` file in the backend root with the following variables:

```env
# App Configuration
LOG_LEVEL=INFO
SECRET_KEY=your-secret-key-here
API_KEY=your-api-key-here

# Database Configuration
DATABASE_TYPE=mongodb  # Options: "mongodb" or "dynamodb"

# MongoDB Atlas Configuration (if DATABASE_TYPE=mongodb)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
MONGODB_DATABASE=urbanspot

# DynamoDB Configuration (if DATABASE_TYPE=dynamodb)
DYNAMODB_TABLE_PREFIX=urbanspot
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key

# File Storage Configuration
FILE_STORAGE_TYPE=s3  # Options: "s3" or "imgbb"

# AWS S3 Configuration (if FILE_STORAGE_TYPE=s3)
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# ImgBB Configuration (if FILE_STORAGE_TYPE=imgbb)
IMGBB_API_KEY=your-imgbb-api-key
```

## Running the Application

### Development

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

Interactive documentation (Swagger): `http://localhost:8000/docs`
Alternative documentation (ReDoc): `http://localhost:8000/redoc`

## API Security

### API Key Authentication

All API endpoints are protected using **API Key authentication**. To access any endpoint, you must include the API key in the request headers:

```
X-API-Key: your-api-key-here
```

The API key is configured in the `.env` file as `API_KEY`. If the API key is missing or invalid, the API will return a `401 Unauthorized` error.

**Security Best Practices:**
- Keep your API key secret and never commit it to version control
- Use different API keys for development and production environments
- Rotate API keys periodically
- Use HTTPS in production to protect the API key in transit

## User Management & Credentials

### User Registration

Users are created with the following information:
- **Name**: User's full name
- **Email**: Valid email address (validated using Pydantic's `EmailStr`)
- **Password**: Plain text password (minimum 6 characters, maximum 72 bytes)

### Password Security

User passwords are securely managed using the following approach:

1. **Password Hashing**: Passwords are hashed using **bcrypt** before being stored in the database. The original password is never stored.

2. **Password Validation**:
   - Minimum length: 6 characters
   - Maximum length: 72 bytes (bcrypt limitation)
   - Passwords are validated before hashing to ensure they meet requirements

3. **Password Storage**: Only the bcrypt hash is stored in the database in the `hashed_password` field. The plain text password is never persisted.

4. **Password Verification**: When authenticating, the provided password is hashed and compared against the stored hash using bcrypt's secure comparison function.

**Security Features:**
- Passwords are automatically salted by bcrypt
- Each password hash is unique, even for identical passwords
- The hashing process is computationally expensive, making brute-force attacks difficult
- Passwords are never returned in API responses

### User Authentication Flow

1. **Registration**: `POST /users/` - Creates a new user with email and password
2. **Authentication**: `POST /users/authenticate` - Validates email/password and returns the user object if credentials are valid

The authentication endpoint does not return tokens or sessions. It simply validates credentials and returns the user data. Session management should be handled by the frontend application.

## API Endpoints

### Users

- `POST /users/` - Create a new user (requires: name, email, password)
- `POST /users/authenticate` - Authenticate user with email and password
- `GET /users/{user_id}` - Get user by ID
- `GET /users/{user_id}/profile` - Get user profile with contribution statistics
- `GET /users/ranking/global` - Get global user ranking by total score

### POIs (Points of Interest)

- `POST /pois/` - Create a POI (requires: name, description, latitude, longitude, author_id, image)
- `GET /pois/` - List all POIs (supports pagination and tag filtering)
- `GET /pois/{poi_id}` - Get POI by ID with details
- `PUT /pois/{poi_id}` - Update a POI
- `DELETE /pois/{poi_id}` - Delete a POI and associated photos

### Photos

- `POST /photos/` - Upload a photo to a POI (requires: poi_id, author_id, image)
- `GET /photos/poi/{poi_id}` - Get all photos for a specific POI
- `GET /photos/{photo_id}` - Get photo by ID with details
- `DELETE /photos/{photo_id}` - Delete a photo

### Ratings

- `POST /ratings/` - Create a rating for a POI or photo (requires: user_id, target_type, target_id, score)
- `GET /ratings/{rating_id}` - Get rating by ID
- `DELETE /ratings/{rating_id}` - Delete a rating

## Gamification System

The system automatically awards points based on user actions:

- **Create POI**: +20 points
- **POI with average rating > 7**: +10 bonus points
- **Upload photo**: +5 points
- **Photo with average rating > 7**: +10 bonus points
- **Rate content**: +1 point

Points are automatically calculated and updated in the user's profile. The system tracks separate scores for POI contributions and photo contributions, as well as a total score.

## Architecture

### Protocols

The system uses protocols (ABC) to abstract storage operations:

- **FileDB**: Protocol for file storage operations
  - **S3 Implementation**: AWS S3 for production-grade file storage
  - **ImgBB Implementation**: ImgBB API for easy image hosting (simpler setup, no AWS account needed)
- **DataDB**: Protocol for database operations
  - **MongoDB Implementation**: MongoDB Atlas for flexible document storage
  - **DynamoDB Implementation**: Amazon DynamoDB for serverless NoSQL database

### Storage

The `Storage` class receives instances of both protocols and manages:
- File storage (images) - configurable via `FILE_STORAGE_TYPE` environment variable
- Database operations - configurable via `DATABASE_TYPE` environment variable

You can mix and match implementations (e.g., S3 for files + MongoDB for data, or ImgBB for files + DynamoDB for data).

### Services

Each service encapsulates business logic:
- Data validation
- Score calculations (ratings, rankings)
- Gamification integration
- Relationship management between entities

## Development

### Code Formatting

The project uses `black` and `ruff` for code formatting and linting:

```bash
# Format code
black app/

# Linting
ruff check app/
```

## Notes

- All endpoints require API Key authentication via the `X-API-Key` header
- User passwords are hashed using bcrypt before storage
- Images are stored in S3 or ImgBB (configurable via `FILE_STORAGE_TYPE`) and URLs are saved in the database
- The system automatically calculates average ratings and updates user points
- User IDs must be provided explicitly in creation endpoints (author_id, user_id)
- Email addresses are validated using Pydantic's email validator

## File Storage Options

### AWS S3 (Default)

S3 is the default file storage option, suitable for production environments. It requires:
- AWS account
- S3 bucket created
- IAM credentials with S3 permissions

### ImgBB

ImgBB is an alternative file storage option that is **extremely easy to use** for image hosting. It's ideal for:
- Development and testing
- Quick prototyping
- Projects that don't require AWS infrastructure

**Advantages of ImgBB:**
- No AWS account needed
- Simple API - just upload and get a URL
- Free tier available
- Automatic image optimization
- CDN included

**Getting an ImgBB API Key:**
1. Visit https://api.imgbb.com/
2. Sign up for a free account
3. Get your API key from the dashboard
4. Set `FILE_STORAGE_TYPE=imgbb` and `IMGBB_API_KEY=your-key` in your `.env` file

**Note**: ImgBB does not support programmatic deletion via API. Images uploaded to ImgBB will remain until manually deleted through the web interface.
