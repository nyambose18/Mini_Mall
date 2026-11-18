# Round 9 · Persona Design Specification

## Seller
Lerato runs an electronics shop in Germiston.
She needs accurate specification fields and quick mobile stock editing.
Her order queue needs dispatch eligibility, tracking and access to refund cases.

## Buyer
Thabo is a Johannesburg TVET robotics student who shops on mobile.
He needs compatible parts, a rand total and a delivery estimate before placing an order.
He needs EFT or eligible cash on delivery, tracking, receipt confirmation and refunds.

## Administrator
Priya manages marketplace operations and uses a laptop plus mobile triage.
She reviews listings and delisting requests, resolves order exceptions and decides refund cases.
She uses a sales dashboard with paid, pending and refunded amounts shown separately.

## Inputs for the PRD
- Require technical specs at listing time and reuse them on the product and review screens.
- Recheck stock at order placement and show the postcode-based delivery estimate in working days.
- Show payment and fulfilment separately. Confirm EFT before dispatch, or release eligible orders accepted for cash on delivery.
- Give sellers a resubmission path after listing feedback.
- Flag overdue dispatch and record returned-item receipt against the refund case.

## Retrospective
Seller-first exposed the product data, available stock and dispatch timing that the buyer and administrator depend on. In Round 2 the image anchored a fictional context. In Round 7 the rendered image itself was the artifact to inspect against approved copy. A text-only model could draft persona copy and an audit checklist, but would need a description or image-capable support to inspect visual details, typography and layout.

1. Supply the business flow, the local constraints and the intended design decisions before asking for a persona.
2. Require separate observation and inference labels, plus an explicit feature mapping for each pain point.
3. Supply approved card copy beside the rendered image. Ask the reviewer to report omissions, contradictions and legibility issues by severity before revising.

## Suggested personal takeaways
I learned that a persona detail should help me decide what to build or how it should work.
I learned that a reference image can suggest a setting, while business assumptions still need validation.
I learned that acting out a purchase uncovers handoffs and exceptions that a feature list can miss.
