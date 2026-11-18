import { dateTime } from '../utils/format.js';

export default function Timeline({ events = [] }) {
  if (!events.length) return <p className="muted">No events recorded yet.</p>;

  return (
    <ol className="timeline">
      {events.map((event, index) => (
        <li key={`${event.type}-${index}`} className="timeline-item">
          <span className="timeline-dot" aria-hidden="true" />
          <div>
            <strong>{event.label}</strong>
            <div className="timeline-meta">
              {dateTime(event.at)} · {event.actorRole}
            </div>
            {event.note ? <p className="timeline-note">{event.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}