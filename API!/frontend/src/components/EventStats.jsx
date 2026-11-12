import {
  CalendarDays,
  Clock3,
  FileText,
  Send,
} from "lucide-react";

export default function EventStats({ stats = {} }) {
  const eventStats = [
    [
      "Upcoming",
      stats.upcoming ?? 0,
      CalendarDays,
      "blue",
    ],
    [
      "Scheduled",
      stats.scheduled ?? 0,
      Clock3,
      "purple",
    ],
    [
      "Sent",
      stats.sent ?? 0,
      Send,
      "green",
    ],
    [
      "Drafts",
      stats.drafts ?? 0,
      FileText,
      "yellow",
    ],
  ];

  return (
    <div className="stats-grid">
      {eventStats.map(
        ([label, value, Icon, tone]) => (
          <div
            className="stat-card"
            key={label}
          >
            <div
              className={`stat-icon ${tone}`}
            >
              <Icon size={19} />
            </div>

            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          </div>
        )
      )}
    </div>
  );
}