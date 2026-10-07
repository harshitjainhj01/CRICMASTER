const statusBox = document.getElementById("status");
const container = document.getElementById("matchContainer");
const backBtn = document.getElementById("backBtn");


function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function getMatchId() {
    const params = new URLSearchParams(
        window.location.search
    );

    return params.get("id");
}


function formatDate(value) {
    if (!value) {
        return "Unavailable";
    }

    try {
        return new Date(value).toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );
    } catch {
        return value;
    }
}


function formatNumber(value, decimals = 2) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toFixed(decimals);
}


/* =========================================
   BATTING TABLE
========================================= */

function renderBattingTable(players) {

    if (!Array.isArray(players) || !players.length) {
        return `
            <div class="empty-table">
                No batting data available.
            </div>
        `;
    }

    return `
        <div class="scorecard-table-wrapper">

            <table class="scorecard-table">

                <thead>
                    <tr>
                        <th>Batter</th>
                        <th>R</th>
                        <th>B</th>
                        <th>4s</th>
                        <th>6s</th>
                        <th>SR</th>
                    </tr>
                </thead>

                <tbody>

                    ${players.map(player => `
                        <tr>

                            <td>
                                ${escapeHTML(player.player)}
                            </td>

                            <td>
                                ${escapeHTML(player.runs)}
                            </td>

                            <td>
                                ${escapeHTML(player.balls)}
                            </td>

                            <td>
                                ${escapeHTML(player.fours)}
                            </td>

                            <td>
                                ${escapeHTML(player.sixes)}
                            </td>

                            <td>
                                ${escapeHTML(
                                    formatNumber(
                                        player.strike_rate
                                    )
                                )}
                            </td>

                        </tr>
                    `).join("")}

                </tbody>

            </table>

        </div>
    `;
}


/* =========================================
   BOWLING TABLE
========================================= */

function renderBowlingTable(players) {

    if (!Array.isArray(players) || !players.length) {
        return `
            <div class="empty-table">
                No bowling data available.
            </div>
        `;
    }

    return `
        <div class="scorecard-table-wrapper">

            <table class="scorecard-table">

                <thead>
                    <tr>
                        <th>Bowler</th>
                        <th>O</th>
                        <th>R</th>
                        <th>W</th>
                        <th>Econ</th>
                    </tr>
                </thead>

                <tbody>

                    ${players.map(player => `
                        <tr>

                            <td>
                                ${escapeHTML(player.player)}
                            </td>

                            <td>
                                ${escapeHTML(player.overs)}
                            </td>

                            <td>
                                ${escapeHTML(player.runs)}
                            </td>

                            <td>
                                ${escapeHTML(player.wickets)}
                            </td>

                            <td>
                                ${escapeHTML(
                                    formatNumber(
                                        player.economy
                                    )
                                )}
                            </td>

                        </tr>
                    `).join("")}

                </tbody>

            </table>

        </div>
    `;
}


/* =========================================
   INNINGS
========================================= */

function renderInnings(innings) {

    if (!Array.isArray(innings) || !innings.length) {
        return `
            <div class="empty">
                No innings data available.
            </div>
        `;
    }

    return innings.map(inning => {

        const battingTeam =
            inning.batting_team || "Batting Team";

        const runs =
            inning.total_runs ?? 0;

        const wickets =
            inning.wickets ?? 0;

        const overs =
            inning.overs ?? 0;

        return `
            <div class="innings-card">

                <div class="innings-heading">

                    <div class="innings-heading-title">
                        ${escapeHTML(battingTeam)}
                    </div>

                    <div class="innings-heading-score">
                        ${escapeHTML(runs)}
                        /
                        ${escapeHTML(wickets)}
                        •
                        ${escapeHTML(overs)}
                        overs
                    </div>

                </div>


                <div class="table-section-title">
                    Batting
                </div>

                ${renderBattingTable(inning.batting)}


                <div class="table-section-title">
                    Bowling
                </div>

                ${renderBowlingTable(inning.bowling)}

            </div>
        `;

    }).join("");
}


/* =========================================
   RENDER MATCH
========================================= */

