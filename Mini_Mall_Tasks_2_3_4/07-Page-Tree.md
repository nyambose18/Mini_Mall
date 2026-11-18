# Task 3 · Round 3 · Text hierarchy

Mini Mall is level 1. Storefront/Admin Backend are level 2. Each page below is level 3; route segments are not additional information-architecture levels.

## Storefront (including seller workspace)
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

## Admin Backend (independent entry)
| Page | Path | Access | Core elements |
|---|---|---|---|
| Admin catalogue | /admin/catalogue | Admin | Review, delist, categories |
| Admin orders/refunds | /admin/orders | Admin | Payment confirmation, timeline, refund decision |
| Admin statistics | /admin/statistics | Admin | Date/seller filters, paid, pending, refunds |

Key links: Product list → Product details → Cart → Checkout → Order details. Account → Orders → Order details → Refund case. Seller products → Editor; Seller orders → inline order/refund drawer. Admin entry → Catalogue, Orders/refunds, Statistics.
Coverage: browse = list/details; cart = cart; order = checkout; payment = checkout/order details; shipping = seller orders + buyer order details; receipt = order details; refund = refund case + admin orders/refunds. No buyer route grants seller/admin access. Authentication alone is insufficient: ownership and role must also match.
