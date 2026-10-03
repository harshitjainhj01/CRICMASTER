from typing import Any

import httpx

from app.database.connection import settings


class CricketAPIError(Exception):
    """Raised when the cricket provider cannot be reached or returns an error."""


class CricketAPI:
    BASE_URL = "https://cricket.sportmonks.com/api/v2.0"

    def __init__(self, token: str | None = None):
        self.token = token or settings.sportmonks_api_token

    def _require_token(self) -> None:
        if not self.token:
            raise CricketAPIError(
                "SPORTMONKS_API_TOKEN is not configured in backend/.env"
            )

    async def _get(
        self,
        endpoint: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:

        self._require_token()

        request_params = params.copy() if params else {}
        request_params["api_token"] = self.token

        url = f"{self.BASE_URL}/{endpoint.lstrip('/')}"

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    url,
                    params=request_params,
                )

        except httpx.RequestError as exc:
            raise CricketAPIError(
                f"Unable to reach Sportmonks: {exc}"
            ) from exc

        if response.status_code == 401:
            raise CricketAPIError("Sportmonks API token is invalid.")

        if response.status_code == 403:
            raise CricketAPIError(
                "Your Sportmonks plan does not provide access to this data."
            )

        if response.status_code >= 400:
            raise CricketAPIError(
                f"Sportmonks returned HTTP {response.status_code}: "
                f"{response.text[:500]}"
            )

        try:
            return response.json()
        except ValueError as exc:
            raise CricketAPIError(
                "Sportmonks returned an invalid JSON response."
            ) from exc

    async def get_live_scores(self) -> dict[str, Any]:
        return await self._get(
            "/livescores/now",
            params={
                "include": ",".join(
                    [
                        "localteam",
                        "visitorteam",
                        "runs",
                        "batting",
                        "bowling",
                        "lineup",
                        "balls",
                        "venue",
                    ]
                )
            },
        )

    async def get_today_scores(self) -> dict[str, Any]:
        return await self._get(
            "/livescores",
            params={
                "include": ",".join(
                    [
                        "localteam",
                        "visitorteam",
                        "runs",
                    ]
                )
            },
        )


cricket_api = CricketAPI()