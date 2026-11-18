# Mini Mall · PRD v1 · 17 November 2026

## Background and objectives
Build a mobile-first teaching marketplace for robotics components, electronics and gadgets in South Africa. Lerato supplies accurate listings; Thabo buys compatible parts within budget; Priya reviews catalogue and resolves exceptions. Success: demonstrate listing → approval → buyer order → simulated EFT or eligible COD → dispatch → receipt → refund case. Two-week schedule is adopted from the manual as a planning assumption. No technical stack is selected here.

## Feature list
| ID | Role | Feature | Behaviour | Source | Priority |
|---|---|---|---|---|---|
| B1 | Buyer | Browse and search | Search model/part names; filter categories; approved products only | Thabo: compatible parts | P0 |
| B2 | Buyer | Product details | Photos, model, voltage, compatibility, contents, rand price and stock | Thabo: avoid wrong components | P0 |
| B3 | Buyer | Sign in and return | Sign in before cart; preserve intended action | Walkthrough: continue shopping after login | P0 |
| B4 | Buyer | Cart | Change quantities; remove items; recalculate totals | Thabo: fixed budget | P0 |
| B5 | Buyer | Checkout | Address/postcode, working-day estimate, fee, total; stock recheck | Walkthrough: last unit sold at counter | P0 |
| B6 | Buyer | Payment | Simulated EFT reference/status or eligible COD amount due | Thabo: EFT or COD; separate payment status | P0 |
| B7 | Buyer | Orders and receipt | Order history, manual tracking, receipt confirmation | Thabo: deadline and receipt confirmation | P0 |
| B8 | Buyer | Refund request | Delivered-item request with reason, optional image and status | Priya: compare complaint with ordered item | P0 |
| S1 | Seller | Listing editor | Create/edit specifications and photos; submit/resubmit for review; request delisting | Lerato: similar modules; Priya: listing/delisting review | P0 |
| S2 | Seller | Stock editor | Quick quantity adjustment; low stock; zero stock disables purchase | Lerato: counter and online sales | P0 |
| S3 | Seller | Fulfilment queue | Payment/fulfilment badges; pack; dispatch; manual tracking and lead time | Lerato: dispatch eligibility and timing | P0 |
| S4 | Seller | Refund cases | View assigned case and record returned-item receipt | Walkthrough: returned goods intake | P0 |
| A1 | Admin | Catalogue review | Approve/request changes; review delisting; maintain categories | Priya: catalogue review; Task 3 category convention | P1 |
| A2 | Admin | Order and refund management | Confirm simulated EFT; exceptions; refund decision and event timeline | Priya: resolve payment and refund exceptions | P1 |
| A3 | Admin | Sales dashboard | Date/seller filters; paid, pending and refunded rand amounts separately | Priya: weekly sales figures | P1 |

## User stories and acceptance
The accompanying 24-PRD-user-stories.md specifies all 12 P0 stories and three P1 summaries and is a normative part of this PRD.

## Non-functional targets
| Area | Proposed measurable requirement | Basis |
|---|---|---|
| Performance | With 100 seeded products, cold product-list load ≤3 seconds at 10 Mbps/150 ms latency; initial transfer ≤1 MB; measure median of 5 runs | Thabo: mobile data |
| Responsive | No horizontal page scrolling at 360, 390, 768 and 1366 CSS px; labels/buttons remain usable | Phone buyer and seller |
| Usability | Explicit field labels, field errors, keyboard focus, 44px main tap targets; status conveyed by text as well as colour | Lerato: quick phone editing |
| Security | Week 8: salted adaptive password hashing, authenticated API routes, server-side role and object-ownership checks; buyer requests to admin API return 403 | Priya's restricted duties |
| Integrity | Atomic stock reserve; retry-safe order creation; record status events; never dispatch unconfirmed EFT | Counter-sale walkthrough |

## Explicit exclusions
| Item | Reason | Cost if included |
|---|---|---|
| Real payment gateway | Demo payment meets teaching goal | Provider setup, webhooks, reconciliation and payment testing |
| Live courier integration | Manual tracking and configured estimate suffice | API onboarding, sync and failure handling |
| Language switching | English submission | Translation and cross-screen language testing |
| Flash sales/coupons | No baseline persona blocker | Discount stacking, expiry and pricing tests |
| Wishlist | No source-backed blocker | Extra storage/API/UI work reduces cart testing time |
| Automated payouts/tax accounting | Not a core teaching transaction | Ledger, settlement and accounting complexity |

## Proposed rules requiring review
One seller per checkout; rand prices; configured demo delivery fee and postcode eligibility; EFT reservation expires after 24 hours; accepted COD must dispatch within 2 working days or be flagged for admin cancellation review. Cancellation releases reserved stock once. Refund availability is shown for delivered items; the demo uses a configurable 7-day request window, not a legal policy. Refund approval and simulated refund completion are separate events. Real EFT transfers and real customer money must not be used in the demonstration.

## Requirement-source traceability
Persona source: current 21-persona-design-spec.md. Walkthrough sources: stock race, returned goods, overdue dispatch and resubmission recorded there. No screenshot-derived claims. This concise master uses companion files for detailed stories; the manual’s three-page target applies to the master summary, with page count dependent on export settings.
