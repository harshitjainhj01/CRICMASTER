from __future__ import annotations
import json

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text

from app.database.connection import engine


router = APIRouter(
    prefix="/api/ipl",
    tags=["IPL Historical"],
)


# ---------------------------------------------------------
# Seasons
# ---------------------------------------------------------

@router.get("/seasons")
def get_seasons():
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                """
                SELECT
                    season,
                    COUNT(*) AS matches
                FROM ipl_matches
                WHERE season IS NOT NULL
                GROUP BY season
                ORDER BY season
                """
            )
        ).mappings().all()

    return {
        "success": True,
        "count": len(rows),
        "data": [dict(row) for row in rows],
    }


# ---------------------------------------------------------
# Matches
# ---------------------------------------------------------

@router.get("/matches")
def get_matches(
    season: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    offset = (page - 1) * limit

    with engine.connect() as connection:

        if season is None:

            total = connection.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM ipl_matches
                    """
                )
            ).scalar_one()

            rows = connection.execute(
                text(
                    """
                    SELECT *
                    FROM ipl_matches
                    ORDER BY match_date DESC, match_number DESC
                    LIMIT :limit OFFSET :offset
                    """
                ),
                {
                    "limit": limit,
                    "offset": offset,
                },
            ).mappings().all()

        else:

            total = connection.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM ipl_matches
                    WHERE season = :season
                    """
                ),
                {"season": season},
            ).scalar_one()

            rows = connection.execute(
                text(
                    """
                    SELECT *
                    FROM ipl_matches
                    WHERE season = :season
                    ORDER BY match_number ASC, match_date ASC
                    LIMIT :limit OFFSET :offset
                    """
                ),
                {
                    "season": season,
                    "limit": limit,
                    "offset": offset,
                },
            ).mappings().all()

    return {
        "success": True,
        "season": season,
        "page": page,
        "limit": limit,
        "total": total,
        "pages": (total + limit - 1) // limit,
        "data": [dict(row) for row in rows],
    }


# ---------------------------------------------------------
# Match details
# ---------------------------------------------------------

@router.get("/matches/{match_id}")
def get_match(match_id: str):

    with engine.connect() as connection:

        match = connection.execute(
            text(
                """
                SELECT *
                FROM ipl_matches
                WHERE match_id = :match_id
                """
            ),
            {"match_id": match_id},
        ).mappings().first()

        if match is None:
            raise HTTPException(
                status_code=404,
                detail="IPL match not found",
            )

        innings = connection.execute(
            text(
                """
                SELECT *
                FROM ipl_innings
                WHERE match_id = :match_id
                ORDER BY innings_number
                """
            ),
            {"match_id": match_id},
        ).mappings().all()

    return {
        "success": True,
        "match": dict(match),
        "innings": [dict(row) for row in innings],
    }


# ---------------------------------------------------------
# Scorecard
# ---------------------------------------------------------

@router.get("/matches/{match_id}/scorecard")
def get_scorecard(match_id: str):

    with engine.connect() as connection:

        match = connection.execute(
            text(
                """
                SELECT *
                FROM ipl_matches
                WHERE match_id = :match_id
                """
            ),
            {"match_id": match_id},
        ).mappings().first()

        if match is None:
            raise HTTPException(
                status_code=404,
                detail="IPL match not found",
            )

        innings = connection.execute(
            text(
                """
                SELECT
                    innings_number,
                    batting_team,
                    total_runs,
                    wickets,
                    deliveries,
                    overs
                FROM ipl_innings
                WHERE match_id = :match_id
                ORDER BY innings_number
                """
            ),
            {"match_id": match_id},
        ).mappings().all()

    return {
        "success": True,
        "match": dict(match),
        "innings": [dict(row) for row in innings],
    }


# ---------------------------------------------------------
# Ball-by-ball
# ---------------------------------------------------------

