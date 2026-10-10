import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    firebaseConfig
} from "./firebase-config.js";


const firebaseApp =
    initializeApp(firebaseConfig);

const auth =
    getAuth(firebaseApp);

const googleProvider =
    new GoogleAuthProvider();


document.addEventListener(
    "DOMContentLoaded",
    () => {
        setupSignup();
        setupLogin();
        setupGoogleLogin();
        setupLogout();

        const pendingError = sessionStorage.getItem("cricmasterAuthError");
        if (pendingError) {
            sessionStorage.removeItem("cricmasterAuthError");
            showStatus(pendingError);
        }
    }
);


function setupSignup() {

    const form =
        document.getElementById("signupForm");

    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const name =
                document
                    .getElementById("name")
                    .value
                    .trim();

            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("password")
                    .value;

            const confirmPassword =
                document
                    .getElementById("confirmPassword")
                    .value;


            if (password !== confirmPassword) {

                showStatus(
                    "Passwords do not match."
                );

                return;
            }


            if (password.length < 6) {

                showStatus(
                    "Password must be at least 6 characters."
                );

                return;
            }


            try {

                showStatus(
                    "Creating your account..."
                );


                const result =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                if (name) {

                    await updateProfile(
                        result.user,
                        {
                            displayName: name
                        }
                    );

                }


                await connectToCRICMASTER(
                    result.user
                );


            } catch (error) {

                console.error(
                    "Signup error:",
                    error
                );

                showStatus(
                    firebaseErrorMessage(error)
                );

            }

        }
    );

}


function setupLogin() {

    const form =
        document.getElementById(
            "emailLoginForm"
        );

    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("password")
                    .value;


            try {

                showStatus(
                    "Signing in..."
                );


                const result =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                await connectToCRICMASTER(
                    result.user
                );


            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );

                showStatus(
                    firebaseErrorMessage(error)
                );

            }

        }
    );

}


function setupGoogleLogin() {

    const buttons =
        document.querySelectorAll(
            "[data-google-login]"
        );


    buttons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                async () => {

                    try {

                        showStatus(
                            "Opening Google sign-in..."
                        );


                        const result =
                            await signInWithPopup(
                                auth,
                                googleProvider
                            );


                        await connectToCRICMASTER(
                            result.user
                        );


                    } catch (error) {

                        console.error(
                            "Google login error:",
                            error
                        );

                        showStatus(
                            firebaseErrorMessage(error)
                        );

                    }

                }
            );

        }
    );

}


async function connectToCRICMASTER(
    firebaseUser
) {

    showStatus(
        "Connecting your account to CRICMASTER..."
    );


    const idToken =
        await firebaseUser.getIdToken(true);


    sessionStorage.setItem(
        "cricmasterIdToken",
        idToken
    );


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
        throw new Error(`Session endpoint returned non-JSON (HTTP ${response.status}). Check that FastAPI is running on port 8000.`);
    }

    if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || `CRICMASTER account creation failed (HTTP ${response.status}).`);
    }


    localStorage.setItem(
        "cricmasterUser",
        JSON.stringify(data)
    );


    if (data.onboarding_completed) {

        window.location.replace(
            "/index.html"
        );

    } else {

        window.location.replace(
            "/pages/onboarding.html"
        );

    }

}


function setupLogout() {

    const button =
        document.getElementById(
            "logoutButton"
        );

    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

                sessionStorage.removeItem(
                    "cricmasterIdToken"
                );

                localStorage.removeItem(
                    "cricmasterUser"
                );

                window.location.replace(
                    "/pages/login.html"
                );

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            }

        }
    );

}


function showStatus(message) {

    let element =
        document.getElementById(
            "authStatus"
        );


    if (!element) {

        element =
            document.createElement("div");

        element.id =
            "authStatus";

        element.style.marginTop =
            "16px";

        element.style.textAlign =
            "center";

        element.style.color =
            "#9ca9a2";


        const form =
            document.getElementById(
                "signupForm"
            ) ||
            document.getElementById(
                "emailLoginForm"
            );


        if (form) {

            form.after(element);

        }

    }


    element.textContent =
        message;

}


function firebaseErrorMessage(error) {

    const code =
        error?.code || "";


    const messages = {

        "auth/email-already-in-use":
            "This email is already registered.",

        "auth/invalid-email":
            "Please enter a valid email address.",

        "auth/weak-password":
            "Password must be at least 6 characters.",

        "auth/invalid-credential":
            "Email or password is incorrect.",

        "auth/popup-closed-by-user":
            "Google sign-in was cancelled.",

        "auth/too-many-requests":
            "Too many attempts. Please try again later."

    };


    return (
        messages[code] ||
        error?.message ||
        "Authentication failed."
    );

}