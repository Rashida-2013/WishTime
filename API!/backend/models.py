from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    Time,
    Text,
    ForeignKey,
    DateTime,
)
from sqlalchemy.sql import func

from database import Base


# =========================================================
# USER MODEL
# =========================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    google_id = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    name = Column(String(255))

    access_token = Column(Text)
    refresh_token = Column(Text)

    token_expiry = Column(String(100))

    # Password hash for normal email/password accounts.
    # Google accounts can leave this field empty.
    password_hash = Column(Text, nullable=True)


# =========================================================
# BIRTHDAY MODEL
# Preserved for existing birthday reminders and scheduler.
# =========================================================

class Birthday(Base):
    __tablename__ = "birthdays"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        nullable=False,
    )

    name = Column(
        String(255),
        nullable=False,
    )

    birthday = Column(
        Date,
        nullable=False,
    )

    email = Column(
        String(255),
        nullable=False,
    )

    reminder_time = Column(
        Time,
        nullable=False,
    )

    calendar_event_id = Column(
        String(255),
        nullable=True,
    )

    last_sent_year = Column(
        Integer,
        nullable=True,
    )


# =========================================================
# GENERAL EVENT MODEL
# Supports the frontend's Create Event and My Events pages.
# =========================================================

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # Birthday, Anniversary, Festival, Achievement, etc.
    event_type = Column(
        String(100),
        nullable=False,
        default="Birthday",
    )

    # Used when the user selects Custom Event.
    custom_event_name = Column(
        String(255),
        nullable=True,
    )

    # Recipient information.
    recipient = Column(
        String(255),
        nullable=False,
    )

    email = Column(
        String(255),
        nullable=False,
    )

    # Scheduled date and time.
    event_date = Column(
        Date,
        nullable=False,
    )

    event_time = Column(
        Time,
        nullable=False,
    )

    timezone = Column(
        String(255),
        nullable=False,
        default="(GMT+05:30) India Standard Time",
    )

    # Greeting or message content.
    message = Column(
        Text,
        nullable=False,
    )

    # Scheduled, Draft, Sent, or Cancelled.
    status = Column(
        String(50),
        nullable=False,
        default="Scheduled",
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
    )