import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { roleLabel, roleLanding } from '../utils/format.js';
import { LoadingPage } from './PageStates.jsx';

export default function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingPage label="Checking your account…" />;

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  if (user.role !== role) {
    return (
      <section className="panel centered-panel">
        <span className="eyebrow">Access restricted</span>
        <h1>This area is for {role === 'seller' ? 'sellers' : role === 'admin' ? 'administrators' : 'buyers'}.</h1>
        <p className="muted">
          You are signed in as {user.name} ({roleLabel(user.role)}). Access is checked on the server
          as well as in this page, so another role cannot open these records.
        </p>
        <div className="button-row">
          <Link className="btn btn-primary" to={roleLanding(user.role)}>
            Go to my workspace
          </Link>
          <Link className="btn btn-ghost" to="/products">
            Browse products
          </Link>
        </div>
      </section>
    );
  }

  return children;
}