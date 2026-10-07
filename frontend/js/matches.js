const matchList = document.getElementById("matchList");
const statusBox = document.getElementById("status");

const upcomingBtn = document.getElementById("upcomingBtn");
const resultsBtn = document.getElementById("resultsBtn");

const seasonSelect = document.getElementById("seasonSelect");


let currentView = "results";
let selectedSeason = "";


/* =========================
   SECURITY
========================= */

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================
   DATE
========================= */

function formatDate(value) {

    if (!value) {
        return "Date unavailable";
    }

    try {

        return new Date(value).toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );

    } catch {

        return value;
    }
}


/* =========================
   LOAD SEASONS
========================= */

async function loadSeasons() {

    try {

        const response = await fetch(
            "/api/ipl/seasons"
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error ||
                "Unable to load IPL seasons"
            );
        }


        const seasons = Array.isArray(data.data)
            ? data.data
            : [];


        seasonSelect.innerHTML = `
            <option value="">
                All Seasons
            </option>
        `;


        seasons
            .sort(
                (a, b) =>
                    Number(b.season) -
                    Number(a.season)
            )
            .forEach(season => {

                const option =
                    document.createElement("option");

                option.value =
                    season.season;

                option.textContent =
                    `IPL ${season.season}`;

                seasonSelect.appendChild(
                    option
                );
            });


    } catch (error) {

        console.error(
            "Season loading error:",
            error
        );

    }
}


/* =========================
   LOAD MATCHES
========================= */

async function loadMatches() {

    statusBox.textContent =
        "Loading IPL matches...";

    matchList.innerHTML = "";


    try {

        let url =
            "/api/ipl/matches?page=1&limit=50";


        if (selectedSeason) {

            url +=
                `&season=${encodeURIComponent(
                    selectedSeason
                )}`;
        }


        const response =
            await fetch(url);


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.error ||
                "Unable to load matches"
            );
        }


        let matches =
            Array.isArray(data.data)
                ? data.data
                : [];


        /*
         * The database contains historical
         * completed IPL matches.
         *
         * Therefore:
         *
         * Results = historical database
         *
         * Upcoming = currently empty here.
         *
         * Live/upcoming current matches are
         * handled by the CricketData API.
         */


        if (currentView === "upcoming") {

            renderUpcomingMessage();

            return;
        }


        statusBox.textContent =
            `${matches.length} matches` +
            (
                selectedSeason
                    ? ` • IPL ${selectedSeason}`
                    : ""
            );


        renderMatches(matches);


    } catch (error) {

        console.error(
            "Matches loading error:",
            error
        );


        statusBox.textContent =
            "Unable to load IPL matches.";


        matchList.innerHTML = `
            <div class="empty">

                <div class="empty-icon">
                    ⚠️
                </div>

                <div class="empty-title">
                    Unable to load matches
                </div>

                <div class="empty-text">
                    ${escapeHTML(error.message)}
                </div>

            </div>
        `;
    }
}


/* =========================
   UPCOMING MESSAGE
========================= */

function renderUpcomingMessage() {

    statusBox.textContent =
        "Upcoming matches come from live cricket data.";


    matchList.innerHTML = `

        <div class="empty">

            <div class="empty-icon">
                🏏
            </div>

            <div class="empty-title">
                Current & Upcoming Matches
            </div>

            <div class="empty-text">
                Open the Live page to view
                current cricket matches from
                the live data provider.
            </div>

        </div>

    `;
}


/* =========================
   RENDER MATCHES
========================= */

function renderMatches(matches) {

    matchList.innerHTML = "";


    if (!matches.length) {

        matchList.innerHTML = `

            <div class="empty">

                <div class="empty-icon">
                    🏏
                </div>

                <div class="empty-title">
                    No IPL matches found
                </div>

                <div class="empty-text">
                    Try selecting another season.
                </div>

            </div>

        `;

        return;
    }


    matches.forEach(match => {

        const card =
            document.createElement("article");


        card.className =
            "match-card";


        const competition =
            match.event_name ||
            "Indian Premier League";


        const matchNumber =
            match.match_number ??
            "-";


        const team1 =
            match.team1 ||
            "TBD";


        const team2 =
            match.team2 ||
            "TBD";


        const winner =
            match.winner ||
            "";


        const venue =
            match.venue ||
            "";


        card.innerHTML = `

            <div class="match-top">

                <div class="competition">
                    ${escapeHTML(competition)}
                </div>

                <div class="match-number">
                    Match ${escapeHTML(matchNumber)}
                </div>

            </div>


            <div class="match-body">

                <div class="teams">

                    <div class="team">

                        <div class="team-name">
                            ${escapeHTML(team1)}
                        </div>

                    </div>


                    <div class="vs">
                        VS
                    </div>


                    <div class="team">

                        <div class="team-name">
                            ${escapeHTML(team2)}
                        </div>

                    </div>

                </div>


                <div class="match-info">

                    <span>
                        📅
                        ${escapeHTML(
                            formatDate(
                                match.match_date
                            )
                        )}
                    </span>

                    ${
                        venue
                            ? `
                                <span>
                                    📍
                                    ${escapeHTML(venue)}
                                </span>
                              `
                            : ""
                    }

                </div>


                ${
                    winner
                        ? `
                            <div class="winner">
                                Winner:
                                <strong>
                                    ${escapeHTML(winner)}
                                </strong>
                            </div>
                          `
                        : ""
                }

            </div>

        `;


        /* Open match details */

        card.addEventListener(
            "click",
            () => {

                window.location.href =
                    `/pages/match-details.html?id=${
                        encodeURIComponent(
                            match.match_id
                        )
                    }`;

            }
        );


        matchList.appendChild(card);

    });
}


/* =========================
   TAB HANDLING
========================= */

function setActiveTab(button) {

    upcomingBtn.classList.remove(
        "active"
    );

    resultsBtn.classList.remove(
        "active"
    );


    button.classList.add(
        "active"
    );
}


/* =========================
   EVENTS
========================= */

upcomingBtn.addEventListener(
    "click",
    () => {

        currentView =
            "upcoming";

        setActiveTab(
            upcomingBtn
        );

        loadMatches();
    }
);


resultsBtn.addEventListener(
    "click",
    () => {

        currentView =
            "results";

        setActiveTab(
            resultsBtn
        );

        loadMatches();
    }
);


seasonSelect.addEventListener(
    "change",
    () => {

        selectedSeason =
            seasonSelect.value;

        currentView =
            "results";

        setActiveTab(
            resultsBtn
        );

        loadMatches();
    }
);


/* =========================
   INITIALIZE
========================= */

async function initialize() {

    await loadSeasons();

    await loadMatches();
}


initialize();