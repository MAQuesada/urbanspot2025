# UrbanSpot

Collaborative urban POI (Points of Interest) discovery platform.

## Project Structure

```
.
├── backend/          # FastAPI backend API
├── frontend/         # Frontend application (to be added)
├── Dockerfile        # Backend Docker image
└── docker-compose.yml # Docker Compose configuration
```

## Quick Start with Docker

### Prerequisites

- Docker and Docker Compose installed
- Environment variables configured (see below)

### Development

1. **Copy environment file:**
   ```bash
   cp .env.docker.example .env
   ```

2. **Edit `.env` file** with your credentials:
   - MongoDB Atlas URI
   - AWS S3 credentials
   - API Key and Secret Key

3. **Build and start containers:**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. **Check logs:**
   ```bash
   docker-compose logs -f backend
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Swagger Docs: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

### Production

Use the same `docker-compose.yml` file with production settings:

1. **Edit `.env` file** with production credentials

2. **Start in production mode:**
   ```bash
   RESTART_POLICY=always docker-compose up -d
   ```

   The `RESTART_POLICY=always` ensures containers restart automatically on failure or server reboot.

   Alternatively, you can add `RESTART_POLICY=always` to your `.env` file.

## Docker Commands

### Build the image
```bash
docker-compose build
```

### Start containers
```bash
# Development (default)
docker-compose up -d

# Production (with restart policy)
RESTART_POLICY=always docker-compose up -d
```

### Stop containers
```bash
docker-compose down
```

### Restart containers
```bash
docker-compose restart
```

### View logs
```bash
# Follow logs for all services
docker-compose logs -f

# Follow logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# View last 100 lines
docker-compose logs --tail=100 backend
```

### Execute commands in container
```bash
docker-compose exec backend /bin/bash
```

### Remove containers and volumes
```bash
docker-compose down -v
```

### Rebuild and restart
```bash
docker-compose up -d --build
```

## Environment Variables

Required environment variables (set in `.env` file):

```env
# App Configuration
LOG_LEVEL=INFO
SECRET_KEY=your-secret-key-here
API_KEY=your-api-key-here

# API URL for frontend (use localhost since requests come from browser)
API_URL=http://localhost:8000

# Ports (optional)
BACKEND_PORT=8000
FRONTEND_PORT=3000

# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
MONGODB_DATABASE=urbanspot

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name
```

## Development Without Docker

### Backend
See [backend/README.md](backend/README.md) for instructions on running the backend locally without Docker.

### Frontend
See [frontend/README.md](frontend/README.md) for instructions on running the frontend locally without Docker.

## Architecture

- **Backend**: FastAPI application running on port 8000 (configurable via `BACKEND_PORT` env var)
- **Frontend**: Angular application running on port 3000 (configurable via `FRONTEND_PORT` env var)
- **Network**: Both services communicate via `urbanspot-network`

## Development vs Production

The same `docker-compose.yml` file is used for both development and production. The difference is controlled by environment variables:

- **Development**: Default restart policy is `unless-stopped`
- **Production**: Set `RESTART_POLICY=always` in your `.env` file or use `make prod`

You can also customize the port by setting `BACKEND_PORT` in your `.env` file.

## Health Checks

The backend includes a health check endpoint at `/health` that Docker uses to verify the service is running correctly.

## Troubleshooting

### Container won't start
- Check logs: `docker-compose logs backend`
- Verify environment variables are set correctly
- Ensure MongoDB and S3 credentials are valid

### Port already in use
- Change the port mapping in `docker-compose.yml`
- Or stop the service using the port: `lsof -ti:8000 | xargs kill`

### Build fails
- Ensure Docker has enough resources allocated
- Clear Docker cache: `docker system prune -a`

## Frontend Features

The Angular frontend includes:

- **User Authentication**: Login and registration with email/password
- **Interactive Map**: Leaflet-based map showing all POIs with markers
- **POI Management**: Create, view, and manage Points of Interest
- **Photo Gallery**: Upload and view photos for each POI
- **Rating System**: Rate POIs and photos (0-10 scale)
- **User Profiles**: View user statistics and contributions
- **Global Ranking**: See top users by total score
- **Gamification**: Visual display of user points and achievements

## Technology Stack

- **Backend**: FastAPI (Python), MongoDB Atlas, AWS S3
- **Frontend**: Angular 17, Leaflet (maps), nginx (production)
- **Containerization**: Docker & Docker Compose
- **Authentication**: API Key for backend, email/password for users

