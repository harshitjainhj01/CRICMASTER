CRICMASTER Home Dashboard Fix

Replace these two files in your project:

frontend/pages/home-stitch.html
frontend/js/home-stitch.js

The fixed Home Dashboard:
- removes the Stitch demo values from the HTML
- keeps live/upcoming/results/standings real-data loaders
- reads CricPoints from the authenticated user/session and supported backend responses
- reads Player Spotlight from /api/stats
- reads news from /api/news and uses a live-news fallback without fake headlines
- never restores the old 2,450/Alex Dev demo values

After replacing the files:
1. Restart the FastAPI backend if it is running.
2. Open the Home Dashboard.
3. Press Ctrl+F5 for a hard refresh.
