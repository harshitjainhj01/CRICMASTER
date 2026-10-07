from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text


# ---------------------------------------------------------
# Project paths
# ---------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATA_DIR = PROJECT_ROOT / "data" / "raw" / "ipl"


# ---------------------------------------------------------
# Import backend modules
# ---------------------------------------------------------

BACKEND_DIR = PROJECT_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


from app.database.connection import engine  # noqa: E402


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------

def json_text(value: Any) -> str:
    """Convert a Python object to compact JSON text."""
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
    )


def first_value(value: Any) -> Any:
    """Return the first value when Cricsheet gives a list."""
    if isinstance(value, list):
        return value[0] if value else None

    return value


def get_match_date(info: dict[str, Any]) -> str | None:
    value = first_value(info.get("dates"))

    if value is None:
        return None

    return str(value)


def get_event_info(info: dict[str, Any]) -> dict[str, Any]:
    event = info.get("event")

    if isinstance(event, dict):
        return event

    return {}


def get_outcome_info(info: dict[str, Any]) -> dict[str, Any]:
    outcome = info.get("outcome")

    if isinstance(outcome, dict):
        return outcome

    return {}


def calculate_innings_totals(
    overs: list[dict[str, Any]],
) -> tuple[int, int, int]:
    total_runs = 0
    wickets = 0
    delivery_count = 0

    for over in overs:

        deliveries = over.get("deliveries", [])

        if not isinstance(deliveries, list):
            continue

        for delivery in deliveries:

            delivery_count += 1

            runs = delivery.get("runs", {})

            if isinstance(runs, dict):
                total_runs += int(
                    runs.get("total", 0) or 0
                )

            wicket_list = delivery.get("wickets", [])

            if isinstance(wicket_list, list):
                wickets += len(wicket_list)

    return total_runs, wickets, delivery_count


# ---------------------------------------------------------
# Database schema
# ---------------------------------------------------------

SCHEMA_SQL = [

    """
    CREATE TABLE IF NOT EXISTS ipl_teams (
        team_name TEXT PRIMARY KEY
    )
    """,

    """
    CREATE TABLE IF NOT EXISTS ipl_players (
        player_name TEXT PRIMARY KEY
    )
    """,

    """
    CREATE TABLE IF NOT EXISTS ipl_player_teams (
        player_name TEXT NOT NULL,
        team_name TEXT NOT NULL,
        PRIMARY KEY (player_name, team_name)
    )
    """,

    """
    CREATE TABLE IF NOT EXISTS ipl_matches (
        match_id TEXT PRIMARY KEY,
        season INTEGER,
        match_number INTEGER,
        event_name TEXT,
        match_type TEXT,
        gender TEXT,
        match_date TEXT,
        city TEXT,
        venue TEXT,
        team1 TEXT,
        team2 TEXT,
        toss_winner TEXT,
        toss_decision TEXT,
        winner TEXT,
        player_of_match TEXT,
        outcome_json TEXT,
        source_file TEXT,
        imported_at TEXT
    )
    """,

    """
    CREATE TABLE IF NOT EXISTS ipl_innings (
        innings_id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        innings_number INTEGER NOT NULL,
        batting_team TEXT,
        total_runs INTEGER DEFAULT 0,
        wickets INTEGER DEFAULT 0,
        deliveries INTEGER DEFAULT 0,
        overs INTEGER DEFAULT 0
    )
    """,

    """
    CREATE TABLE IF NOT EXISTS ipl_deliveries (
        delivery_id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        innings_number INTEGER NOT NULL,
        over_number INTEGER NOT NULL,
        ball_number INTEGER NOT NULL,
        batter TEXT,
        bowler TEXT,
        non_striker TEXT,
        batter_runs INTEGER DEFAULT 0,
        extras_runs INTEGER DEFAULT 0,
        total_runs INTEGER DEFAULT 0,
        extras_json TEXT,
        wickets_json TEXT
    )
    """,
]


def create_schema() -> None:
    with engine.begin() as connection:
        for statement in SCHEMA_SQL:
            connection.execute(text(statement))


# ---------------------------------------------------------
# Import one match
# ---------------------------------------------------------

