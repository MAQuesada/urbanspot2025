"""
Main application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import users, pois, photos, ratings
from app.utils.dependencies import startup_storage, shutdown_storage

app = FastAPI(
    title="UrbanSpot API",
    description="API for UrbanSpot - Collaborative urban POI discovery platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router)
app.include_router(pois.router)
app.include_router(photos.router)
app.include_router(ratings.router)


@app.on_event("startup")
async def startup():
    """Initialize services on application startup"""
    await startup_storage()


@app.on_event("shutdown")
async def shutdown():
    """Cleanup on application shutdown"""
    await shutdown_storage()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "UrbanSpot API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
