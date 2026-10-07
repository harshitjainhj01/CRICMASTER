document.addEventListener("DOMContentLoaded", async () => {
    const page = document.body;

    try {
        const response = await fetch("/api/stats");

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Remove old generated content if present
        const old = document.getElementById("stats-data-container");
        if (old) old.remove();

        const container = document.createElement("div");
        container.id = "stats-data-container";
        container.style.padding = "20px";
        container.style.maxWidth = "1100px";
        container.style.margin = "0 auto";

        container.innerHTML = `
            <h2 style="margin-bottom:20px;">IPL Statistics</h2>

            ${createSection("Top Run Scorers", data.top_runs)}
            ${createSection("Top Wicket Takers", data.top_wickets)}
            ${createSection("Best Strike Rate", data.best_strike_rate)}
            ${createSection("Most Sixes", data.most_sixes)}
            ${createSection("Most Fours", data.most_fours)}
            ${createSection("Best Economy", data.best_economy)}
        `;

        page.appendChild(container);

    } catch (error) {
        console.error("Stats loading failed:", error);

        const errorBox = document.createElement("div");
        errorBox.style.padding = "20px";
        errorBox.innerHTML = `
            <h3>Unable to load statistics</h3>
            <p>${error.message}</p>
        `;

        page.appendChild(errorBox);
    }
});


function createSection(title, rows) {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return `
            <section style="margin-bottom:30px;">
                <h3>${title}</h3>
                <p>No data available.</p>
            </section>
        `;
    }

    const headers = Object.keys(rows[0]);

    const tableRows = rows.map(row => `
        <tr>
            ${headers.map(header => `
                <td style="padding:10px;border-bottom:1px solid #ddd;">
                    ${escapeHTML(row[header])}
                </td>
            `).join("")}
        </tr>
    `).join("");

    const headerRow = headers.map(header => `
        <th style="padding:10px;text-align:left;">
            ${formatHeader(header)}
        </th>
    `).join("");

    return `
        <section style="margin-bottom:35px;">
            <h3 style="margin-bottom:12px;">${title}</h3>

            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr>
                            ${headerRow}
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}


function formatHeader(text) {
    return String(text)
        .replace(/_/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());
}


function escapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}