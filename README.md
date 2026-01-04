# UrbanSpot

Collaborative urban POI (Points of Interest) discovery platform with gamification features.

## Overview

UrbanSpot is a full-stack web application that allows users to discover, create, and rate Points of Interest (POIs) in urban areas. The platform includes a gamification system that rewards users for their contributions through a scoring mechanism.

### Key Features

- **User Management**: Registration, authentication, and user profiles
- **POI Management**: Create, view, edit, and delete Points of Interest
- **Photo Gallery**: Upload and manage photos for each POI
- **Rating System**: Rate POIs and photos on a 0-10 scale
- **Interactive Map**: Leaflet-based map showing all POIs with custom markers
- **Gamification**: Point system rewarding user contributions
- **Global Ranking**: Leaderboard showing top users by total score
- **User Profiles**: Detailed statistics of user contributions

## Project Structure

```
.
├── backend/              # FastAPI backend API
│   ├── app/
│   │   ├── models/      # Pydantic models
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utilities and abstractions
│   └── pyproject.toml   # Dependencies
├── frontend/            # Angular frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/  # Angular components
│   │   │   ├── services/     # API and auth services
│   │   │   └── models/       # TypeScript interfaces
│   │   └── assets/
│   ├── Dockerfile
│   └── package.json
├── Dockerfile           # Backend Docker image
├── docker-compose.yml   # Docker Compose configuration
└── README.md
```

## Technology Stack

### Backend

- **Python 3.11**: Main programming language
- **FastAPI 0.104+**: Modern, high-performance web framework
- **Uvicorn**: ASGI server
- **MongoDB Atlas**: Cloud NoSQL database
- **Motor 3.3+**: Asynchronous MongoDB driver
- **AWS S3**: Object storage for images
- **Pydantic 2.5+**: Data validation and serialization
- **Passlib with bcrypt**: Secure password hashing
- **UV**: Modern Python package manager

### Frontend

- **TypeScript 5.2+**: Main programming language
- **Angular 17.0+**: Modern web framework for SPAs
- **RxJS 7.8+**: Reactive programming library
- **Leaflet 1.9.4**: Interactive maps library
- **Nginx**: Web server for production

### Infrastructure

- **Docker**: Containerization
- **Docker Compose**: Service orchestration

## Architecture

The application follows a layered architecture with clear separation of responsibilities:

### Backend Architecture

```
FastAPI Application (Routes, Middleware)
         ↓
Service Layer (Business Logic, Gamification)
         ↓
Storage Abstraction Layer (Protocols: DataDB, FileDB)
         ↓
    ┌────┴────┐
    │         │
MongoDB    AWS S3
```

### Frontend Architecture

```
Angular Application (Components, Routing)
         ↓
Service Layer (ApiService, AuthService)
         ↓
HTTP Client (RxJS Observables)
         ↓
Backend API (FastAPI)
```

### Design Patterns

- **Protocol-based Abstraction**: The backend uses abstract protocols (`DataDB`, `FileDB`) to allow switching between different storage implementations (MongoDB/DynamoDB, S3/local storage) without changing business logic
- **Service-Oriented**: Frontend uses centralized services for API communication and state management
- **Component-Based**: Frontend follows Angular's component architecture with lazy loading

## Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable | Description |
|----------|-------------|
| `API_KEY` | API key for backend authentication |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DATABASE` | Database name |
| `AWS_ACCESS_KEY_ID` | AWS access key for S3 |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for S3 |
| `S3_BUCKET_NAME` | S3 bucket name |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level | `INFO` |
| `API_URL` | Backend API URL for frontend | `http://localhost:8000` |
| `BACKEND_PORT` | Backend port | `8000` |
| `FRONTEND_PORT` | Frontend port | `3000` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `RESTART_POLICY` | Container restart policy | `unless-stopped` |

### Database Selection

The backend supports multiple database implementations:

- **MongoDB** (default): Set `DATABASE_TYPE=mongodb` or omit
- **DynamoDB**: Set `DATABASE_TYPE=dynamodb` and configure AWS credentials

For DynamoDB, additional configuration is required. See [MEMORIA_TECNICA_AWS.md](MEMORIA_TECNICA_AWS.md) for details.

## Quick Start with Docker

### Prerequisites

- Docker and Docker Compose installed
- MongoDB Atlas account (free tier available)
- AWS account with S3 bucket (or configure for local storage)
- `.env` file configured (see Environment Variables section above)

### Setup Steps

