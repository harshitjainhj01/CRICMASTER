import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const statusEl = document.getElementById("status");
const contentEl = document.getElementById("content");

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
        statusEl.textContent = "Please log in first.";

        contentEl.innerHTML = `
            <div class="card">
                <h3>Login required</h3>
                <p>Please log in to view your profile.</p>
                <a href="/pages/login.html">Login</a>
            </div>
        `;

        return;
    }

    try {
        statusEl.textContent = "Loading profile...";

        const token = await firebaseUser.getIdToken(true);

        const response = await fetch("/api/auth/me", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Unable to load profile");
        }

        const user = data.user || data;

        const name =
            user.name ||
            user.display_name ||
            user.displayName ||
            firebaseUser.displayName ||
            "Not set";

        const email =
            user.email ||
            firebaseUser.email ||
            "Not set";

        const points =
            user.cric_points ??
            user.points ??
            1000;

        contentEl.innerHTML = `
            <div class="card">

                <div class="row">
                    <div class="label">Name</div>
                    <div class="value">
                        ${escapeHTML(name)}
                    </div>
                </div>

                <div class="row">
                    <div class="label">Email</div>
                    <div class="value">
                        ${escapeHTML(email)}
                    </div>
                </div>

                <div class="row">
                    <div class="label">CricPoints</div>
                    <div class="value">
                        ${escapeHTML(points)}
                    </div>
                </div>

                <div style="margin-top: 25px;">
                    <button
                        id="logout-button"
                        type="button"
                        style="
                            padding: 10px 20px;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            background: #dc2626;
                            color: white;
                            font-size: 15px;
                        "
                    >
                        Logout
                    </button>
                </div>

            </div>
        `;

        statusEl.textContent = "Profile loaded";

        const logoutButton =
            document.getElementById("logout-button");

        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;
            logoutButton.textContent = "Logging out...";

            try {
                await signOut(auth);

                localStorage.removeItem("cricmaster_user");
                localStorage.removeItem("cricmaster_token");
                sessionStorage.clear();

                window.location.href =
                    "/pages/login.html";

            } catch (error) {
                console.error("Logout failed:", error);

                logoutButton.disabled = false;
                logoutButton.textContent = "Logout";

                alert("Logout failed. Please try again.");
            }
        });

    } catch (error) {
        console.error("Profile loading failed:", error);

        statusEl.textContent = "Unable to load profile";

        contentEl.innerHTML = `
            <div class="card">
                <h3>Profile error</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
});