@router.get("/matches/{match_id}/deliveries")
def get_deliveries(
    match_id: str,
    innings: int | None = Query(default=None, ge=1),
):
    with engine.connect() as connection:

        match_exists = connection.execute(
            text(
                """
                SELECT COUNT(*)
                FROM ipl_matches
                WHERE match_id = :match_id
                """
            ),
            {"match_id": match_id},
        ).scalar_one()

        if not match_exists:
            raise HTTPException(
                status_code=404,
                detail="IPL match not found",
            )

        if innings is None:

            rows = connection.execute(
                text(
                    """
                    SELECT *
                    FROM ipl_deliveries
                    WHERE match_id = :match_id
                    ORDER BY
                        innings_number,
                        over_number,
                        ball_number
                    """
                ),
                {"match_id": match_id},
            ).mappings().all()

        else:

            rows = connection.execute(
                text(
                    """
                    SELECT *
                    FROM ipl_deliveries
                    WHERE
                        match_id = :match_id
                        AND innings_number = :innings
                    ORDER BY
                        over_number,
                        ball_number
                    """
                ),
                {
                    "match_id": match_id,
                    "innings": innings,
                },
            ).mappings().all()

    return {
        "success": True,
        "match_id": match_id,
        "innings": innings,
        "count": len(rows),
        "data": [dict(row) for row in rows],
    }


# ---------------------------------------------------------
# Teams
# ---------------------------------------------------------

@router.get("/teams")
def get_teams():

    with engine.connect() as connection:
        rows = connection.execute(
            text(
                """
                SELECT
                    team_name
                FROM ipl_teams
                ORDER BY team_name
                """
            )
        ).mappings().all()

    return {
        "success": True,
        "count": len(rows),
        "data": [dict(row) for row in rows],
    }


# ---------------------------------------------------------
# Players
# ---------------------------------------------------------

@router.get("/players")
def get_players(
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
):

    with engine.connect() as connection:

        if search:

            rows = connection.execute(
                text(
                    """
                    SELECT player_name
                    FROM ipl_players
                    WHERE player_name LIKE :search
                    ORDER BY player_name
                    LIMIT :limit
                    """
                ),
                {
                    "search": f"%{search}%",
                    "limit": limit,
                },
            ).mappings().all()

        else:

            rows = connection.execute(
                text(
                    """
                    SELECT player_name
                    FROM ipl_players
                    ORDER BY player_name
                    LIMIT :limit
                    """
                ),
                {"limit": limit},
            ).mappings().all()

    return {
        "success": True,
        "count": len(rows),
        "search": search,
        "data": [dict(row) for row in rows],
    }


# ---------------------------------------------------------
# Basic player batting statistics
# ---------------------------------------------------------

@router.get("/player-stats")
def get_player_stats(
    player: str = Query(..., min_length=2),
):

    with engine.connect() as connection:

        batting = connection.execute(
            text(
                """
                SELECT
                    batter AS player,
                    COUNT(*) AS balls_faced,
                    COALESCE(
                        SUM(batter_runs),
                        0
                    ) AS runs
                FROM ipl_deliveries
                WHERE batter = :player
                GROUP BY batter
                """
            ),
            {"player": player},
        ).mappings().first()

        bowling = connection.execute(
            text(
                """
                SELECT
                    bowler AS player,
                    COUNT(*) AS balls_bowled,
                    COALESCE(
                        SUM(total_runs),
                        0
                    ) AS runs_conceded
                FROM ipl_deliveries
                WHERE bowler = :player
                GROUP BY bowler
                """
            ),
            {"player": player},
        ).mappings().first()

        dismissals = connection.execute(
            text(
                """
                SELECT COUNT(*)
                FROM ipl_deliveries,
                     json_each(ipl_deliveries.wickets_json)
                WHERE json_extract(
                    json_each.value,
                    '$.player_out'
                ) = :player
                """
            ),
            {"player": player},
        ).scalar_one()

    return {
        "success": True,
        "player": player,
        "batting": dict(batting) if batting else {
            "player": player,
            "balls_faced": 0,
            "runs": 0,
        },
        "bowling": dict(bowling) if bowling else {
            "player": player,
            "balls_bowled": 0,
            "runs_conceded": 0,
        },
        "dismissals": dismissals,
    }
