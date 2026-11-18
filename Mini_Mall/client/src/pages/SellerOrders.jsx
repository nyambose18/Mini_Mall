import { useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { EmptyState, ErrorNotice, LoadingPage } from '../components/PageStates.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Timeline from '../components/Timeline.jsx';
import { dateTime, money } from '../utils/format.js';

function DispatchControls({ order, onDone }) {
  const { notify } = useToast();
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);

  async function dispatch(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api(`/seller/orders/${order.id}/dispatch`, {
        method: 'POST',
        body: { trackingNumber: tracking },
      });
      notify(result.message || 'Order dispatched.', 'success');
      onDone();
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!order.canDispatch) {
    if (order.fulfilment.status !== 'pending') return null;
    return (
      <p className="muted small">
        {order.payment.method === 'eft' && order.payment.status !== 'confirmed'
          ? 'Dispatch is blocked until Priya confirms the EFT payment.'
          : 'This order is not ready to dispatch yet.'}
      </p>
    );
  }

  return (
    <form className="dispatch-form" onSubmit={dispatch}>
      <div className="field">
        <label htmlFor={`tracking-${order.id}`}>Tracking number</label>
        <input
          id={`tracking-${order.id}`}
          value={tracking}
          onChange={(event) => setTracking(event.target.value)}
          placeholder="e.g. MM-TRK-1010"
          required
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy || tracking.trim().length < 2}>
        {busy ? 'Dispatching…' : 'Mark dispatched'}
      </button>
    </form>
  );
}

