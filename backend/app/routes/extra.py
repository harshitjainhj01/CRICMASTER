from __future__ import annotations

import os
import xml.etree.ElementTree as ET
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text

from app.database.connection import engine, settings
from app.models.user import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api", tags=["Project Features"])


def rows(result) -> list[dict[str, Any]]:
    return [dict(row) for row in result.mappings().all()]


@router.get("/stats")
def get_stats(
    season: int | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
):
    params = {"season": season, "limit": limit}
    clause = " AND m.season = :season" if season is not None else ""

    with engine.connect() as db:
        top_runs = rows(db.execute(text(f"""
            SELECT d.batter AS player,
                   COUNT(DISTINCT d.match_id) AS matches,
                   COALESCE(SUM(d.batter_runs),0) AS runs,
                   COALESCE(SUM(CASE WHEN d.batter_runs=4 THEN 1 ELSE 0 END),0) AS fours,
                   COALESCE(SUM(CASE WHEN d.batter_runs=6 THEN 1 ELSE 0 END),0) AS sixes,
                   COALESCE(SUM(CASE WHEN COALESCE(json_extract(d.extras_json,'$.wides'),0)=0 THEN 1 ELSE 0 END),0) AS balls
            FROM ipl_deliveries d
            JOIN ipl_matches m ON m.match_id=d.match_id
            WHERE 1=1 {clause}
            GROUP BY d.batter
            ORDER BY runs DESC, player ASC
            LIMIT :limit
        """), params))

        top_wickets = rows(db.execute(text(f"""
            SELECT d.bowler AS player,
                   COUNT(DISTINCT d.match_id) AS matches,
                   COUNT(*) AS wickets
            FROM ipl_deliveries d
            JOIN ipl_matches m ON m.match_id=d.match_id
            JOIN json_each(d.wickets_json) w
            WHERE lower(COALESCE(json_extract(w.value,'$.kind'),'')) NOT IN
                  ('retired hurt','retired out','obstructing the field')
              {clause}
            GROUP BY d.bowler
            ORDER BY wickets DESC, player ASC
            LIMIT :limit
        """), params))

        best_sr = rows(db.execute(text(f"""
            SELECT d.batter AS player,
                   COUNT(DISTINCT d.match_id) AS matches,
                   COALESCE(SUM(d.batter_runs),0) AS runs,
                   COALESCE(SUM(CASE WHEN COALESCE(json_extract(d.extras_json,'$.wides'),0)=0 THEN 1 ELSE 0 END),0) AS balls
            FROM ipl_deliveries d
            JOIN ipl_matches m ON m.match_id=d.match_id
            WHERE 1=1 {clause}
            GROUP BY d.batter
            HAVING balls >= 100
            ORDER BY CAST(runs AS REAL)/balls DESC, runs DESC
            LIMIT :limit
        """), params))

        most_sixes = rows(db.execute(text(f"""
            SELECT d.batter AS player,
                   COUNT(DISTINCT d.match_id) AS matches,
                   COALESCE(SUM(CASE WHEN d.batter_runs=6 THEN 1 ELSE 0 END),0) AS sixes
            FROM ipl_deliveries d
            JOIN ipl_matches m ON m.match_id=d.match_id
            WHERE 1=1 {clause}
            GROUP BY d.batter
            ORDER BY sixes DESC, player ASC
            LIMIT :limit
        """), params))

        most_fours = rows(db.execute(text(f"""
            SELECT d.batter AS player,
                   COUNT(DISTINCT d.match_id) AS matches,
                   COALESCE(SUM(CASE WHEN d.batter_runs=4 THEN 1 ELSE 0 END),0) AS fours
            FROM ipl_deliveries d
            JOIN ipl_matches m ON m.match_id=d.match_id
            WHERE 1=1 {clause}
            GROUP BY d.batter
            ORDER BY fours DESC, player ASC
            LIMIT :limit
        """), params))

        best_economy = rows(db.execute(text(f"""
            SELECT d.bowler AS player,
                   COUNT(DISTINCT d.match_id) AS matches,
                   COALESCE(SUM(CASE WHEN COALESCE(json_extract(d.extras_json,'$.wides'),0)=0
                                      AND COALESCE(json_extract(d.extras_json,'$.noballs'),0)=0
                                     THEN 1 ELSE 0 END),0) AS legal_balls,
                   COALESCE(SUM(d.total_runs
                      - COALESCE(json_extract(d.extras_json,'$.byes'),0)
                      - COALESCE(json_extract(d.extras_json,'$.legbyes'),0)),0) AS runs_conceded
            FROM ipl_deliveries d
            JOIN ipl_matches m ON m.match_id=d.match_id
            WHERE 1=1 {clause}
            GROUP BY d.bowler
            HAVING legal_balls >= 120
            ORDER BY CAST(runs_conceded AS REAL)/legal_balls ASC
            LIMIT :limit
        """), params))

    for p in top_runs + best_sr:
        b = int(p.get("balls") or 0)
        p["strike_rate"] = round(int(p.get("runs") or 0) * 100 / b, 2) if b else 0
    for p in best_economy:
        b = int(p.get("legal_balls") or 0)
        p["overs"] = f"{b//6}.{b%6}"
        p["economy"] = round(int(p.get("runs_conceded") or 0) * 6 / b, 2) if b else 0

    return {
        "success": True,
        "season": season,
        "top_runs": top_runs,
        "top_wickets": top_wickets,
        "best_strike_rate": best_sr,
        "most_sixes": most_sixes,
        "most_fours": most_fours,
        "best_economy": best_economy,
    }


