import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { ErrorNotice, LoadingPage } from '../components/PageStates.jsx';
import { money } from '../utils/format.js';
import { Icon } from '../components/Icons.jsx';

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

const PRESETS = [
  {
    key: '7',
    label: 'Last 7 days',
    range: () => [isoDate(daysAgo(6)), isoDate(new Date())],
  },
  {
    key: '30',
    label: 'Last 30 days',
    range: () => [isoDate(daysAgo(29)), isoDate(new Date())],
  },
  {
    key: 'month',
    label: 'This month',
    range: () => [isoDate(startOfMonth()), isoDate(new Date())],
  },
  {
    key: 'all',
    label: 'All time',
    range: () => ['', ''],
  },
];

function StatTile({ label, value, count, detail, tone, icon }) {
  return (
    <article className={`stat-tile stat-tile-${tone}`}>
      <div className="stat-tile-heading">
        <span className={`stat-icon stat-icon-${tone}`}>
          <Icon name={icon} size={18} />
        </span>
        <span className="stat-label">{label}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <div className="stat-meta">
        <span>{count}</span>
        <span className="muted">{detail}</span>
      </div>
    </article>
  );
}

export default function AdminStatistics() {
  const [from, setFrom] = useState(() => isoDate(daysAgo(29)));
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [sellerId, setSellerId] = useState('');
  const [preset, setPreset] = useState('30');

  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (sellerId) params.set('sellerId', sellerId);

  const statsApi = useApi(`/admin/stats${params.toString() ? `?${params}` : ''}`);
  const sellersApi = useApi('/admin/sellers');
  const summary = statsApi.data?.summary;

  function applyPreset(item) {
    const [nextFrom, nextTo] = item.range();
    setFrom(nextFrom);
    setTo(nextTo);
    setPreset(item.key);
  }

  return (
    <div className="stack">
      <section className="page-heading">
        <span className="eyebrow">Priya's weekly summary</span>
        <h1>Sales statistics</h1>
        <p className="muted">
          Paid sales, pending payments and refunds are shown separately. A pending EFT or an unpaid
          cash-on-delivery order never inflates the paid total.
        </p>
      </section>

      <section className="panel filter-panel stats-filters">
        <div className="preset-row" role="group" aria-label="Date range presets">
          {PRESETS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={preset === item.key ? 'preset-button preset-active' : 'preset-button'}
              onClick={() => applyPreset(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <div className="field">
            <label htmlFor="stats-from">From</label>
            <input
              id="stats-from"
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPreset('');
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="stats-to">To</label>
            <input
              id="stats-to"
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPreset('');
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="stats-seller">Seller</label>
            <select
              id="stats-seller"
              value={sellerId}
              onChange={(event) => setSellerId(event.target.value)}
            >
              <option value="">All sellers</option>
              {(sellersApi.data?.sellers || []).map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {sellersApi.error ? (
          <span className="field-error">Seller filter could not load: {sellersApi.error.message}</span>
        ) : null}
      </section>

      {statsApi.error ? <ErrorNotice error={statsApi.error} onRetry={statsApi.reload} /> : null}
      {statsApi.loading && !summary ? <LoadingPage label="Calculating the summary…" /> : null}

      {summary ? (
        <div className={`stats-results${statsApi.loading ? ' is-loading' : ''}`} aria-busy={statsApi.loading}>
          <section className="kpi-row" aria-label="Sales summary totals">
            <StatTile
              label="Orders in period"
              value={String(summary.orders)}
              count={`${summary.perSeller.length} seller(s)`}
              detail="created in this date range"
              tone="neutral"
              icon="grid"
            />
            <StatTile
              label="Paid sales"
              value={money(summary.paid.amountCents)}
              count={`${summary.paid.count} order(s)`}
              detail="confirmed EFT and collected cash"
              tone="good"
              icon="check"
            />
            <StatTile
              label="Pending payments"
              value={money(summary.pending.amountCents)}
              count={`${summary.pending.count} order(s)`}
              detail="awaiting EFT, failed or cash due"
              tone="warning"
              icon="arrow"
            />
            <StatTile
              label="Refunds"
              value={money(summary.refunds.amountCents)}
              count={`${summary.refunds.count} order(s)`}
              detail="shown separately, not deducted"
              tone="critical"
              icon="bag"
            />
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Table view</span>
                <h2>Breakdown by seller</h2>
              </div>
              <span className="muted small">
                {from || 'Start'} → {to || 'Today'}
              </span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Seller</th>
                    <th scope="col" className="numeric">
                      Orders
                    </th>
                    <th scope="col" className="numeric">
                      Paid
                    </th>
                    <th scope="col" className="numeric">
                      Pending
                    </th>
                    <th scope="col" className="numeric">
                      Refunds
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.perSeller.map((seller) => (
                    <tr key={seller.sellerId}>
                      <th scope="row">{seller.sellerName}</th>
                      <td className="numeric" data-label="Orders">
                        {seller.orderCount}
                      </td>
                      <td className="numeric" data-label="Paid">
                        {money(seller.paid.amountCents)}
                      </td>
                      <td className="numeric" data-label="Pending">
                        {money(seller.pending.amountCents)}
                      </td>
                      <td className="numeric" data-label="Refunds">
                        {money(seller.refunds.amountCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">All sellers</th>
                    <td className="numeric" data-label="Orders">
                      {summary.orders}
                    </td>
                    <td className="numeric" data-label="Paid">
                      {money(summary.paid.amountCents)}
                    </td>
                    <td className="numeric" data-label="Pending">
                      {money(summary.pending.amountCents)}
                    </td>
                    <td className="numeric" data-label="Refunds">
                      {money(summary.refunds.amountCents)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="muted small">
              Paid sales are confirmed EFT payments and collected cash-on-delivery payments. Pending
              payments include awaiting EFT, failed and expired EFT, and unpaid cash-on-delivery
              orders. Refunds are not subtracted from paid sales.
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}