# ---------------------------------------------------------
# Detailed scorecard
# ---------------------------------------------------------



def _get_wicket_kind(wicket: dict) -> str:
    return str(
        wicket.get("kind", "")
    ).lower().strip()


def _wicket_credited_to_bowler(kind: str) -> bool:
    """
    Wicket types normally credited to the bowler.
    """
    return kind not in {
        "retired hurt",
        "retired out",
        "obstructing the field",
    }


@router.get("/matches/{match_id}/scorecard/detailed")
def get_detailed_scorecard(match_id: str):

    with engine.connect() as connection:

        match = connection.execute(
            text(
                """
                SELECT *
                FROM ipl_matches
                WHERE match_id = :match_id
                """
            ),
            {
                "match_id": match_id,
            },
        ).mappings().first()

        if match is None:
            raise HTTPException(
                status_code=404,
                detail="IPL match not found",
            )

        innings_rows = connection.execute(
            text(
                """
                SELECT *
                FROM ipl_innings
                WHERE match_id = :match_id
                ORDER BY innings_number
                """
            ),
            {
                "match_id": match_id,
            },
        ).mappings().all()

        delivery_rows = connection.execute(
            text(
                """
                SELECT *
                FROM ipl_deliveries
                WHERE match_id = :match_id
                ORDER BY
                    innings_number,
                    over_number,
                    ball_number
                """
            ),
            {
                "match_id": match_id,
            },
        ).mappings().all()


    # -----------------------------------------------------
    # Create scorecard structures
    # -----------------------------------------------------

    innings_data = []


    for innings in innings_rows:

        innings_number = innings["innings_number"]

        batting_team = (
            innings["batting_team"]
            or "Unknown Team"
        )

        batting = {}
        bowling = {}


        innings_deliveries = [
            row
            for row in delivery_rows
            if row["innings_number"]
            == innings_number
        ]


        # -------------------------------------------------
        # Process deliveries
        # -------------------------------------------------

        for row in innings_deliveries:

            batter = row["batter"] or "Unknown"
            bowler = row["bowler"] or "Unknown"

            batter_runs = int(
                row["batter_runs"] or 0
            )

            extras_runs = int(
                row["extras_runs"] or 0
            )

            total_runs = int(
                row["total_runs"] or 0
            )


            try:
                extras = json.loads(
                    row["extras_json"] or "{}"
                )
            except (ValueError, TypeError):
                extras = {}


            try:
                wickets = json.loads(
                    row["wickets_json"] or "[]"
                )
            except (ValueError, TypeError):
                wickets = []


            if not isinstance(extras, dict):
                extras = {}

            if not isinstance(wickets, list):
                wickets = []


            wides = int(
                extras.get("wides", 0)
                or 0
            )

            noballs = int(
                extras.get("noballs", 0)
                or 0
            )

            byes = int(
                extras.get("byes", 0)
                or 0
            )

            legbyes = int(
                extras.get("legbyes", 0)
                or 0
            )


            # -------------------------------------------------
            # Batting
            # -------------------------------------------------

            if batter not in batting:

                batting[batter] = {
                    "player": batter,
                    "runs": 0,
                    "balls": 0,
                    "fours": 0,
                    "sixes": 0,
                }


            batting[batter]["runs"] += batter_runs


            # Wides do not count as a ball faced.
            if wides == 0:
                batting[batter]["balls"] += 1


            if batter_runs == 4:
                batting[batter]["fours"] += 1


            if batter_runs == 6:
                batting[batter]["sixes"] += 1


            # -------------------------------------------------
            # Bowling
            # -------------------------------------------------

            if bowler not in bowling:

                bowling[bowler] = {
                    "player": bowler,
                    "balls": 0,
                    "runs": 0,
                    "wickets": 0,
                    "maidens": 0,
                }


            # Wides and no-balls are not legal deliveries.
            if wides == 0 and noballs == 0:
                bowling[bowler]["balls"] += 1


            # Bowler is generally charged with all runs
            # except byes and leg-byes.
            bowler_runs = (
                total_runs
                - byes
                - legbyes
            )

            bowling[bowler]["runs"] += max(
                bowler_runs,
                0,
            )


            # -------------------------------------------------
            # Wickets
            # -------------------------------------------------

            for wicket in wickets:

                if not isinstance(
                    wicket,
                    dict,
                ):
                    continue


                kind = _get_wicket_kind(
                    wicket
                )


                if _wicket_credited_to_bowler(
                    kind
                ):

                    bowling[bowler][
                        "wickets"
                    ] += 1


        # -------------------------------------------------
        # Calculate batting rates
        # -------------------------------------------------

        batting_list = []

        for player in batting.values():

            balls = player["balls"]

            runs = player["runs"]

            player["strike_rate"] = (
                round(
                    (runs / balls) * 100,
                    2,
                )
                if balls
                else 0
            )

            batting_list.append(
                player
            )


        batting_list.sort(
            key=lambda item: (
                -item["runs"],
                -item["balls"],
                item["player"],
            )
        )


        # -------------------------------------------------
        # Calculate bowling rates
        # -------------------------------------------------

        bowling_list = []

        for player in bowling.values():

            balls = player["balls"]

            runs = player["runs"]

            complete_overs = (
                balls // 6
            )

            remaining_balls = (
                balls % 6
            )

            overs_display = (
                f"{complete_overs}."
                f"{remaining_balls}"
            )

            economy = (
                round(
                    (runs / balls) * 6,
                    2,
                )
                if balls
                else 0
            )

            player["overs"] = overs_display
            player["economy"] = economy

            bowling_list.append(
                player
            )


        bowling_list.sort(
            key=lambda item: (
                -item["wickets"],
                item["runs"],
                item["player"],
            )
        )


        innings_data.append(
            {
                "innings_number":
                    innings_number,

                "batting_team":
                    batting_team,

                "total_runs":
                    innings["total_runs"],

                "wickets":
                    innings["wickets"],

                "overs":
                    innings["overs"],

                "batting":
                    batting_list,

                "bowling":
                    bowling_list,
            }
        )


    return {
        "success": True,
        "match": dict(match),
        "innings": innings_data,
    }