1. **Clone the repository:**

   ```bash
   git clone https://github.com/MAQuesada/urbanspot_cloud2025.git
   cd practica
   ```

2. **Create `.env` file** in the project root (see Environment Variables section for template)

3. **Build and start containers:**

   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. **Access the application:**
   - Frontend: <http://localhost:3000>
   - Backend API: <http://localhost:8000>
   - Swagger Docs: <http://localhost:8000/docs>
   - Health Check: <http://localhost:8000/health>

For production, set `RESTART_POLICY=always` in your `.env` file or run:

```bash
RESTART_POLICY=always docker-compose up -d
```

## Development Without Docker

### Backend

See [backend/README.md](backend/README.md) for detailed instructions.

**Quick start:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload
```

### Frontend

See [frontend/README.md](frontend/README.md) for detailed instructions.

**Quick start:**

```bash
cd frontend
npm install
npm start
```

The frontend will be available at <http://localhost:4200>

## API Documentation

The backend provides automatic interactive API documentation:

- **Swagger UI**: <http://localhost:8000/docs>
- **ReDoc**: <http://localhost:8000/redoc>
- **OpenAPI Schema**: <http://localhost:8000/openapi.json>

### Authentication

All endpoints (except `/`, `/health`, `/docs`, `/redoc`) require authentication via API Key:

```
X-API-Key: your-api-key-here
```

### Main Endpoints

- **Users**: `/users/` - User management and authentication
- **POIs**: `/pois/` - Points of Interest CRUD operations
- **Photos**: `/photos/` - Photo management
- **Ratings**: `/ratings/` - Rating system
- **Health**: `/health` - Health check endpoint

## Gamification System

The platform includes a point-based gamification system:

- **Create POI**: +20 points (`poi_score`)
- **POI with rating > 7**: +10 additional points (`poi_score`)
- **Upload photo**: +5 points (`photo_score`)
- **Photo with rating > 7**: +10 additional points (`photo_score`)
- **Give rating**: +1 point (`total_score` only)

Points are updated automatically after each action, maintaining real-time consistency.

## Production

### Production Deployment on AWS

For production deployment, the application is designed to run on **Amazon Web Services (AWS)** using a containerized architecture. However, due to **AWS Free Tier limitations**, a complete production setup with custom domains is not possible.

#### Why Vercel Cannot Be Used

**Vercel** is designed for:

- Static frontend applications and SPAs (React, Vue, Angular)
- Serverless API functions (`/api/*` routes)
- Framework-based applications (Next.js, Nuxt, SvelteKit)

However, this project requires:

- A **persistent backend server** running 24/7 (FastAPI with Uvicorn)
- **Container-based deployment** with full control over the runtime environment
- **Long-running processes** that cannot be handled by serverless functions

Vercel's serverless model is not suitable for applications that need continuous server execution, making AWS ECS Fargate the appropriate choice for this containerized backend architecture.

#### Production Architecture Flow

The production deployment uses the following AWS services:

```
User Request
    ↓
Application Load Balancer (ALB)
    ↓
ECS Fargate (Container Execution)
    ↑
ECR (Docker Image Registry)
```

**Services involved:**

1. **ECR (Elastic Container Registry)**: Stores Docker images for backend and frontend
2. **ECS Fargate**: Executes containers without managing EC2 instances
3. **ALB (Application Load Balancer)**: Routes traffic to containers and provides public DNS
4. **CloudWatch**: Monitors logs and metrics

#### Why This Architecture?

- **Serverless containers**: ECS Fargate eliminates server management overhead
- **Automatic scaling**: Containers scale based on demand
- **High availability**: ALB distributes traffic across multiple container instances
- **Cost-effective**: Pay only for resources used (CPU/RAM)
- **Managed infrastructure**: AWS handles infrastructure maintenance

For detailed deployment instructions, see [MEMORIA_TECNICA_AWS.md](MEMORIA_TECNICA_AWS.md).

## Project Documentation

For detailed technical documentation, see:

- **[MEMORIA_TECNICA_BACKEND.md](MEMORIA_TECNICA_BACKEND.md)**: Complete backend documentation
- **[MEMORIA_TECNICA_FRONTEND.md](MEMORIA_TECNICA_FRONTEND.md)**: Complete frontend documentation
- **[MEMORIA_TECNICA_AWS.md](MEMORIA_TECNICA_AWS.md)**: AWS deployment documentation (includes DynamoDB configuration)

## License

This project is part of a university assignment at the University of Málaga for the course "Desarrollo de Aplicaciones en la Nube".
