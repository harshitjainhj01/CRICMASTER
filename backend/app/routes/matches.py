from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Query

from app.services.cricket_api import (
    CricketDataAPIError,
    cricket_data,
)

router = APIRouter(
    prefix="/api/matches",
    tags=["Matches"],
)


def parse_match_date(match: dict) -> datetime | None:
    value = (
        match.get("dateTimeGMT")
        or match.get("date")
        or match.get("startTime")
    )

    if not value:
        return None

    try:
        value = str(value)

        if value.endswith("Z"):
            value = value[:-1] + "+00:00"

        parsed = datetime.fromisoformat(value)

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)

        return parsed

    except (ValueError, TypeError):
        return None


def is_match_live(match: dict) -> bool:
    return (
        match.get("matchStarted") is True
        and match.get("matchEnded") is not True
    )


def is_match_result(match: dict) -> bool:
    if match.get("matchEnded") is True:
        return True

    status = str(match.get("status", "")).lower()

    result_words = [
        "won",
        "drawn",
        "tie",
        "no result",
        "abandoned",
        "completed",
        "finished",
    ]

    return any(word in status for word in result_words)


def is_match_upcoming(match: dict) -> bool:
    if is_match_live(match) or is_match_result(match):
        return False

    match_date = parse_match_date(match)

    if match_date is None:
        return False

    return match_date > datetime.now(timezone.utc)


def classify_matches(
    matches: list[dict],
    view: str,
) -> list[dict]:

    if view == "upcoming":
        filtered = [
            match
            for match in matches
            if is_match_upcoming(match)
        ]

        filtered.sort(
            key=lambda match: (
                parse_match_date(match)
                or datetime.max.replace(tzinfo=timezone.utc)
            )
        )

        return filtered

    if view == "results":
        filtered = [
            match
            for match in matches
            if is_match_result(match)
        ]

        filtered.sort(
            key=lambda match: (
                parse_match_date(match)
                or datetime.min.replace(tzinfo=timezone.utc)
            ),
            reverse=True,
        )

        return filtered

    if view == "live":
        return [
            match
            for match in matches
            if is_match_live(match)
        ]

    return matches


@router.get("")
async def matches(
    view: Literal[
        "upcoming",
        "results",
        "live",
    ] = Query("upcoming"),
):
    try:
        payload = await cricket_data.get_current_matches()

        all_matches = payload.get("data", [])

        if not isinstance(all_matches, list):
            all_matches = []

        filtered_matches = classify_matches(
            all_matches,
            view,
        )

        return {
            "success": True,
            "view": view,
            "provider": "cricketdata",
            "count": len(filtered_matches),
            "cached": payload.get("_cached", False),
            "data": filtered_matches,
            "info": payload.get("info", {}),
        }

    except CricketDataAPIError as exc:
        return {
            "success": False,
            "view": view,
            "provider": "cricketdata",
            "error": str(exc),
            "data": [],
        }

    except Exception as exc:
        return {
            "success": False,
            "view": view,
            "provider": "cricketdata",
            "error": f"Unexpected error: {exc}",
            "data": [],
        }