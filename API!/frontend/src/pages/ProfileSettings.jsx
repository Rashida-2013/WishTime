import { useState } from "react";
import { Clock3, KeyRound, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import Toggle from "../components/Toggle";
import { updateProfile } from "../services/api";

export default function ProfileSettings() {
  const [emailOn, setEmailOn] = useState(true);
  const [reminderOn, setReminderOn] = useState(true);
  const [saved, setSaved] = useState(false);

  async function save() {
    await updateProfile({ emailOn, reminderOn });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <DashboardLayout>
      <div className="breadcrumb"><span>Home</span><span>›</span><span>Profile</span></div>
      <div className="page-title"><h1>Profile & Settings</h1><p>Manage your account and preferences.</p></div>

      <div className="settings-grid">
        <Card title="Profile Information">
          <div className="profile-summary">
            <div className="avatar-large">PS</div>
            <div><span>Sarah name</span><strong>Priya Sharma</strong></div>
          </div>
          <Input label="Full Name" value="Priya Sharma" readOnly />
          <Input label="Email" icon={Mail} value="priya@example.com" readOnly />
          <Input label="Phone" icon={Phone} value="+91 98765 43210" readOnly />
          <div className="card-bottom"><Button>Edit Profile</Button></div>
        </Card>

        <Card title="Preferences">
          <Select label="Time Zone" options={["(GMT+05:30) India Standard Time", "(GMT+00:00) Greenwich Mean Time"]} />
          <div className="preference-block">
            <span className="field-label">Notification Preferences</span>
            <Toggle label="Email Notifications" checked={emailOn} onChange={setEmailOn} />
            <Toggle label="Reminder Notifications" checked={reminderOn} onChange={setReminderOn} />
          </div>
          <Select label="Reminder Settings" options={["1 hour before", "3 hours before", "1 day before"]} />
          <div className="security">
            <span className="field-label">Security</span>
            <div className="security-grid">
              <button><KeyRound size={15} /> Change Password</button>
              <button><ShieldCheck size={15} /> Login Sessions</button>
            </div>
          </div>
          <div className="card-bottom align-right"><Button onClick={save}>Save Changes</Button></div>
        </Card>
      </div>
      {saved && <div className="toast"><Clock3 size={15} /> Changes saved</div>}
    </DashboardLayout>
  );
}
