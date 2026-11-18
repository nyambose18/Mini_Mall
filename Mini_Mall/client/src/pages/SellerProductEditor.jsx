import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, uploadImage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { ErrorNotice, InlineError, LoadingPage } from '../components/PageStates.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const EMPTY = {
  title: '',
  model: '',
  categoryId: '',
  price: '',
  stock: '0',
  voltage: '',
  connector: '',
  compatibility: '',
  contents: '',
  description: '',
  images: [],
};

export default function SellerProductEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();
  const categoriesApi = useApi('/categories');
  const productApi = useApi(isNew ? null : `/seller/products/${id}`, { enabled: !isNew });
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const loadedId = useRef('');
  const createdNotice = location.state?.created;

  useEffect(() => {
    const product = productApi.data?.product;
    if (!product || loadedId.current === product.id) return;
    loadedId.current = product.id;
    setForm({
      title: product.title || '',
      model: product.model || '',
      categoryId: product.categoryId?.id || product.categoryId || '',
      price: (product.priceCents / 100).toFixed(2),
      stock: String(product.stock ?? 0),
      voltage: product.voltage || '',
      connector: product.connector || '',
      compatibility: product.compatibility || '',
      contents: product.contents || '',
      description: product.description || '',
      images: product.images || [],
    });
  }, [productApi.data]);

  if (!isNew && productApi.loading) return <LoadingPage label="Opening the listing…" />;
  if (!isNew && productApi.error) {
    return <ErrorNotice error={productApi.error} onRetry={productApi.reload} />;
  }

  const product = productApi.data?.product;
  const status = product?.status;
  const locked = status === 'pending' || status === 'delisted';

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function payload() {
    return {
      title: form.title,
      model: form.model,
      categoryId: form.categoryId || null,
      voltage: form.voltage,
      connector: form.connector,
      compatibility: form.compatibility,
      contents: form.contents,
      description: form.description,
      priceCents: Math.round((Number(form.price) || 0) * 100),
      stock: Number(form.stock) || 0,
      images: form.images,
    };
  }

  async function upload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadImage(file);
      update('images', [...form.images, result.url]);
      notify('Image uploaded.', 'success');
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function save(submitAfter = false) {
    setSaving(true);
    setError(null);
    setErrors({});
    try {
      if (isNew) {
        const result = await api('/seller/products', { method: 'POST', body: payload() });
        notify('Draft saved. Complete the remaining details, then submit for review.', 'success');
        navigate(`/seller/products/${result.product.id}/edit`, { replace: true, state: { created: true } });
        return;
      }

      await api(`/seller/products/${id}`, { method: 'PUT', body: payload() });
      if (submitAfter) {
        await api(`/seller/products/${id}/submit`, { method: 'POST' });
        notify('Listing submitted for administrator review.', 'success');
      } else {
        notify('Listing saved.', 'success');
      }
      navigate('/seller/products');
    } catch (caught) {
      setError(caught);
      if (caught.fields) setErrors(caught.fields);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/seller/products">My listings</Link>
        <span aria-hidden="true">/</span>
        <span>{isNew ? 'New listing' : product?.title || 'Edit listing'}</span>
      </nav>

      <section className="page-heading split-heading">
        <div>
          <span className="eyebrow">Seller listing editor</span>
          <h1>{isNew ? 'Create a listing' : 'Edit listing'}</h1>
          <p className="muted">
            Title, model, category, voltage, connector, compatibility, contents, price, stock and at
            least one image are required before submission.
          </p>
        </div>
        {product ? <StatusBadge status={product.status} kind="product" /> : null}
      </section>

      {createdNotice ? (
        <div className="notice notice-success">
          <p>Draft saved. Add the missing details and submit it for review when you are ready.</p>
        </div>
      ) : null}

      {product?.reviewFeedback ? (
        <div className="notice notice-warn">
          <div>
            <strong>Priya requested a correction</strong>
            <p>{product.reviewFeedback}</p>
          </div>
        </div>
      ) : null}

      {product?.status === 'approved' ? (
        <div className="notice notice-info">
          <p>
            Editing an approved listing removes it from the public catalogue until Priya approves
            the changes again. Stock edits do not require re-approval.
          </p>
        </div>
      ) : null}

      {locked ? (
        <div className="notice notice-info">
          <p>
            {status === 'pending'
              ? 'This listing is waiting for review, so its details are read-only.'
              : 'This listing is delisted and cannot be edited.'}
          </p>
        </div>
      ) : null}

      <form
        className="panel form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          save(false);
        }}
      >
        <fieldset className="form-fieldset" disabled={locked || saving}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                value={form.title}
                onChange={(event) => update('title', event.target.value)}
                placeholder="L298N Motor Driver Module"
              />
              {errors.title ? <p className="field-error">{errors.title}</p> : null}
            </div>
            <div className="field">
              <label htmlFor="model">Model</label>
              <input
                id="model"
                value={form.model}
                onChange={(event) => update('model', event.target.value)}
                placeholder="L298N"
              />
              {errors.model ? <p className="field-error">{errors.model}</p> : null}
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={form.categoryId}
                onChange={(event) => update('categoryId', event.target.value)}
              >
                <option value="">Choose a category</option>
                {(categoriesApi.data?.categories || []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId ? <p className="field-error">{errors.categoryId}</p> : null}
            </div>
            <div className="field">
              <label htmlFor="price">Price in rand</label>
              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => update('price', event.target.value)}
                placeholder="149.00"
              />
              {errors.priceCents ? <p className="field-error">{errors.priceCents}</p> : null}
            </div>
            <div className="field">
              <label htmlFor="stock">Available stock</label>
              <input
                id="stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) => update('stock', event.target.value)}
              />
              {errors.stock ? <p className="field-error">{errors.stock}</p> : null}
            </div>
            <div className="field">
              <label htmlFor="voltage">Voltage</label>
              <input
                id="voltage"
                value={form.voltage}
                onChange={(event) => update('voltage', event.target.value)}
                placeholder="5 V logic, 5–35 V motor supply"
              />
              {errors.voltage ? <p className="field-error">{errors.voltage}</p> : null}
            </div>
            <div className="field">
              <label htmlFor="connector">Connector</label>
              <input
                id="connector"
                value={form.connector}
                onChange={(event) => update('connector', event.target.value)}
                placeholder="Screw terminals and 2.54 mm headers"
              />
              {errors.connector ? <p className="field-error">{errors.connector}</p> : null}
            </div>
            <div className="field span-2">
              <label htmlFor="compatibility">Compatibility</label>
              <input
                id="compatibility"
                value={form.compatibility}
                onChange={(event) => update('compatibility', event.target.value)}
                placeholder="Arduino, ESP32 and Pico; two DC motors"
              />
              {errors.compatibility ? <p className="field-error">{errors.compatibility}</p> : null}
            </div>
            <div className="field span-2">
              <label htmlFor="contents">In the box</label>
              <input
                id="contents"
                value={form.contents}
                onChange={(event) => update('contents', event.target.value)}
                placeholder="1x L298N module"
              />
              {errors.contents ? <p className="field-error">{errors.contents}</p> : null}
            </div>
            <div className="field span-2">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                rows="4"
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="image-upload">Images</label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={(event) => upload(event.target.files?.[0])}
              disabled={uploading}
            />
            <p className="field-hint">Add one or more images, up to 5 MB each.</p>
            {errors.images ? <p className="field-error">{errors.images}</p> : null}
            {form.images.length ? (
              <div className="editor-images">
                {form.images.map((image) => (
                  <div key={image} className="editor-image">
                    <img src={image} alt="" />
                    <button
                      type="button"
                      className="text-button danger"
                      onClick={() => update('images', form.images.filter((entry) => entry !== image))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">No images added yet.</p>
            )}
          </div>

          <InlineError error={error} />

          <div className="button-row">
            {isNew ? (
              <button className="btn btn-primary btn-large" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save draft and continue'}
              </button>
            ) : (
              <>
                <button className="btn btn-primary btn-large" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                {['draft', 'changes_requested', 'approved'].includes(status) ? (
                  <button
                    className="btn btn-ghost btn-large"
                    type="button"
                    onClick={() => save(true)}
                    disabled={saving}
                  >
                    Save and submit for review
                  </button>
                ) : null}
              </>
            )}
            <Link className="btn btn-ghost" to="/seller/products">
              Cancel
            </Link>
          </div>
        </fieldset>
      </form>
    </div>
  );
}