import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { ErrorNotice, LoadingPage } from '../components/PageStates.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Timeline from '../components/Timeline.jsx';
import { money } from '../utils/format.js';

export default function RefundCase() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi(`/refunds/${id}`);

  if (loading) return <LoadingPage label="Opening the refund case…" />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data?.refund) return null;

  const refund = data.refund;
  const order = data.order;

  return (
    <div className="stack">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/orders">Orders</Link>
        <span aria-hidden="true">/</span>
        <span>Refund case</span>
      </nav>

      <section className="page-heading refund-heading">
        <div>
          <span className="eyebrow">Item refund</span>
          <h1>{refund.productId?.title || 'Refund case'}</h1>
          <p className="muted">
            Order {order?.orderNumber || '—'} · Seller {refund.sellerId?.name || 'Seller'}
          </p>
        </div>
        <div className="refund-heading-right">
          <StatusBadge status={refund.status} />
          <strong className="detail-price">{money(refund.amountCents)}</strong>
        </div>
      </section>

      <div className="two-column">
        <section className="panel">
          <h2>Request</h2>
          <p className="refund-reason">{refund.reason}</p>
          {refund.imageUrl ? (
            <img
              className="refund-image"
              src={refund.imageUrl}
              alt="Evidence supplied with the refund request"
            />
          ) : (
            <p className="muted small">No evidence image was supplied.</p>
          )}
          <dl className="mini-details">
            <div>
              <dt>Item</dt>
              <dd>{refund.productId?.model || '—'}</dd>
            </div>
            <div>
              <dt>Refund amount</dt>
              <dd>{money(refund.amountCents)}</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <h2>Decision</h2>
          {refund.decisionReason ? (
            <>
              <p className="muted small">The administrator recorded:</p>
              <p className="refund-decision">{refund.decisionReason}</p>
            </>
          ) : (
            <p className="muted">
              The administrator has not decided this case yet. You will see the reason here if it is
              rejected.
            </p>
          )}
          {refund.status === 'awaiting_return' ? (
            <p className="notice notice-info">
              The refund was approved. Return the item to the seller so they can record its receipt.
            </p>
          ) : null}
          {refund.status === 'return_received' ? (
            <p className="notice notice-info">
              The seller has the returned item. The administrator still needs to complete the
              simulated refund.
            </p>
          ) : null}
          {refund.status === 'refunded' ? (
            <p className="notice notice-success">
              The simulated refund is complete. No real money was transferred.
            </p>
          ) : null}
          {refund.status === 'rejected' ? (
            <p className="notice notice-error">
              The order remains delivered with a rejected case and the reason above.
            </p>
          ) : null}
          <Link className="text-link" to={`/orders/${refund.orderId}`}>
            Back to order
          </Link>
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <h2>Case timeline</h2>
        </div>
        <Timeline events={refund.events} />
      </section>
    </div>
  );
}