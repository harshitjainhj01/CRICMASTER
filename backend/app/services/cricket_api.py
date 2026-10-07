from __future__ import annotations

import time
from typing import Any

import httpx

from app.database.connection import settings


class CricketDataAPIError(Exception):
    """Raised when the CricketData API cannot be used."""


class CricketDataAPI:
    BASE_URL = "https://api.cricapi.com/v1"

    # Cache current-match data for 60 seconds.
    # This helps us stay within the free API request limit.
    CACHE_TTL_SECONDS = 60

    def __init__(self) -> None:
        self.api_key = settings.cricketdata_api_key

        self._current_matches_cache: dict[str, Any] | None = None
        self._current_matches_cache_time = 0.0

    def _check_api_key(self) -> None:
        if not self.api_key:
            raise CricketDataAPIError(
                "CRICKETDATA_API_KEY is not configured in backend/.env"
            )

    def _cache_is_valid(self) -> bool:
        if self._current_matches_cache is None:
            return False

        return (
            time.time() - self._current_matches_cache_time
            < self.CACHE_TTL_SECONDS
        )

    async def _get(
        self,
        endpoint: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        self._check_api_key()

        query_params = {
            "apikey": self.api_key,
            "offset": 0,
        }

        if params:
            query_params.update(params)

        url = f"{self.BASE_URL}/{endpoint}"

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    url,
                    params=query_params,
                )

        except httpx.HTTPError as exc:
            raise CricketDataAPIError(
                f"Unable to connect to CricketData: {exc}"
            ) from exc

        try:
            payload = response.json()

        except ValueError as exc:
            raise CricketDataAPIError(
                "CricketData returned invalid JSON."
            ) from exc

        if response.status_code >= 400:
            message = (
                payload.get("reason")
                or payload.get("message")
                or f"HTTP {response.status_code}"
            )

            raise CricketDataAPIError(
                f"CricketData API error: {message}"
            )

        if payload.get("status") == "failure":
            message = (
                payload.get("reason")
                or payload.get("message")
                or "CricketData request failed"
            )

            raise CricketDataAPIError(message)

        return payload

    async def get_current_matches(self) -> dict[str, Any]:
        """
        Return current/live/recent/upcoming matches.

        Results are cached for 60 seconds to reduce API usage.
        """

        if self._cache_is_valid():
            return {
                **self._current_matches_cache,
                "_cached": True,
            }

        payload = await self._get("currentMatches")

        self._current_matches_cache = payload
        self._current_matches_cache_time = time.time()

        return {
            **payload,
            "_cached": False,
        }


cricket_data = CricketDataAPI()