@router.get("/search")
def search_all(
    q: str = Query(..., min_length=2),
    limit: int = Query(default=15, ge=1, le=50),
):
    pattern = f"%{q}%"
    with engine.connect() as db:
        players = rows(db.execute(text("""
            SELECT player_name FROM ipl_players
            WHERE player_name LIKE :p
            ORDER BY player_name LIMIT :limit
        """), {"p": pattern, "limit": limit}))
        teams = rows(db.execute(text("""
            SELECT team_name FROM ipl_teams
            WHERE team_name LIKE :p
            ORDER BY team_name LIMIT :limit
        """), {"p": pattern, "limit": limit}))
        matches = rows(db.execute(text("""
            SELECT match_id, season, match_number, match_date, team1, team2, winner
            FROM ipl_matches
            WHERE team1 LIKE :p OR team2 LIKE :p OR event_name LIKE :p
            ORDER BY match_date DESC LIMIT :limit
        """), {"p": pattern, "limit": limit}))
    return {"success": True, "query": q, "players": players, "teams": teams, "matches": matches}


@router.get("/series")
def get_series():
    with engine.connect() as db:
        data = rows(db.execute(text("""
            SELECT season, COUNT(*) AS matches,
                   MIN(match_date) AS start_date,
                   MAX(match_date) AS end_date
            FROM ipl_matches
            GROUP BY season ORDER BY season DESC
        """)))
    return {"success": True, "count": len(data), "data": data}


