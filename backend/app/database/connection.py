from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.models_base import Base


class Settings(BaseSettings):
    app_name: str = "CRICMASTER"
    app_env: str = "development"
    database_url: str = "sqlite:///./cricmaster.db"
    cricketdata_api_key: str = ""
    frontend_url: str = "http://127.0.0.1:5500"
    firebase_credentials_path: str = "secrets/firebase-service-account.json"
    cricmaster_news_rss_url: str = ""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()


connect_args = {}

if settings.database_url.startswith("sqlite"):
    connect_args = {
        "check_same_thread": False,
    }


engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
)


SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()