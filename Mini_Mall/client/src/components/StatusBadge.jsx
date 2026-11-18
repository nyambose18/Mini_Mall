import { badgeTone, statusLabel } from '../utils/format.js';

export default function StatusBadge({ status, kind = 'generic', label }) {
  return (
    <span className={`badge badge-${badgeTone(status, kind)}`}>{label || statusLabel(status, kind)}</span>
  );
}