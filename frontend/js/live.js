const matchList = document.getElementById("matchList");
const statusBox = document.getElementById("status");
const refreshBtn = document.getElementById("refreshBtn");


function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDate(value) {
    if (!value) {
        return "Time unavailable";
    }

    try {
        return new Date(value).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    } catch {
        return value;
    }
}


function getTeamNames(match) {
    if (
        Array.isArray(match.teams) &&
        match.teams.length >= 2
    ) {
        return {
            team1: match.teams[0],
            team2: match.teams[1]
        };
    }

    return {
        team1: "Team 1",
        team2: "Team 2"
    };
}


function getTeamScore(match, teamName) {
    if (!Array.isArray(match.score)) {
        return "";
    }

    const result = match.score.find(item => {
        const inning = String(
            item?.inning || ""
        ).toLowerCase();

        return inning.includes(
            String(teamName).toLowerCase()
        );
    });

    if (!result) {
        return "";
    }

    const runs = result.r ?? "";
    const wickets = result.w ?? "";
    const overs = result.o ?? "";

    if (runs === "" && wickets === "") {
        return "";
    }

    return `${runs}/${wickets} (${overs})`;
}


function renderMatches(matches) {

    matchList.innerHTML = "";

    if (!matches.length) {
        matchList.innerHTML = `
            <div class="empty">
                <div class="empty-icon">🏏</div>
                <strong>No live matches right now</strong>
                <p>
                    Check again when a match is in progress.
                </p>
            </div>
        `;

        return;
    }


    matches.forEach(match => {

        const {
            team1,
            team2
        } = getTeamNames(match);


        const score1 = getTeamScore(
            match,
            team1
        );

        const score2 = getTeamScore(
            match,
            team2
        );


        const matchName =
            match.name ||
            `${team1} vs ${team2}`;


        const status =
            match.status ||
            "Live";


        const venue =
            match.venue ||
            "Venue unavailable";


        const date =
            match.dateTimeGMT ||
            match.date;


        const card =
            document.createElement("article");


        card.className = "match-card";


        card.innerHTML = `
            <div class="match-header">

                <div class="match-name">
                    ${escapeHTML(matchName)}
                </div>

                <div class="match-meta">
                    ${escapeHTML(venue)}
                    •
                    ${escapeHTML(formatDate(date))}
                </div>

            </div>


            <div class="match-body">

                <div class="team-row">

                    <div class="team">
                        <div class="team-name">
                            ${escapeHTML(team1)}
                        </div>

                        ${
                            score1
                                ? `
                                    <div class="team-score">
                                        ${escapeHTML(score1)}
                                    </div>
                                  `
                                : ""
                        }
                    </div>


                    <div class="vs">
                        VS
                    </div>


                    <div class="team">
                        <div class="team-name">
                            ${escapeHTML(team2)}
                        </div>

                        ${
                            score2
                                ? `
                                    <div class="team-score">
                                        ${escapeHTML(score2)}
                                    </div>
                                  `
                                : ""
                        }
                    </div>

                </div>


                <div class="match-status">
                    🔴 ${escapeHTML(status)}
                </div>

            </div>
        `;


        matchList.appendChild(card);
    });
}


async function loadLiveMatches() {

    statusBox.textContent =
        "Loading live matches...";


    refreshBtn.disabled = true;


    try {

        const response = await fetch(
            "/api/matches?view=live",
            {
                cache: "no-store"
            }
        );


        const data =
            await response.json();


        if (!response.ok || !data.success) {
            throw new Error(
                data.error ||
                `HTTP ${response.status}`
            );
        }


        const matches =
            Array.isArray(data.data)
                ? data.data
                : [];


        statusBox.textContent =
            `${matches.length} live match` +
            `${matches.length === 1 ? "" : "es"}` +
            ` • ${data.cached ? "cached" : "fresh data"}`;


        renderMatches(matches);

    } catch (error) {

        console.error(
            "CRICMASTER Live API Error:",
            error
        );


        statusBox.textContent =
            "Unable to load live cricket data.";


        matchList.innerHTML = `
            <div class="empty">
                <div class="empty-icon">⚠️</div>
                <strong>Live data unavailable</strong>
                <p>
                    ${escapeHTML(error.message)}
                </p>
            </div>
        `;

    } finally {

        refreshBtn.disabled = false;
    }
}


refreshBtn.addEventListener(
    "click",
    loadLiveMatches
);


loadLiveMatches();


// Refresh approximately every 2 minutes.
// The backend cache prevents unnecessary provider requests.
setInterval(
    loadLiveMatches,
    120000
);