def import_match(
    connection,
    json_file: Path,
) -> tuple[int, int, int]:
    with json_file.open(
        "r",
        encoding="utf-8",
    ) as file:
        match_data = json.load(file)

    info = match_data.get("info", {})

    if not isinstance(info, dict):
        raise ValueError(
            f"Invalid info object in {json_file.name}"
        )

    match_id = json_file.stem

    event = get_event_info(info)
    outcome = get_outcome_info(info)

    teams = info.get("teams", [])

    if not isinstance(teams, list):
        teams = []

    team1 = teams[0] if len(teams) >= 1 else None
    team2 = teams[1] if len(teams) >= 2 else None

    # -----------------------------------------------------
    # Teams
    # -----------------------------------------------------

    for team in teams:
        connection.execute(
            text(
                """
                INSERT INTO ipl_teams (team_name)
                VALUES (:team_name)
                ON CONFLICT (team_name) DO NOTHING
                """
            ),
            {
                "team_name": str(team),
            },
        )

    # -----------------------------------------------------
    # Players
    # -----------------------------------------------------

    players_by_team = info.get("players", {})

    if isinstance(players_by_team, dict):

        for team_name, players in players_by_team.items():

            if not isinstance(players, list):
                continue

            for player_name in players:

                player_name = str(player_name)

                connection.execute(
                    text(
                        """
                        INSERT INTO ipl_players (player_name)
                        VALUES (:player_name)
                        ON CONFLICT (player_name) DO NOTHING
                        """
                    ),
                    {
                        "player_name": player_name,
                    },
                )

                connection.execute(
                    text(
                        """
                        INSERT INTO ipl_player_teams (
                            player_name,
                            team_name
                        )
                        VALUES (
                            :player_name,
                            :team_name
                        )
                        ON CONFLICT (
                            player_name,
                            team_name
                        ) DO NOTHING
                        """
                    ),
                    {
                        "player_name": player_name,
                        "team_name": str(team_name),
                    },
                )

    # -----------------------------------------------------
    # Match
    # -----------------------------------------------------

    toss = info.get("toss", {})

    if not isinstance(toss, dict):
        toss = {}

    player_of_match = info.get(
        "player_of_match",
        [],
    )

    if isinstance(player_of_match, list):
        player_of_match_text = ", ".join(
            str(player)
            for player in player_of_match
        )
    else:
        player_of_match_text = (
            str(player_of_match)
            if player_of_match
            else None
        )

    match_values = {
        "match_id": match_id,
        "season": info.get("season"),
        "match_number": event.get("match_number"),
        "event_name": event.get("name"),
        "match_type": info.get("match_type"),
        "gender": info.get("gender"),
        "match_date": get_match_date(info),
        "city": info.get("city"),
        "venue": info.get("venue"),
        "team1": team1,
        "team2": team2,
        "toss_winner": toss.get("winner"),
        "toss_decision": toss.get("decision"),
        "winner": outcome.get("winner"),
        "player_of_match": player_of_match_text,
        "outcome_json": json_text(outcome),
        "source_file": json_file.name,
        "imported_at": datetime.now(
            timezone.utc
        ).isoformat(),
    }

    connection.execute(
        text(
            """
            INSERT INTO ipl_matches (
                match_id,
                season,
                match_number,
                event_name,
                match_type,
                gender,
                match_date,
                city,
                venue,
                team1,
                team2,
                toss_winner,
                toss_decision,
                winner,
                player_of_match,
                outcome_json,
                source_file,
                imported_at
            )
            VALUES (
                :match_id,
                :season,
                :match_number,
                :event_name,
                :match_type,
                :gender,
                :match_date,
                :city,
                :venue,
                :team1,
                :team2,
                :toss_winner,
                :toss_decision,
                :winner,
                :player_of_match,
                :outcome_json,
                :source_file,
                :imported_at
            )
            ON CONFLICT (match_id) DO NOTHING
            """
        ),
        match_values,
    )

    # -----------------------------------------------------
    # Innings and deliveries
    # -----------------------------------------------------

    innings_list = match_data.get(
        "innings",
        [],
    )

    if not isinstance(innings_list, list):
        innings_list = []

    delivery_total = 0
    innings_total = 0

    for innings_number, innings in enumerate(
        innings_list,
        start=1,
    ):

        if not isinstance(innings, dict):
            continue

        batting_team = innings.get("team")

        overs = innings.get(
            "overs",
            [],
        )

        if not isinstance(overs, list):
            overs = []

        total_runs, wickets, deliveries = (
            calculate_innings_totals(overs)
        )

        innings_id = (
            f"{match_id}:{innings_number}"
        )

        connection.execute(
            text(
                """
                INSERT INTO ipl_innings (
                    innings_id,
                    match_id,
                    innings_number,
                    batting_team,
                    total_runs,
                    wickets,
                    deliveries,
                    overs
                )
                VALUES (
                    :innings_id,
                    :match_id,
                    :innings_number,
                    :batting_team,
                    :total_runs,
                    :wickets,
                    :deliveries,
                    :overs
                )
                ON CONFLICT (innings_id) DO NOTHING
                """
            ),
            {
                "innings_id": innings_id,
                "match_id": match_id,
                "innings_number": innings_number,
                "batting_team": batting_team,
                "total_runs": total_runs,
                "wickets": wickets,
                "deliveries": deliveries,
                "overs": len(overs),
            },
        )

        innings_total += 1

        # -------------------------------------------------
        # Individual deliveries
        # -------------------------------------------------

        for over in overs:

            if not isinstance(over, dict):
                continue

            over_number = int(
                over.get("over", 0)
            )

            deliveries_list = over.get(
                "deliveries",
                [],
            )

            if not isinstance(
                deliveries_list,
                list,
            ):
                continue

            for ball_number, delivery in enumerate(
                deliveries_list,
                start=1,
            ):

                if not isinstance(
                    delivery,
                    dict,
                ):
                    continue

                runs = delivery.get(
                    "runs",
                    {},
                )

                if not isinstance(runs, dict):
                    runs = {}

                extras = delivery.get(
                    "extras",
                    {},
                )

                if not isinstance(extras, dict):
                    extras = {}

                wickets_list = delivery.get(
                    "wickets",
                    [],
                )

                if not isinstance(
                    wickets_list,
                    list,
                ):
                    wickets_list = []

                delivery_id = (
                    f"{match_id}:"
                    f"{innings_number}:"
                    f"{over_number}:"
                    f"{ball_number}"
                )

                connection.execute(
                    text(
                        """
                        INSERT INTO ipl_deliveries (
                            delivery_id,
                            match_id,
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
                        )
                        VALUES (
                            :delivery_id,
                            :match_id,
                            :innings_number,
                            :over_number,
                            :ball_number,
                            :batter,
                            :bowler,
                            :non_striker,
                            :batter_runs,
                            :extras_runs,
                            :total_runs,
                            :extras_json,
                            :wickets_json
                        )
                        ON CONFLICT (delivery_id) DO NOTHING
                        """
                    ),
                    {
                        "delivery_id": delivery_id,
                        "match_id": match_id,
                        "innings_number": innings_number,
                        "over_number": over_number,
                        "ball_number": ball_number,
                        "batter": delivery.get("batter"),
                        "bowler": delivery.get("bowler"),
                        "non_striker": delivery.get(
                            "non_striker"
                        ),
                        "batter_runs": int(
                            runs.get("batter", 0)
                            or 0
                        ),
                        "extras_runs": int(
                            runs.get("extras", 0)
                            or 0
                        ),
                        "total_runs": int(
                            runs.get("total", 0)
                            or 0
                        ),
                        "extras_json": json_text(
                            extras
                        ),
                        "wickets_json": json_text(
                            wickets_list
                        ),
                    },
                )

                delivery_total += 1

    return (
        1,
        innings_total,
        delivery_total,
    )