# ---------------------------------------------------------
# Ball-by-ball commentary
# ---------------------------------------------------------

@router.get("/matches/{match_id}/commentary")
def get_commentary(
    match_id: str,
    innings: int | None = Query(default=None, ge=1),
    over: int | None = Query(default=None, ge=0),
):
    with engine.connect() as connection:

        match_exists = connection.execute(
            text(
                """
                SELECT COUNT(*)
                FROM ipl_matches
                WHERE match_id = :match_id
                """
            ),
            {
                "match_id": match_id,
            },
        ).scalar_one()

        if not match_exists:
            raise HTTPException(
                status_code=404,
                detail="IPL match not found",
            )

        conditions = [
            "match_id = :match_id"
        ]

        params = {
            "match_id": match_id,
        }


        if innings is not None:
            conditions.append(
                "innings_number = :innings"
            )
            params["innings"] = innings


        if over is not None:
            conditions.append(
                "over_number = :over"
            )
            params["over"] = over


        where_clause = " AND ".join(
            conditions
        )


        query = text(
            f"""
            SELECT
                delivery_id,
                innings_number,
                over_number,
                ball_number,
                batter,
                bowler,
                non_striker,
                batter_runs,
                extras_runs,
                total_runs,
                extras_json,
                wickets_json
            FROM ipl_deliveries
            WHERE {where_clause}
            ORDER BY
                innings_number,
                over_number,
                ball_number
            """
        )


        rows = connection.execute(
            query,
            params,
        ).mappings().all()


    commentary = []


    for row in rows:

        extras = {}

        try:
            extras = json.loads(
                row["extras_json"] or "{}"
            )
        except (
            ValueError,
            TypeError,
        ):
            extras = {}


        wickets = []

        try:
            wickets = json.loads(
                row["wickets_json"] or "[]"
            )
        except (
            ValueError,
            TypeError,
        ):
            wickets = []


        commentary.append(
            {
                "delivery_id":
                    row["delivery_id"],

                "innings":
                    row["innings_number"],

                "over":
                    row["over_number"],

                "ball":
                    row["ball_number"],

                "batter":
                    row["batter"],

                "bowler":
                    row["bowler"],

                "non_striker":
                    row["non_striker"],

                "batter_runs":
                    row["batter_runs"],

                "extras_runs":
                    row["extras_runs"],

                "total_runs":
                    row["total_runs"],

                "extras":
                    extras,

                "wickets":
                    wickets,
            }
        )


    return {
        "success": True,
        "match_id": match_id,
        "innings": innings,
        "over": over,
        "count": len(commentary),
        "data": commentary,
    }
