import os
import base64
from email.message import EmailMessage

from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from models import User

load_dotenv()


def get_credentials(user: User):
    """Create Google credentials for the logged-in user."""

    return Credentials(
        token=user.access_token,
        refresh_token=user.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=[
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "openid",
        ],
    )


def create_calendar_event(
    user: User,
    birthday,
):
    """Create a recurring birthday event in Google Calendar."""

    credentials = get_credentials(user)

    calendar = build(
        "calendar",
        "v3",
        credentials=credentials,
        cache_discovery=False,
    )

    birthday_name = (
        getattr(birthday, "name", None)
        or getattr(birthday, "birthday_name", None)
        or "Birthday"
    )

    birthday_date = (
        getattr(birthday, "date", None)
        or getattr(birthday, "birthday_date", None)
    )

    if not birthday_date:
        raise ValueError(
            "The birthday event does not contain a date."
        )

    event = {
        "summary": f"🎂 {birthday_name}'s Birthday",
        "description": f"Birthday reminder for {birthday_name}",
        "start": {
            "date": birthday_date.isoformat(),
        },
        "end": {
            "date": birthday_date.isoformat(),
        },
        "recurrence": [
            "RRULE:FREQ=YEARLY",
        ],
    }

    result = (
        calendar.events()
        .insert(
            calendarId="primary",
            body=event,
        )
        .execute()
    )

    return result

def _send_email(user: User, recipient: str, subject: str, content: str):
    """Send an email through the user's Google Gmail account."""

    if not user.access_token:
        raise ValueError(
            "Google access token is missing. Please log in again."
        )

    credentials = get_credentials(user)

    gmail = build(
        "gmail",
        "v1",
        credentials=credentials,
    )

    message = EmailMessage()
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(content)

    encoded_message = base64.urlsafe_b64encode(
        message.as_bytes()
    ).decode("utf-8")

    result = (
        gmail.users()
        .messages()
        .send(
            userId="me",
            body={"raw": encoded_message},
        )
        .execute()
    )

    return result


def send_birthday_email(
    user: User,
    birthday,
):
    """
    Send an email notification when a birthday event
    is scheduled.
    """

    recipient = user.email

    if not recipient:
        raise ValueError(
            "The logged-in user's email address is missing."
        )

    birthday_name = (
        getattr(birthday, "name", None)
        or getattr(birthday, "birthday_name", None)
        or "Birthday"
    )

    subject = f"🎂 Birthday Reminder - {birthday_name}"

    content = f"""Hello {user.name or 'there'},

Your birthday event for {birthday_name} has been scheduled.

Event date: {getattr(birthday, 'date', 'See your WishTime calendar')}

Have a great day!

WishTime
"""

    return _send_email(
        user=user,
        recipient=recipient,
        subject=subject,
        content=content,
    )

def send_event_email(
    user: User,
    recipient: str,
    event_name: str,
    event_message: str,
):
    """Send the message saved for a scheduled event."""

    subject = f"🎉 {event_name}"

    content = f"""{event_message}

Sent using WishTime.
"""

    return _send_email(
        user=user,
        recipient=recipient,
        subject=subject,
        content=content,
    )