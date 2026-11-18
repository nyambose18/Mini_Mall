import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { EmptyState, ErrorNotice, LoadingPage } from '../components/PageStates.jsx';
import { money } from '../utils/format.js';

export default function Cart() {
  const { data, loading, error, reload, setData } = useApi('/cart');
  const { notify } = useToast();
  const [busyId, setBusyId] = useState('');

  const cart = data?.cart;

  async function changeQty(item, qty) {
    if (qty < 1) return;
    setBusyId(item.productId);
    try {
      const result = await api(`/cart/${item.productId}`, { method: 'PATCH', body: { qty } });
      setData({ cart: result.cart });
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setBusyId('');
    }
  }

  async function remove(item) {
    setBusyId(item.productId);
    try {
      const result = await api(`/cart/${item.productId}`, { method: 'DELETE' });
      setData({ cart: result.cart });
      notify(`Removed ${item.title} from the cart.`, 'info');
    } catch (caught) {
      notify(caught.message, 'error');
    } finally {
      setBusyId('');
    }
  }

  if (loading) return <LoadingPage label="Loading your cart…" />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!cart) return null;

  if (!cart.items.length) {
    return (
      <EmptyState
        title="Your cart is empty."
        action={
          <Link className="btn btn-primary" to="/products">
            Browse approved parts
          </Link>
        }
      >
        Add a part from the catalogue and it will appear here.
      </EmptyState>
    );
  }

  const canCheckout = !cart.mixedSellers && !cart.hasProblems;

  return (
    <div className="stack">
      <section className="page-heading">
        <span className="eyebrow">Buyer cart</span>
        <h1>Your cart</h1>
        <p className="muted">
          Quantities are checked again at checkout. A counter sale can change stock before you place
          the order.
        </p>
      </section>

      {cart.mixedSellers ? (
        <div className="notice notice-warn">
          <div>
            <strong>This cart spans more than one seller.</strong>
            <p>
              Checkout supports one seller at a time. Remove the items from the other seller to
              continue with {cart.items[0].sellerName}.
            </p>
          </div>
        </div>
      ) : null}

      {cart.hasProblems ? (
        <div className="notice notice-error">
          <div>
            <strong>Some items need attention.</strong>
            <p>{cart.items.filter((item) => item.problem).map((item) => item.problem).join(' ')}</p>
          </div>
        </div>
      ) : null}

      <div className="cart-layout">
        <section className="panel cart-list">
          {cart.items.map((item) => (
            <article key={item.productId} className="cart-row">
              <img
                className="cart-thumb"
                src={item.image || '/images/placeholder.svg'}
                alt=""
                onError={(event) => {
                  event.currentTarget.src = '/images/placeholder.svg';
                }}
              />
              <div className="cart-row-main">
                <Link to={`/products/${item.productId}`} className="cart-title">
                  {item.title}
                </Link>
                <div className="muted small">
                  {item.model} · {item.sellerName}
                </div>
                <div className={item.problem ? 'stock stock-out' : 'stock stock-ok'}>
                  {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                </div>
                {item.problem ? <p className="field-error">{item.problem}</p> : null}
              </div>
              <div className="qty-control" aria-label={`Quantity for ${item.title}`}>
                <button
                  type="button"
                  onClick={() => changeQty(item, item.qty - 1)}
                  disabled={item.qty <= 1 || busyId === item.productId}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span>{item.qty}</span>
                <button
                  type="button"
                  onClick={() => changeQty(item, item.qty + 1)}
                  disabled={item.qty >= item.stock || busyId === item.productId}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <div className="cart-row-total">
                <strong>{money(item.lineTotalCents)}</strong>
                <span className="muted small">{money(item.unitPriceCents)} each</span>
              </div>
              <button
                type="button"
                className="text-button danger"
                onClick={() => remove(item)}
                disabled={busyId === item.productId}
              >
                Remove
              </button>
            </article>
          ))}
        </section>

        <aside className="panel cart-summary">
          <h2>Summary</h2>
          <div className="summary-row">
            <span>{cart.count} items</span>
            <strong>{money(cart.subtotalCents)}</strong>
          </div>
          <p className="muted small">
            Delivery fee and the working-day estimate are calculated from your postcode at checkout.
          </p>
          <div className="summary-total">
            <span>Subtotal</span>
            <strong>{money(cart.subtotalCents)}</strong>
          </div>
          {canCheckout ? (
            <Link className="btn btn-primary btn-large btn-block" to="/checkout">
              Continue to checkout
            </Link>
          ) : (
            <button className="btn btn-primary btn-large btn-block" type="button" disabled>
              Resolve cart issues first
            </button>
          )}
          <Link className="text-link" to="/products">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}