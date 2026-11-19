import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { ErrorNotice, LoadingPage } from '../components/PageStates.jsx';
import SpecGrid from '../components/SpecGrid.jsx';
import { money } from '../utils/format.js';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();
  const { data, loading, error, reload } = useApi(`/products/${id}`);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const appliedIntent = useRef(false);
  const product = data?.product;

  useEffect(() => {
    setImageIndex(0);
    setAdded(false);
  }, [id]);

  useEffect(() => {
    if (!product || !user || user.role !== 'buyer' || appliedIntent.current) return;
    const raw = sessionStorage.getItem('mm_intent');
    if (!raw) return;

    let intent;
    try {
      intent = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem('mm_intent');
      return;
    }
    if (intent.productId !== product.id) return;

    sessionStorage.removeItem('mm_intent');
    appliedIntent.current = true;
    setAdding(true);
    api('/cart', { method: 'POST', body: { productId: product.id, qty: intent.qty || 1 } })
      .then((result) => {
        setAdded(true);
        notify(result.message || 'Added to your cart.', 'success');
      })
      .catch((caught) => notify(caught.message, 'error'))
      .finally(() => setAdding(false));
  }, [product, user, notify]);

  async function handleAdd() {
    if (!product) return;
    if (!user) {
      sessionStorage.setItem(
        'mm_intent',
        JSON.stringify({ productId: product.id, next: `/products/${product.id}`, qty: 1 }),
      );
      navigate(`/auth?next=${encodeURIComponent(`/products/${product.id}`)}&intent=add`);
      return;
    }
    if (user.role !== 'buyer') {
      notify('Only buyer accounts can shop. Sign in as Thabo to use the cart.', 'error');
      return;
    }

    setAdding(true);
    try {
      const result = await api('/cart', { method: 'POST', body: { productId: product.id, qty: 1 } });
      setAdded(true);
      notify(result.message || 'Added to your cart.', 'success');
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setAdding(false);
    }
  }

  if (loading) return <LoadingPage label="Opening the part…" />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!product) return null;

  const images = product.images?.length ? product.images : ['/images/placeholder.svg'];
  const outOfStock = product.stock <= 0;

  return (
    <div className="stack">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/products">Products</Link>
        <span aria-hidden="true">/</span>
        <span>{product.title}</span>
      </nav>

      <div className="detail-layout">
        <section className="detail-media">
          <div className="detail-image">
            <img
              src={images[imageIndex]}
              alt={`${product.title} product photo`}
              onError={(event) => {
                event.currentTarget.src = '/images/placeholder.svg';
              }}
            />
          </div>
          {images[imageIndex]?.startsWith('/images/photos/') ? (
            <p className="photo-caption muted small">
              Product reference photo.{' '}
              <a href="/images/photos/credits.html" target="_blank" rel="noreferrer">Photo credits</a>
            </p>
          ) : null}
          {images.length > 1 ? (
            <div className="thumb-row">
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  className={index === imageIndex ? 'thumb thumb-active' : 'thumb'}
                  onClick={() => setImageIndex(index)}
                  aria-label={`Show image ${index + 1}`}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="detail-info">
          <span className="eyebrow">{product.categoryId?.name || 'Robotics part'}</span>
          <h1>{product.title}</h1>
          <p className="muted detail-model">Model {product.model || 'not stated'}</p>

          <div className="detail-price-row">
            <strong className="detail-price">{money(product.priceCents)}</strong>
            <span className={outOfStock ? 'stock stock-out' : 'stock stock-ok'}>
              {outOfStock ? 'Out of stock' : `${product.stock} in stock`}
            </span>
          </div>

          <p className="detail-description">{product.description || 'No description supplied.'}</p>

          <div className="detail-actions">
            <button
              type="button"
              className="btn btn-primary btn-large"
              onClick={handleAdd}
              disabled={adding || outOfStock || user?.role === 'seller' || user?.role === 'admin'}
            >
              {outOfStock ? 'Out of stock' : adding ? 'Adding…' : 'Add to cart'}
            </button>
            {added ? (
              <Link className="btn btn-ghost" to="/cart">
                View cart
              </Link>
            ) : null}
          </div>

          {outOfStock ? (
            <p className="notice notice-warn">
              This listing has zero stock, so purchasing is blocked. Lerato can update the quantity
              from her stock editor.
            </p>
          ) : null}
          {user?.role === 'seller' || user?.role === 'admin' ? (
            <p className="notice notice-info">
              {user.role === 'seller' ? 'Seller' : 'Administrator'} accounts cannot shop in this
              demo. Sign in as Thabo to add items to a cart.
            </p>
          ) : null}
          {!user ? (
            <p className="muted small">
              You can browse without signing in. Adding to the cart will ask you to sign in and then
              bring you back to this part.
            </p>
          ) : null}

          <p className="seller-line">
            Sold by <strong>{product.sellerId?.name || 'Marketplace seller'}</strong>
          </p>
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Check before you buy</span>
            <h2>Specifications</h2>
          </div>
        </div>
        <SpecGrid
          specs={[
            { label: 'Model', value: product.model },
            { label: 'Voltage', value: product.voltage },
            { label: 'Connector', value: product.connector },
            { label: 'Compatibility', value: product.compatibility },
            { label: 'In the box', value: product.contents },
            { label: 'Category', value: product.categoryId?.name },
          ]}
        />
      </section>
    </div>
  );
}
