import { Link } from 'react-router-dom';

export function LoadingPage({ label = 'Loading…' }) {
  return (
    <div className="state-box" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function ErrorNotice({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="notice notice-error" role="alert">
      <div>
        <strong>Something went wrong.</strong>
        <p>{error.message}</p>
      </div>
      {onRetry ? (
        <button type="button" className="btn btn-small btn-ghost" onClick={onRetry}>
          Try again
        </button>
      ) : null}
      {error.status === 401 ? (
        <Link className="btn btn-small btn-primary" to="/auth">
          Sign in
        </Link>
      ) : null}
    </div>
  );
}

export function InlineError({ error }) {
  if (!error) return null;
  return (
    <div className="notice notice-error" role="alert">
      <p>{error.message}</p>
    </div>
  );
}