import logging
import os

from dotenv import load_dotenv

from apscheduler.schedulers.background import BackgroundScheduler

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    BackgroundTasks,
    Request,
)
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session

from itsdangerous import (
    BadSignature,
    SignatureExpired,
)
from scheduler import check_scheduled_events
from database import Base, engine, get_db
from models import User, Birthday, Event
from schemas import BirthdayCreate, BirthdayResponse, EventCreate, EventUpdate

from auth import (
    router as auth_router,
    session_serializer,
    SESSION_COOKIE_NAME,
    SESSION_MAX_AGE,
)

from google_service import (
    create_calendar_event,
    send_birthday_email,
)


# =========================================================
# ENVIRONMENT CONFIGURATION
# =========================================================

load_dotenv()

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)

# =========================================================
# APSCHEDULER
# =========================================================
# Runs scheduled birthday notification checks in the background.
scheduler = BackgroundScheduler()

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
).rstrip("/")


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

Base.metadata.create_all(bind=engine)

# Lightweight SQLite schema upgrade for existing WishTime databases.
# SQLAlchemy create_all() does not add new columns to an existing table.
if os.getenv("DATABASE_URL", "sqlite:///./birthday.db").startswith("sqlite"):
    from sqlalchemy import inspect, text

    _inspector = inspect(engine)
    _user_columns = {column["name"] for column in _inspector.get_columns("users")}
    if "password_hash" not in _user_columns:
        with engine.begin() as _connection:
            _connection.execute(
                text("ALTER TABLE users ADD COLUMN password_hash TEXT")
            )


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="WishTime API",
    description=(
        "Birthday scheduling, Google authentication, "
        "and email notifications."
    ),
    version="1.0.0",
)


# =========================================================
# CORS CONFIGURATION
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(
        {
            FRONTEND_URL,
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        }
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# AUTHENTICATION ROUTES
# =========================================================

app.include_router(auth_router)


# =========================================================
# HOME
# GET /
# =========================================================

@app.get("/")
def home():
    return {
        "message": "WishTime API is running",
        "status": "success",
    }


# =========================================================
# DATABASE HEALTH CHECK
# GET /health
# =========================================================

@app.get("/health")
def health_check(
    db: Session = Depends(get_db),
):
    try:
        db.query(User).limit(1).all()

        return {
            "status": "healthy",
            "database": "connected",
        }

    except Exception as exc:
        logger.exception(
            "Database health check failed"
        )

        raise HTTPException(
            status_code=503,
            detail="Database connection failed.",
        ) from exc


# =========================================================
# HELPER: GET AUTHENTICATED USER
# =========================================================

def get_authenticated_user(
    request: Request,
    db: Session,
) -> User:
    """
    Validate the signed session cookie and retrieve
    the currently logged-in user.
    """

    session_token = request.cookies.get(
        SESSION_COOKIE_NAME
    )

    if not session_token:
        raise HTTPException(
            status_code=401,
            detail="Please sign in first.",
        )

    # Validate the signed session.
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

    user_id = session_data.get("user_id")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid login session.",
        )

    try:
        user_id = int(user_id)

    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid user ID in login session.",
        ) from exc

    if user_id <= 0:
        raise HTTPException(
            status_code=401,
            detail="Invalid user ID in login session.",
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail=(
                "User account not found. "
                "Please sign in again."
            ),
        )

    return user


# =========================================================
# GET CURRENT USER
# GET /api/me
# =========================================================