# ---------------------------------------------------------
# Player profile & statistics
# ---------------------------------------------------------

@router.get("/player-profile")
def get_player_profile(
    player: str = Query(..., min_length=2)
):
    # ---------------------------------------------
    # All database work stays inside one connection
    # ---------------------------------------------

    with engine.connect() as connection:

        # -----------------------------------------
        # Check player exists
        # -----------------------------------------

        player_exists = connection.execute(
            text(
                """
                SELECT COUNT(*)
                FROM ipl_players
                WHERE player_name = :player
                """
            ),
            {
                "player": player,
            },
        ).scalar_one()

        if not player_exists:
            raise HTTPException(
                status_code=404,
                detail="Player not found",
            )

        # -----------------------------------------
        # Batting statistics
        # -----------------------------------------

        batting = connection.execute(
            text(
                """
                SELECT
                    COUNT(DISTINCT match_id) AS matches,
                    COUNT(*) AS balls,
                    COALESCE(
                        SUM(batter_runs),
                        0
                    ) AS runs,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN batter_runs = 4
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS fours,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN batter_runs = 6
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS sixes
                FROM ipl_deliveries
                WHERE
                    batter = :player
                    AND COALESCE(
                        json_extract(
                            extras_json,
                            '$.wides'
                        ),
                        0
                    ) = 0
                """
            ),
            {
                "player": player,
            },
        ).mappings().first()

        # -----------------------------------------
        # Bowling statistics
        # -----------------------------------------

        bowling = connection.execute(
            text(
                """
                SELECT
                    COUNT(DISTINCT match_id) AS matches,
                    COUNT(*) AS deliveries,
                    COALESCE(
                        SUM(
                            total_runs
                            - COALESCE(
                                json_extract(
                                    extras_json,
                                    '$.byes'
                                ),
                                0
                            )
                            - COALESCE(
                                json_extract(
                                    extras_json,
                                    '$.legbyes'
                                ),
                                0
                            )
                        ),
                        0
                    ) AS runs_conceded
                FROM ipl_deliveries
                WHERE
                    bowler = :player
                    AND COALESCE(
                        json_extract(
                            extras_json,
                            '$.wides'
                        ),
                        0
                    ) = 0
                    AND COALESCE(
                        json_extract(
                            extras_json,
                            '$.noballs'
                        ),
                        0
                    ) = 0
                """
            ),
            {
                "player": player,
            },
        ).mappings().first()

        # -----------------------------------------
        # Bowling wickets
        # -----------------------------------------

        bowling_rows = connection.execute(
            text(
                """
                SELECT wickets_json
                FROM ipl_deliveries
                WHERE bowler = :player
                """
            ),
            {
                "player": player,
            },
        ).scalars().all()

        wickets = 0

        for wickets_json in bowling_rows:

            try:
                wicket_list = json.loads(
                    wickets_json or "[]"
                )
            except (
                ValueError,
                TypeError,
            ):
                wicket_list = []

            if not isinstance(
                wicket_list,
                list
            ):
                continue

            for wicket in wicket_list:

                if not isinstance(
                    wicket,
                    dict
                ):
                    continue

                kind = str(
                    wicket.get("kind", "")
                ).lower().strip()

                if kind not in {
                    "retired hurt",
                    "retired out",
                    "obstructing the field",
                }:
                    wickets += 1

        # -----------------------------------------
        # Total matches
        # -----------------------------------------

        total_matches = connection.execute(
            text(
                """
                SELECT COUNT(DISTINCT match_id)
                FROM ipl_deliveries
                WHERE
                    batter = :player
                    OR bowler = :player
                """
            ),
            {
                "player": player,
            },
        ).scalar_one()

        # -----------------------------------------
        # Teams
        # -----------------------------------------

        teams = connection.execute(
            text(
                """
                SELECT team_name
                FROM ipl_player_teams
                WHERE player_name = :player
                ORDER BY team_name
                """
            ),
            {
                "player": player,
            },
        ).scalars().all()

    # ---------------------------------------------
    # Convert statistics
    # ---------------------------------------------

    batting_matches = int(
        batting["matches"] or 0
    )

    batting_balls = int(
        batting["balls"] or 0
    )

    batting_runs = int(
        batting["runs"] or 0
    )

    batting_fours = int(
        batting["fours"] or 0
    )

    batting_sixes = int(
        batting["sixes"] or 0
    )

    bowling_matches = int(
        bowling["matches"] or 0
    )

    bowling_deliveries = int(
        bowling["deliveries"] or 0
    )

    bowling_runs = int(
        bowling["runs_conceded"] or 0
    )

    # ---------------------------------------------
    # Strike rate
    # ---------------------------------------------

    strike_rate = (
        round(
            batting_runs / batting_balls * 100,
            2,
        )
        if batting_balls
        else 0
    )

    # ---------------------------------------------
    # Bowling overs
    # ---------------------------------------------

    bowling_overs = (
        f"{bowling_deliveries // 6}."
        f"{bowling_deliveries % 6}"
    )

    # ---------------------------------------------
    # Economy
    # ---------------------------------------------

    economy = (
        round(
            bowling_runs
            / bowling_deliveries
            * 6,
            2,
        )
        if bowling_deliveries
        else 0
    )

    # ---------------------------------------------
    # Final response
    # ---------------------------------------------

    return {
        "success": True,

        "player": player,

        "teams": list(teams),

        "matches": int(total_matches),

        "batting": {
            "matches": batting_matches,
            "runs": batting_runs,
            "balls": batting_balls,
            "fours": batting_fours,
            "sixes": batting_sixes,
            "strike_rate": strike_rate,
        },

        "bowling": {
            "matches": bowling_matches,
            "overs": bowling_overs,
            "deliveries": bowling_deliveries,
            "runs_conceded": bowling_runs,
            "wickets": wickets,
            "economy": economy,
        },
    }
