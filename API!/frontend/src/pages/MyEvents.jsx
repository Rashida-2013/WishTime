import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  
  Search,
  Pencil,
  CalendarX,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import EventStats from "../components/EventStats";
import EventIcon from "../components/EventIcon";
import StatusBadge from "../components/StatusBadge";
import Button from "../components/Button";

import {
  getEvents,
  getPublicEvents,
  getCurrentUser,
  updateEvent,
  cancelEvent,
  deleteEvent,
} from "../services/api";

const filters = [
  "All",
  "Scheduled",
  "Sent",
  "Draft",
  "Cancelled",
];

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(", ");
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (!error?.response) {
    return "Cannot connect to the backend. Check that your FastAPI server is running.";
  }

  return "Something went wrong. Please try again.";
}

function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "No time";

  const time = String(value).slice(0, 5);
  const [hours, minutes] = time.split(":").map(Number);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return String(value);
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function normalizeEvent(event) {
  return {
    ...event,
    id: event.id,
    type: event.type || "Birthday",
    customEventName: event.customEventName || "",
    recipient: event.recipient || "",
    email: event.contact || event.email || "",
    date: event.date || event.event_date || "",
    time: event.time || event.event_time || "",
    timezone:
      event.timezone ||
      "(GMT+05:30) India Standard Time",
    message: event.message || "",
    status: event.status || "Scheduled",
  };
}

const defaultForm = {
  type: "Birthday",
  customEventName: "",
  recipient: "",
  email: "",
  date: "",
  time: "09:00",
  timezone: "(GMT+05:30) India Standard Time",
  message: "",
};

