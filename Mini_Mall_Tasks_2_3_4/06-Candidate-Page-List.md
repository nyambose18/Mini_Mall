# Task 3 · Round 2 · Candidate adjudication

| Page | Path | Access | Core elements |
|---|---|---|---|
| Home | / | Public | Categories, featured approved parts, search |
| Product list | /products | Public | Search, category filter, stock, rand prices |
| Product details | /products/:id | Public | Photos, specs, price, stock, add to cart |
| Sign in/register | /auth | Public | Forms, errors, return destination |
| Cart | /cart | Buyer | Quantity, remove, subtotal, checkout |
| Checkout | /checkout | Buyer | Address, estimate, fees, payment choice |
| Orders | /orders | Buyer | Status filters, order links |
| Order details | /orders/:id | Buyer | Payment instructions, tracking, receipt, refund entry |
| Refund case | /refunds/:id | Buyer | Reason, image, status, decision |
| Seller products | /seller/products | Seller | Listings, stock, review feedback |
| Seller product editor | /seller/products/:id/edit | Seller | Specs, images, submit/resubmit |
| Seller orders | /seller/orders | Seller | Queue, inline order drawer, dispatch, refund intake |
| Admin catalogue | /admin/catalogue | Admin | Review, delist, categories |
| Admin orders/refunds | /admin/orders | Admin | Payment confirmation, timeline, refund decision |
| Admin statistics | /admin/statistics | Admin | Date/seller filters, paid, pending, refunds |

Entries: Home via logo; list via search/categories; details via product card; auth via sign in or protected action; cart via navigation; checkout via cart; orders via Account; order details via order row; refund via delivered item; seller area via role menu; editor via New/Edit; seller orders via seller menu; admin via independent /admin entry.

Candidate cuts: wishlist and coupons excluded; Help/About merged into footer sections. Category and search pages share Product list. Payment instructions live in Order details. Seller order details and refund intake use a drawer within Seller orders, not additional routes. Category maintenance is a tab within Admin catalogue. 15 baseline pages remain: 12 storefront pages including seller workspace, 3 admin pages. Sellers have ownership-restricted permissions, not buyer access.
