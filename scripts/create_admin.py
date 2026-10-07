import sqlite3
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = PROJECT_ROOT / "backend" / "cricmaster.db"


def main():
    print("CRICMASTER Admin Setup")
    print("----------------------")

    if not DB_PATH.exists():
        print(f"Database not found:")
        print(DB_PATH)
        return

    email = input("Enter the CRICMASTER admin email: ").strip().lower()

    if not email:
        print("Email cannot be empty.")
        return

    connection = sqlite3.connect(DB_PATH)

    try:
        cursor = connection.cursor()

        cursor.execute(
            "SELECT id, email, display_name, role FROM users "
            "WHERE LOWER(email) = ?",
            (email,)
        )

        user = cursor.fetchone()

        if user is None:
            print()
            print("No CRICMASTER account was found with this email.")
            print("Log in to CRICMASTER with this email first.")
            return

        user_id, user_email, display_name, current_role = user

        print()
        print(f"User ID       : {user_id}")
        print(f"Email         : {user_email}")
        print(f"Name          : {display_name or 'Not set'}")
        print(f"Current role  : {current_role}")

        cursor.execute(
            "UPDATE users SET role = ? WHERE id = ?",
            ("admin", user_id)
        )

        connection.commit()

        print()
        print("======================================")
        print("CRICMASTER ADMIN CREATED SUCCESSFULLY")
        print("======================================")
        print(f"Email : {user_email}")
        print(f"Role  : admin")
        print("======================================")

    finally:
        connection.close()


if __name__ == "__main__":
    main()