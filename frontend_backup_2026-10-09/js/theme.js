const THEME_KEY = "cricmaster_theme";

function addDarkModeStyles() {
    let style = document.getElementById("cricmaster-dark-styles");

    if (!style) {
        style = document.createElement("style");
        style.id = "cricmaster-dark-styles";

        style.textContent = `
            html[data-theme="dark"] body {
                background: #0b0f14 !important;
                color: #ffffff !important;
            }

            html[data-theme="dark"] header,
            html[data-theme="dark"] nav {
                background: #11161d !important;
                color: #ffffff !important;
            }

            html[data-theme="dark"] main,
            html[data-theme="dark"] section,
            html[data-theme="dark"] article {
                background-color: transparent !important;
                color: #ffffff !important;
            }

            html[data-theme="dark"] .card,
            html[data-theme="dark"] .settings-card,
            html[data-theme="dark"] .match-card,
            html[data-theme="dark"] .player-card,
            html[data-theme="dark"] .team-card,
            html[data-theme="dark"] .news-card,
            html[data-theme="dark"] .series-card,
            html[data-theme="dark"] .panel {
                background-color: #171c23 !important;
                color: #ffffff !important;
                border-color: #343c48 !important;
            }

            html[data-theme="dark"] h1,
            html[data-theme="dark"] h2,
            html[data-theme="dark"] h3,
            html[data-theme="dark"] h4,
            html[data-theme="dark"] h5,
            html[data-theme="dark"] h6,
            html[data-theme="dark"] p,
            html[data-theme="dark"] span,
            html[data-theme="dark"] label,
            html[data-theme="dark"] strong,
            html[data-theme="dark"] td,
            html[data-theme="dark"] th,
            html[data-theme="dark"] li,
            html[data-theme="dark"] a {
                color: #ffffff !important;
            }

            html[data-theme="dark"] input,
            html[data-theme="dark"] textarea,
            html[data-theme="dark"] select {
                background-color: #202733 !important;
                color: #ffffff !important;
                border-color: #4b5563 !important;
            }

            html[data-theme="dark"] table {
                background-color: #171c23 !important;
                color: #ffffff !important;
            }

            html[data-theme="dark"] th {
                background-color: #202733 !important;
                color: #ffffff !important;
            }

            html[data-theme="dark"] button {
                color: #ffffff !important;
            }
        `;

        document.head.appendChild(style);
    }
}

function removeDarkModeStyles() {
    const style = document.getElementById("cricmaster-dark-styles");

    if (style) {
        style.remove();
    }
}

function applyTheme(theme) {
    const isDark = theme === "dark";

    document.documentElement.setAttribute(
        "data-theme",
        isDark ? "dark" : "light"
    );

    document.documentElement.classList.toggle("dark", isDark);

    localStorage.setItem(
        THEME_KEY,
        isDark ? "dark" : "light"
    );

    if (isDark) {
        addDarkModeStyles();
    } else {
        removeDarkModeStyles();
    }

    updateThemeButtons(isDark);
}

function updateThemeButtons(isDark) {
    document
        .querySelectorAll(
            "#theme-toggle, #themeToggle, .theme-toggle, [data-theme-toggle]"
        )
        .forEach(button => {
            button.textContent = isDark
                ? "☀️ Light Mode"
                : "🌙 Dark Mode";
        });
}

function toggleTheme() {
    const current =
        localStorage.getItem(THEME_KEY) || "light";

    applyTheme(
        current === "dark"
            ? "light"
            : "dark"
    );
}

function initializeTheme() {
    const savedTheme =
        localStorage.getItem(THEME_KEY) || "light";

    applyTheme(savedTheme);

    document
        .querySelectorAll(
            "#theme-toggle, #themeToggle, .theme-toggle, [data-theme-toggle]"
        )
        .forEach(button => {
            button.addEventListener("click", toggleTheme);
        });
}

/* Initialize ONLY once */
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeTheme,
        { once: true }
    );
} else {
    initializeTheme();
}