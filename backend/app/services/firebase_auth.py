from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials

from app.database.connection import settings


class FirebaseAuthError(Exception):
    """Raised when Firebase authentication fails."""


def get_firebase_app():
    try:
        return firebase_admin.get_app()

    except ValueError:
        pass


    credentials_path = (
        Path(__file__).resolve().parents[2]
        / settings.firebase_credentials_path
    )


    if not credentials_path.exists():
        raise FirebaseAuthError(
            "Firebase service-account file was not found at: "
            f"{credentials_path}"
        )


    try:

        credential = credentials.Certificate(
            str(credentials_path)
        )

        return firebase_admin.initialize_app(
            credential
        )

    except Exception as exc:

        raise FirebaseAuthError(
            f"Unable to initialize Firebase Admin SDK: {exc}"
        ) from exc


def verify_firebase_token(
    id_token: str
) -> dict:

    get_firebase_app()

    try:

        return auth.verify_id_token(
            id_token
        )

    except Exception as exc:

        raise FirebaseAuthError(
            f"Invalid Firebase ID token: {exc}"
        ) from exc