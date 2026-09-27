"""VendorPulse FastAPI Application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.api.router import api_router
from app.services.seed_service import seed_database_from_processed_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # Auto-seed database if raw or processed datasets available
    try:
        with SessionLocal() as db:
            seed_database_from_processed_data(db)
    except Exception as err:
        print(f"Startup database seeding note: {err}")

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health Check"])
def root():
    """Health check endpoint."""
    return {"status": "ok", "app": settings.PROJECT_NAME, "version": "1.0.0"}
