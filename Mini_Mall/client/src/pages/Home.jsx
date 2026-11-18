import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { LoadingPage, ErrorNotice } from '../components/PageStates.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { PERSONAS } from '../data/personas.js';

export default function Home() {
  const { data, loading, error, reload } = useApi('/home');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  function submitSearch(event) {
    event.preventDefault();
    const value = search.trim();
    navigate(value ? `/products?search=${encodeURIComponent(value)}` : '/products');
  }

  return (
    <div className="stack">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">South African robotics marketplace</span>
          <h1>Parts that fit. Orders that move.</h1>
          <p>
            Find the right board, driver or sensor with the specification details that matter —
            voltage, connector and compatibility — then follow the order from payment to parcel.
          </p>
          <form className="hero-search" onSubmit={submitSearch} role="search">
            <label className="sr-only" htmlFor="home-search">
              Search parts by model or name
            </label>
            <input
              id="home-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by model, e.g. L298N"
            />
            <button className="btn btn-primary" type="submit">
              Search parts
            </button>
          </form>
          <div className="hero-links">
            <Link className="btn btn-ghost" to="/products">
              Browse all parts
            </Link>
            <Link className="btn btn-ghost" to="/auth">
              Meet the three personas
            </Link>
          </div>
        </div>
        <div className="hero-board" aria-hidden="true">
          <div className="hero-chip">
            <span>L298N</span>
            <small>5–35 V · dual H-bridge</small>
          </div>
          <div className="hero-chip hero-chip-mid">
            <span>HC-SR04</span>
            <small>5 V · distance sensor</small>
          </div>
          <div className="hero-chip hero-chip-low">
            <span>ESP32</span>
            <small>3.3 V · Wi-Fi</small>
          </div>
          <div className="hero-wire" />
        </div>
      </section>

      {loading ? <LoadingPage label="Loading the marketplace…" /> : null}
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}

      {data ? (
        <>
          <section>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Shop by category</span>
                <h2>Start with the part you need</h2>
              </div>
              <Link className="text-link" to="/products">
                See every part
              </Link>
            </div>
            <div className="category-grid">
              {data.categories.map((category) => (
                <Link
                  key={category.id}
                  className="category-card"
                  to={`/products?category=${category.id}`}
                >
                  <span className="category-name">{category.name}</span>
                  <span className="category-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Approved listings</span>
                <h2>Recently added parts</h2>
              </div>
            </div>
            <div className="product-grid">
              {data.featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className="persona-strip">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Three personas, one flow</span>
            <h2>The people behind the system</h2>
          </div>
          <Link className="text-link" to="/auth">
            Sign in as a persona
          </Link>
        </div>
        <div className="persona-mini-grid">
          {PERSONAS.map((persona) => (
            <article key={persona.role} className={`persona-mini persona-mini-${persona.role}`}>
              <span className="avatar" aria-hidden="true">
                {persona.initials}
              </span>
              <div>
                <strong>{persona.name}</strong>
                <span className="muted"> · {persona.title}</span>
                <p>“{persona.quote}”</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}