import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, uploadImage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { ErrorNotice, InlineError, LoadingPage } from '../components/PageStates.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Timeline from '../components/Timeline.jsx';
import { dateOnly, dateTime, money } from '../utils/format.js';

function RefundRequestForm({ order, item, onDone }) {
  const { notify } = useToast();
  const [reason, setReason] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let imageUrl = '';
      if (file) {
        const upload = await uploadImage(file);
        imageUrl = upload.url;
      }
      await api('/refunds', {
        method: 'POST',
        body: {
          orderId: order.id,
          itemId: item.id || item._id,
          reason,
          imageUrl,
        },
      });
      notify('Refund request created.', 'success');
      onDone();
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="refund-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor={`reason-${item.id || item._id}`}>What went wrong?</label>
        <textarea
          id={`reason-${item.id || item._id}`}
          rows="3"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Describe the fault or incorrect item."
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`image-${item.id || item._id}`}>Optional evidence image</label>
        <input
          id={`image-${item.id || item._id}`}
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </div>
      <InlineError error={error} />
      <div className="button-row">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit refund request'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={onDone} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { data, loading, error, reload } = useApi(`/orders/${id}`);
  const [busyAction, setBusyAction] = useState('');
  const [openRefundItem, setOpenRefundItem] = useState('');
  const placedNotified = useRef(false);

  const placed = location.state?.placed;
  useEffect(() => {
    if (placed && !placedNotified.current) {
      placedNotified.current = true;
      notify('Order placed. Follow the payment instructions below.', 'success');
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [placed, notify, navigate, location.pathname]);

  if (loading) return <LoadingPage label="Opening the order…" />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data?.order) return null;

  const order = data.order;
  const payment = order.payment;
  const fulfilment = order.fulfilment;
  const canPay = payment.method === 'eft' && ['awaiting_eft', 'failed'].includes(payment.status);

  async function run(action, label, request) {
    setBusyAction(action);
    try {
      const result = await request();
      notify(result?.message || label, 'success');
      await reload();
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setBusyAction('');
    }
  }

  function simulatePayment(result) {
    run(result, result === 'success' ? 'Payment submitted.' : 'Payment failure recorded.', () =>
      api(`/orders/${order.id}/pay`, { method: 'POST', body: { result } }),
    );
  }

  function confirmReceipt() {
    run('receipt', 'Receipt confirmed.', () =>
      api(`/orders/${order.id}/confirm-receipt`, { method: 'POST' }),
    );
  }

  return (
    <div className="stack">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/orders">Orders</Link>
        <span aria-hidden="true">/</span>
        <span>{order.orderNumber}</span>
      </nav>

      <section className="page-heading order-heading">
        <div>
          <span className="eyebrow">Order details</span>
          <h1>{order.orderNumber}</h1>
          <p className="muted">
            Placed {dateTime(order.createdAt)} · Seller {order.sellerId?.name || 'Seller'}
          </p>
        </div>
        <strong className="detail-price">{money(order.totalCents)}</strong>
      </section>

      <div className="two-column">
        <section className="panel">
          <div className="section-heading">
            <h2>Payment</h2>
            <StatusBadge status={payment.status} />
          </div>
          <p className="muted">
            {payment.method === 'eft' ? 'Simulated electronic transfer' : 'Cash on delivery'}
          </p>
          {payment.method === 'eft' ? (
            <div className="reference-box">
              <span className="muted small">Demo reference</span>
              <strong>{payment.reference}</strong>
              <span className="muted small">
                {payment.expiresAt ? `Reservation ends ${dateTime(payment.expiresAt)}` : ''}
              </span>
            </div>
          ) : null}

          {payment.status === 'awaiting_eft' ? (
            <p className="notice notice-warn">
              Awaiting EFT. Dispatch stays blocked until Priya confirms the simulated payment.
            </p>
          ) : null}
          {payment.status === 'failed' ? (
            <p className="notice notice-error">
              The simulated payment failed. You can retry the same order; no duplicate order is
              created.
            </p>
          ) : null}
          {payment.status === 'awaiting_confirmation' ? (
            <p className="notice notice-info">
              Payment submitted. Sign in as Priya to confirm the demo EFT before dispatch.
            </p>
          ) : null}
          {payment.status === 'confirmed' ? (
            <p className="notice notice-success">
              Payment confirmed. Lerato can now pack and dispatch this order.
            </p>
          ) : null}
          {payment.status === 'expired' ? (
            <p className="notice notice-error">
              This EFT reservation expired and the stock was released. Please place a new order.
            </p>
          ) : null}
          {payment.method === 'cod' && payment.status === 'due_on_delivery' ? (
            <p className="notice notice-warn">
              Cash is due on delivery. Delivery and payment are separate: Lerato records cash after
              you confirm receipt.
            </p>
          ) : null}
          {payment.status === 'paid' ? (
            <p className="notice notice-success">Cash collection recorded by the seller.</p>
          ) : null}

          {canPay ? (
            <div className="button-row">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => simulatePayment('success')}
                disabled={Boolean(busyAction)}
              >
                {busyAction === 'success' ? 'Submitting…' : 'Simulate successful payment'}
              </button>
              {payment.status === 'awaiting_eft' ? (
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => simulatePayment('fail')}
                  disabled={Boolean(busyAction)}
                >
                  Simulate a failed payment
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Fulfilment</h2>
            <StatusBadge status={fulfilment.status} kind="fulfilment" />
          </div>
          <dl className="mini-details">
            <div>
              <dt>Tracking</dt>
              <dd>{fulfilment.trackingNumber || 'Not entered yet'}</dd>
            </div>
            <div>
              <dt>Dispatched</dt>
              <dd>{fulfilment.dispatchedAt ? dateTime(fulfilment.dispatchedAt) : '—'}</dd>
            </div>
            <div>
              <dt>Delivered</dt>
              <dd>{fulfilment.deliveredAt ? dateTime(fulfilment.deliveredAt) : '—'}</dd>
            </div>
          </dl>
          {order.overdue ? <p className="notice notice-error">{order.overdueReason}</p> : null}
          {order.canConfirmReceipt ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={confirmReceipt}
              disabled={Boolean(busyAction)}
            >
              {busyAction === 'receipt' ? 'Confirming…' : 'Confirm receipt'}
            </button>
          ) : null}
          {fulfilment.status === 'pending' ? (
            <p className="muted small">
              {payment.method === 'eft'
                ? 'Lerato can dispatch after the EFT is confirmed.'
                : 'This COD order is eligible for dispatch.'}
            </p>
          ) : null}
          {fulfilment.status === 'delivered' ? (
            <p className="muted small">
              {payment.method === 'cod' && payment.status === 'due_on_delivery'
                ? 'Receipt is confirmed. Lerato can now record the cash collection.'
                : 'Receipt is confirmed.'}
            </p>
          ) : null}
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <h2>Delivery</h2>
        </div>
        <dl className="mini-details">
          <div>
            <dt>Address</dt>
            <dd>{order.delivery.address}</dd>
          </div>
          <div>
            <dt>Postcode</dt>
            <dd>{order.delivery.postcode}</dd>
          </div>
          <div>
            <dt>Estimate</dt>
            <dd>
              {order.delivery.workingDays} working days · by {dateOnly(order.delivery.estimatedDate)}
            </dd>
          </div>
          <div>
            <dt>Delivery fee</dt>
            <dd>{money(order.delivery.feeCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Items</h2>
          <span className="muted small">{order.items.length} item line(s)</span>
        </div>
        <div className="item-list">
          {order.items.map((item) => {
            const itemId = item.id || item._id;
            const refund = item.refund || data.refunds?.find((entry) => entry.orderItemId === itemId);
            return (
              <article key={itemId} className="item-row">
                <div className="item-row-main">
                  <strong>{item.title}</strong>
                  <span className="muted small">
                    {item.model} · {item.qty} × {money(item.unitPriceCents)}
                  </span>
                  {refund ? (
                    <div className="badge-row">
                      <StatusBadge status={refund.status} />
                      <Link className="text-link" to={`/refunds/${refund.id}`}>
                        Open refund case
                      </Link>
                    </div>
                  ) : null}
                  {!refund && item.refundEligible ? (
                    <button
                      type="button"
                      className="btn btn-small btn-ghost"
                      onClick={() => setOpenRefundItem(itemId)}
                    >
                      Request refund
                    </button>
                  ) : null}
                  {!refund && !item.refundEligible && fulfilment.status === 'delivered' ? (
                    <span className="muted small">{item.refundReason}</span>
                  ) : null}
                </div>
                <strong>{money(item.lineTotalCents)}</strong>
                {openRefundItem === itemId ? (
                  <RefundRequestForm
                    order={order}
                    item={item}
                    onDone={() => {
                      setOpenRefundItem('');
                      reload();
                    }}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Order timeline</h2>
        </div>
        <Timeline events={order.events} />
      </section>
    </div>
  );
}