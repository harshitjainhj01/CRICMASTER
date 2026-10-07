from fastapi import APIRouter

from app.services.cricket_api import (
    CricketDataAPIError,
    cricket_data,
)

router = APIRouter(
    prefix="/api/cricket",
    tags=["Cricket"],
)


def get_matches(payload: dict) -> list[dict]:
    data = payload.get("data", [])

    if isinstance(data, list):
        return data

    return []


def is_live(match: dict) -> bool:
    return bool(
        match.get("matchStarted")
        and not match.get("matchEnded")
    )


@router.get("/current")
async def current_matches():
    try:
        payload = await cricket_data.get_current_matches()

        matches = get_matches(payload)

        return {
            "success": True,
            "provider": "cricketdata",
            "count": len(matches),
            "cached": payload.get("_cached", False),
            "data": matches,
            "info": payload.get("info", {}),
        }

    except CricketDataAPIError as exc:
        return {
            "success": False,
            "provider": "cricketdata",
            "error": str(exc),
            "data": [],
        }


@router.get("/live")
async def live_matches():
    try:
        payload = await cricket_data.get_current_matches()

        matches = [
            match
            for match in get_matches(payload)
            if is_live(match)
        ]

        return {
            "success": True,
            "provider": "cricketdata",
            "count": len(matches),
            "cached": payload.get("_cached", False),
            "data": matches,
            "info": payload.get("info", {}),
        }

    except CricketDataAPIError as exc:
        return {
            "success": False,
            "provider": "cricketdata",
            "error": str(exc),
            "data": [],
        }