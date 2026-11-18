import { useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { EmptyState, ErrorNotice, LoadingPage } from '../components/PageStates.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Timeline from '../components/Timeline.jsx';
import { dateTime, money } from '../utils/format.js';

function RefundDecision({ refund, onDone }) {
  const { notify } = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');

  async function decide(decision) {
    if (decision === 'reject' && reason.trim().length < 3) {
      notify('Explain why the refund is rejected.', 'error');
      return;
    }
    setBusy(decision);
    try {
      const result = await api(`/admin/refunds/${refund.id}/decide`, {
        method: 'POST',
        body: { decision, reason },
      });
      notify(
        result.refund.status === 'awaiting_return'
          ? 'Refund approved. Waiting for the returned item.'
          : 'Refund rejected with a recorded reason.',
        'success',
      );
      onDone();
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setBusy('');
    }
  }

  async function complete() {
    setBusy('complete');
    try {
      const result = await api(`/admin/refunds/${refund.id}/complete`, { method: 'POST' });
      notify(result.message || 'Simulated refund completed.', 'success');
      onDone();
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="refund-decision">
      {refund.status === 'requested' ? (
        <>
          <div className="field">
            <label htmlFor={`refund-reason-${refund.id}`}>Decision reason</label>
            <textarea
              id={`refund-reason-${refund.id}`}
              rows="2"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Required when rejecting; useful when approving."
            />
          </div>
          <div className="button-row">
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={() => decide('approve')}
              disabled={Boolean(busy)}
            >
              {busy === 'approve' ? 'Approving…' : 'Approve refund'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => decide('reject')}
              disabled={Boolean(busy)}
            >
              {busy === 'reject' ? 'Rejecting…' : 'Reject with reason'}
            </button>
          </div>
        </>
      ) : null}
      {refund.status === 'awaiting_return' ? (
        <p className="muted small">Waiting for Lerato to record the returned item.</p>
      ) : null}
      {refund.status === 'return_received' ? (
        <div className="button-row">
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={complete}
            disabled={Boolean(busy)}
          >
            {busy === 'complete' ? 'Completing…' : 'Complete simulated refund'}
          </button>
          <span className="muted small">No real money is transferred.</span>
        </div>
      ) : null}
      {refund.status === 'refunded' ? (
        <p className="muted small">Completed. The amount is included in the refunds total.</p>
      ) : null}
      {refund.status === 'rejected' ? (
        <p className="muted small">Rejected. The order stays delivered and the reason is visible.</p>
      ) : null}
    </div>
  );
}

export default function AdminOrders() {
  const { notify } = useToast();
  const [paymentStatus, setPaymentStatus] = useState('');
  const [fulfilmentStatus, setFulfilmentStatus] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [busyId, setBusyId] = useState('');

  const params = new URLSearchParams();
  if (paymentStatus) params.set('paymentStatus', paymentStatus);
  if (fulfilmentStatus) params.set('fulfilmentStatus', fulfilmentStatus);
  if (sellerId) params.set('sellerId', sellerId);
  if (overdueOnly) params.set('overdue', 'true');

  const ordersApi = useApi(`/admin/orders${params.toString() ? `?${params}` : ''}`);
  const refundsApi = useApi('/admin/refunds');
  const sellersApi = useApi('/admin/sellers');

  const orders = ordersApi.data?.orders || [];
  const refunds = refundsApi.data?.refunds || [];

  function refresh() {
    ordersApi.reload();
    refundsApi.reload();
  }

  async function confirmEft(order) {
    setBusyId(order.id);
    try {
      const result = await api(`/admin/orders/${order.id}/confirm-eft`, { method: 'POST' });
      notify(result.message || 'Simulated EFT confirmed.', 'success');
      refresh();
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setBusyId('');
    }
  }

  if (ordersApi.loading) return <LoadingPage label="Loading orders and refund cases…" />;
  if (ordersApi.error) return <ErrorNotice error={ordersApi.error} onRetry={ordersApi.reload} />;

  return (
    <div className="stack">
      <section className="page-heading">
        <span className="eyebrow">Priya's order and refund desk</span>
        <h1>Orders &amp; refunds</h1>
        <p className="muted">
          Payment and fulfilment are filtered separately, so a delivery exception is never mistaken
          for a payment exception. Every decision is recorded on the timeline.
        </p>
      </section>

      <section className="panel filter-panel">
        <div className="filter-row">
          <div className="field">
            <label htmlFor="admin-payment">Payment</label>
            <select
              id="admin-payment"
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
            >
              <option value="">All payments</option>
              <option value="awaiting_eft">Awaiting EFT</option>
              <option value="awaiting_confirmation">Awaiting confirmation</option>
              <option value="confirmed">Payment confirmed</option>
              <option value="failed">Payment failed</option>
              <option value="expired">EFT expired</option>
              <option value="due_on_delivery">Cash due on delivery</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="admin-fulfilment">Fulfilment</label>
            <select
              id="admin-fulfilment"
              value={fulfilmentStatus}
              onChange={(event) => setFulfilmentStatus(event.target.value)}
            >
              <option value="">All fulfilment</option>
              <option value="pending">Not dispatched</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="admin-seller">Seller</label>
            <select id="admin-seller" value={sellerId} onChange={(event) => setSellerId(event.target.value)}>
              <option value="">All sellers</option>
              {(sellersApi.data?.sellers || []).map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(event) => setOverdueOnly(event.target.checked)}
            />
            <span>Overdue dispatch only</span>
          </label>
        </div>
        <span className="muted small">
          {orders.length} order(s) · {refunds.length} refund case(s)
        </span>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Payment and fulfilment</span>
            <h2>Order exceptions</h2>
          </div>
        </div>
        {!orders.length ? (
          <EmptyState title="No orders match these filters.">
            Clear the filters to see the seeded order states.
          </EmptyState>
        ) : null}
        <div className="order-list">
          {orders.map((order) => {
            const canConfirmEft =
              order.payment.method === 'eft' &&
              ['awaiting_eft', 'awaiting_confirmation'].includes(order.payment.status);
            return (
              <article key={order.id} className="order-card">
                <div className="order-card-top">
                  <div>
                    <strong className="order-number">{order.orderNumber}</strong>
                    <p className="muted small">
                      {order.buyerId?.name || 'Buyer'} → {order.sellerId?.name || 'Seller'} ·{' '}
                      {dateTime(order.createdAt)}
                    </p>
                  </div>
                  <strong className="price">{money(order.totalCents)}</strong>
                </div>

                <div className="badge-row">
                  <StatusBadge status={order.payment.status} />
                  <StatusBadge status={order.fulfilment.status} kind="fulfilment" />
                  <span className="badge badge-neutral">
                    {order.payment.method === 'eft' ? 'EFT' : 'Cash on delivery'}
                  </span>
                  {order.overdue ? <span className="badge badge-danger">Dispatch overdue</span> : null}
                </div>

                <div className="order-item-line">
                  {order.items.map((item) => (
                    <span key={item.id || item._id}>
                      {item.qty} × {item.title}
                    </span>
                  ))}
                </div>

                {order.overdue ? <p className="notice notice-error">{order.overdueReason}</p> : null}

                {canConfirmEft ? (
                  <div className="button-row">
                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      onClick={() => confirmEft(order)}
                      disabled={busyId === order.id}
                    >
                      {busyId === order.id ? 'Confirming…' : 'Confirm simulated EFT'}
                    </button>
                    <span className="muted small">
                      Reference: {order.payment.reference || '—'}
                    </span>
                  </div>
                ) : null}

                <details className="order-details-toggle">
                  <summary>Timeline and payment details</summary>
                  <dl className="mini-details">
                    <div>
                      <dt>Payment reference</dt>
                      <dd>{order.payment.reference || '—'}</dd>
                    </div>
                    <div>
                      <dt>Confirmed</dt>
                      <dd>{order.payment.confirmedAt ? dateTime(order.payment.confirmedAt) : '—'}</dd>
                    </div>
                    <div>
                      <dt>Tracking</dt>
                      <dd>{order.fulfilment.trackingNumber || 'Not entered'}</dd>
                    </div>
                  </dl>
                  <Timeline events={order.events} />
                </details>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Refund adjudication</span>
            <h2>Refund cases</h2>
          </div>
          <span className="muted small">{refunds.length} case(s)</span>
        </div>
        {refundsApi.loading ? <LoadingPage label="Loading refund cases…" /> : null}
        {refundsApi.error ? (
          <ErrorNotice error={refundsApi.error} onRetry={refundsApi.reload} />
        ) : null}
        {!refundsApi.loading && !refunds.length ? (
          <EmptyState title="No refund cases.">Buyer requests appear here for adjudication.</EmptyState>
        ) : null}
        <div className="refund-list">
          {refunds.map((refund) => (
            <article key={refund.id} className="refund-card">
              <div className="refund-card-top">
                <div>
                  <strong>
                    {refund.orderId?.orderNumber || 'Order'} · {refund.buyerId?.name || 'Buyer'} →{' '}
                    {refund.sellerId?.name || 'Seller'}
                  </strong>
                  <p className="muted small">{refund.reason}</p>
                </div>
                <StatusBadge status={refund.status} />
              </div>
              <div className="refund-card-meta">
                <strong>{money(refund.amountCents)}</strong>
                {refund.decisionReason ? (
                  <span className="muted small">Decision: {refund.decisionReason}</span>
                ) : null}
              </div>
              <RefundDecision refund={refund} onDone={refresh} />
              <details className="order-details-toggle">
                <summary>Case timeline</summary>
                <Timeline events={refund.events} />
              </details>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}