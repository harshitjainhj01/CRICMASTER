const statusBox =
    document.getElementById("status");

const container =
    document.getElementById("teamContainer");

const backBtn =
    document.getElementById("backBtn");


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function getTeamName() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return params.get("team");
}


function formatPercent(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0%";
    }

    return `${number.toFixed(2)}%`;
}


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


function renderSeasonTable(seasons) {

    if (
        !Array.isArray(seasons) ||
        !seasons.length
    ) {

        return `
            <div class="empty">
                No season records available.
            </div>
        `;
    }


    return `
        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>
                        <th>Season</th>
                        <th>Matches</th>
                        <th>Wins</th>
                        <th>Losses</th>
                        <th>Win %</th>
                    </tr>

                </thead>

                <tbody>

                    ${seasons.map(season => `

                        <tr>

                            <td>
                                IPL ${escapeHTML(
                                    season.season
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    season.matches
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    season.wins
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    season.losses
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    formatPercent(
                                        season.win_rate
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


function renderPlayers(players) {

    if (
        !Array.isArray(players) ||
        !players.length
    ) {

        return `
            <div class="empty">
                No player records available.
            </div>
        `;
    }


    return `
        <div class="players">

            ${players.map(player => `

                <div class="player">
                    ${escapeHTML(player)}
                </div>

            `).join("")}

        </div>
    `;
}


function renderTeamMatches(matches) {

    if (
        !Array.isArray(matches) ||
        !matches.length
    ) {

        return `
            <div class="empty">
                No match history available.
            </div>
        `;
    }


    return `
        <div class="team-matches">

            ${matches.map(match => {

                const resultClass =
                    String(
                        match.result || ""
                    ).toLowerCase()
                    .replaceAll(" ", "-");


                return `

                    <article
                        class="team-match-card"
                        data-match-id="${escapeHTML(
                            match.match_id
                        )}"
                    >

                        <div class="team-match-top">

                            <div class="team-match-title">

                                vs
                                ${escapeHTML(
                                    match.opponent ||
                                    "Unknown"
                                )}

                            </div>


                            <div
                                class="team-match-result ${escapeHTML(
                                    resultClass
                                )}"
                            >
                                ${escapeHTML(
                                    match.result ||
                                    "Unknown"
                                )}
                            </div>

                        </div>


                        <div class="team-match-meta">

                            IPL
                            ${escapeHTML(
                                match.season
                            )}

                            • Match
                            ${escapeHTML(
                                match.match_number ?? "-"
                            )}

                            •
                            ${escapeHTML(
                                formatDate(
                                    match.match_date
                                )
                            )}

                        </div>


                        <div class="team-match-venue">

                            ${
                                match.venue
                                    ? `📍 ${escapeHTML(
                                        match.venue
                                    )}`
                                    : ""
                            }

                            ${
                                match.city
                                    ? ` • ${escapeHTML(
                                        match.city
                                    )}`
                                    : ""
                            }

                        </div>

                    </article>

                `;

            }).join("")}

        </div>
    `;
}


function renderTeam(
    data,
    matches
) {

    const team =
        data.team ||
        "Unknown Team";

    const totalMatches =
        data.matches ?? 0;

    const wins =
        data.wins ?? 0;

    const losses =
        data.losses ?? 0;

    const winRate =
        data.win_rate ?? 0;

    const players =
        Array.isArray(data.players)
            ? data.players
            : [];

    const seasons =
        Array.isArray(data.seasons)
            ? data.seasons
            : [];


    container.innerHTML = `

        <section class="team-card">

            <div class="team-icon">
                🏏
            </div>


            <h1 class="team-name">
                ${escapeHTML(team)}
            </h1>


            <div class="team-subtitle">
                IPL historical team profile
            </div>


            <div class="stats-grid">

                <div class="stat">
                    <div class="stat-label">
                        Matches
                    </div>

                    <div class="stat-value">
                        ${escapeHTML(
                            totalMatches
                        )}
                    </div>
                </div>


                <div class="stat">
                    <div class="stat-label">
                        Wins
                    </div>

                    <div class="stat-value">
                        ${escapeHTML(wins)}
                    </div>
                </div>


                <div class="stat">
                    <div class="stat-label">
                        Losses
                    </div>

                    <div class="stat-value">
                        ${escapeHTML(losses)}
                    </div>
                </div>


                <div class="stat">
                    <div class="stat-label">
                        Win Rate
                    </div>

                    <div class="stat-value">
                        ${escapeHTML(
                            formatPercent(
                                winRate
                            )
                        )}
                    </div>
                </div>

            </div>

        </section>


        <section class="section">

            <div class="section-title">
                Season-by-Season Record
            </div>

            ${renderSeasonTable(seasons)}

        </section>


        <section class="section">

            <div class="section-title">
                Players Associated With Team
            </div>

            ${renderPlayers(players)}

        </section>


        <section class="section">

            <div class="section-title">
                Match History
            </div>

            ${renderTeamMatches(matches)}

        </section>
    `;


    /*
     * Make each historical match clickable.
     */

    document
        .querySelectorAll(".team-match-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const matchId =
                        card.dataset.matchId;


                    if (!matchId) {
                        return;
                    }


                    window.location.href =
                        `/pages/match-details.html?id=${
                            encodeURIComponent(
                                matchId
                            )
                        }`;

                }
            );

        });
}


async function loadTeam() {

    const team =
        getTeamName();


    if (!team) {

        statusBox.textContent =
            "Team name is missing.";

        container.innerHTML = `
            <div class="empty">
                Invalid team link.
            </div>
        `;

        return;
    }


    try {

        statusBox.textContent =
            "Loading team profile...";


        /*
         * Load profile and match history
         * in parallel.
         */

        const [
            profileResponse,
            matchesResponse
        ] = await Promise.all([

            fetch(
                `/api/ipl/team-profile?team=${encodeURIComponent(
                    team
                )}`
            ),

            fetch(
                `/api/ipl/team-matches?team=${encodeURIComponent(
                    team
                )}&limit=50`
            )

        ]);


        const profileData =
            await profileResponse.json();

        const matchesData =
            await matchesResponse.json();


        if (
            !profileResponse.ok ||
            !profileData.success
        ) {

            throw new Error(
                profileData.detail ||
                profileData.error ||
                "Team profile could not be loaded."
            );
        }


        if (
            !matchesResponse.ok ||
            !matchesData.success
        ) {

            throw new Error(
                matchesData.detail ||
                matchesData.error ||
                "Team match history could not be loaded."
            );
        }


        const matches =
            Array.isArray(matchesData.data)
                ? matchesData.data
                : [];


        renderTeam(
            profileData,
            matches
        );


        statusBox.textContent =
            "Team profile loaded";


    } catch (error) {

        console.error(
            "Team profile error:",
            error
        );


        statusBox.textContent =
            "Unable to load team.";


        container.innerHTML = `
            <div class="empty">

                <div style="font-size:36px;">
                    ⚠️
                </div>

                <strong>
                    Team unavailable
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


backBtn.addEventListener(
    "click",
    () => {
        window.history.back();
    }
);


loadTeam();