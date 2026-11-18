import { Link } from 'react-router-dom';
import { money } from '../utils/format.js';

export default function ProductCard({ product }) {
  return (
    <Link className="product-card" to={`/products/${product.id}`}>
      <div className="product-image">
        <img
          src={product.images?.[0] || '/images/placeholder.svg'}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = '/images/placeholder.svg';
          }}
        />
      </div>
      <div className="product-card-body">
        <span className="eyebrow">{product.categoryId?.name || 'Robotics part'}</span>
        <h3>{product.title}</h3>
        <p className="muted product-model">{product.model || 'Model not stated'}</p>
        <div className="product-card-footer">
          <strong className="price">{money(product.priceCents)}</strong>
          <span className={product.stock > 0 ? 'stock stock-ok' : 'stock stock-out'}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </span>
        </div>
      </div>
    </Link>
  );
}