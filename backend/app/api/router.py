"""Master API router."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import vendors, requests, decisions, outcomes
from app.db.session import get_db
from app.services.seed_service import seed_database_from_processed_data

api_router = APIRouter()

api_router.include_router(vendors.router)
api_router.include_router(requests.router)
api_router.include_router(decisions.router)
api_router.include_router(outcomes.router)


@api_router.post("/seed", tags=["Database Seed"])
def seed_database(db: Session = Depends(get_db)):
    """Triggers seeding of Phase 0 processed datasets into SQLite database."""
    return seed_database_from_processed_data(db)