# ---------------------------------------------------------
# IPL Teams
# ---------------------------------------------------------

@router.get("/team-profile")
def get_team_profile(
    team: str = Query(..., min_length=2)
):
    with engine.connect() as connection:

        team_exists = connection.execute(
            text(
                """
                SELECT COUNT(*)
                FROM ipl_teams
                WHERE team_name = :team
                """
            ),
            {
                "team": team,
            },
        ).scalar_one()

        if not team_exists:
            raise HTTPException(
                status_code=404,
                detail="Team not found",
            )


        # ---------------------------------------------
        # Matches
        # ---------------------------------------------

        matches = connection.execute(
            text(
                """
                SELECT COUNT(*)
                FROM ipl_matches
                WHERE
                    team1 = :team
                    OR team2 = :team
                """
            ),
            {
                "team": team,
            },
        ).scalar_one()


        # ---------------------------------------------
        # Wins
        # ---------------------------------------------

        wins = connection.execute(
            text(
                """
                SELECT COUNT(*)
                FROM ipl_matches
                WHERE winner = :team
                """
            ),
            {
                "team": team,
            },
        ).scalar_one()


        # ---------------------------------------------
        # Season-wise record
        # ---------------------------------------------

        season_rows = connection.execute(
            text(
                """
                SELECT
                    season,
                    COUNT(*) AS matches,
                    SUM(
                        CASE
                            WHEN winner = :team
                            THEN 1
                            ELSE 0
                        END
                    ) AS wins
                FROM ipl_matches
                WHERE
                    team1 = :team
                    OR team2 = :team
                GROUP BY season
                ORDER BY season
                """
            ),
            {
                "team": team,
            },
        ).mappings().all()


        # ---------------------------------------------
        # Players associated with team
        # ---------------------------------------------

        players = connection.execute(
            text(
                """
                SELECT player_name
                FROM ipl_player_teams
                WHERE team_name = :team
                ORDER BY player_name
                """
            ),
            {
                "team": team,
            },
        ).scalars().all()


    matches = int(matches or 0)
    wins = int(wins or 0)

    losses = max(
        matches - wins,
        0,
    )

    win_rate = (
        round(
            wins / matches * 100,
            2,
        )
        if matches
        else 0
    )


    seasons = []

    for row in season_rows:

        season_matches = int(
            row["matches"] or 0
        )

        season_wins = int(
            row["wins"] or 0
        )

        seasons.append(
            {
                "season": row["season"],
                "matches": season_matches,
                "wins": season_wins,
                "losses": max(
                    season_matches - season_wins,
                    0,
                ),
                "win_rate": (
                    round(
                        season_wins
                        / season_matches
                        * 100,
                        2,
                    )
                    if season_matches
                    else 0
                ),
            }
        )


    return {
        "success": True,
        "team": team,
        "matches": matches,
        "wins": wins,
        "losses": losses,
        "win_rate": win_rate,
        "players": list(players),
        "seasons": seasons,
    }
