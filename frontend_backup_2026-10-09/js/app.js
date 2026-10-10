document.addEventListener("DOMContentLoaded", async () => {

    setupTheme();

    await loadLiveMatches();

});


function setupTheme() {

    const button =
        document.getElementById("themeToggle");

    if (!button) {
        return;
    }

    button.addEventListener("click", () => {

        document.body.classList.toggle("light-mode");

        button.textContent =
            document.body.classList.contains("light-mode")
                ? "☀️"
                : "🌙";

    });

}


async function loadLiveMatches() {

    const container =
        document.getElementById("liveMatches");

    if (!container) {
        return;
    }

    try {

        const result =
            await API.liveMatches();

        if (!result.success) {

            container.innerHTML = `
                <div class="loading-card">
                    ${escapeHtml(result.error)}
                </div>
            `;

            return;
        }

        const matches =
            result.data?.data || [];

        if (!matches.length) {

            container.innerHTML = `
                <div class="loading-card">
                    No live cricket matches right now.
                </div>
            `;

            return;
        }

        container.innerHTML =
            matches
                .slice(0, 6)
                .map(renderMatchCard)
                .join("");

    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <div class="loading-card">
                Unable to load live cricket data.
            </div>
        `;
    }
}


function renderMatchCard(match) {

    const localTeam =
        match.localteam?.data?.name ||
        match.localteam?.name ||
        "Team A";

    const visitorTeam =
        match.visitorteam?.data?.name ||
        match.visitorteam?.name ||
        "Team B";

    return `
        <article class="match-card">

            <span class="match-status">
                LIVE
            </span>

            <div class="match-teams">

                <div class="team-row">
                    <span class="team-name">
                        ${escapeHtml(localTeam)}
                    </span>

                    <span class="score">
                        -
                    </span>
                </div>

                <div class="team-row">
                    <span class="team-name">
                        ${escapeHtml(visitorTeam)}
                    </span>

                    <span class="score">
                        -
                    </span>
                </div>

            </div>

            <div class="match-meta">
                Fixture ID: ${escapeHtml(String(match.id ?? "-"))}
            </div>

        </article>
    `;
}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}