import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { EmptyState, ErrorNotice, LoadingPage } from '../components/PageStates.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { dateTime, money } from '../utils/format.js';

const PAYMENT_FILTERS = [
  ['', 'All payments'],
  ['awaiting_eft', 'Awaiting EFT'],
  ['awaiting_confirmation', 'Awaiting confirmation'],
  ['confirmed', 'Payment confirmed'],
  ['failed', 'Payment failed'],
  ['due_on_delivery', 'Cash due on delivery'],
  ['paid', 'Paid'],
  ['expired', 'EFT expired'],
];

const FULFILMENT_FILTERS = [
  ['', 'All fulfilment'],
  ['pending', 'Not dispatched'],
  ['dispatched', 'Dispatched'],
  ['delivered', 'Delivered'],
];

export default function Orders() {
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [fulfilmentStatus, setFulfilmentStatus] = useState('');

  const params = new URLSearchParams();
  if (paymentStatus) params.set('paymentStatus', paymentStatus);
  if (fulfilmentStatus) params.set('fulfilmentStatus', fulfilmentStatus);
  const { data, loading, error, reload } = useApi(
    `/orders${params.toString() ? `?${params}` : ''}`,
  );

  const query = search.trim().toLowerCase();
  const orders = (data?.orders || []).filter((order) =>
    !query || [order.orderNumber, order.fulfilment.trackingNumber, ...order.items.map((item) => item.title)]
      .some((value) => value?.toLowerCase().includes(query)),
  );

  return (
    <div className="stack">
      <section className="page-heading">
        <span className="eyebrow">Buyer orders</span>
        <h1>Your orders</h1>
        <p>Find a past order and open its details to see delivery updates and tracking.</p>
        <p className="muted">
          Payment and fulfilment are shown separately, so an EFT delay does not look like a delivery
          delay.
        </p>
      </section>

      <section className="panel filter-panel">
        <div className="filter-row">
          <div className="field">
            <label htmlFor="orders-search">Find an order</label>
            <input id="orders-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Order number, tracking number or item" />
          </div>
          <div className="field">
            <label htmlFor="orders-payment">Payment status</label>
            <select
              id="orders-payment"
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
            >
              {PAYMENT_FILTERS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="orders-fulfilment">Fulfilment status</label>
            <select
              id="orders-fulfilment"
              value={fulfilmentStatus}
              onChange={(event) => setFulfilmentStatus(event.target.value)}
            >
              {FULFILMENT_FILTERS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {search || paymentStatus || fulfilmentStatus ? (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setSearch('');
                setPaymentStatus('');
                setFulfilmentStatus('');
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      {loading ? <LoadingPage label="Loading your orders…" /> : null}
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}

      {!loading && !error && !orders.length ? (
        <EmptyState
          title="No orders match these filters."
          action={
            <Link className="btn btn-primary" to="/products">
              Browse parts
            </Link>
          }
        >
          Place a demo order to see the payment and delivery states here.
        </EmptyState>
      ) : null}

      {orders.length ? (
        <section className="order-list">
          {orders.map((order) => (
            <article key={order.id} className="order-card">
              <div className="order-card-top">
                <div>
                  <Link className="order-number" to={`/orders/${order.id}`}>
                    {order.orderNumber}
                  </Link>
                  <p className="muted small">
                    {dateTime(order.createdAt)} · {order.sellerId?.name || 'Seller'}
                  </p>
                </div>
                <strong className="price">{money(order.totalCents)}</strong>
              </div>
              <div className="order-item-line">
                {order.items.map((item) => (
                  <span key={item.id || item._id}>
                    {item.qty} × {item.title}
                  </span>
                ))}
              </div>
              <div className="badge-row">
                <StatusBadge status={order.payment.status} />
                <StatusBadge status={order.fulfilment.status} kind="fulfilment" />
                {order.overdue ? <span className="badge badge-danger">Dispatch overdue</span> : null}
              </div>
              <div className="order-card-footer">
                <Link className="text-link" to={`/orders/${order.id}`}>
                  Open order details
                </Link>
                {order.fulfilment.trackingNumber && <span className="muted small">Tracking: {order.fulfilment.trackingNumber}</span>}
                {order.canConfirmReceipt ? (
                  <span className="muted small">Parcel dispatched — receipt can be confirmed inside.</span>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}