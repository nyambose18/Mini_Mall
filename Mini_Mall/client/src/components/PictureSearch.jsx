import { useEffect, useState } from 'react';
import ProductCard from './ProductCard.jsx';
import { similarProducts } from '../utils/pictureSearch.js';

export default function PictureSearch({ products, catalogueUnavailable }) {
  const [file, setFile] = useState(null);
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file || !products) return;
    const controller = new AbortController();
    setMatches(null);
    setError('');
    similarProducts(file, products, controller.signal)
      .then((results) => { if (!controller.signal.aborted) setMatches(results); })
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not read that picture. Try a JPG, PNG or WebP image.');
      });
    return () => controller.abort();
  }, [file, products]);

  function select(event) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    setMatches(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 8 * 1024 * 1024) {
      setFile(null);
      setError('Choose a JPG, PNG or WebP picture up to 8 MB.');
      return;
    }
    setError('');
    setFile(selected);
  }

  return <section className="panel stack" aria-labelledby="picture-search-heading">
    <h2 id="picture-search-heading">Search by picture</h2>
    <p className="muted">Choose a clear photo of the part. Mini Mall compares it with photos in the current catalogue results, in your browser. Check the model and specifications before buying.</p>
    <div className="field">
      <label htmlFor="part-picture">Part picture (JPG, PNG or WebP, up to 8 MB)</label>
      <input id="part-picture" type="file" accept="image/jpeg,image/png,image/webp" onChange={select} />
    </div>
    {file && <div className="button-row">
      <span className="muted small">{file.name}</span>
      <button className="btn btn-ghost" type="button" onClick={() => {
        setFile(null);
        setMatches(null);
        setError('');
      }}>Clear picture</button>
    </div>}
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    {file && catalogueUnavailable && <p role="status">Retry loading the catalogue to compare this picture.</p>}
    {file && !error && !catalogueUnavailable && (!products || matches === null) && <p role="status">Comparing catalogue photos?</p>}
    {file && products && matches && <div>
      <h3 role="status">{matches.length ? 'Closest visual matches' : 'No catalogue photos available to compare'}</h3>
      {matches.length > 0 && <div className="product-grid">
        {matches.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>}
    </div>}
  </section>;
}