export default function SellerOrders() {
  const ordersApi = useApi('/seller/orders');
  const refundsApi = useApi('/seller/refunds');
  const { notify } = useToast();
  const [paymentFilter, setPaymentFilter] = useState('');
  const [fulfilmentFilter, setFulfilmentFilter] = useState('');
  const [busyId, setBusyId] = useState('');

  const orders = (ordersApi.data?.orders || []).filter((order) => {
    if (paymentFilter && order.payment.status !== paymentFilter) return false;
    if (fulfilmentFilter && order.fulfilment.status !== fulfilmentFilter) return false;
    return true;
  });
  const refunds = refundsApi.data?.refunds || [];

  function refresh() {
    ordersApi.reload();
    refundsApi.reload();
  }

  async function collectCash(order) {
    setBusyId(order.id);
    try {
      const result = await api(`/seller/orders/${order.id}/collect-cod`, { method: 'POST' });
      notify(result.message || 'Cash collection recorded.', 'success');
      refresh();
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setBusyId('');
    }
  }

  async function recordReturn(refund) {
    setBusyId(refund.id);
    try {
      const result = await api(`/seller/refunds/${refund.id}/return-received`, {
        method: 'POST',
        body: { note: 'Returned item received and checked by the seller.' },
      });
      notify(result.message || 'Returned item recorded.', 'success');
      refresh();
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setBusyId('');
    }
  }

  if (ordersApi.loading) return <LoadingPage label="Loading the fulfilment queue…" />;
  if (ordersApi.error) return <ErrorNotice error={ordersApi.error} onRetry={ordersApi.reload} />;

  const readyToPack = orders.filter((order) => order.canDispatch).length;
  const cashDue = orders.filter((order) => order.canCollectCod).length;

  return (
    <div className="stack">
      <section className="page-heading">
        <span className="eyebrow">Lerato's fulfilment queue</span>
        <h1>Orders to pack and dispatch</h1>
        <p className="muted">
          Payment and fulfilment are separate decisions. Dispatch becomes available after confirmed
          EFT, or immediately for an accepted cash-on-delivery order.
        </p>
      </section>

      <div className="stat-strip">
        <div className="stat-chip">
          <span>Ready to pack</span>
          <strong>{readyToPack}</strong>
        </div>
        <div className="stat-chip">
          <span>Cash to collect</span>
          <strong>{cashDue}</strong>
        </div>
        <div className="stat-chip">
          <span>Refund cases</span>
          <strong>{refunds.length}</strong>
        </div>
      </div>

      <section className="panel filter-panel">
        <div className="filter-row">
          <div className="field">
            <label htmlFor="seller-payment-filter">Payment</label>
            <select
              id="seller-payment-filter"
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
            >
              <option value="">All payments</option>
              <option value="awaiting_eft">Awaiting EFT</option>
              <option value="awaiting_confirmation">Awaiting confirmation</option>
              <option value="confirmed">Payment confirmed</option>
              <option value="due_on_delivery">Cash due on delivery</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="seller-fulfilment-filter">Fulfilment</label>
            <select
              id="seller-fulfilment-filter"
              value={fulfilmentFilter}
              onChange={(event) => setFulfilmentFilter(event.target.value)}
            >
              <option value="">All fulfilment</option>
              <option value="pending">Not dispatched</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>
      </section>

      {!orders.length ? (
        <EmptyState title="No orders match these filters.">
          Seeded orders cover each payment and fulfilment state.
        </EmptyState>
      ) : null}

      <section className="order-list">
        {orders.map((order) => (
          <article key={order.id} className="order-card">
            <div className="order-card-top">
              <div>
                <strong className="order-number">{order.orderNumber}</strong>
                <p className="muted small">
                  {order.buyerId?.name || 'Buyer'} · {dateTime(order.createdAt)} ·{' '}
                  {order.delivery.postcode}
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

            <DispatchControls order={order} onDone={refresh} />

            {order.canCollectCod ? (
              <button
                type="button"
                className="btn btn-small btn-ghost"
                onClick={() => collectCash(order)}
                disabled={busyId === order.id}
              >
                {busyId === order.id ? 'Recording…' : 'Record COD cash collection'}
              </button>
            ) : null}

            <details className="order-details-toggle">
              <summary>Timeline and delivery details</summary>
              <dl className="mini-details">
                <div>
                  <dt>Address</dt>
                  <dd>
                    {order.delivery.address}, {order.delivery.postcode}
                  </dd>
                </div>
                <div>
                  <dt>Tracking</dt>
                  <dd>{order.fulfilment.trackingNumber || 'Not entered'}</dd>
                </div>
              </dl>
              <Timeline events={order.events} />
            </details>
          </article>
        ))}
      </section>

      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Returned goods intake</span>
            <h2>Refund cases for your orders</h2>
          </div>
        </div>
        {refundsApi.loading ? <LoadingPage label="Loading refund cases…" /> : null}
        {refundsApi.error ? (
          <ErrorNotice error={refundsApi.error} onRetry={refundsApi.reload} />
        ) : null}
        {!refundsApi.loading && !refunds.length ? (
          <EmptyState title="No refund cases assigned to you.">
            Cases appear here after Thabo requests one from a delivered item.
          </EmptyState>
        ) : null}
        {refunds.length ? (
          <div className="refund-list">
            {refunds.map((refund) => (
              <article key={refund.id} className="refund-card">
                <div className="refund-card-top">
                  <div>
                    <strong>
                      {refund.orderId?.orderNumber || 'Order'} · {refund.buyerId?.name || 'Buyer'}
                    </strong>
                    <p className="muted small">{refund.reason}</p>
                  </div>
                  <StatusBadge status={refund.status} />
                </div>
                <div className="refund-card-footer">
                  <strong>{money(refund.amountCents)}</strong>
                  {refund.status === 'awaiting_return' ? (
                    <button
                      type="button"
                      className="btn btn-small btn-primary"
                      onClick={() => recordReturn(refund)}
                      disabled={busyId === refund.id}
                    >
                      {busyId === refund.id ? 'Recording…' : 'Record returned item'}
                    </button>
                  ) : null}
                  {refund.decisionReason ? (
                    <span className="muted small">Decision: {refund.decisionReason}</span>
                  ) : null}
                </div>
                <Timeline events={refund.events} />
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}