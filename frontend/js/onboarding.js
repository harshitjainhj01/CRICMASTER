import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    firebaseConfig
} from "./firebase-config.js";


const firebaseApp =
    initializeApp(firebaseConfig);

const auth =
    getAuth(firebaseApp);


let currentUser = null;
let initialAuthRouteChecked = false;

function setOnboardingStatus(message) {
    const element = document.getElementById("onboardingStatus");
    if (element) element.textContent = message;
}

async function verifyOnboardingRoute(user) {
    try {
        const idToken = await user.getIdToken(true);
        sessionStorage.setItem("cricmasterIdToken", idToken);

        // Create/retrieve the backend user and use its authoritative flag.
        const response = await fetch(
            "http://127.0.0.1:8000/api/auth/session",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${idToken}`,
                    "Accept": "application/json"
                }
            }
        );

        const responseText = await response.text();
        let data = {};
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            throw new Error(`Session endpoint returned non-JSON (HTTP ${response.status}).`);
        }

        if (!response.ok || !data.success) {
            throw new Error(data.detail || data.message || `Session check failed (HTTP ${response.status}).`);
        }

        localStorage.setItem("cricmasterUser", JSON.stringify(data));

        // A returning user should never see onboarding again.
        if (data.onboarding_completed) {
            window.location.replace("/index.html");
            return;
        }

        // New user: remain on the questions page.
        console.log("CRICMASTER: onboarding required for new user.");
    } catch (error) {
        console.error("Onboarding route check failed:", error);
        setOnboardingStatus(
            "We could not verify your account. Please sign in again. " + error.message
        );
    }
}

onAuthStateChanged(auth, user => {
    currentUser = user;

    // Only run the routing check on the initial auth-state resolution.
    if (initialAuthRouteChecked) return;
    initialAuthRouteChecked = true;

    if (!user) {
        console.warn("No Firebase user is currently signed in. Returning to login.");
        window.location.replace("/pages/login.html");
        return;
    }

    console.log("Firebase user:", user.email || user.phoneNumber);
    verifyOnboardingRoute(user);
});


document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            document.getElementById(
                "onboardingForm"
            );

        if (!form) {

            console.error(
                "onboardingForm not found"
            );

            return;
        }


        form.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                const status =
                    document.getElementById(
                        "onboardingStatus"
                    );


                const showStatus =
                    (message) => {

                        if (status) {
                            status.textContent =
                                message;
                        }

                    };


                const cricketLevel =
                    document.getElementById(
                        "cricketLevel"
                    ).value;


                const favoriteFormat =
                    document.getElementById(
                        "favoriteFormat"
                    ).value || null;


                const favoriteTeam =
                    document.getElementById(
                        "favoriteTeam"
                    ).value || null;


                const acceptedTerms =
                    document.getElementById(
                        "terms"
                    ).checked;


                const acceptedPrivacy =
                    document.getElementById(
                        "privacy"
                    ).checked;


                if (!cricketLevel) {

                    showStatus(
                        "Please select your cricket level."
                    );

                    return;
                }


                if (!acceptedTerms) {

                    showStatus(
                        "Please accept the Terms and Conditions."
                    );

                    return;
                }


                if (!acceptedPrivacy) {

                    showStatus(
                        "Please accept the Privacy Policy."
                    );

                    return;
                }


                /*
                 * Firebase may take a moment to restore
                 * the signed-in session after the page loads.
                 */

                if (!currentUser) {

                    showStatus(
                        "Checking your login session..."
                    );


                    await waitForFirebaseUser();


                    if (!currentUser) {

                        showStatus(
                            "Your login session is missing. Please log in again."
                        );

                        setTimeout(
                            () => {
                                window.location.replace(
                                    "/pages/login.html"
                                );
                            },
                            1500
                        );

                        return;
                    }

                }


                showStatus(
                    "Saving your preferences..."
                );


                try {

                    /*
                     * Get a fresh Firebase ID token.
                     * This is the token our FastAPI backend verifies.
                     */

                    const idToken =
                        await currentUser.getIdToken(
                            true
                        );


                    const response =
                        await fetch(
                            "http://127.0.0.1:8000/api/onboarding",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json",

                                    "Authorization":
                                        `Bearer ${idToken}`
                                },

                                body:
                                    JSON.stringify(
                                        {
                                            cricket_level:
                                                cricketLevel,

                                            favorite_format:
                                                favoriteFormat,

                                            favorite_team:
                                                favoriteTeam,

                                            accepted_terms:
                                                acceptedTerms,

                                            accepted_privacy:
                                                acceptedPrivacy
                                        }
                                    )
                            }
                        );


                    const responseText = await response.text();
                    let data = {};
                    try {
                        data = responseText ? JSON.parse(responseText) : {};
                    } catch {
                        throw new Error(`Onboarding endpoint returned non-JSON (HTTP ${response.status}). Check FastAPI on port 8000.`);
                    }

                    console.log("Onboarding response:", data);


                    if (!response.ok) {

                        showStatus(
                            data.detail ||
                            data.message ||
                            "Unable to save onboarding."
                        );

                        return;
                    }


                    if (!data.success) {

                        showStatus(
                            data.message ||
                            "Unable to save onboarding."
                        );

                        return;
                    }


                    /*
                     * Save the CRICMASTER user information
                     * for the frontend.
                     */

                    localStorage.setItem(
                        "cricmasterUser",
                        JSON.stringify(
                            {
                                user_id: data.user_id,
                                onboarding_completed: true
                            }
                        )
                    );


                    showStatus(
                        "Saved successfully. Opening CRICMASTER..."
                    );


                    setTimeout(
                        () => {

                            window.location.replace(
                                "/index.html"
                            );

                        },
                        700
                    );

                } catch (error) {

                    console.error(
                        "Onboarding error:",
                        error
                    );

                    showStatus(
                        error.message ||
                        "Unable to connect to CRICMASTER."
                    );

                }

            }
        );

    }
);


function waitForFirebaseUser() {

    return new Promise(
        (resolve) => {

            let finished = false;


            const timeout =
                setTimeout(
                    () => {

                        if (!finished) {

                            finished = true;

                            resolve();

                        }

                    },
                    3000
                );


            const unsubscribe =
                onAuthStateChanged(
                    auth,
                    (user) => {

                        if (user && !finished) {

                            currentUser =
                                user;

                            finished = true;

                            clearTimeout(
                                timeout
                            );

                            unsubscribe();

                            resolve();
                        }

                    }
                );

        }
    );

}