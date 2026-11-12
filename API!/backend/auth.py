import os
import hashlib
import hmac
import secrets


from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse

from dotenv import load_dotenv

from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from sqlalchemy.orm import Session

from itsdangerous import (
    URLSafeTimedSerializer,
    BadSignature,
    SignatureExpired,
)

from database import SessionLocal
from models import User


# =========================================================
# ENVIRONMENT CONFIGURATION
# =========================================================

load_dotenv()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
).rstrip("/")

SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY")

if not SESSION_SECRET_KEY:
    raise RuntimeError(
        "SESSION_SECRET_KEY is missing from your backend .env file."
    )

GOOGLE_OAUTH_CONFIGURED = bool(
    CLIENT_ID and CLIENT_SECRET and REDIRECT_URI
)


def require_google_oauth():
    if not GOOGLE_OAUTH_CONFIGURED:
        raise HTTPException(
            status_code=503,
            detail=(
                "Google login is not configured. Add "
                "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and "
                "GOOGLE_REDIRECT_URI to the backend .env file."
            ),
        )


# =========================================================
# SESSION CONFIGURATION
# =========================================================

SESSION_COOKIE_NAME = "wishtime_session"

SESSION_MAX_AGE = 7 * 24 * 60 * 60

SESSION_COOKIE_SECURE = (
    os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
)

session_serializer = URLSafeTimedSerializer(
    SESSION_SECRET_KEY
)


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# =========================================================
# PASSWORD HELPERS
# =========================================================

PASSWORD_ITERATIONS = 310_000

def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_ITERATIONS,
    )
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str | None) -> bool:
    """Verify a password against a stored PBKDF2 hash."""
    if not stored_hash:
        return False

    try:
        algorithm, iterations, salt_hex, digest_hex = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False

        expected = bytes.fromhex(digest_hex)
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iterations),
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def create_session_response(user_id: int):
    """Create a normal JSON response with the signed session cookie."""
    from fastapi.responses import JSONResponse

    session_token = session_serializer.dumps({"user_id": user_id})
    response = JSONResponse({
        "message": "Authentication successful.",
        "user": {"id": user_id},
    })
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
        max_age=SESSION_MAX_AGE,
        path="/",
    )
    return response


# =========================================================
# GOOGLE OAUTH SCOPES
# =========================================================

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.send",
]


# =========================================================
# DATABASE HELPER
# =========================================================

def get_database_session() -> Session:
    """
    Create a SQLAlchemy database session.
    """
    return SessionLocal()


# =========================================================
# CREATE GOOGLE OAUTH FLOW
# =========================================================

def create_flow() -> Flow:
    """
    Create the Google OAuth flow.
    """

    client_config = {
        "web": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI],
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
    )

    flow.redirect_uri = REDIRECT_URI

    return flow


# =========================================================
# NORMAL EMAIL/PASSWORD REGISTRATION
# POST /auth/register
# =========================================================

@router.post("/register")
def register(
    payload: dict,
):
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    confirm = str(payload.get("confirm", ""))

    if not name or not email or not password:
        raise HTTPException(
            status_code=400,
            detail="Name, email, and password are required.",
        )

    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid email address.",
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters.",
        )

    if confirm and password != confirm:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match.",
        )

    db = get_database_session()

    try:
        existing = db.query(User).filter(User.email == email).first()

        if existing is not None:
            if existing.password_hash:
                raise HTTPException(
                    status_code=409,
                    detail="An account with this email already exists. Please log in.",
                )

            # If the email belongs to a Google account, allow the user
            # to add a normal password without creating a duplicate user.
            existing.name = name
            existing.password_hash = hash_password(password)
            db.commit()
            user_id = existing.id
        else:
            user = User(
                google_id=f"local:{email}",
                email=email,
                name=name,
                password_hash=hash_password(password),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            user_id = user.id

        return create_session_response(user_id)

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create your account. Please try again.",
        ) from exc
    finally:
        db.close()


# =========================================================
# NORMAL EMAIL/PASSWORD LOGIN
# POST /auth/login
# =========================================================

@router.post("/login")
def login(payload: dict):
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not email or not password:
        raise HTTPException(
            status_code=400,
            detail="Email and password are required.",
        )

    db = get_database_session()

    try:
        user = db.query(User).filter(User.email == email).first()

        if user is None or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password.",
            )

        response = create_session_response(user.id)
        return response
    finally:
        db.close()


# =========================================================
# GOOGLE LOGIN
# GET /auth/google
# =========================================================

@router.get("/google")
def google_login():

    require_google_oauth()
    flow = create_flow()

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    response = RedirectResponse(
        url=authorization_url,
        status_code=302,
    )

    # Store OAuth state for callback validation.
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
        max_age=600,
        path="/",
    )

    # Store the PKCE verifier if the OAuth library generated one.
    if flow.code_verifier:
        response.set_cookie(
            key="oauth_code_verifier",
            value=flow.code_verifier,
            httponly=True,
            secure=SESSION_COOKIE_SECURE,
            samesite="lax",
            max_age=600,
            path="/",
        )

    return response


# =========================================================
# GOOGLE LOGIN CALLBACK
# GET /auth/google/callback
# =========================================================

