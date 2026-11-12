import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Check,
  FileText,
  Mail,
  UserRound,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import RichTextEditor from "../components/RichTextEditor";
import MessagePreview from "../components/MessagePreview";
import Modal from "../components/Modal";
import { createEvent } from "../services/api";

const eventOptions = [
  "Birthday",
  "Anniversary",
  "Festival",
  "Achievement",
  "Thank You",
  "Custom Event",
];

const timezones = [
  "(GMT+05:30) India Standard Time",
  "(GMT+00:00) Greenwich Mean Time",
  "(GMT-05:00) Eastern Time",
];

const today = new Date();
const localToday = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(", ");
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  if (!error?.response) {
    return "Cannot connect to the backend. Check that your FastAPI server is running.";
  }

  return "Something went wrong. Please check your details and try again.";
}

export default function CreateEvent() {
  const [type, setType] = useState("Birthday");
  const [customEventName, setCustomEventName] = useState("");
  const [recipient, setRecipient] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(localToday);
  const [time, setTime] = useState("09:00");
  const [timezone, setTimezone] = useState(timezones[0]);

  const [message, setMessage] = useState(
    "Wishing you a wonderful day filled with happiness, success, and unforgettable memories!"
  );

  const [modal, setModal] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validateForm() {
    if (!recipient.trim()) {
      return "Please enter the recipient's name.";
    }

    if (!email.trim()) {
      return "Please enter the recipient's email address.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      return "Please enter a valid email address.";
    }

    if (!date) {
      return "Please select an event date.";
    }

    if (date < localToday) {
      return "The event date cannot be in the past.";
    }

    if (!time) {
      return "Please select an event time.";
    }

    if (type === "Custom Event" && !customEventName.trim()) {
      return "Please enter a custom event name.";
    }

    if (!message.trim()) {
      return "Please enter a message.";
    }

    return "";
  }

  async function saveEvent(status) {
    setError("");
    setSaved("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        type,
        customEventName:
          type === "Custom Event" ? customEventName.trim() : null,
        recipient: recipient.trim(),
        email: email.trim(),
        date,
        time,
        timezone,
        message: message.trim(),
        status,
      };

      await createEvent(payload);

      if (status === "Draft") {
        setSaved("Draft saved successfully.");
      } else {
        setModal(true);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  const formattedDate = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Choose a date";

  const formattedTime = time
    ? new Date(`2000-01-01T${time}:00`).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "Choose a time";

  return (
    <DashboardLayout>
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span>›</span>
        <span>Create Event</span>
      </div>

      <div className="page-title">
        <h1>Create a New Event</h1>
        <p>
          Set up a special wish and schedule it for the perfect moment.
        </p>
      </div>

      <div className="create-grid">
        <div className="create-left">
          <Card
            title={
              <>
                <FileText size={15} /> Event Details
              </>
            }
          >
            <Select
              label="Select Event Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={eventOptions}
            />

            {type === "Custom Event" && (
              <Input
                label="Custom Event Name"
                placeholder="Enter custom event name"
                value={customEventName}
                onChange={(e) => setCustomEventName(e.target.value)}
              />
            )}
          </Card>

          <Card
            title={
              <>
                <UserRound size={15} /> Recipient Details
              </>
            }
          >
            <div className="two-fields">
              <Input
                label="Recipient Name"
                icon={UserRound}
                placeholder="Enter recipient name"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />

              <Input
                label="Recipient Email"
                icon={Mail}
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </Card>

          <Card
            title={
              <>
                <CalendarDays size={15} /> Schedule Your Wish
              </>
            }
          >
            <div className="three-fields">
              <Input
                label="Event Date"
                type="date"
                value={date}
                min={localToday}
                onChange={(e) => setDate(e.target.value)}
              />

              <Input
                label="Event Time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />

              <Select
                label="Time Zone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={timezones}
              />
            </div>

            <div className="scheduled-box">
              <CalendarDays size={18} />
              <span>
                <b>Scheduled for</b>
                <small>
                  {formattedDate} · {formattedTime}
                </small>
              </span>
            </div>
          </Card>

          <Card
            title={
              <>
                <FileText size={15} /> Your Message
              </>
            }
          >
            <RichTextEditor
              value={message}
              onChange={setMessage}
            />
          </Card>
        </div>

        <aside className="create-right">
          <Card title="Message Preview">
            <MessagePreview
              recipient={recipient.trim().split(/\s+/)[0] || "Recipient"}
            />

            <div className="preview-schedule">
              <CalendarDays size={16} />
              <span>
                <b>Scheduled</b>
                <small>
                  {date || "No date selected"}
                  <br />
                  {formattedTime}
                </small>
              </span>
            </div>
          </Card>

          <Card title="Your Message">
            <RichTextEditor
              value={message}
              onChange={setMessage}
            />
          </Card>
        </aside>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="page-actions">
        <Button
          variant="outline"
          onClick={() => {
            setError("");
            setSaved("");
            setRecipient("");
            setEmail("");
            setCustomEventName("");
            setType("Birthday");
            setDate(localToday);
            setTime("09:00");
            setTimezone(timezones[0]);
            setMessage("");
          }}
          disabled={loading}
        >
          Clear Form
        </Button>

        <div>
          <Button
            variant="outline"
            onClick={() => saveEvent("Draft")}
            disabled={loading}
          >
            Save as Draft
          </Button>

          <Button
            onClick={() => saveEvent("Scheduled")}
            disabled={loading}
          >
            {loading ? "Saving..." : "Schedule Wish"}
          </Button>
        </div>
      </div>

      {saved && (
        <div className="toast" role="status">
          <Check size={15} /> {saved}
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        onUse={() => setModal(false)}
        onRegenerate={() => {}}
      />
    </DashboardLayout>
  );
}