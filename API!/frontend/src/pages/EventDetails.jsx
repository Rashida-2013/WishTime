import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Gift,
  Edit3,
  Trash2,
  XCircle,
  Save,
  ArrowLeft,
  LoaderCircle,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import StatusBadge from "../components/StatusBadge";
import MessagePreview from "../components/MessagePreview";

import {
  getEventById,
  updateEvent,
  cancelEvent,
  deleteEvent,
} from "../services/api";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    type: "Birthday",
    customEventName: "",
    recipient: "",
    email: "",
    date: "",
    time: "",
    timezone: "(GMT+05:30) India Standard Time",
    message: "",
  });

  // Load the selected event from the FastAPI backend.
  useEffect(() => {
    let active = true;

    async function loadEvent() {
      setLoading(true);
      setError("");

      try {
        const response = await getEventById(id);
        const data = response.data;

        if (!active) return;

        setEvent(data);

        setForm({
          type: data.type || "Birthday",
          customEventName: data.customEventName || "",
          recipient: data.recipient || "",
          email: data.contact || data.email || "",
          date: String(data.date || "").slice(0, 10),
          time: String(data.time || "09:00").slice(0, 5),
          timezone:
            data.timezone || "(GMT+05:30) India Standard Time",
          message: data.message || "",
        });
      } catch (err) {
        if (!active) return;

        setError(
          err.response?.data?.detail ||
            "Unable to load this event. Check that the backend is running and the event exists."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    if (id) {
      loadEvent();
    } else {
      setError("No event ID was provided.");
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [id]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function startEditing() {
    setNotice("");
    setError("");
    setEditing(true);
  }

  function cancelEditing() {
    if (!event) return;

    setForm({
      type: event.type || "Birthday",
      customEventName: event.customEventName || "",
      recipient: event.recipient || "",
      email: event.contact || event.email || "",
      date: String(event.date || "").slice(0, 10),
      time: String(event.time || "09:00").slice(0, 5),
      timezone:
        event.timezone || "(GMT+05:30) India Standard Time",
      message: event.message || "",
    });

    setEditing(false);
    setError("");
  }

  async function saveChanges(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (
      !form.recipient.trim() ||
      !form.email.trim() ||
      !form.date ||
      !form.time ||
      !form.message.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        type: form.type,
        customEventName:
          form.type === "Other"
            ? form.customEventName.trim() || null
            : null,
        recipient: form.recipient.trim(),
        email: form.email.trim(),
        date: form.date,
        time: form.time,
        timezone: form.timezone,
        message: form.message.trim(),
      };

      const response = await updateEvent(id, payload);

      setEvent(response.data);

      setForm({
        type: response.data.type || "Birthday",
        customEventName: response.data.customEventName || "",
        recipient: response.data.recipient || "",
        email: response.data.contact || response.data.email || "",
        date: String(response.data.date || "").slice(0, 10),
        time: String(response.data.time || "09:00").slice(0, 5),
        timezone:
          response.data.timezone ||
          "(GMT+05:30) India Standard Time",
        message: response.data.message || "",
      });

      setEditing(false);
      setNotice("Event updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to update the event. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!event || actionLoading) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this event?"
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setActionLoading(true);

    try {
      const response = await cancelEvent(id);

      setEvent(response.data);
      setNotice("Event cancelled successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to cancel the event."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!event || actionLoading) return;

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this event?"
    );

    if (!confirmed) return;

    setError("");
    setActionLoading(true);

    try {
      await deleteEvent(id);
      navigate("/events", {
        replace: true,
        state: { notice: "Event deleted successfully." },
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to delete the event."
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="event-details-message">
          <LoaderCircle size={22} className="loading-icon" />
          <p>Loading event details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!event) {
    return (
      <DashboardLayout>
        <div className="breadcrumb">
          <Link to="/events">My Events</Link>
          <span>›</span>
          <span>Event Details</span>
        </div>

        <Card title="Event Not Found">
          <p>
            {error ||
              "This event could not be found. It may have been deleted."}
          </p>

          <Link to="/events" className="event-back-link">
            <ArrowLeft size={16} />
            Back to My Events
          </Link>
        </Card>
      </DashboardLayout>
    );
  }

  const eventTitle =
    event.type === "Other" && event.customEventName
      ? event.customEventName
      : event.type;

  return (
    <DashboardLayout>
      <div className="breadcrumb">
        <Link to="/events">My Events</Link>
        <span>›</span>
        <span>Event Details</span>
      </div>

      <div className="page-title title-with-status">
        <div>
          <h1>{eventTitle} Wish</h1>
          <p>View and manage your scheduled event.</p>
        </div>

        <StatusBadge status={event.status} />
      </div>

      {error && (
        <div className="event-alert event-alert-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="event-alert event-alert-success" role="status">
          {notice}
        </div>
      )}

      <div className="detail-grid">
        <div className="detail-main">
          {editing ? (
            <Card title="Edit Event Information">
              <form onSubmit={saveChanges}>
                <div className="event-edit-form">
                  <label>
                    Event Type
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      required
                    >
                      <option value="Birthday">Birthday</option>
                      <option value="Anniversary">Anniversary</option>
                      <option value="Wedding">Wedding</option>
                      <option value="Festival">Festival</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  {form.type === "Other" && (
                    <label>
                      Custom Event Name
                      <input
                        name="customEventName"
                        value={form.customEventName}
                        onChange={handleChange}
                        placeholder="Enter event name"
                      />
                    </label>
                  )}

                  <label>
                    Recipient Name
                    <input
                      name="recipient"
                      value={form.recipient}
                      onChange={handleChange}
                      required
                    />
                  </label>

                  <label>
                    Email Address
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </label>

                  <div className="event-edit-fields">
                    <label>
                      Date
                      <input
                        type="date"
                        name="date"
                        value={form.date}
                        onChange={handleChange}
                        required
                      />
                    </label>

                    <label>
                      Time
                      <input
                        type="time"
                        name="time"
                        value={form.time}
                        onChange={handleChange}
                        required
                      />
                    </label>
                  </div>

                  <label>
                    Time Zone
                    <select
                      name="timezone"
                      value={form.timezone}
                      onChange={handleChange}
                      required
                    >
                      <option value="(GMT+05:30) India Standard Time">
                        India Standard Time (IST)
                      </option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">
                        Eastern Time
                      </option>
                      <option value="America/Los_Angeles">
                        Pacific Time
                      </option>
                      <option value="Europe/London">
                        London Time
                      </option>
                    </select>
                  </label>

                  <label>
                    Message
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={5}
                      required
                    />
                  </label>
                </div>

                <div className="event-modal-actions">
                  <Button
                    type="submit"
                    disabled={saving}
                  >
                    <Save size={15} />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <>
              <Card title="Event Information">
                <div className="event-information">
                  <div className="large-event-icon">
                    <Gift size={24} />
                  </div>

                  <dl>
                    <div>
                      <dt>Event Type</dt>
                      <dd>{eventTitle}</dd>
                    </div>

                    <div>
                      <dt>Recipient</dt>
                      <dd>{event.recipient}</dd>
                    </div>

                    <div>
                      <dt>Email Address</dt>
                      <dd>{event.contact || event.email || "—"}</dd>
                    </div>

                    <div>
                      <dt>Date</dt>
                      <dd>{event.date || "—"}</dd>
                    </div>

                    <div>
                      <dt>Time</dt>
                      <dd>{String(event.time || "—").slice(0, 5)}</dd>
                    </div>

                    <div>
                      <dt>Time Zone</dt>
                      <dd>{event.timezone || "—"}</dd>
                    </div>
                  </dl>
                </div>
              </Card>

              <Card title="Message">
                <div className="message-card-content">
                  <h3>
                    {event.type === "Birthday"
                      ? `Happy Birthday, ${event.recipient}!`
                      : `${eventTitle}, ${event.recipient}!`}
                  </h3>

                  <p>{event.message}</p>

                  <div className="message-mini-art">
                    <MessagePreview recipient={event.recipient} />
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        <aside className="detail-side">
          <Card title="Actions">
            {!editing && (
              <Button
                className="full"
                onClick={startEditing}
                disabled={actionLoading}
              >
                <Edit3 size={14} />
                Edit Event
              </Button>
            )}

            {!editing && event.status === "Scheduled" && (
              <Button
                variant="danger-outline"
                className="full"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                <XCircle size={14} />
                {actionLoading ? "Please wait..." : "Cancel Schedule"}
              </Button>
            )}

            {!editing && (
              <Button
                variant="danger-outline"
                className="full"
                onClick={handleDelete}
                disabled={actionLoading}
              >
                <Trash2 size={14} />
                Delete Event
              </Button>
            )}

            <Link to="/events" className="event-back-link">
              <ArrowLeft size={16} />
              Back to My Events
            </Link>
          </Card>

          <Card title="Status">
            <div className="status-box">
              <StatusBadge status={event.status} />
              <span>Scheduled for</span>
              <b>
                {event.date} · {String(event.time || "").slice(0, 5)}
              </b>
            </div>
          </Card>
        </aside>
      </div>
    </DashboardLayout>
  );
}