@router.get("/google/callback")
def google_callback(request: Request):

    require_google_oauth()

    # -----------------------------------------------------
    # STEP 1: Read temporary OAuth cookies
    # -----------------------------------------------------

    state = request.cookies.get("oauth_state")

    code_verifier = request.cookies.get(
        "oauth_code_verifier"
    )

    if not state or not code_verifier:
        raise HTTPException(
            status_code=400,
            detail=(
                "Google login session is missing or expired. "
                "Please start Google login again."
            ),
        )

    # -----------------------------------------------------
    # STEP 2: Exchange the authorization code for tokens
    # -----------------------------------------------------

    flow = create_flow()

    flow.state = state
    flow.code_verifier = code_verifier

    try:
        flow.fetch_token(
            authorization_response=str(request.url)
        )

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "Google authentication failed. "
                "Please try logging in again."
            ),
        ) from exc

    credentials = flow.credentials

    # -----------------------------------------------------
    # STEP 3: Retrieve the Google profile
    # -----------------------------------------------------

    try:
        oauth_service = build(
            "oauth2",
            "v2",
            credentials=credentials,
            cache_discovery=False,
        )

        user_info = (
            oauth_service
            .userinfo()
            .get()
            .execute()
        )

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Unable to retrieve your Google profile.",
        ) from exc

    google_id = user_info.get("id")
    email = user_info.get("email")
    name = user_info.get("name") or email

    if not google_id or not email:
        raise HTTPException(
            status_code=400,
            detail=(
                "Google did not return the required "
                "profile information."
            ),
        )

    # -----------------------------------------------------
    # STEP 4: Find or create the database user
    # -----------------------------------------------------

    db: Session = get_database_session()

    try:
        # First, look up the user by Google ID.
        user = (
            db.query(User)
            .filter(User.google_id == google_id)
            .first()
        )

        # If not found, check whether this email already exists.
        if user is None:
            user = (
                db.query(User)
                .filter(User.email == email)
                .first()
            )

        # Create a new user if no existing account was found.
        if user is None:
            user = User(
                google_id=google_id,
                email=email,
                name=name,
            )

            db.add(user)

        # Update the user's profile information.
        user.google_id = google_id
        user.email = email
        user.name = name

        # Store Google credentials for calendar/email features.
        user.access_token = credentials.token

        # Google may not return a refresh token on every login.
        # Keep the existing refresh token if no new one is provided.
        if credentials.refresh_token:
            user.refresh_token = credentials.refresh_token

        if credentials.expiry:
            user.token_expiry = credentials.expiry.isoformat()

        db.commit()
        db.refresh(user)

        # Only the database user ID is stored in the session.
        user_id = user.id

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to save your Google account.",
        ) from exc

    finally:
        db.close()

    # -----------------------------------------------------
    # STEP 5: Create the signed login session
    # -----------------------------------------------------

    session_token = session_serializer.dumps(
        {
            "user_id": user_id,
        }
    )

    # Redirect to the frontend after successful login.
    response = RedirectResponse(
        url="http://localhost:5173/",
        status_code=303,
    )

    # Create the authentication cookie.
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
        max_age=SESSION_MAX_AGE,
        path="/",
    )

    # Remove temporary OAuth cookies.
    response.delete_cookie(
        key="oauth_state",
        path="/",
        secure=SESSION_COOKIE_SECURE,
        httponly=True,
        samesite="lax",
    )

    response.delete_cookie(
        key="oauth_code_verifier",
        path="/",
        secure=SESSION_COOKIE_SECURE,
        httponly=True,
        samesite="lax",
    )

    return response


# =========================================================
# GET CURRENTLY LOGGED-IN USER
# GET /auth/me
# =========================================================

@router.get("/me")
def get_current_user(request: Request):

    # -----------------------------------------------------
    # STEP 1: Read the authentication cookie
    # -----------------------------------------------------

    session_token = request.cookies.get(
        SESSION_COOKIE_NAME
    )

    if not session_token:
        raise HTTPException(
            status_code=401,
            detail=(
                "Not logged in. Please sign in."
            ),
        )

    # -----------------------------------------------------
    # STEP 2: Validate the signed session
    # -----------------------------------------------------

    try:
        session_data = session_serializer.loads(
            session_token,
            max_age=SESSION_MAX_AGE,
        )

    except SignatureExpired as exc:
        raise HTTPException(
            status_code=401,
            detail=(
                "Your login session has expired. "
                "Please sign in again."
            ),
        ) from exc

    except BadSignature as exc:
        raise HTTPException(
            status_code=401,
            detail=(
                "Your login session is invalid. "
                "Please sign in again."
            ),
        ) from exc

    # -----------------------------------------------------
    # STEP 3: Validate the database user ID
    # -----------------------------------------------------

    user_id = session_data.get("user_id")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="The login session does not contain a user ID.",
        )

    try:
        user_id = int(user_id)

    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=401,
            detail="The login session contains an invalid user ID.",
        ) from exc

    if user_id <= 0:
        raise HTTPException(
            status_code=401,
            detail="The login session contains an invalid user ID.",
        )

    # -----------------------------------------------------
    # STEP 4: Retrieve the logged-in user from the database
    # -----------------------------------------------------

    db: Session = get_database_session()

    try:
        user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if user is None:
            raise HTTPException(
                status_code=401,
                detail=(
                    "Your user account could not be found. "
                    "Please sign in again."
                ),
            )

        # Return the real name and email from the database.
        return {
            "id": user.id,
            "name": user.name or user.email,
            "email": user.email,
        }

    finally:
        db.close()


# =========================================================
# LOGOUT
# POST /auth/logout
# =========================================================

@router.post("/logout")
def logout():
    from fastapi.responses import JSONResponse

    response = JSONResponse(
        {
            "message": "Logged out successfully."
        }
    )

    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        secure=SESSION_COOKIE_SECURE,
        httponly=True,
        samesite="lax",
    )

    return response
