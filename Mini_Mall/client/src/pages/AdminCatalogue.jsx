import { useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { EmptyState, ErrorNotice, LoadingPage } from '../components/PageStates.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { money, dateTime } from '../utils/format.js';

const TABS = [
  { key: 'pending', label: 'Pending review', countKey: 'pending' },
  { key: 'changes', label: 'Changes requested', countKey: 'changes_requested' },
  { key: 'delisting', label: 'Delisting requests', countKey: 'delisting_requested' },
  { key: 'categories', label: 'Categories', countKey: '' },
];

function ReviewCard({ product, tab, onDone }) {
  const { notify } = useToast();
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [busy, setBusy] = useState('');

  async function run(action, request, message) {
    setBusy(action);
    try {
      const result = await request();
      notify(result.message || message, 'success');
      onDone();
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setBusy('');
    }
  }

  const approve = () =>
    run('approve', () => api(`/admin/products/${product.id}/approve`, { method: 'POST' }), 'Listing approved.');

  const requestChanges = () => {
    if (feedback.trim().length < 3) {
      notify('Explain what the seller must correct.', 'error');
      return;
    }
    run(
      'changes',
      () =>
        api(`/admin/products/${product.id}/request-changes`, {
          method: 'POST',
          body: { feedback },
        }),
      'Feedback sent.',
    );
  };

  const delist = () =>
    run('delist', () => api(`/admin/products/${product.id}/delist`, { method: 'POST' }), 'Listing delisted.');

  return (
    <article className="review-card">
      <img
        className="listing-thumb"
        src={product.images?.[0] || '/images/placeholder.svg'}
        alt=""
        onError={(event) => {
          event.currentTarget.src = '/images/placeholder.svg';
        }}
      />
      <div className="review-card-main">
        <div className="listing-title-row">
          <div>
            <h2>{product.title}</h2>
            <p className="muted small">
              {product.model || 'No model'} · {product.categoryId?.name || 'No category'} ·{' '}
              {product.sellerId?.name || 'Seller'}
            </p>
          </div>
          <StatusBadge status={product.status} kind="product" />
        </div>

        <div className="review-specs">
          <span>
            <strong>Voltage</strong> {product.voltage || 'Missing'}
          </span>
          <span>
            <strong>Connector</strong> {product.connector || 'Missing'}
          </span>
          <span>
            <strong>Compatibility</strong> {product.compatibility || 'Missing'}
          </span>
          <span>
            <strong>Price</strong> {money(product.priceCents)}
          </span>
          <span>
            <strong>Stock</strong> {product.stock}
          </span>
          <span>
            <strong>Submitted</strong> {product.submittedAt ? dateTime(product.submittedAt) : '—'}
          </span>
        </div>

        {product.reviewFeedback ? (
          <div className="notice notice-warn">
            <div>
              <strong>Feedback already sent</strong>
              <p>{product.reviewFeedback}</p>
            </div>
          </div>
        ) : null}

        {tab === 'pending' ? (
          <div className="review-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={approve}
              disabled={Boolean(busy)}
            >
              {busy === 'approve' ? 'Approving…' : 'Approve and publish'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowFeedback((current) => !current)}
              disabled={Boolean(busy)}
            >
              {showFeedback ? 'Hide correction form' : 'Request changes'}
            </button>
          </div>
        ) : null}

        {tab === 'pending' && showFeedback ? (
          <div className="feedback-form">
            <div className="field">
              <label htmlFor={`feedback-${product.id}`}>What must Lerato correct?</label>
              <textarea
                id={`feedback-${product.id}`}
                rows="2"
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="For example: add the connector type and confirm the output voltage."
              />
            </div>
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={requestChanges}
              disabled={busy === 'changes'}
            >
              {busy === 'changes' ? 'Sending…' : 'Send feedback'}
            </button>
          </div>
        ) : null}

        {tab === 'changes' ? (
          <p className="muted small">
            Waiting for the seller to edit and resubmit. The listing returns to Pending review after
            resubmission.
          </p>
        ) : null}

        {tab === 'delisting' ? (
          <div className="review-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={delist}
              disabled={Boolean(busy)}
            >
              {busy === 'delist' ? 'Delisting…' : 'Approve delisting'}
            </button>
            <span className="muted small">The listing leaves the public catalogue after approval.</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function CategoriesPanel() {
  const { notify } = useToast();
  const categoriesApi = useApi('/admin/categories');
  const [name, setName] = useState('');
  const [busyId, setBusyId] = useState('');
  const [adding, setAdding] = useState(false);

  async function addCategory(event) {
    event.preventDefault();
    setAdding(true);
    try {
      await api('/admin/categories', { method: 'POST', body: { name } });
      notify('Category added.', 'success');
      setName('');
      categoriesApi.reload();
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setAdding(false);
    }
  }

  async function toggle(category) {
    setBusyId(category.id);
    try {
      await api(`/admin/categories/${category.id}`, {
        method: 'PATCH',
        body: { active: !category.active },
      });
      notify(`Category ${category.active ? 'deactivated' : 'reactivated'}.`, 'success');
      categoriesApi.reload();
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setBusyId('');
    }
  }

  if (categoriesApi.loading) return <LoadingPage label="Loading categories…" />;
  if (categoriesApi.error) {
    return <ErrorNotice error={categoriesApi.error} onRetry={categoriesApi.reload} />;
  }

  return (
    <div className="two-column">
      <section className="panel">
        <h2>Add a category</h2>
        <form className="form-stack" onSubmit={addCategory}>
          <div className="field">
            <label htmlFor="category-name">Category name</label>
            <input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Enclosures"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={adding}>
            {adding ? 'Adding…' : 'Add category'}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Existing categories</h2>
        <div className="category-admin-list">
          {(categoriesApi.data?.categories || []).map((category) => (
            <div key={category.id} className="category-admin-row">
              <div>
                <strong>{category.name}</strong>
                <span className={`badge badge-${category.active ? 'success' : 'neutral'}`}>
                  {category.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-small btn-ghost"
                onClick={() => toggle(category)}
                disabled={busyId === category.id}
              >
                {category.active ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AdminCatalogue() {
  const [tab, setTab] = useState('pending');
  const catalogueApi = useApi(`/admin/catalogue?tab=${tab}`, { enabled: tab !== 'categories' });
  const counts = catalogueApi.data?.counts || {};
  const products = catalogueApi.data?.products || [];

  function refresh() {
    catalogueApi.reload();
  }

  return (
    <div className="stack">
      <section className="page-heading">
        <span className="eyebrow">Priya's catalogue review</span>
        <h1>Catalogue decisions</h1>
        <p className="muted">
          Missing voltage or model information can make a listing misleading. Review the complete
          specifications before publishing or asking for a correction.
        </p>
      </section>

      <div className="tab-row" role="tablist" aria-label="Catalogue review sections">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={tab === item.key ? 'tab tab-active' : 'tab'}
            onClick={() => setTab(item.key)}
          >
            {item.label}
            {item.countKey && counts[item.countKey] ? (
              <span className="tab-count">{counts[item.countKey]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'categories' ? <CategoriesPanel /> : null}

      {tab !== 'categories' ? (
        <>
          {catalogueApi.loading ? <LoadingPage label="Loading the review queue…" /> : null}
          {catalogueApi.error ? (
            <ErrorNotice error={catalogueApi.error} onRetry={catalogueApi.reload} />
          ) : null}
          {!catalogueApi.loading && !catalogueApi.error && !products.length ? (
            <EmptyState title="Nothing in this review queue.">
              Pending listings, correction follow-ups and delisting requests appear here.
            </EmptyState>
          ) : null}
          <div className="review-list">
            {products.map((product) => (
              <ReviewCard key={product.id} product={product} tab={tab} onDone={refresh} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}