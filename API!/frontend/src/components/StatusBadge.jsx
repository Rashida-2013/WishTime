import {
  CheckCircle2,
  Clock3,
  Send,
  FileText,
  XCircle,
} from "lucide-react";

const icons = {
  Scheduled: CheckCircle2,
  Sent: Send,
  Draft: FileText,
  Cancelled: XCircle,
};

export default function StatusBadge({ status }) {
  // Prevent errors when status is missing
  const safeStatus = status || "Scheduled";

  const Icon = icons[safeStatus] || Clock3;

  return (
    <span className={`status status-${safeStatus.toLowerCase()}`}>
      <Icon size={12} strokeWidth={2.5} />
      {safeStatus}
    </span>
  );
}

