"""Application settings and configuration."""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "VendorPulse"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite:///./vendorpulse.db"

    # LLM Settings (for Phase 2+)
    LLM_PROVIDER: str = "groq"
    GROQ_API_KEY: str = ""
    LLM_MODEL: str = "openai/gpt-oss-120b"

    # Hindsight Settings (for Phase 2+)
    HINDSIGHT_API_KEY: str = ""
    HINDSIGHT_API_URL: str = "https://api.hindsight.ai"
    HINDSIGHT_MOCK_MODE: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
