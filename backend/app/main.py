
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.routes.auth import router as auth_router
from app.routes.cricket import router as cricket_router
from app.routes.matches import router as matches_router
from app.routes.extra import router as extra_router
from app.routes.onboarding import router as onboarding_router
from app.routes.ipl import router as ipl_router

from app.database.connection import Base, engine, settings
from app import models  # noqa: F401


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="CRICMASTER cricket application backend",
)


# Allow the local frontend development server to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Serve existing frontend folders.
if FRONTEND_DIR.exists():
    for folder in ("css", "js", "assets", "pages"):
        folder_path = FRONTEND_DIR / folder

        if folder_path.is_dir():
            app.mount(
                f"/{folder}",
                StaticFiles(directory=folder_path),
                name=folder,
            )


# Register API routers.
app.include_router(ipl_router)
app.include_router(auth_router)
app.include_router(onboarding_router)
app.include_router(cricket_router)
app.include_router(matches_router)
app.include_router(extra_router)


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
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/index.html")
async def frontend_index():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/styles.css")
async def frontend_styles():
    return FileResponse(FRONTEND_DIR / "styles.css", media_type="text/css")


@app.get("/app.js")
async def frontend_script():
    return FileResponse(FRONTEND_DIR / "app.js", media_type="application/javascript")


@app.get("/favicon.ico")
async def frontend_favicon():
    icon_path = FRONTEND_DIR / "favicon.ico"
    if icon_path.exists():
        return FileResponse(icon_path, media_type="image/x-icon")
    return FileResponse(FRONTEND_DIR / "assets" / "cricmaster-logo.png", media_type="image/png")
