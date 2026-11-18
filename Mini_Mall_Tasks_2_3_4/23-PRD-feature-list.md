# Task 2 · Rounds 3–4 · Feature list

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

Priority is delivery order, not business importance. P0 means week 7 visible buyer/seller screens using fixtures. P1 means week 8 working admin console and backend enforcement for all screens. A P0 screen does not make its underlying transaction secure or persistent in week 7.

Proposed adjudication: keep visible buyer/seller workflows P0; admin operations P1. Promoting admin to week 7 would take time from cart/checkout and role workflow demonstrations. Category maintenance is explicitly sourced to the manual's Task 3 convention, not invented as a persona quote.

No unverified competitor evidence is used. AI guide, recommendations and ratings are candidate changes, not baseline requirements. The manual assigns AI integration P1 if chosen; no persona blocker currently justifies a standalone assistant. Wishlist and coupons remain excluded. Ratings are introduced only in the Task 3 change exercise.

Coverage: seven buying stages covered by B1/B2, B4, B5, B6, S3, B7, B8. Seller review/resubmission S1, stock S2, returned goods S4; all administrator duties A1–A3. Source spot checks: B2 maps to Thabo's compatibility need; S2 to Lerato's counter sales; A3 to Priya's separate paid/pending/refund totals. 15 features = 12 P0 stories + 3 P1 summaries.
