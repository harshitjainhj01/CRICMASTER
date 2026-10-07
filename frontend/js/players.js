const searchInput =
    document.getElementById("playerSearch");

const searchButton =
    document.getElementById("searchBtn");

const playerList =
    document.getElementById("playerList");

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


async function searchPlayers() {

    const query =
        searchInput.value.trim();


    if (query.length < 2) {

        statusBox.textContent =
            "Enter at least 2 characters.";

        playerList.innerHTML = "";

        return;
    }


    statusBox.textContent =
        "Searching players...";

    playerList.innerHTML = "";


    try {

        const response =
            await fetch(
                `/api/ipl/players?search=${encodeURIComponent(
                    query
                )}&limit=50`
            );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.error ||
                "Player search failed."
            );
        }


        const players =
            Array.isArray(data.data)
                ? data.data
                : [];


        statusBox.textContent =
            `${players.length} player${
                players.length === 1
                    ? ""
                    : "s"
            } found`;


        renderPlayers(players);


    } catch (error) {

        console.error(
            "Player search error:",
            error
        );


        statusBox.textContent =
            "Unable to search players.";


        playerList.innerHTML = `
            <div class="empty">

                <div class="empty-icon">
                    ⚠️
                </div>

                ${escapeHTML(
                    error.message
                )}

            </div>
        `;
    }
}


function renderPlayers(players) {

    if (!players.length) {

        playerList.innerHTML = `

            <div class="empty">

                <div class="empty-icon">
                    🏏
                </div>

                No player found.

            </div>

        `;

        return;
    }


    players.forEach(player => {

        const card =
            document.createElement("article");


        card.className =
            "player-card";


        const name =
            player.player_name ||
            "Unknown Player";


        card.innerHTML = `

            <div class="player-name">
                ${escapeHTML(name)}
            </div>

            <div class="player-subtitle">
                View IPL career statistics →
            </div>

        `;


        card.addEventListener(
            "click",
            () => {

                window.location.href =
                    `/pages/player-details.html?player=${encodeURIComponent(
                        name
                    )}`;

            }
        );


        playerList.appendChild(card);

    });
}


searchButton.addEventListener(
    "click",
    searchPlayers
);


searchInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            searchPlayers();
        }

    }
);