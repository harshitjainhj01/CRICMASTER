# CRICMASTER — Corrected Development Project

This copy integrates the existing plain HTML/CSS/JavaScript frontend with the FastAPI backend. It intentionally excludes personal local databases, `backend/.env`, and Firebase Admin service-account credentials.

## Requirements

- Windows 10/11
- Python 3.10 or newer
- Your own Firebase Admin SDK service-account JSON for project `cricmaster-b33be`
- A CricketData API key if you want current/live provider data

## Important before installing

1. Back up your current project folder.
2. Keep your existing `backend/.env`, `backend/secrets/firebase-service-account.json`, and `backend/cricmaster.db` if you already have them.
3. Do not send credentials or private keys to anyone. The `.env.example` is only a template.
4. Copy the corrected source into your current project rather than deleting the old project first.

## Configure the backend

From PowerShell, keep the virtual environment at the project root (this matches the usual `(.venv)` prompt for this project):

```powershell
cd "C:\HARSHIT JAIN\cricmaster"
if (!(Test-Path ".\.venv\Scripts\Activate.ps1")) { python -m venv .venv }
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r .\backend\requirements.txt
```

If your root `.venv` is already active, just run:

```powershell
cd "C:\HARSHIT JAIN\cricmaster"
python -m pip install -r .\backend\requirements.txt
```

Create `backend/.env` by copying `backend/.env.example`, then add your own `CRICKETDATA_API_KEY`. Keep the database URL and Firebase credential path consistent with where the files actually live. The expected default credential location is:

`backend/secrets/firebase-service-account.json`

## Historical IPL database

If copying this project to a new folder with no local database, first install the dependencies and configure `backend/.env`, then run the history importer using the documented project script. From the backend folder:

```powershell
python ..\scripts\import_ipl_history.py
```

If you already have an imported `backend/cricmaster.db`, preserve and copy that database instead of re-importing the full dataset. Never overwrite a working database without a separate backup.

## Start the backend

In PowerShell window 1:

```powershell
cd "C:\HARSHIT JAIN\cricmaster\backend"
.\.venv\Scripts\Activate.ps1
python run.py
```

Check `http://127.0.0.1:8000/docs` and `http://127.0.0.1:8000/api/health`.

## Start the frontend

In PowerShell window 2:

```powershell
cd "C:\HARSHIT JAIN\cricmaster\frontend"
python -m http.server 5500 --bind 127.0.0.1
```

Open `http://127.0.0.1:5500/index.html`.

Do not double-click `index.html`; use the local HTTP URL so browser requests have the expected origin. Login pages and Firebase sessions need the same origin each time.

## What is connected

- Current match views: `/api/matches?view=live|upcoming|results`
- Historical IPL matches with season selection and pagination: `/api/ipl/seasons`, `/api/ipl/matches`
- Historical IPL scorecards, detailed scorecards, deliveries and commentary endpoints
- IPL players with backend-side search and pagination
- Team listings and team/player profiles
- Player statistics: `/api/stats`
- Search: `/api/search`
- Series: `/api/series`
- Standings: `/api/standings?season=2026` (select other seasons in the UI)
- News: `/api/news`
- Authenticated profile and protected admin overview

## Notes / limitations

- The live provider may return zero upcoming matches. The UI shows an empty state rather than inventing scheduled fixtures.
- Current live commentary depends on what the current provider exposes. Historical IPL scorecards/commentary/deliveries come from the local imported IPL dataset.
- Admin overview requires an authenticated user with administrator privileges.
- This is a local-development configuration. Before public deployment, set the exact production CORS origins, secure the environment, review access controls and enable HTTPS.

## Validation performed on this package

JavaScript syntax checks and Python compilation checks passed during packaging. Runtime behavior still depends on your local configuration, installed dependencies, Firebase service-account file and local database.