@router.get("/standings")
def get_standings(season: str = Query(..., min_length=4, max_length=9)):
    with engine.connect() as db:
        matches = rows(db.execute(text("""
            SELECT match_id, team1, team2, winner, outcome_json
            FROM ipl_matches WHERE season=:season
        """), {"season": season}))
        innings = rows(db.execute(text("""
            SELECT i.match_id, i.batting_team, i.total_runs,
                   COALESCE(SUM(CASE
                       WHEN COALESCE(json_extract(d.extras_json,'$.wides'),0)=0
                        AND COALESCE(json_extract(d.extras_json,'$.noballs'),0)=0
                       THEN 1 ELSE 0 END),0) AS legal_balls
            FROM ipl_innings i
            LEFT JOIN ipl_deliveries d
              ON d.match_id=i.match_id AND d.innings_number=i.innings_number
            JOIN ipl_matches m ON m.match_id=i.match_id
            WHERE m.season=:season
            GROUP BY i.innings_id, i.match_id, i.batting_team, i.total_runs
        """), {"season": season}))

    teams: dict[str, dict[str, Any]] = {}
    for m in matches:
        for t in (m["team1"], m["team2"]):
            if t and t not in teams:
                teams[t] = {"team": t, "played": 0, "wins": 0, "losses": 0,
                            "no_results": 0, "points": 0, "rf": 0, "ra": 0,
                            "bf": 0, "ba": 0}
        if not m["team1"] or not m["team2"]:
            continue
        teams[m["team1"]]["played"] += 1
        teams[m["team2"]]["played"] += 1
        w = m["winner"]
        if w == m["team1"]:
            teams[m["team1"]]["wins"] += 1; teams[m["team1"]]["points"] += 2; teams[m["team2"]]["losses"] += 1
        elif w == m["team2"]:
            teams[m["team2"]]["wins"] += 1; teams[m["team2"]]["points"] += 2; teams[m["team1"]]["losses"] += 1
        else:
            teams[m["team1"]]["no_results"] += 1; teams[m["team2"]]["no_results"] += 1
            teams[m["team1"]]["points"] += 1; teams[m["team2"]]["points"] += 1

    pair = {m["match_id"]:(m["team1"],m["team2"]) for m in matches}
    for i in innings:
        t = i["batting_team"]; mid=i["match_id"]
        if t not in teams or mid not in pair: continue
        t1,t2=pair[mid]; opp=t2 if t==t1 else t1
        runs=int(i["total_runs"] or 0); balls=int(i["legal_balls"] or 0)
        teams[t]["rf"] += runs; teams[t]["bf"] += balls
        if opp in teams: teams[opp]["ra"] += runs; teams[opp]["ba"] += balls

    out=[]
    for x in teams.values():
        nrr = (x["rf"]/(x["bf"]/6) if x["bf"] else 0) - (x["ra"]/(x["ba"]/6) if x["ba"] else 0)
        out.append({k:x[k] for k in ("team","played","wins","losses","no_results","points")}|{"nrr":round(nrr,3)})
    out.sort(key=lambda x:(-x["points"],-x["nrr"],-x["wins"],x["team"]))
    for i,x in enumerate(out,1): x["position"]=i
    return {"success":True,"season":season,"data":out}


@router.get("/news")
async def get_news():
    rss_url = settings.cricmaster_news_rss_url.strip() or os.getenv("CRICMASTER_NEWS_RSS_URL", "").strip()
    if not rss_url:
        return {"success":True,"configured":False,"data":[{"title":"Open Official IPL News","source":"IPL","url":"https://www.iplt20.com/news"}]}
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r=await client.get(rss_url); r.raise_for_status()
        root=ET.fromstring(r.text); items=[]
        for item in root.findall(".//item")[:20]:
            items.append({"title":item.findtext("title") or "Untitled",
                          "url":item.findtext("link") or "",
                          "published":item.findtext("pubDate") or "",
                          "source":"RSS"})
        return {"success":True,"configured":True,"data":items}
    except Exception as exc:
        return {"success":False,"configured":True,"error":str(exc),"data":[]}


@router.get("/admin/overview")
def admin_overview(user: User = Depends(get_current_user)):
    allowed = bool(getattr(user,"is_admin",False) or str(getattr(user,"role","")).lower()=="admin")
    if not allowed:
        raise HTTPException(status_code=403, detail="Administrator access required.")
    candidates={"users":["users","user"],"login_events":["login_events","login_event"],"reviews":["reviews","review"],"points":["stake_points","stakepoint"]}
    counts={}
    with engine.connect() as db:
        for key, names in candidates.items():
            value=0
            for name in names:
                exists=db.execute(text("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=:name"),{"name":name}).scalar_one()
                if exists:
                    value=db.execute(text(f'SELECT COUNT(*) FROM "{name}"')).scalar_one(); break
            counts[key]=int(value)
    return {"success":True,"user":{"id":getattr(user,"id",None),"email":getattr(user,"email",None)},"counts":counts}
