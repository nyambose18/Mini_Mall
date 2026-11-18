# Task 2 · Round 5 · User stories

## B1 · Browse and search
As a buyer, I want to find the correct board without unrelated listings, so that I can meet the need recorded in the source: Thabo: compatible parts.

**Given** an approved Arduino Uno and an unapproved sensor exist, **when** Thabo searches Arduino, **then** only approved matching products appear; category filtering can narrow results.

## B2 · Product details
As a buyer, I want to verify compatibility before spending my budget, so that I can meet the need recorded in the source: Thabo: avoid wrong components.

**Given** an approved L298N has voltage, compatibility and contents, **when** Thabo opens its detail page, **then** all supplied specifications, price in rand and stock are visible before Add to Cart.

## B3 · Sign in and return
As a buyer, I want to continue my purchase after signing in, so that I can meet the need recorded in the source: Walkthrough: continue shopping after login.

**Given** Thabo is signed out on a product page, **when** he chooses Add to Cart and successfully signs in, **then** he returns to that product and the intended single addition is applied once.

## B4 · Cart
As a buyer, I want to keep quantities within my budget, so that I can meet the need recorded in the source: Thabo: fixed budget.

**Given** the cart holds two R100 boards, **when** Thabo changes quantity to three, **then** subtotal becomes R300; removing the line makes subtotal R0.

## B5 · Checkout
As a buyer, I want to avoid ordering unavailable stock and see delivery costs, so that I can meet the need recorded in the source: Walkthrough: last unit sold at counter.

**Given** the cart contains the last sensor but its stock has become zero, **when** Thabo submits checkout, **then** no order is created; the affected item is identified and totals refresh.

## B6 · Payment
As a buyer, I want to understand EFT instructions or cash due on delivery, so that I can meet the need recorded in the source: Thabo: EFT or COD; separate payment status.

**Given** EFT is selected for a R350 order, **when** Thabo submits the order, **then** a unique demo reference and Awaiting EFT status appear; dispatch remains blocked until confirmation.

## B7 · Orders and receipt
As a buyer, I want to see progress and confirm arrival before my practical, so that I can meet the need recorded in the source: Thabo: deadline and receipt confirmation.

**Given** an order is dispatched, **when** Thabo opens it and confirms receipt, **then** manual tracking remains visible and fulfilment becomes Delivered; an already completed confirmation creates no duplicate event.

## B8 · Refund request
As a buyer, I want to report a faulty or incorrect part and follow the case, so that I can meet the need recorded in the source: Priya: compare complaint with ordered item.

**Given** a delivered order item belongs to Thabo, **when** he submits a refund request with a reason, **then** a linked case appears as Requested; another buyer cannot view or amend it.

## S1 · Listing editor
As a seller, I want to publish accurate component data and correct review feedback, so that I can meet the need recorded in the source: Lerato: similar modules; Priya: listing/delisting review.

**Given** Lerato has a draft with missing voltage, **when** she submits it, **then** submission is blocked with a field message; a complete resubmission goes to review and is not public until approved.

## S2 · Stock editor
As a seller, I want to prevent selling the same last unit twice, so that I can meet the need recorded in the source: Lerato: counter and online sales.

**Given** Lerato owns a product with stock one, **when** she changes stock to zero, **then** the product becomes unavailable for purchase; negative quantities are rejected.

## S3 · Fulfilment queue
As a seller, I want to dispatch only orders eligible for fulfilment, so that I can meet the need recorded in the source: Lerato: dispatch eligibility and timing.

**Given** an order has unconfirmed EFT, **when** Lerato attempts dispatch, **then** dispatch is blocked; an accepted eligible COD order may dispatch with payment Due on Delivery.

## S4 · Refund cases
As a seller, I want to tell operations when returned goods arrive, so that I can meet the need recorded in the source: Walkthrough: returned goods intake.

**Given** Lerato owns a refund case awaiting return, **when** she records return receipt, **then** the case timeline records receipt; it does not mark money as refunded automatically.

## Additional payment and checkout acceptance cases
- Given COD is unavailable for the postcode, when COD is selected, then submission is blocked with the reason and EFT remains available.
- Given a demo payment fails, when the system displays the failure, then the buyer can retry the same order without duplicate orders or reservations.
- Given a checkout for R300 of items with R50 delivery, when the summary opens, then R350 and the configured working-day window appear before submission.
- Given the basket spans sellers, when checkout is attempted, then the teaching MVP requests separate seller checkouts; no mixed-seller order is created.

## P1 summaries
A1: Priya reviews products/delisting and maintains categories.
A2: Priya confirms simulated payments, investigates orders and decides refund cases with recorded reasons.
A3: Priya views separate paid, pending and refunded amounts with date/seller filters.
These are elaborated during week 8; they are not represented as completed test specifications.

## Acceptance review
All 12 P0 features have observable criteria. Week 7 uses fixtures; week 8 repeats these against persistent role-protected APIs. Test stock concurrency with two checkout submissions for one unit: at most one succeeds. Proposed deadlines/eligibility rules below require owner review; they are configuration, not claims about South African law.
