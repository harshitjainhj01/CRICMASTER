from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.database.connection import Base, engine, settings
from app.routes.cricket import router as cricket_router

# Import all models so SQLAlchemy knows about every table.
from app import models  # noqa: F401


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="CRICMASTER cricket application backend",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if FRONTEND_DIR.exists():

    app.mount(
        "/css",
        StaticFiles(directory=FRONTEND_DIR / "css"),
        name="css",
    )

    app.mount(
        "/js",
        StaticFiles(directory=FRONTEND_DIR / "js"),
        name="js",
    )

    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIR / "assets"),
        name="assets",
    )


app.include_router(cricket_router)


@app.on_event("startup")
def startup():

    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
async def health():

    return {
        "success": True,
        "app": settings.app_name,
        "environment": settings.app_env,
        "status": "running",
    }


@app.get("/api/database/health")
async def database_health():

    try:

        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "success": True,
            "database": "connected",
        }

    except Exception as exc:

        return {
            "success": False,
            "database": "error",
            "error": str(exc),
        }


@app.get("/")
async def frontend():

    return FileResponse(
        FRONTEND_DIR / "index.html"
    )