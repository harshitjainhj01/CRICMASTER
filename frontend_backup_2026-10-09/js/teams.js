const teamList =
    document.getElementById("teamList");

const statusBox =
    document.getElementById("status");


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


async function loadTeams() {

    statusBox.textContent =
        "Loading IPL teams...";

    teamList.innerHTML = "";


    try {

        const response =
            await fetch(
                "/api/ipl/teams"
            );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.error ||
                "Unable to load teams."
            );
        }


        const teams =
            Array.isArray(data.data)
                ? data.data
                : [];


        statusBox.textContent =
            `${teams.length} IPL teams found`;


        renderTeams(teams);


    } catch (error) {

        console.error(
            "Teams API error:",
            error
        );


        statusBox.textContent =
            "Unable to load teams.";


        teamList.innerHTML = `
            <div class="empty">

                <div style="font-size:36px;">
                    ⚠️
                </div>

                <strong>
                    Teams unavailable
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


function renderTeams(teams) {

    if (!teams.length) {

        teamList.innerHTML = `
            <div class="empty">

                <div style="font-size:36px;">
                    🏏
                </div>

                No teams found.

            </div>
        `;

        return;
    }


    teams.forEach(team => {

        const teamName =
            team.team_name ||
            "Unknown Team";


        const card =
            document.createElement(
                "article"
            );


        card.className =
            "team-card";


        card.innerHTML = `

            <div class="team-icon">
                🏏
            </div>

            <div class="team-name">
                ${escapeHTML(teamName)}
            </div>

            <div class="team-link">
                View team profile →
            </div>

        `;


        card.addEventListener(
            "click",
            () => {

                window.location.href =
                    `/pages/team-details.html?team=${encodeURIComponent(
                        teamName
                    )}`;

            }
        );


        teamList.appendChild(card);

    });
}


loadTeams();