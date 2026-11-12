from datetime import date as DateType, time as TimeType, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict


# =========================================================
# BIRTHDAY SCHEMAS
# Existing birthday reminder functionality
# =========================================================

class BirthdayCreate(BaseModel):
    name: str
    birthday: DateType
    email: EmailStr
    reminder_time: TimeType = TimeType(9, 0)


class BirthdayResponse(BaseModel):
    id: int
    name: str
    birthday: DateType
    email: str
    reminder_time: TimeType
    calendar_event_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# EVENT CREATE SCHEMA
# Used when creating a new scheduled event
# =========================================================

class EventCreate(BaseModel):
    type: str = "Birthday"
    customEventName: Optional[str] = None

    recipient: str
    email: EmailStr

    date: DateType
    time: TimeType

    timezone: str = "(GMT+05:30) India Standard Time"
    message: str

    status: str = "Scheduled"


# =========================================================
# EVENT UPDATE SCHEMA
# Used when editing an existing event
# =========================================================

class EventUpdate(BaseModel):
    type: Optional[str] = None
    customEventName: Optional[str] = None

    recipient: Optional[str] = None
    email: Optional[EmailStr] = None

    date: Optional[DateType] = None
    time: Optional[TimeType] = None

    timezone: Optional[str] = None
    message: Optional[str] = None
    status: Optional[str] = None


# =========================================================
# EVENT RESPONSE SCHEMA
# Used when returning event information to the frontend
# =========================================================

class EventResponse(BaseModel):
    id: int

    type: str
    customEventName: Optional[str] = None

    recipient: str
    contact: str

    date: DateType
    time: TimeType

    timezone: str
    status: str
    message: str

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# =========================================================
# WISH GENERATION REQUEST
# Used when requesting a birthday or event wish
# =========================================================

class WishGenerateRequest(BaseModel):
    recipient: str
    type: str = "Birthday"
    message: Optional[str] = None


# =========================================================
# WISH GENERATION RESPONSE
# =========================================================

class WishGenerateResponse(BaseModel):
    message: str