# ---------------------------------------------------------
# Main importer
# ---------------------------------------------------------

def main() -> None:

    print()
    print("=" * 60)
    print("CRICMASTER - IPL HISTORICAL DATA IMPORTER")
    print("=" * 60)
    print()

    if not DATA_DIR.exists():
        print(
            f"ERROR: IPL data folder not found:\n{DATA_DIR}"
        )
        sys.exit(1)

    json_files = sorted(
        DATA_DIR.glob("*.json")
    )

    print(
        f"IPL JSON files found: {len(json_files)}"
    )

    if not json_files:
        print(
            "ERROR: No IPL JSON files were found."
        )
        sys.exit(1)

    print()
    print("Creating database tables...")

    create_schema()

    print("Database tables ready.")
    print()

    imported_matches = 0
    imported_innings = 0
    imported_deliveries = 0
    failed_matches = 0

    started_at = datetime.now(
        timezone.utc
    )

    for index, json_file in enumerate(
        json_files,
        start=1,
    ):

        try:

            with engine.begin() as connection:

                matches, innings, deliveries = (
                    import_match(
                        connection,
                        json_file,
                    )
                )

                imported_matches += matches
                imported_innings += innings
                imported_deliveries += deliveries

        except Exception as exc:

            failed_matches += 1

            print(
                f"[ERROR] {json_file.name}: {exc}"
            )

        if (
            index % 50 == 0
            or index == len(json_files)
        ):

            print(
                f"Progress: {index}/{len(json_files)} "
                f"| Matches: {imported_matches} "
                f"| Innings: {imported_innings} "
                f"| Deliveries: {imported_deliveries} "
                f"| Failed: {failed_matches}"
            )

    finished_at = datetime.now(
        timezone.utc
    )

    duration = (
        finished_at - started_at
    ).total_seconds()

    print()
    print("=" * 60)
    print("IMPORT COMPLETE")
    print("=" * 60)
    print()
    print(
        f"Matches imported : {imported_matches}"
    )
    print(
        f"Innings imported : {imported_innings}"
    )
    print(
        f"Deliveries       : {imported_deliveries}"
    )
    print(
        f"Failed files     : {failed_matches}"
    )
    print(
        f"Time taken       : {duration:.1f} seconds"
    )
    print()


if __name__ == "__main__":
    main()