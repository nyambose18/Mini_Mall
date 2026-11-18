import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { EmptyState, ErrorNotice, LoadingPage } from '../components/PageStates.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { money } from '../utils/format.js';

function StockEditor({ product, onSaved }) {
  const { notify } = useToast();
  const [stock, setStock] = useState(String(product.stock));
  const [saving, setSaving] = useState(false);
  const changed = Number(stock) !== product.stock;

  async function save() {
    setSaving(true);
    try {
      const result = await api(`/seller/products/${product.id}/stock`, {
        method: 'PATCH',
        body: { stock: Number(stock) },
      });
      notify(result.message || 'Stock updated.', 'success');
      onSaved();
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="inline-stock">
      <label htmlFor={`stock-${product.id}`}>Stock</label>
      <input
        id={`stock-${product.id}`}
        type="number"
        min="0"
        step="1"
        value={stock}
        onChange={(event) => setStock(event.target.value)}
      />
      <button
        type="button"
        className="btn btn-small btn-ghost"
        onClick={save}
        disabled={!changed || saving || product.status === 'delisted'}
      >
        {saving ? 'Saving…' : 'Save stock'}
      </button>
    </div>
  );
}

export default function SellerProducts() {
  const { data, loading, error, reload } = useApi('/seller/products');
  const { notify } = useToast();
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState('');

  const products = data?.products || [];
  const visible = filter === 'all' ? products : products.filter((product) => product.status === filter);

  async function submitForReview(product) {
    setBusyId(product.id);
    try {
      const result = await api(`/seller/products/${product.id}/submit`, { method: 'POST' });
      notify(result.message || 'Submitted for review.', 'success');
      reload();
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setBusyId('');
    }
  }

  async function requestDelist(product) {
    setBusyId(product.id);
    try {
      const result = await api(`/seller/products/${product.id}/delist-request`, { method: 'POST' });
      notify(result.message || 'Delisting requested.', 'success');
      reload();
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setBusyId('');
    }
  }

  if (loading) return <LoadingPage label="Loading your listings…" />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;

  return (
    <div className="stack">
      <section className="page-heading split-heading">
        <div>
          <span className="eyebrow">Lerato's workspace</span>
          <h1>My listings</h1>
          <p className="muted">
            Accurate voltage, connector and compatibility fields help Thabo choose the right part.
            New and corrected listings go to Priya for review.
          </p>
        </div>
        <Link className="btn btn-primary" to="/seller/products/new">
          New listing
        </Link>
      </section>

      <section className="panel filter-panel">
        <div className="field">
          <label htmlFor="listing-filter">Show listings</label>
          <select id="listing-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">In review</option>
            <option value="changes_requested">Changes requested</option>
            <option value="approved">Approved</option>
            <option value="delisting_requested">Delisting requested</option>
            <option value="delisted">Delisted</option>
          </select>
        </div>
        <span className="muted small">{visible.length} listing(s)</span>
      </section>

      {!visible.length ? (
        <EmptyState
          title="No listings in this view."
          action={
            <Link className="btn btn-primary" to="/seller/products/new">
              Create your first listing
            </Link>
          }
        >
          A draft becomes public only after Priya approves it.
        </EmptyState>
      ) : null}

      <section className="listing-stack">
        {visible.map((product) => (
          <article key={product.id} className="listing-card">
            <img
              className="listing-thumb"
              src={product.images?.[0] || '/images/placeholder.svg'}
              alt=""
              onError={(event) => {
                event.currentTarget.src = '/images/placeholder.svg';
              }}
            />
            <div className="listing-main">
              <div className="listing-title-row">
                <div>
                  <h2>{product.title}</h2>
                  <p className="muted small">
                    {product.model || 'No model'} · {product.categoryId?.name || 'No category'} ·{' '}
                    {money(product.priceCents)}
                  </p>
                </div>
                <StatusBadge status={product.status} kind="product" />
              </div>

              {product.reviewFeedback ? (
                <div className="notice notice-warn">
                  <div>
                    <strong>Review feedback</strong>
                    <p>{product.reviewFeedback}</p>
                  </div>
                </div>
              ) : null}

              <div className="listing-meta">
                {product.voltage ? <span>Voltage: {product.voltage}</span> : null}
                {product.connector ? <span>Connector: {product.connector}</span> : null}
                {product.stock === 0 ? <span className="stock stock-out">Out of stock</span> : null}
              </div>

              <div className="listing-actions">
                <StockEditor product={product} onSaved={reload} />
                {product.status !== 'delisted' ? (
                  <Link className="btn btn-small" to={`/seller/products/${product.id}/edit`}>
                    Edit listing
                  </Link>
                ) : null}
                {['draft', 'changes_requested'].includes(product.status) ? (
                  <button
                    type="button"
                    className="btn btn-small btn-primary"
                    onClick={() => submitForReview(product)}
                    disabled={busyId === product.id}
                  >
                    {product.status === 'changes_requested' ? 'Resubmit for review' : 'Submit for review'}
                  </button>
                ) : null}
                {product.status === 'approved' ? (
                  <button
                    type="button"
                    className="btn btn-small btn-ghost"
                    onClick={() => requestDelist(product)}
                    disabled={busyId === product.id}
                  >
                    Request delisting
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}