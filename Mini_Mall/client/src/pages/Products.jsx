import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { ErrorNotice, LoadingPage, EmptyState } from '../components/PageStates.jsx';
import ProductCard from '../components/ProductCard.jsx';
import PictureSearch from '../components/PictureSearch.jsx';

export default function Products() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const [draftSearch, setDraftSearch] = useState(search);

  useEffect(() => {
    setDraftSearch(search);
  }, [search]);

  const categoriesApi = useApi('/categories');
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (category) query.set('category', category);
  const productsApi = useApi(`/products${query.toString() ? `?${query}` : ''}`);

  function updateParams(nextSearch, nextCategory) {
    const next = new URLSearchParams();
    if (nextSearch.trim()) next.set('search', nextSearch.trim());
    if (nextCategory) next.set('category', nextCategory);
    setParams(next, { replace: false });
  }

  function submit(event) {
    event.preventDefault();
    updateParams(draftSearch, category);
  }

  const products = productsApi.data?.products || [];
  const activeCategory = categoriesApi.data?.categories?.find((item) => item.id === category);

  return (
    <div className="stack">
      <section className="page-heading">
        <span className="eyebrow">Public catalogue</span>
        <h1>{activeCategory ? activeCategory.name : 'All approved parts'}</h1>
        <p className="muted">
          Only listings approved by Priya appear here. Search by model or part name, then check the
          specifications before adding to cart.
        </p>
      </section>

      <section className="panel filter-panel">
        <form className="filter-row" onSubmit={submit} role="search">
          <div className="field grow">
            <label htmlFor="product-search">Search model or part</label>
            <input
              id="product-search"
              type="search"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="e.g. HC-SR04 or motor driver"
            />
          </div>
          <div className="field">
            <label htmlFor="category-filter">Category</label>
            <select
              id="category-filter"
              value={category}
              onChange={(event) => updateParams(draftSearch, event.target.value)}
            >
              <option value="">All categories</option>
              {(categoriesApi.data?.categories || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary filter-submit" type="submit">
            Search
          </button>
        </form>
        {search || category ? (
          <button type="button" className="text-button" onClick={() => updateParams('', '')}>
            Clear filters
          </button>
        ) : null}
      </section>

      <PictureSearch products={productsApi.loading || productsApi.error ? null : productsApi.data?.products}
        catalogueUnavailable={Boolean(productsApi.error)} />

      {productsApi.loading ? <LoadingPage label="Finding parts…" /> : null}
      {productsApi.error ? (
        <ErrorNotice error={productsApi.error} onRetry={productsApi.reload} />
      ) : null}
      {categoriesApi.error ? (
        <ErrorNotice error={categoriesApi.error} onRetry={categoriesApi.reload} />
      ) : null}

      {!productsApi.loading && !productsApi.error ? (
        <>
          <p className="result-count" role="status">
            {products.length} {products.length === 1 ? 'part' : 'parts'}
            {search ? ` matching “${search}”` : ''}
          </p>
          {products.length ? (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState title="No approved parts match this search.">
              Try a different model number or clear the filters.
            </EmptyState>
          )}
        </>
      ) : null}
    </div>
  );
}