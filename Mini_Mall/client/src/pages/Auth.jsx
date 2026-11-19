import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { canOpenPathForRole } from '../data/personas.js';
import { InlineError } from '../components/PageStates.jsx';
import { roleLabel, roleLanding } from '../utils/format.js';

const INITIAL_FORM = { name: '', email: '', phone: '', address: '', postcode: '', password: '', confirmPassword: '' };

export default function Auth() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [role, setRole] = useState('buyer');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [applicationEmail, setApplicationEmail] = useState('');
  const registering = params.get('mode') === 'register';
  const next = params.get('next') || '';

  function setMode(mode) {
    const updated = new URLSearchParams(params);
    if (mode === 'register') updated.set('mode', mode);
    else updated.delete('mode');
    setParams(updated);
    setError(null);
    setApplicationEmail('');
    setForm((current) => ({ ...current, password: '', confirmPassword: '' }));
  }

  function destinationFor(account) {
    if (next.startsWith('/') && !next.startsWith('//') && canOpenPathForRole(next, account.role)) return next;
    return roleLanding(account.role);
  }

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    if (registering && form.password !== form.confirmPassword) {
      setError({ message: 'Your passwords do not match.', fields: { confirmPassword: 'Enter the same password again.' } });
      return;
    }
    setBusy(true);
    try {
      if (registering) {
        const { confirmPassword, ...details } = form;
        const result = await register({ ...details, role });
        setForm((current) => ({ ...current, password: '', confirmPassword: '' }));
        if (result.requiresApproval) {
          setApplicationEmail(result.user.email);
          return;
        }
        notify('Your account is ready. Welcome to Mini Mall.', 'success');
        navigate(destinationFor(result.user), { replace: true });
      } else {
        const account = await login(form.email, form.password);
        setForm((current) => ({ ...current, password: '' }));
        notify(`Welcome back, ${account.name}.`, 'success');
        navigate(destinationFor(account), { replace: true });
      }
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  function field(key, label, type = 'text', options = {}) {
    const message = error?.fields?.[key];
    return (
      <div className={`field ${options.wide ? 'span-2' : ''}`}>
        <label htmlFor={`account-${key}`}>{label}</label>
        <input id={`account-${key}`} name={key} type={type} value={form[key]}
          onChange={(event) => update(key, event.target.value)}
          required={options.required} minLength={options.minLength} maxLength={options.maxLength}
          autoComplete={options.autoComplete} aria-invalid={Boolean(message)}
          aria-describedby={message ? `error-${key}` : undefined} />
        {message ? <p id={`error-${key}`} className="field-error">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="account-page stack">
      <section className="page-heading">
        <span className="eyebrow">Mini Mall account</span>
        <h1>{applicationEmail ? 'Application received' : registering ? 'Create an account' : 'Sign in'}</h1>
      </section>

      {user ? (
        <section className="panel form-stack">
          <p>Signed in as <strong>{user.name}</strong> ({roleLabel(user.role)}).</p>
          <Link className="btn btn-primary" to={roleLanding(user.role)}>Go to my workspace</Link>
        </section>
      ) : applicationEmail ? (
        <section className="panel form-stack" role="status">
          <span className="badge badge-warn">Awaiting approval</span>
          <p>Your seller application for <strong>{applicationEmail}</strong> has been submitted.</p>
          <p className="muted">An administrator must approve your account before you can sign in and sell.</p>
          <button type="button" className="btn btn-primary" onClick={() => setMode('login')}>Back to sign in</button>
        </section>
      ) : (
        <section className="panel form-stack">
          <div className="account-modes" role="group" aria-label="Account access">
            <button type="button" aria-pressed={!registering} disabled={busy}
              className={!registering ? 'account-mode active' : 'account-mode'} onClick={() => setMode('login')}>Sign in</button>
            <button type="button" aria-pressed={registering} disabled={busy}
              className={registering ? 'account-mode active' : 'account-mode'} onClick={() => setMode('register')}>Create account</button>
          </div>
          <form className="form-stack" onSubmit={handleSubmit}>
            <fieldset disabled={busy} className="account-fields form-stack">
              {registering ? (
                <fieldset className="account-types">
                  <legend>Account type</legend>
                  <label><input type="radio" name="account-role" value="buyer" checked={role === 'buyer'} onChange={() => setRole('buyer')} />Buyer</label>
                  <label><input type="radio" name="account-role" value="seller" checked={role === 'seller'} onChange={() => setRole('seller')} />Seller</label>
                </fieldset>
              ) : null}
              {registering && role === 'seller' ? <p className="notice notice-info">Seller accounts require administrator approval.</p> : null}
              <div className={registering ? 'form-grid' : 'form-stack'}>
                {registering ? field('name', 'Full name', 'text', { required: true, maxLength: 100, autoComplete: 'name' }) : null}
                {registering ? field('phone', role === 'seller' ? 'Contact number' : 'Contact number (optional)', 'tel', { required: role === 'seller', maxLength: 30, autoComplete: 'tel' }) : null}
                {field('email', 'Email', 'email', { required: true, maxLength: 254, autoComplete: 'username', wide: registering })}
                {registering ? field('address', 'Address (optional)', 'text', { maxLength: 300, autoComplete: 'street-address', wide: true }) : null}
                {registering ? field('postcode', 'Postcode (optional)', 'text', { maxLength: 12, autoComplete: 'postal-code', wide: true }) : null}
                {field('password', registering ? 'Password (at least 12 characters)' : 'Password', 'password', { required: true, minLength: registering ? 12 : undefined, autoComplete: registering ? 'new-password' : 'current-password' })}
                {registering ? field('confirmPassword', 'Confirm password', 'password', { required: true, minLength: 12, autoComplete: 'new-password' }) : null}
              </div>
              <InlineError error={error} />
              <button className="btn btn-primary btn-large" type="submit" disabled={busy}>
                {busy ? 'Please wait...' : registering ? role === 'seller' ? 'Submit seller application' : 'Create buyer account' : 'Sign in'}
              </button>
            </fieldset>
          </form>
        </section>
      )}
    </div>
  );
}