function renderMatch(data) {

    const match = data.match || {};

    const innings = Array.isArray(data.innings)
        ? data.innings
        : [];

    const team1 =
        match.team1 || "Team 1";

    const team2 =
        match.team2 || "Team 2";

    const winner =
        match.winner || "Not available";

    const playerOfMatch =
        match.player_of_match || "Not available";

    const venue =
        match.venue || "Venue unavailable";

    const city =
        match.city || "";

    const tossWinner =
        match.toss_winner || "Not available";

    const tossDecision =
        match.toss_decision || "";


    container.innerHTML = `

        <section class="hero-card">

            <div class="hero-top">

                <div class="competition">
                    ${escapeHTML(
                        match.event_name ||
                        "Indian Premier League"
                    )}
                </div>

                <div class="match-title">
                    ${escapeHTML(team1)}
                    vs
                    ${escapeHTML(team2)}
                </div>

                <div class="match-meta">

                    Match
                    ${escapeHTML(
                        match.match_number ?? "-"
                    )}

                    • IPL
                    ${escapeHTML(
                        match.season ?? "-"
                    )}

                    •
                    ${escapeHTML(
                        formatDate(match.match_date)
                    )}

                </div>

            </div>


            <div class="teams">

                <div class="team-box">

                    <div class="team-name">
                        ${escapeHTML(team1)}
                    </div>

                </div>


                <div class="vs">
                    VS
                </div>


                <div class="team-box">

                    <div class="team-name">
                        ${escapeHTML(team2)}
                    </div>

                </div>

            </div>


            <div class="winner">

                Winner:

                <strong>
                    ${escapeHTML(winner)}
                </strong>

            </div>


            <div class="info-grid">

                <div class="info-item">

                    <div class="info-label">
                        Venue
                    </div>

                    <div class="info-value">
                        ${escapeHTML(venue)}
                    </div>

                </div>


                <div class="info-item">

                    <div class="info-label">
                        City
                    </div>

                    <div class="info-value">
                        ${escapeHTML(city || "-")}
                    </div>

                </div>


                <div class="info-item">

                    <div class="info-label">
                        Player of Match
                    </div>

                    <div class="info-value">
                        ${escapeHTML(playerOfMatch)}
                    </div>

                </div>

            </div>

        </section>


        <section class="section">

            <div class="section-title">
                Full Scorecard
            </div>

            <div class="innings">

                ${renderInnings(innings)}

            </div>

        </section>


        <section class="section">

            <div class="section-title">
                Match Information
            </div>

            <div class="details-grid">

                <div class="detail-item">

                    <div class="detail-label">
                        Toss Winner
                    </div>

                    <div class="detail-value">
                        ${escapeHTML(tossWinner)}
                    </div>

                </div>


                <div class="detail-item">

                    <div class="detail-label">
                        Toss Decision
                    </div>

                    <div class="detail-value">
                        ${escapeHTML(
                            tossDecision || "-"
                        )}
                    </div>

                </div>


                <div class="detail-item">

                    <div class="detail-label">
                        Match Type
                    </div>

                    <div class="detail-value">
                        ${escapeHTML(
                            match.match_type || "-"
                        )}
                    </div>

                </div>


                <div class="detail-item">

                    <div class="detail-label">
                        Gender
                    </div>

                    <div class="detail-value">
                        ${escapeHTML(
                            match.gender || "-"
                        )}
                    </div>

                </div>

            </div>

        </section>


        <!-- =====================================
             BALL-BY-BALL COMMENTARY
        ====================================== -->

        <section class="section">

            <div class="section-title">
                Ball-by-Ball Commentary
            </div>

            <div
                id="commentaryContainer"
                class="commentary-list"
            >

                <div class="empty">
                    Loading commentary...
                </div>

            </div>

        </section>

    `;
}


/* =========================================
   LOAD COMMENTARY
========================================= */

