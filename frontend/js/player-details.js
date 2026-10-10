const statusBox =
    document.getElementById("status");

const container =
    document.getElementById("playerContainer");

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


function getPlayerName() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return params.get("player");
}


function displayName(name) {

    if (name === "V Kohli") {
        return "Virat Kohli";
    }

    return name;
}


function renderPlayer(data) {

    const name =
        data.player || "Unknown Player";

    const teams =
        Array.isArray(data.teams)
            ? data.teams
            : [];


    const batting =
        data.batting || {};

    const bowling =
        data.bowling || {};


    const prettyName =
        displayName(name);


    container.innerHTML = `

        <section class="profile-card">

            <h1 class="player-name">

                ${escapeHTML(prettyName)}

            </h1>


            <div class="player-teams">

                ${
                    teams.length
                        ? escapeHTML(
                            teams.join(" • ")
                        )
                        : "IPL player"
                }

            </div>


            <div class="stats-grid">

                <div class="stat-box">

                    <div class="stat-label">
                        IPL Matches
                    </div>

                    <div class="stat-value">
                        ${escapeHTML(
                            data.matches ?? 0
                        )}
                    </div>

                </div>


                <div class="stat-box">

                    <div class="stat-label">
                        Runs
                    </div>

                    <div class="stat-value">
                        ${escapeHTML(
                            batting.runs ?? 0
                        )}
                    </div>

                </div>


                <div class="stat-box">

                    <div class="stat-label">
                        Wickets
                    </div>

                    <div class="stat-value">
                        ${escapeHTML(
                            bowling.wickets ?? 0
                        )}
                    </div>

                </div>


                <div class="stat-box">

                    <div class="stat-label">
                        Strike Rate
                    </div>

                    <div class="stat-value">
                        ${escapeHTML(
                            batting.strike_rate ?? 0
                        )}
                    </div>

                </div>

            </div>

        </section>


        <section class="section">

            <div class="section-title">
                Batting Statistics
            </div>


            <div class="table-wrapper">

                <table>

                    <thead>

                        <tr>
                            <th>Statistic</th>
                            <th>Value</th>
                        </tr>

                    </thead>


                    <tbody>

                        <tr>
                            <td>Matches</td>
                            <td>
                                ${escapeHTML(
                                    batting.matches ?? 0
                                )}
                            </td>
                        </tr>


                        <tr>
                            <td>Runs</td>
                            <td>
                                ${escapeHTML(
                                    batting.runs ?? 0
                                )}
                            </td>
                        </tr>


                        <tr>
                            <td>Balls Faced</td>
                            <td>
                                ${escapeHTML(
                                    batting.balls ?? 0
                                )}
                            </td>
                        </tr>


                        <tr>
                            <td>Fours</td>
                            <td>
                                ${escapeHTML(
                                    batting.fours ?? 0
                                )}
                            </td>
                        </tr>


                        <tr>
                            <td>Sixes</td>
                            <td>
                                ${escapeHTML(
                                    batting.sixes ?? 0
                                )}
                            </td>
                        </tr>


                        <tr>
                            <td>Strike Rate</td>
                            <td>
                                ${escapeHTML(
                                    batting.strike_rate ?? 0
                                )}
                            </td>
                        </tr>

                    </tbody>

                </table>

            </div>

        </section>


        <section class="section">

            <div class="section-title">
                Bowling Statistics
            </div>


            <div class="table-wrapper">

                <table>

                    <thead>

                        <tr>
                            <th>Statistic</th>
                            <th>Value</th>
                        </tr>

                    </thead>


                    <tbody>

                        <tr>
                            <td>Matches</td>
                            <td>
                                ${escapeHTML(
                                    bowling.matches ?? 0
                                )}
                            </td>
                        </tr>


                        <tr>
                            <td>Overs</td>
                            <td>
                                ${escapeHTML(
                                    bowling.overs ?? 0
                                )}
                            </td>
                        </tr>


                        <tr>
                            <td>Deliveries</td>
                            <td>
                                ${escapeHTML(
                                    bowling.deliveries ?? 0
                                )}
                            </td>
                        </tr>


                        <tr>
                            <td>Runs Conceded</td>
                            <td>
                                ${escapeHTML(
                                    bowling.runs_conceded ?? 0
                                )}
                            </td>
                        </tr>


                        <tr>
                            <td>Wickets</td>
                            <td>
                                ${escapeHTML(
                                    bowling.wickets ?? 0
                                )}
                            </td>
                        </tr>


                        <tr>
                            <td>Economy</td>
                            <td>
                                ${escapeHTML(
                                    bowling.economy ?? 0
                                )}
                            </td>
                        </tr>

                    </tbody>

                </table>

            </div>

        </section>

    `;
}


async function loadPlayer() {

    const player =
        getPlayerName();


    if (!player) {

        statusBox.textContent =
            "Player name is missing.";

        container.innerHTML = `
            <div class="empty">
                Invalid player link.
            </div>
        `;

        return;
    }


    try {

        statusBox.textContent =
            "Loading player statistics...";


        const response =
            await fetch(`http://127.0.0.1:8000/api/ipl/player-profile?player=${encodeURIComponent(
                    player
                )}`
            );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.detail ||
                data.error ||
                "Player could not be loaded."
            );
        }


        renderPlayer(data);


        statusBox.textContent =
            "Player statistics loaded";


    } catch (error) {

        console.error(
            "Player profile error:",
            error
        );


        statusBox.textContent =
            "Unable to load player.";


        container.innerHTML = `
            <div class="empty">

                <div style="font-size:36px;">
                    ⚠️
                </div>

                <strong>
                    Player unavailable
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


loadPlayer();