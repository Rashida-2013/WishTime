import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from database import SessionLocal
from models import User, Birthday, Event
from google_service import (
    send_birthday_email,
    send_event_email,
)


DEFAULT_TIMEZONE = ZoneInfo("Asia/Kolkata")


def get_event_timezone(timezone_label: str | None):
    """Convert a saved timezone label into a Python timezone."""

    if not timezone_label:
        return DEFAULT_TIMEZONE

    label = timezone_label.strip()
    normalized = label.lower()

    known_timezones = {
        "india standard time": "Asia/Kolkata",
        "ist": "Asia/Kolkata",
        "utc": "UTC",
        "coordinated universal time": "UTC",
        "eastern time": "America/New_York",
        "eastern standard time": "America/New_York",
        "central time": "America/Chicago",
        "central standard time": "America/Chicago",
        "mountain time": "America/Denver",
        "pacific time": "America/Los_Angeles",
        "pacific standard time": "America/Los_Angeles",
        "british summer time": "Europe/London",
        "gmt": "UTC",
    }

    for name, zone_name in known_timezones.items():
        if name in normalized:
            return ZoneInfo(zone_name)

    # Handle labels such as "(GMT+05:30) India Standard Time".
    match = re.search(
        r"GMT\s*([+-])\s*(\d{1,2}):(\d{2})",
        label,
        re.IGNORECASE,
    )

    if match:
        sign = 1 if match.group(1) == "+" else -1
        hours = int(match.group(2))
        minutes = int(match.group(3))

        offset = timedelta(
            hours=hours,
            minutes=minutes,
        ) * sign

        return timezone(offset)

    # Support standard IANA names, such as Asia/Kolkata.
    try:
        return ZoneInfo(label)
    except (KeyError, ValueError):
        print(
            f"Unknown timezone '{timezone_label}'. "
            "Using India Standard Time."
        )
        return DEFAULT_TIMEZONE


def check_birthdays():
    """Send birthday reminders that are due."""

    db: Session = SessionLocal()

    try:
        now = datetime.now(DEFAULT_TIMEZONE)
        current_date = now.date()
        current_hour = now.hour

        birthdays = (
            db.query(Birthday)
            .filter(Birthday.birthday.isnot(None))
            .all()
        )

        for birthday in birthdays:
            if birthday.birthday.month != current_date.month:
                continue

            if birthday.birthday.day != current_date.day:
                continue

            if birthday.reminder_time is None:
                continue

            if birthday.reminder_time.hour != current_hour:
                continue

            if birthday.last_sent_year == current_date.year:
                continue

            user = (
                db.query(User)
                .filter(User.id == birthday.user_id)
                .first()
            )

            if not user:
                continue

            try:
                send_birthday_email(
                    user=user,
                    recipient=birthday.email,
                    birthday_name=birthday.name,
                )

                birthday.last_sent_year = current_date.year
                db.commit()

                print(
                    f"Birthday email accepted by Gmail for "
                    f"{birthday.email}"
                )

            except Exception as error:
                db.rollback()
                print(
                    f"Birthday email failed for "
                    f"{birthday.email}: {error}"
                )

    finally:
        db.close()


def check_scheduled_events():
    """Send emails for events whose scheduled time has arrived."""

    db: Session = SessionLocal()

    try:
        now_utc = datetime.now(timezone.utc)

        events = (
            db.query(Event)
            .filter(Event.status == "Scheduled")
            .order_by(
                Event.event_date.asc(),
                Event.event_time.asc(),
            )
            .all()
        )

        for event in events:
            try:
                event_timezone = get_event_timezone(event.timezone)

                now_local = datetime.now(event_timezone)

                scheduled_at = datetime.combine(
                    event.event_date,
                    event.event_time,
                )

                # The saved event time is local to the selected timezone.
                # Compare it with the current time in that timezone.
                if scheduled_at > now_local.replace(tzinfo=None):
                    continue

                user = (
                    db.query(User)
                    .filter(User.id == event.user_id)
                    .first()
                )

                if not user:
                    print(
                        f"Event {event.id} skipped: "
                        "the event owner was not found."
                    )
                    continue

                event_name = (
                    event.custom_event_name
                    or event.event_type
                    or "Scheduled Event"
                )

                result = send_event_email(
                    user=user,
                    recipient=event.email,
                    event_name=event_name,
                    event_message=event.message,
                )

                # Gmail returned successfully. Mark the event as sent
                # only after that response has been received.
                if result and result.get("id"):
                    event.status = "Sent"
                    db.commit()

                    print(
                        f"Event email accepted by Gmail for "
                        f"{event.email}; event ID: {event.id}"
                    )
                else:
                    db.rollback()
                    print(
                        f"Event {event.id}: Gmail did not return "
                        "a message ID. The event remains scheduled."
                    )

            except Exception as error:
                db.rollback()
                print(
                    f"Event email failed for event {event.id}: {error}"
                )

    finally:
        db.close()


scheduler = BackgroundScheduler()


def start_scheduler():
    """Start the background checks once per minute."""

    if scheduler.running:
        return

    scheduler.add_job(
        check_birthdays,
        trigger="interval",
        minutes=1,
        id="birthday_checker",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.add_job(
        check_scheduled_events,
        trigger="interval",
        minutes=1,
        id="scheduled_event_checker",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()

    print("Birthday and scheduled-event email checks are running.")