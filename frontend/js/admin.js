import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const content = document.getElementById("admin-content");

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showMessage(title, message) {
    content.innerHTML = `
        <div class="card">
            <h2>${escapeHTML(title)}</h2>
            <p>${escapeHTML(message)}</p>
        </div>
    `;
}

onAuthStateChanged(auth, async (firebaseUser) => {

    if (!firebaseUser) {
        showMessage(
            "Login required",
            "Please log in before opening the Admin dashboard."
        );
        return;
    }

    try {
        const token = await firebaseUser.getIdToken(true);

        const response = await fetch("http://127.0.0.1:8000/api/admin/overview", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || `Request failed (${response.status})`
            );
        }

        const users = data.users ?? data.user_count ?? 0;
        const logins = data.logins ?? data.login_count ?? 0;
        const reviews = data.reviews ?? data.review_count ?? 0;
        const points = data.points ?? data.total_points ?? 0;

        content.innerHTML = `
            <div class="admin-grid">

                <div class="card">
                    <h3>Users</h3>
                    <strong>${escapeHTML(users)}</strong>
                </div>

                <div class="card">
                    <h3>Logins</h3>
                    <strong>${escapeHTML(logins)}</strong>
                </div>

                <div class="card">
                    <h3>Reviews</h3>
                    <strong>${escapeHTML(reviews)}</strong>
                </div>

                <div class="card">
                    <h3>CricPoints</h3>
                    <strong>${escapeHTML(points)}</strong>
                </div>

            </div>
        `;

    } catch (error) {
        console.error("Admin dashboard error:", error);

        showMessage(
            "Admin access error",
            error.message
        );
    }
});