# ---------------------------------------------------------
# Team match history
# ---------------------------------------------------------

@router.get("/team-matches")
def get_team_matches(
    team: str = Query(..., min_length=2),
    season: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
):
    with engine.connect() as connection:

        # ---------------------------------------------
        # Check team exists
        # ---------------------------------------------

        team_exists = connection.execute(
            text(
                """
                SELECT COUNT(*)
                FROM ipl_teams
                WHERE team_name = :team
                """
            ),
            {
                "team": team,
            },
        ).scalar_one()

        if not team_exists:
            raise HTTPException(
                status_code=404,
                detail="Team not found",
            )


        # ---------------------------------------------
        # Build query
        # ---------------------------------------------

        if season is None:

            rows = connection.execute(
                text(
                    """
                    SELECT
                        match_id,
                        season,
                        match_number,
                        match_date,
                        team1,
                        team2,
                        winner,
                        venue,
                        city
                    FROM ipl_matches
                    WHERE
                        team1 = :team
                        OR team2 = :team
                    ORDER BY
                        match_date DESC,
                        match_number DESC
                    LIMIT :limit
                    """
                ),
                {
                    "team": team,
                    "limit": limit,
                },
            ).mappings().all()

        else:

            rows = connection.execute(
                text(
                    """
                    SELECT
                        match_id,
                        season,
                        match_number,
                        match_date,
                        team1,
                        team2,
                        winner,
                        venue,
                        city
                    FROM ipl_matches
                    WHERE
                        (
                            team1 = :team
                            OR team2 = :team
                        )
                        AND season = :season
                    ORDER BY
                        match_number DESC
                    LIMIT :limit
                    """
                ),
                {
                    "team": team,
                    "season": season,
                    "limit": limit,
                },
            ).mappings().all()


    matches = []

    for row in rows:

        opponent = (
            row["team2"]
            if row["team1"] == team
            else row["team1"]
        )


        if row["winner"] == team:
            result = "Won"

        elif row["winner"]:
            result = "Lost"

        else:
            result = "No Result"


        matches.append(
            {
                "match_id": row["match_id"],
                "season": row["season"],
                "match_number": row["match_number"],
                "match_date": row["match_date"],
                "team": team,
                "opponent": opponent,
                "winner": row["winner"],
                "result": result,
                "venue": row["venue"],
                "city": row["city"],
            }
        )


    return {
        "success": True,
        "team": team,
        "season": season,
        "count": len(matches),
        "data": matches,
    }