from fastapi import APIRouter

from app.services.cricket_api import CricketAPIError, cricket_api


router = APIRouter(
    prefix="/api/cricket",
    tags=["Cricket"],
)


@router.get("/live")
async def live_matches():
    try:
        data = await cricket_api.get_live_scores()

        return {
            "success": True,
            "provider": "sportmonks",
            "data": data,
        }

    except CricketAPIError as exc:
        return {
            "success": False,
            "provider": "sportmonks",
            "error": str(exc),
            "data": [],
        }


@router.get("/today")
async def today_matches():
    try:
        data = await cricket_api.get_today_scores()

        return {
            "success": True,
            "provider": "sportmonks",
            "data": data,
        }

    except CricketAPIError as exc:
        return {
            "success": False,
            "provider": "sportmonks",
            "error": str(exc),
            "data": [],
        }