export default function MyEvents() {
  const navigate = useNavigate();
  const [eventList, setEventList] = useState([]);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [action, setAction] = useState("");

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [editForm, setEditForm] = useState(defaultForm);

  // ------------------------------------------------------
  // LOAD EVENTS FROM THE BACKEND
  // ------------------------------------------------------

  async function loadEvents() {
  setLoading(true);
  setError("");

  try {
    let response;

    try {
      // First try to load the user's own events.
      response = await getEvents();
    } catch (requestError) {
      // If the user is not logged in, load the
      // public scheduled events instead.
      if (requestError?.response?.status === 401) {
        response = await getPublicEvents();
      } else {
        throw requestError;
      }
    }

    const data = Array.isArray(response.data)
      ? response.data
      : [];

    setEventList(data.map(normalizeEvent));
  } catch (requestError) {
    setError(getErrorMessage(requestError));
  } finally {
    setLoading(false);
  }
}
  useEffect(() => {
    loadEvents();
  }, []);

  // ------------------------------------------------------
  // FILTER AND SEARCH EVENTS
  // ------------------------------------------------------

  const filtered = useMemo(() => {
    const searchText = query.trim().toLowerCase();

    return eventList.filter((event) => {
      const matchesFilter =
        filter === "All" || event.status === filter;

      const matchesSearch =
        !searchText ||
        [
          event.type,
          event.customEventName,
          event.recipient,
          event.email,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchText);

      return matchesFilter && matchesSearch;
    });
  }, [eventList, filter, query]);




  // =========================================================
// EVENT STATISTICS
// Calculate the numbers from the actual events.
// =========================================================

const eventStats = useMemo(() => {
  const now = new Date();

  let upcoming = 0;
  let scheduled = 0;
  let sent = 0;
  let drafts = 0;

  eventList.forEach((event) => {
    const status = String(event.status || "")
      .trim()
      .toLowerCase();

    // Scheduled events
    if (status === "scheduled") {
      scheduled += 1;

      // Upcoming = scheduled event whose date/time
      // is today or in the future.
      if (event.date) {
        const eventDateTime = new Date(
          `${event.date}T${String(event.time || "00:00").slice(0, 5)}`
        );

        if (!Number.isNaN(eventDateTime.getTime()) && eventDateTime >= now) {
          upcoming += 1;
        }
      }
    }

    // Sent events
    if (status === "sent") {
      sent += 1;
    }

    // Draft events
    if (status === "draft") {
      drafts += 1;
    }
  });

  return {
    upcoming,
    scheduled,
    sent,
    drafts,
  };
}, [eventList]);

  // ------------------------------------------------------
  // OPEN AN ACTION
  // ------------------------------------------------------

  async function openAction(event, actionName) {
  setNotice("");
  setError("");

  // Editing requires authentication.
  if (actionName === "edit") {
    try {
      await getCurrentUser();
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        navigate("/login");
        return;
      }

      setError(getErrorMessage(requestError));
      return;
    }

    setSelectedEvent(event);
    setAction(actionName);

    setEditForm({
      type: event.type || "Birthday",
      customEventName: event.customEventName || "",
      recipient: event.recipient || "",
      email: event.email || "",
      date: event.date || "",
      time: String(event.time || "09:00").slice(0, 5),
      timezone:
        event.timezone ||
        "(GMT+05:30) India Standard Time",
      message: event.message || "",
    });

    return;
  }

  // Keep the existing cancel/delete behavior.
  setSelectedEvent(event);
  setAction(actionName);
}

  function closeDialog() {
    if (processing) return;

    setSelectedEvent(null);
    setAction("");
    setError("");
  }

  function changeEditField(field, value) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // ------------------------------------------------------
  // SAVE EVENT EDITS
  // PUT /api/events/{id}
  // ------------------------------------------------------

  async function handleSaveEdit(event) {
    event.preventDefault();

    if (!selectedEvent) return;

    setError("");
    setNotice("");

    if (
      !editForm.recipient.trim() ||
      !editForm.email.trim() ||
      !editForm.date ||
      !editForm.time ||
      !editForm.message.trim()
    ) {
      setError(
        "Please fill in the recipient, email, date, time, and message."
      );
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(editForm.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (
      editForm.type === "Custom Event" &&
      !editForm.customEventName.trim()
    ) {
      setError("Please enter a custom event name.");
      return;
    }

    setProcessing(true);

    try {
      const payload = {
        type: editForm.type,
        customEventName:
          editForm.type === "Custom Event"
            ? editForm.customEventName.trim()
            : null,
        recipient: editForm.recipient.trim(),
        email: editForm.email.trim(),
        date: editForm.date,
        time: editForm.time,
        timezone: editForm.timezone,
        message: editForm.message.trim(),
      };

      const response = await updateEvent(
        selectedEvent.id,
        payload
      );

      const updatedEvent = normalizeEvent(response.data);

      setEventList((current) =>
        current.map((item) =>
          item.id === selectedEvent.id
            ? updatedEvent
            : item
        )
      );

      setNotice("Event updated successfully.");
      setSelectedEvent(null);
      setAction("");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setProcessing(false);
    }
  }

  // ------------------------------------------------------
  // CANCEL OR DELETE AN EVENT
  // ------------------------------------------------------

  async function handleConfirmAction() {
    if (!selectedEvent || processing) return;

    setError("");
    setNotice("");
    setProcessing(true);

    try {
      if (action === "cancel") {
        const response = await cancelEvent(selectedEvent.id);

        const updatedEvent = normalizeEvent(response.data);

        setEventList((current) =>
          current.map((event) =>
            event.id === selectedEvent.id
              ? updatedEvent
              : event
          )
        );

        setNotice("Event schedule cancelled successfully.");
      } else if (action === "delete") {
        await deleteEvent(selectedEvent.id);

        setEventList((current) =>
          current.filter(
            (event) => event.id !== selectedEvent.id
          )
        );

        setNotice("Event deleted successfully.");
      }

      setSelectedEvent(null);
      setAction("");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setProcessing(false);
    }
  }

  // ------------------------------------------------------
  // PAGE
  // ------------------------------------------------------

  return (
    <DashboardLayout>
      <div className="page-title">
        <h1>My Events</h1>
        <p>
          Manage all your scheduled wishes in one place.
        </p>
      </div>

      <EventStats stats={eventStats} />

      <div className="events-toolbar">
        <div className="filter-tabs">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <label className="search-box">
          <Search size={15} />

          <input
            type="search"
            placeholder="Search events..."
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
          />
        </label>
      </div>

      {error && !selectedEvent && (
        <div className="error-message" role="alert">
          {error}

          <button
            type="button"
            onClick={loadEvents}
            disabled={loading}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      <div className="events-table-wrap">
        <table className="events-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Recipient</th>
              <th>Date &amp; Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    Loading your events...
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    {error
                      ? "Events could not be loaded."
                      : "No events match your search."}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((event) => (
                <tr key={event.id}>
                  <td data-label="Event">
                    <span className="event-name">
                      <span
                        className={`table-event-icon ${event.type
                          .toLowerCase()
                          .replaceAll(" ", "-")}`}
                      >
                        <EventIcon
                          type={event.type}
                          size={17}
                        />
                      </span>

                      <span>
                        <b>
                          {event.type === "Custom Event"
                            ? event.customEventName ||
                              "Custom Event"
                            : event.type}
                        </b>
                      </span>
                    </span>
                  </td>

                  <td data-label="Recipient">
                    <div>{event.recipient}</div>
                    {event.email && (
                      <small>{event.email}</small>
                    )}
                  </td>

                  <td data-label="Date & Time">
                    {formatDate(event.date)}
                    {" · "}
                    {formatTime(event.time)}
                  </td>

                  <td data-label="Status">
                    <StatusBadge status={event.status} />
                  </td>

                  <td data-label="Actions">
                    <Link
  className="table-view"
  to={`/events/${event.id}`}
>
  View
</Link>

<div className="event-actions">
  <button
    type="button"
    className="event-action-btn edit-action"
    onClick={() =>
      openAction(event, "edit")
    }
  >
    <Pencil size={14} />
    Edit Event
  </button>

  {event.status === "Scheduled" && (
    <button
      type="button"
      className="event-action-btn cancel-action"
      onClick={() =>
        openAction(event, "cancel")
      }
    >
      <CalendarX size={14} />
      Cancel Schedule
    </button>
  )}

  <button
    type="button"
    className="event-action-btn delete-action"
    onClick={() =>
      openAction(event, "delete")
    }
  >
    <Trash2 size={14} />
    Delete Event
  </button>
</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mobile-new-event">
        <Link to="/create-event">
          <Button>Create an Event</Button>
        </Link>
      </div>

      {notice && (
        <div className="toast" role="status">
          {notice}

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* EDIT, CANCEL, AND DELETE DIALOG */}
      {selectedEvent && (
        <div
          className="modal-backdrop"
          onMouseDown={closeDialog}
        >
          <div
            className="wish-modal event-action-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-action-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="modal-close"
              onClick={closeDialog}
              aria-label="Close"
              disabled={processing}
            >
              <X size={17} />
            </button>

            <h2 id="event-action-title">
              {action === "edit" && "Edit Event"}
              {action === "cancel" && "Cancel Schedule"}
              {action === "delete" && "Delete Event"}
            </h2>

            <p>
              <strong>
                {selectedEvent.type === "Custom Event"
                  ? selectedEvent.customEventName ||
                    "Custom Event"
                  : selectedEvent.type}
              </strong>
              {" — "}
              {selectedEvent.recipient}
            </p>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            {/* EDIT FORM */}
            {action === "edit" && (
              <form onSubmit={handleSaveEdit}>
                <div className="event-edit-form">
                  <label>
                    Event Type
                    <select
                      value={editForm.type}
                      onChange={(event) =>
                        changeEditField(
                          "type",
                          event.target.value
                        )
                      }
                    >
                      {[
                        "Birthday",
                        "Anniversary",
                        "Festival",
                        "Achievement",
                        "Thank You",
                        "Custom Event",
                      ].map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>

                  {editForm.type === "Custom Event" && (
                    <label>
                      Custom Event Name
                      <input
                        type="text"
                        value={editForm.customEventName}
                        onChange={(event) =>
                          changeEditField(
                            "customEventName",
                            event.target.value
                          )
                        }
                        required
                      />
                    </label>
                  )}

                  <label>
                    Recipient Name
                    <input
                      type="text"
                      value={editForm.recipient}
                      onChange={(event) =>
                        changeEditField(
                          "recipient",
                          event.target.value
                        )
                      }
                      required
                    />
                  </label>

                  <label>
                    Recipient Email
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(event) =>
                        changeEditField(
                          "email",
                          event.target.value
                        )
                      }
                      required
                    />
                  </label>

                  <div className="event-edit-fields">
                    <label>
                      Event Date
                      <input
                        type="date"
                        value={editForm.date}
                        onChange={(event) =>
                          changeEditField(
                            "date",
                            event.target.value
                          )
                        }
                        required
                      />
                    </label>

                    <label>
                      Event Time
                      <input
                        type="time"
                        value={editForm.time}
                        onChange={(event) =>
                          changeEditField(
                            "time",
                            event.target.value
                          )
                        }
                        required
                      />
                    </label>
                  </div>

                  <label>
                    Time Zone
                    <select
                      value={editForm.timezone}
                      onChange={(event) =>
                        changeEditField(
                          "timezone",
                          event.target.value
                        )
                      }
                    >
                      {[
                        "(GMT+05:30) India Standard Time",
                        "(GMT+00:00) Greenwich Mean Time",
                        "(GMT-05:00) Eastern Time",
                      ].map((timezone) => (
                        <option
                          key={timezone}
                          value={timezone}
                        >
                          {timezone}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Message
                    <textarea
                      rows={5}
                      value={editForm.message}
                      onChange={(event) =>
                        changeEditField(
                          "message",
                          event.target.value
                        )
                      }
                      required
                    />
                  </label>
                </div>

                <div className="event-modal-actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialog}
                    disabled={processing}
                  >
                    Close
                  </Button>

                  <Button
                    type="submit"
                    disabled={processing}
                  >
                    {processing
                      ? "Saving..."
                      : "Save Changes"}
                  </Button>
                </div>
              </form>
            )}

            {/* CANCEL CONFIRMATION */}
            {action === "cancel" && (
              <>
                <p>
                  Are you sure you want to cancel this
                  scheduled event?
                </p>

                <div className="event-modal-actions">
                  <Button
                    variant="outline"
                    onClick={closeDialog}
                    disabled={processing}
                  >
                    Keep Event
                  </Button>

                  <Button
                    onClick={handleConfirmAction}
                    disabled={processing}
                  >
                    {processing
                      ? "Cancelling..."
                      : "Confirm Cancellation"}
                  </Button>
                </div>
              </>
            )}

            {/* DELETE CONFIRMATION */}
            {action === "delete" && (
              <>
                <p>
                  Are you sure you want to permanently
                  delete this event? This cannot be undone.
                </p>

                <div className="event-modal-actions">
                  <Button
                    variant="outline"
                    onClick={closeDialog}
                    disabled={processing}
                  >
                    Keep Event
                  </Button>

                  <Button
                    onClick={handleConfirmAction}
                    disabled={processing}
                  >
                    {processing
                      ? "Deleting..."
                      : "Confirm Delete"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}