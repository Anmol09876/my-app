import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Scientific Calculator API"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # CORS Settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # Frontend development server
        "http://localhost:5173",  # Vite development server
        "http://localhost:8000",  # Backend development server
        "http://127.0.0.1:3000",  # Frontend development server with IP
        "http://127.0.0.1:5173",  # Vite development server with IP
        "http://127.0.0.1:8000",  # Backend development server with IP
        "https://calculator.example.com",  # Production domain
    ]

    # Database Settings
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/calculator"
    )

    # JWT Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-for-jwt")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Math Engine Settings
    DEFAULT_PRECISION: int = 34
    MAX_PRECISION: int = 200
    CAS_TIMEOUT_SECONDS: int = 30

    # Export Settings
    EXPORT_DIR: str = "./exports"
    MAX_EXPORT_SIZE_MB: int = 10

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()