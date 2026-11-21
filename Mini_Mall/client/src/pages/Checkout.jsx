import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { ErrorNotice, InlineError, LoadingPage } from '../components/PageStates.jsx';
import { dateOnly, money } from '../utils/format.js';

export default function Checkout() {
  const cartApi = useApi('/cart');
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('eft');
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setAddress((current) => current || user.address || '');
      setPostcode((current) => current || user.postcode || '');
    }
  }, [user]);

  useEffect(() => {
    if (!/^\d{4}$/.test(postcode)) {
      setQuote(null);
      setQuoteError('');
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const result = await api(`/orders/quote?postcode=${postcode}`);
        if (!cancelled) {
          setQuote(result.quote);
          setQuoteError('');
        }
      } catch (caught) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(caught.message);
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [postcode]);

  if (cartApi.loading) return <LoadingPage label="Preparing checkout…" />;
  if (cartApi.error) return <ErrorNotice error={cartApi.error} onRetry={cartApi.reload} />;

  const cart = cartApi.data?.cart;
  if (!cart) return null;
  if (!cart.items.length) return <Navigate to="/cart" replace />;

  const totalCents = cart.subtotalCents + (quote?.feeCents || 0);
  const codBlocked = paymentMethod === 'cod' && quote && !quote.codEligible;
  const canSubmit =
    address.trim().length >= 5 &&
    /^\d{4}$/.test(postcode) &&
    Boolean(quote) &&
    !cart.mixedSellers &&
    !cart.hasProblems &&
    !codBlocked &&
    !submitting;

  async function placeOrder(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await api('/orders', {
        method: 'POST',
        body: { address, postcode, paymentMethod },
      });
      notify(`Order ${result.order.orderNumber} placed.`, 'success');
      navigate(`/orders/${result.order.id}`, { state: { placed: true }, replace: true });
    } catch (caught) {
      setError(caught);
      if (caught.code === 'STOCK_CHANGED' || caught.code === 'CART_CHANGED') {
        cartApi.reload();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <section className="page-heading">
        <span className="eyebrow">Checkout</span>
        <h1>Delivery and payment</h1>
        <p className="muted">
          The stock is checked again when you place the order. The delivery estimate uses working
          days.
        </p>
      </section>

      {cart.mixedSellers ? (
        <div className="notice notice-warn">
          <div>
            <strong>One seller per checkout.</strong>
            <p>
              Remove the items from the other seller in your{' '}
              <Link to="/cart">cart</Link> before continuing.
            </p>
          </div>
        </div>
      ) : null}
      {cart.hasProblems ? (
        <div className="notice notice-error">
          <div>
            <strong>Some items are no longer available.</strong>
            <p>
              Review your <Link to="/cart">cart</Link> before placing the order.
            </p>
          </div>
        </div>
      ) : null}

      <div className="checkout-layout">
        <form className="panel form-stack" onSubmit={placeOrder}>
          <h2>Delivery address</h2>
          <div className="field">
            <label htmlFor="checkout-address">Street address</label>
            <textarea
              id="checkout-address"
              rows="2"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              autoComplete="street-address"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="checkout-postcode">Postcode</label>
            <input
              id="checkout-postcode"
              aria-describedby={quoteError ? 'postcode-hint postcode-error' : 'postcode-hint'}
              aria-invalid={Boolean(quoteError)}
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={postcode}
              onChange={(event) => setPostcode(event.target.value.replace(/\D/g, ''))}
              autoComplete="postal-code"
              required
            />
            <p id="postcode-hint" className="field-hint">A 4-digit South African postcode, for example 2001.</p>
            {quoteError ? <p id="postcode-error" className="field-error" role="alert">{quoteError}</p> : null}
          </div>

          {quoteLoading ? <p className="muted small">Checking the delivery estimate…</p> : null}
          {quote ? (
            <div className="quote-box" role="status">
              <div>
                <span className="muted small">Delivery fee</span>
                <strong>{money(quote.feeCents)}</strong>
              </div>
              <div>
                <span className="muted small">Estimate</span>
                <strong>
                  {quote.workingDays} working days · by {dateOnly(quote.estimatedDate)}
                </strong>
              </div>
              <div>
                <span className="muted small">Cash on delivery</span>
                <strong>{quote.codEligible ? 'Available for this postcode' : 'Not available'}</strong>
              </div>
            </div>
          ) : null}

          <fieldset className="payment-group">
            <legend>Payment method</legend>
            <div className="payment-options">
            <label className={paymentMethod === 'eft' ? 'payment-option selected' : 'payment-option'}>
              <input
                type="radio"
                name="payment"
                value="eft"
                checked={paymentMethod === 'eft'}
                onChange={() => setPaymentMethod('eft')}
              />
              <span>
                <strong>EFT — simulated</strong>
                <small>
                  Place the order, receive a demo reference, then simulate payment. Priya confirms
                  it before Lerato can dispatch.
                </small>
              </span>
            </label>
            <label className={paymentMethod === 'cod' ? 'payment-option selected' : 'payment-option'}>
              <input
                type="radio"
                name="payment"
                value="cod"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
              />
              <span>
                <strong>Cash on delivery</strong>
                <small>
                  Available only for eligible postcodes. Cash is recorded separately after delivery.
                </small>
              </span>
            </label>
            </div>
          </fieldset>

          {codBlocked ? (
            <p className="notice notice-warn">
              Cash on delivery is not available for postcode {postcode}. Choose EFT instead.
            </p>
          ) : null}

          <InlineError error={error} />

          <button className="btn btn-primary btn-large" type="submit" disabled={!canSubmit}>
            {submitting ? 'Placing order…' : `Place order · ${money(totalCents)}`}
          </button>
          <p className="muted small">
            This is a teaching demonstration. No real EFT transfer or cash payment is collected.
          </p>
        </form>

        <aside className="panel order-summary">
          <h2>Order summary</h2>
          <ul className="summary-list">
            {cart.items.map((item) => (
              <li key={item.productId}>
                <span>
                  {item.qty} × {item.title}
                </span>
                <strong>{money(item.lineTotalCents)}</strong>
              </li>
            ))}
          </ul>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{money(cart.subtotalCents)}</span>
          </div>
          <div className="summary-row">
            <span>Delivery</span>
            <span>{quote ? money(quote.feeCents) : 'Enter postcode'}</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(totalCents)}</strong>
          </div>
          <p className="muted small">
            Seller: {cart.items[0]?.sellerName}. One order is created for this seller only.
          </p>
        </aside>
      </div>
    </div>
  );
}