@app.get("/api/me")
def get_profile(
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(
        request,
        db,
    )

    return {
        "id": user.id,
        "name": user.name or user.email,
        "email": user.email,
    }


# =========================================================
# CREATE BIRTHDAY
# POST /birthdays
# =========================================================

@app.post(
    "/birthdays",
    response_model=BirthdayResponse,
)
def create_birthday(
    birthday_data: BirthdayCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Save a birthday event, create its Google Calendar
    event, and queue its email notification.
    """

    user = get_authenticated_user(
        request,
        db,
    )

    # -----------------------------------------------------
    # SAVE THE EVENT
    # -----------------------------------------------------

    try:
        if hasattr(birthday_data, "model_dump"):
            birthday_fields = birthday_data.model_dump()
        else:
            birthday_fields = birthday_data.dict()

        # The event must belong to the authenticated user.
        birthday_fields.pop("user_id", None)

        birthday = Birthday(
            **birthday_fields,
            user_id=user.id,
        )

        db.add(birthday)
        db.commit()
        db.refresh(birthday)

    except Exception as exc:
        db.rollback()

        logger.exception(
            "Failed to save birthday event"
        )

        raise HTTPException(
            status_code=500,
            detail="Could not save the birthday event.",
        ) from exc

    # -----------------------------------------------------
    # CREATE GOOGLE CALENDAR EVENT
    # -----------------------------------------------------

    try:
        calendar_result = create_calendar_event(
            birthday=birthday,
            user=user,
        )

        logger.info(
            "Calendar event creation completed for birthday ID %s",
            birthday.id,
        )

        if isinstance(calendar_result, dict):
            event_id = calendar_result.get("id")

            if (
                event_id
                and hasattr(birthday, "google_event_id")
            ):
                birthday.google_event_id = event_id
                db.commit()

    except Exception:
        logger.exception(
            "Calendar event creation failed for birthday ID %s",
            birthday.id,
        )

    # -----------------------------------------------------
    # SEND EMAIL IN BACKGROUND
    # -----------------------------------------------------

    background_tasks.add_task(
        send_birthday_email_safely,
        birthday.id,
    )

    return birthday


# =========================================================
# SEND EMAIL SAFELY
# =========================================================

def send_birthday_email_safely(
    birthday_id: int,
):
    """
    Open a fresh database session, retrieve the event
    and owner, and call the email service.
    """

    db = next(get_db())

    try:
        birthday = (
            db.query(Birthday)
            .filter(Birthday.id == birthday_id)
            .first()
        )

        if birthday is None:
            logger.error(
                "Birthday ID %s was not found; email not sent.",
                birthday_id,
            )
            return

        user_id = getattr(
            birthday,
            "user_id",
            None,
        )

        user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if user is None:
            logger.error(
                "Owner not found for birthday ID %s; email not sent.",
                birthday_id,
            )
            return

        result = send_birthday_email(
            birthday=birthday,
            user=user,
        )

        logger.info(
            "Email function executed for birthday ID %s; result=%s",
            birthday_id,
            result,
        )

    except Exception:
        logger.exception(
            "Email sending failed for birthday ID %s",
            birthday_id,
        )

    finally:
        db.close()


# =========================================================
# SCHEDULED BIRTHDAY CHECK
# =========================================================

def check_scheduled_birthdays():
    """
    Check birthdays that are due and send their email notification.

    APScheduler runs this function in the background. A fresh database
    session is created for each run so the scheduler does not reuse a
    request-scoped SQLAlchemy session.
    """

    from datetime import datetime

    db = next(get_db())

    try:
        now = datetime.now()
        today = now.date()
        current_time = now.strftime("%H:%M")

        birthdays = (
            db.query(Birthday)
            .filter(Birthday.birthday == today)
            .all()
        )

        logger.info(
            "Birthday scheduler checked %s birthday(s) for %s.",
            len(birthdays),
            today,
        )

        for birthday in birthdays:
            reminder_time = getattr(
                birthday,
                "reminder_time",
                None,
            )

            if reminder_time is None:
                continue

            # Normalize SQLAlchemy time values and string values to HH:MM.
            if hasattr(reminder_time, "strftime"):
                birthday_time = reminder_time.strftime("%H:%M")
            else:
                birthday_time = str(reminder_time)[:5]

            if birthday_time != current_time:
                continue

            user_id = getattr(
                birthday,
                "user_id",
                None,
            )

            user = (
                db.query(User)
                .filter(User.id == user_id)
                .first()
            )

            if user is None:
                logger.error(
                    "Owner not found for birthday ID %s; email not sent.",
                    birthday.id,
                )
                continue

            try:
                result = send_birthday_email(
                    birthday=birthday,
                    user=user,
                )

                logger.info(
                    "Scheduled birthday email executed for birthday ID %s; result=%s",
                    birthday.id,
                    result,
                )

            except Exception:
                logger.exception(
                    "Scheduled birthday email failed for birthday ID %s",
                    birthday.id,
                )

    except Exception:
        logger.exception(
            "Birthday scheduler check failed."
        )

    finally:
        db.close()


# =========================================================
# GET PUBLIC SCHEDULED EVENTS
#
# GET /public/events
#
# This endpoint is only for displaying scheduled events
# on the My Events page when the user is not logged in.
#
# It does NOT expose the recipient email address.
# =========================================================

@app.get("/public/events")
def get_public_scheduled_events(
    db: Session = Depends(get_db),
):
    birthdays = (
        db.query(Birthday)
        .order_by(
            Birthday.birthday.asc(),
            Birthday.reminder_time.asc(),
        )
        .all()
    )

    return [
        {
            "id": birthday.id,
            "type": "Birthday",
            "customEventName": "",
            "recipient": birthday.name,
            "email": "",
            "date": birthday.birthday,
            "time": birthday.reminder_time,
            "timezone": "(GMT+05:30) India Standard Time",
            "message": "",
            "status": "Scheduled",
        }
        for birthday in birthdays
    ]


# =========================================================
# GET ALL BIRTHDAYS
# GET /birthdays
# =========================================================

@app.get("/birthdays")
def get_birthdays(
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(
        request,
        db,
    )

    birthdays = (
        db.query(Birthday)
        .filter(Birthday.user_id == user.id)
        .all()
    )

    return birthdays


# =========================================================
# GET ONE BIRTHDAY
# GET /birthdays/{birthday_id}
# =========================================================

@app.get("/birthdays/{birthday_id}")
def get_birthday(
    birthday_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(
        request,
        db,
    )

    birthday = (
        db.query(Birthday)
        .filter(
            Birthday.id == birthday_id,
            Birthday.user_id == user.id,
        )
        .first()
    )

    if birthday is None:
        raise HTTPException(
            status_code=404,
            detail="Birthday event not found.",
        )

    return birthday


# =========================================================
# DELETE BIRTHDAY
# DELETE /birthdays/{birthday_id}
# =========================================================

@app.delete("/birthdays/{birthday_id}")
def delete_birthday(
    birthday_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(
        request,
        db,
    )

    birthday = (
        db.query(Birthday)
        .filter(
            Birthday.id == birthday_id,
            Birthday.user_id == user.id,
        )
        .first()
    )

    if birthday is None:
        raise HTTPException(
            status_code=404,
            detail="Birthday event not found.",
        )

    try:
        db.delete(birthday)
        db.commit()

    except Exception as exc:
        db.rollback()

        logger.exception(
            "Failed to delete birthday event"
        )

        raise HTTPException(
            status_code=500,
            detail="Could not delete the birthday event.",
        ) from exc

    return {
        "message": "Birthday event deleted successfully.",
        "id": birthday_id,
    }


# =========================================================
# GENERAL EVENTS
# These endpoints are used by Create Event and My Events.
# =========================================================


def serialize_event(event: Event):
    """
    Convert the database Event object into the format
    expected by the React frontend.
    """

    return {
        "id": event.id,
        "type": event.event_type,
        "customEventName": event.custom_event_name,
        "recipient": event.recipient,
        "contact": event.email,
        "email": event.email,
        "date": event.event_date,
        "time": event.event_time,
        "timezone": event.timezone,
        "message": event.message,
        "status": event.status,
        "created_at": event.created_at,
        "updated_at": event.updated_at,
    }


# =========================================================
# CREATE EVENT
# POST /events
# =========================================================

@app.post("/events")
def create_event(
    event_data: EventCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(
        request,
        db,
    )

    try:
        event = Event(
            user_id=user.id,
            event_type=event_data.type,
            custom_event_name=event_data.customEventName,
            recipient=event_data.recipient,
            email=event_data.email,
            event_date=event_data.date,
            event_time=event_data.time,
            timezone=event_data.timezone,
            message=event_data.message,
            status=event_data.status,
        )

        db.add(event)
        db.commit()
        db.refresh(event)

        return serialize_event(event)

    except Exception as exc:
        db.rollback()

        logger.exception(
            "Failed to create event"
        )

        raise HTTPException(
            status_code=500,
            detail="Could not save the event.",
        ) from exc


# =========================================================
# GET MY EVENTS
# GET /events
# =========================================================

@app.get("/events")
def get_my_events(
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(
        request,
        db,
    )

    events = (
        db.query(Event)
        .filter(Event.user_id == user.id)
        .order_by(
            Event.event_date.asc(),
            Event.event_time.asc(),
        )
        .all()
    )

    return [
        serialize_event(event)
        for event in events
    ]


# =========================================================
# GET ONE EVENT
# GET /events/{event_id}
# =========================================================

@app.get("/events/{event_id}")
def get_my_event(
    event_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(
        request,
        db,
    )

    event = (
        db.query(Event)
        .filter(
            Event.id == event_id,
            Event.user_id == user.id,
        )
        .first()
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found.",
        )

    return serialize_event(event)


# =========================================================
# UPDATE EVENT
# PUT /events/{event_id}
# =========================================================

@app.put("/events/{event_id}")
def update_my_event(
    event_id: int,
    event_data: EventUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(
        request,
        db,
    )

    event = (
        db.query(Event)
        .filter(
            Event.id == event_id,
            Event.user_id == user.id,
        )
        .first()
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found.",
        )

    try:
        if event_data.type is not None:
            event.event_type = event_data.type

        if event_data.customEventName is not None:
            event.custom_event_name = (
                event_data.customEventName
            )

        if event_data.recipient is not None:
            event.recipient = event_data.recipient

        if event_data.email is not None:
            event.email = event_data.email

        if event_data.date is not None:
            event.event_date = event_data.date

        if event_data.time is not None:
            event.event_time = event_data.time

        if event_data.timezone is not None:
            event.timezone = event_data.timezone

        if event_data.message is not None:
            event.message = event_data.message

        if event_data.status is not None:
            event.status = event_data.status

        db.commit()
        db.refresh(event)

        return serialize_event(event)

    except Exception as exc:
        db.rollback()

        logger.exception(
            "Failed to update event"
        )

        raise HTTPException(
            status_code=500,
            detail="Could not update the event.",
        ) from exc


# =========================================================
# CANCEL EVENT
# POST /events/{event_id}/cancel
# =========================================================

@app.post("/events/{event_id}/cancel")
def cancel_my_event(
    event_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(
        request,
        db,
    )

    event = (
        db.query(Event)
        .filter(
            Event.id == event_id,
            Event.user_id == user.id,
        )
        .first()
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found.",
        )

    event.status = "Cancelled"

    try:
        db.commit()
        db.refresh(event)

        return serialize_event(event)

    except Exception as exc:
        db.rollback()

        logger.exception(
            "Failed to cancel event"
        )

        raise HTTPException(
            status_code=500,
            detail="Could not cancel the event.",
        ) from exc


# =========================================================
# DELETE EVENT
# DELETE /events/{event_id}
# =========================================================

@app.delete("/events/{event_id}")
def delete_my_event(
    event_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(
        request,
        db,
    )

    event = (
        db.query(Event)
        .filter(
            Event.id == event_id,
            Event.user_id == user.id,
        )
        .first()
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found.",
        )

    try:
        db.delete(event)
        db.commit()

        return {
            "message": "Event deleted successfully.",
            "id": event_id,
        }

    except Exception as exc:
        db.rollback()

        logger.exception(
            "Failed to delete event"
        )

        raise HTTPException(
            status_code=500,
            detail="Could not delete the event.",
        ) from exc


# =========================================================
# STARTUP
# =========================================================

@app.on_event("startup")
def startup_event():
    """
    Start APScheduler when the FastAPI application starts.
    """
    if not scheduler.running:
        scheduler.add_job(
            check_scheduled_birthdays,
            "interval",
            minutes=1,
            id="birthday_notification_checker",
            replace_existing=True,
            max_instances=1,
        )

        # Added: register scheduled-event email checker
        # with the scheduler that is actually started by main.py.
        scheduler.add_job(
            check_scheduled_events,
            "interval",
            minutes=1,
            id="scheduled_event_checker",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

        scheduler.start()

    logger.info(
        "WishTime API started successfully."
    )
    logger.info(
        "Birthday notification scheduler started."
    )


# =========================================================
# SHUTDOWN
# =========================================================

@app.on_event("shutdown")
def shutdown_event():
    """
    Stop APScheduler cleanly when the FastAPI application shuts down.
    """
    if scheduler.running:
        scheduler.shutdown(wait=False)

    logger.info(
        "WishTime API shutting down."
    )
