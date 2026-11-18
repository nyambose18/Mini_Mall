import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PERSONAS, canOpenPathForRole } from '../data/personas.js';
import { InlineError } from '../components/PageStates.jsx';
import { roleLabel, roleLanding } from '../utils/format.js';

export default function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, login, demo } = useAuth();
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busyRole, setBusyRole] = useState('');
  const next = params.get('next') || '';

  function destinationFor(signedInUser) {
    if (next && canOpenPathForRole(next, signedInUser.role)) return next;
    return roleLanding(signedInUser.role);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      const signedInUser = await login(email, password);
      notify(`Welcome back, ${signedInUser.name}.`, 'success');
      navigate(destinationFor(signedInUser), { replace: true });
    } catch (caught) {
      setError(caught);
    }
  }

  async function handleDemo(role) {
    setError(null);
    setBusyRole(role);
    try {
      const signedInUser = await demo(role);
      notify(`Signed in as ${signedInUser.name} (${roleLabel(role)}).`, 'success');
      navigate(destinationFor(signedInUser), { replace: true });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusyRole('');
    }
  }

  return (
    <div className="stack">
      <section className="page-heading auth-heading">
        <span className="eyebrow">Sign in</span>
        <h1>Choose a persona or use your account</h1>
        <p className="muted">
          Each persona has a different workspace and different permissions. Role and record
          ownership are checked by the server, not only by the screens.
        </p>
      </section>

      {user ? (
        <div className="notice notice-info">
          <p>
            You are signed in as <strong>{user.name}</strong> ({roleLabel(user.role)}).
          </p>
          <button
            type="button"
            className="btn btn-small btn-ghost"
            onClick={() => navigate(roleLanding(user.role))}
          >
            Go to my workspace
          </button>
        </div>
      ) : null}

      <div className="auth-layout">
        <section className="panel login-panel">
          <h2>Email and password</h2>
          <p className="muted">
            The seeded accounts are seller, buyer and administrator accounts. The demo passwords are
            shown on the persona cards.
          </p>
          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="thabo@minimall.test"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <InlineError error={error} />
            <button className="btn btn-primary btn-large" type="submit">
              Sign in
            </button>
          </form>
          <p className="muted small">
            There is no buyer self-registration in this baseline. Seller and administrator access
            comes from seeded accounts only.
          </p>
        </section>

        <section className="persona-column" aria-label="Demo personas">
          <div className="section-heading">
            <div>
              <span className="eyebrow">One-click demo sign-in</span>
              <h2>The three personas</h2>
            </div>
          </div>
          {PERSONAS.map((persona) => (
            <article key={persona.role} className={`persona-card persona-${persona.role}`}>
              <div className="persona-card-top">
                <span className={`avatar avatar-${persona.role}`} aria-hidden="true">
                  {persona.initials}
                </span>
                <div>
                  <h3>{persona.name}</h3>
                  <p className="muted">
                    {persona.title} · {persona.place} · age {persona.age}
                  </p>
                </div>
              </div>
              <p className="persona-quote">“{persona.quote}”</p>
              <ul className="persona-goals">
                {persona.goals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
              <div className="persona-credentials">
                <span>{persona.email}</span>
                <span>{persona.password}</span>
              </div>
              <button
                type="button"
                className={`btn btn-primary btn-block persona-button-${persona.role}`}
                onClick={() => handleDemo(persona.role)}
                disabled={Boolean(busyRole)}
              >
                {busyRole === persona.role ? 'Signing in…' : `Sign in as ${persona.name.split(' ')[0]}`}
              </button>
            </article>
          ))}
          <p className="muted small">
            One-click sign-in works only in this local demonstration. Set <code>DEMO_LOGIN=false</code>{' '}
            in the server environment to disable it.
          </p>
        </section>
      </div>
    </div>
  );
}