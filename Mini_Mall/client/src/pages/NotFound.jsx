import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="panel centered-panel">
      <span className="eyebrow">404</span>
      <h1>That page does not exist.</h1>
      <p className="muted">
        Check the address or return to the catalogue. The demonstration has 15 baseline pages.
      </p>
      <div className="button-row">
        <Link className="btn btn-primary" to="/">
          Back to home
        </Link>
        <Link className="btn btn-ghost" to="/products">
          Browse products
        </Link>
      </div>
    </section>
  );
}