async function loadCommentary(
    matchId,
    inningsNumber
) {

    try {

        const response = await fetch(
            `/api/ipl/matches/${encodeURIComponent(
                matchId
            )}/commentary?innings=${inningsNumber}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.detail ||
                data.error ||
                "Commentary unavailable"
            );
        }

        return Array.isArray(data.data)
            ? data.data
            : [];

    } catch (error) {

        console.error(
            "Commentary error:",
            error
        );

        return [];
    }
}


/* =========================================
   BALL TEXT
========================================= */

function buildBallText(ball) {

    const batter =
        ball.batter || "Batter";

    const bowler =
        ball.bowler || "Bowler";

    const totalRuns =
        Number(ball.total_runs || 0);

    const batterRuns =
        Number(ball.batter_runs || 0);

    const extrasRuns =
        Number(ball.extras_runs || 0);

    const wickets =
        Array.isArray(ball.wickets)
            ? ball.wickets
            : [];


    let message =
        `<strong>${escapeHTML(
            batter
        )}</strong> faced ` +
        `<strong>${escapeHTML(
            bowler
        )}</strong>`;


    if (wickets.length > 0) {

        const dismissed =
            wickets
                .map(wicket =>
                    wicket.player_out || ""
                )
                .filter(Boolean)
                .join(", ");


        message += dismissed
            ? ` — WICKET: <strong>${escapeHTML(
                dismissed
            )}</strong>`
            : " — WICKET";

    } else if (batterRuns === 6) {

        message += " — SIX";

    } else if (batterRuns === 4) {

        message += " — FOUR";

    } else if (totalRuns === 0) {

        message += " — Dot ball";

    } else {

        message +=
            ` — ${escapeHTML(totalRuns)} ` +
            `run${totalRuns === 1 ? "" : "s"}`;
    }


    if (extrasRuns > 0) {

        message +=
            ` • Extras ${escapeHTML(
                extrasRuns
            )}`;
    }


    return message;
}


/* =========================================
   LOAD MATCH
========================================= */

async function loadMatch() {

    const matchId = getMatchId();


    if (!matchId) {

        statusBox.textContent =
            "Match ID is missing.";

        container.innerHTML = `
            <div class="empty">
                Invalid match link.
            </div>
        `;

        return;
    }


    try {

        statusBox.textContent =
            "Loading detailed scorecard...";


        /* -----------------------------------
           Load scorecard
        ----------------------------------- */

        const response = await fetch(
            `/api/ipl/matches/${encodeURIComponent(
                matchId
            )}/scorecard/detailed`
        );


        const data = await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.detail ||
                data.error ||
                "Scorecard could not be loaded."
            );
        }


        /* -----------------------------------
           Render scorecard
        ----------------------------------- */

        renderMatch(data);


        /* -----------------------------------
           Find commentary container
        ----------------------------------- */

        const commentaryContainer =
            document.getElementById(
                "commentaryContainer"
            );


        if (!commentaryContainer) {

            console.error(
                "Commentary container not found."
            );

            return;
        }


        commentaryContainer.innerHTML = `
            <div class="empty">
                Loading ball-by-ball commentary...
            </div>
        `;


        let commentaryHTML = "";


        /* -----------------------------------
           Load each innings
        ----------------------------------- */

        for (const inning of data.innings || []) {

            const inningsNumber =
                inning.innings_number;


            const balls =
                await loadCommentary(
                    matchId,
                    inningsNumber
                );


            if (!balls.length) {
                continue;
            }


            let currentOver = null;


            /* --------------------------------
               Process deliveries
            -------------------------------- */

            balls.forEach(ball => {

                if (
                    currentOver !== ball.over
                ) {

                    currentOver =
                        ball.over;


                    commentaryHTML += `

                        <div class="over-block">

                            <div class="over-title">
                                Over
                                ${
                                    Number(
                                        ball.over
                                    ) + 1
                                }
                            </div>

                        </div>

                    `;
                }


                let resultClass = "";


                if (
                    Array.isArray(
                        ball.wickets
                    ) &&
                    ball.wickets.length > 0
                ) {

                    resultClass =
                        "wicket";

                } else if (
                    Number(ball.batter_runs) === 6
                ) {

                    resultClass =
                        "run-6";

                } else if (
                    Number(ball.batter_runs) === 4
                ) {

                    resultClass =
                        "run-4";

                } else if (
                    Number(ball.total_runs) === 0
                ) {

                    resultClass =
                        "run-0";
                }


                const result =
                    (
                        Array.isArray(ball.wickets) &&
                        ball.wickets.length > 0
                    )
                        ? "W"
                        : ball.total_runs;


                commentaryHTML += `

                    <div class="ball-row">

                        <div class="ball-number">

                            ${
                                Number(
                                    ball.over
                                ) + 1
                            }.${ball.ball}

                        </div>


                        <div class="ball-text">

                            ${buildBallText(ball)}

                        </div>


                        <div class="ball-result ${resultClass}">

                            ${escapeHTML(result)}

                        </div>

                    </div>

                `;
            });
        }


        /* -----------------------------------
           Show commentary
        ----------------------------------- */

        if (commentaryHTML) {

            commentaryContainer.innerHTML =
                commentaryHTML;

        } else {

            commentaryContainer.innerHTML = `
                <div class="empty">
                    Ball-by-ball commentary
                    is not available for this match.
                </div>
            `;
        }


        statusBox.textContent =
            "Detailed scorecard loaded";


    } catch (error) {

        console.error(
            "Detailed scorecard error:",
            error
        );


        statusBox.textContent =
            "Unable to load scorecard.";


        container.innerHTML = `
            <div class="empty">

                <div style="font-size:36px;">
                    ⚠️
                </div>

                <strong>
                    Scorecard unavailable
                </strong>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>
        `;
    }
}


/* =========================================
   BACK BUTTON
========================================= */

backBtn.addEventListener(
    "click",
    () => {
        window.history.back();
    }
);


/* =========================================
   START
========================================= */

loadMatch();