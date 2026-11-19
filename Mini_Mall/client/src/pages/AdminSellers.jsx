import { useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import { EmptyState, ErrorNotice, InlineError, LoadingPage } from '../components/PageStates.jsx';
import { Icon } from '../components/Icons.jsx';
import { dateTime } from '../utils/format.js';

const STATUS_LABELS = { pending: 'Awaiting approval', approved: 'Approved', rejected: 'Declined' };

function SellerApplication({ seller, onDone }) {
  const { notify } = useToast();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function decide(decision) {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/seller-applications/${seller.id}/decision`, { method: 'POST', body: { decision, reason } });
      notify(decision === 'approve' ? `${seller.name} can now sign in and sell.` : 'Seller application declined.', 'success');
      onDone();
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  const tone = seller.sellerStatus === 'approved' ? 'success' : seller.sellerStatus === 'rejected' ? 'danger' : 'warn';
  return (
    <article className="seller-application">
      <div className="seller-application-summary">
        <div className="stack seller-contact">
          <h2>{seller.name}</h2>
          <a href={`mailto:${seller.email}`}>{seller.email}</a>
          {seller.phone ? <span>{seller.phone}</span> : null}
          {seller.address || seller.postcode ? <p className="muted">{[seller.address, seller.postcode].filter(Boolean).join(', ')}</p> : null}
        </div>
        <div className="seller-review-meta">
          <span className={`badge badge-${tone}`}>{STATUS_LABELS[seller.sellerStatus] || 'Awaiting approval'}</span>
          <span className="muted small">Applied {dateTime(seller.createdAt)}</span>
          {seller.sellerReviewedAt ? <span className="muted small">Reviewed {dateTime(seller.sellerReviewedAt)}</span> : null}
        </div>
      </div>
      {seller.sellerStatus === 'pending' ? (
        <div className="form-stack">
          <div className="button-row">
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => decide('approve')}>
              <Icon name="check" size={18} />{busy ? 'Saving...' : 'Approve seller'}
            </button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => setDeclining(!declining)}>
              {declining ? 'Cancel decline' : 'Decline application'}
            </button>
          </div>
          {declining ? (
            <form className="form-stack" onSubmit={(event) => { event.preventDefault(); decide('reject'); }}>
              <div className="field">
                <label htmlFor={`reason-${seller.id}`}>Reason for declining</label>
                <textarea id={`reason-${seller.id}`} required minLength={3} maxLength={500} value={reason}
                  onChange={(event) => setReason(event.target.value)} disabled={busy} rows={3} />
              </div>
              <button className="btn btn-danger" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Confirm decline'}</button>
            </form>
          ) : null}
          <InlineError error={error} />
        </div>
      ) : seller.sellerReviewReason ? <p className="muted">{seller.sellerReviewReason}</p> : null}
    </article>
  );
}

export default function AdminSellers() {
  const [status, setStatus] = useState('pending');
  const applications = useApi(`/admin/seller-applications?status=${status}`);
  const sellers = applications.data?.sellers || [];
  return (
    <div className="stack">
      <section className="page-heading">
        <span className="eyebrow">Administrator</span>
        <h1>Seller applications</h1>
      </section>
      <div className="seller-application-filter">
        <div className="field">
          <label htmlFor="seller-status">Application status</label>
          <select id="seller-status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="pending">Awaiting approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Declined</option>
            <option value="all">All applications</option>
          </select>
        </div>
        {!applications.loading ? <span className="muted small" aria-live="polite">{sellers.length} {sellers.length === 1 ? 'seller' : 'sellers'}</span> : null}
      </div>
      {applications.loading ? <LoadingPage label="Loading seller applications..." /> : applications.error ? (
        <ErrorNotice error={applications.error} onRetry={applications.reload} />
      ) : sellers.length ? (
        <div>{sellers.map((seller) => <SellerApplication key={seller.id} seller={seller} onDone={applications.reload} />)}</div>
      ) : <EmptyState title="No seller applications in this queue." />}
    </div>
  );
}
