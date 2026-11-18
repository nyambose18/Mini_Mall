# Task 3 · Round 9 · Navigation and reflection

The baseline has 15 route templates, becoming 16 in the isolated reviews change exercise. Storefront (including seller workspace) and Admin Backend are separate sections. The conceptual hierarchy stays within three levels while contextual links connect transactional tasks.

| Surface | Entries | Access behaviour |
|---|---|---|
| Desktop storefront | Home, Products, Cart, Account; Seller workspace for sellers | Cart triggers login if needed; Account shows Orders after login |
| Footer | Help, About, delivery/payment explanation | Inline footer content, no extra pages |
| Mobile tabs | Home, Products, Cart, Account | Four stable destinations; Categories are a filter within Products |
| Seller menu | Products, Orders | Seller role; owners' records only |
| Admin sidebar | Catalogue, Orders & refunds, Statistics | Separate entry; admin only |

Cart is a frequent stable destination and a continuing task across products. Product details depends on a selected product, so it belongs inside browsing rather than a permanent tab. On phones the seller menu is collapsible; admin sidebar becomes a labelled menu. Preserve tap targets and textual status badges.


## Entry relationships
| Entry | Target | Trigger |
|---|---|---|
| Product list | Product details | Select a product |
| Product details | Auth then Cart | Add to Cart while signed out |
| Cart | Checkout | Choose checkout with nonempty cart |
| Checkout | Order details | Stock and eligibility checks pass |
| Orders | Order details | Select own order |
| Delivered order item | Refund case | Submit eligible refund request |
| Delivered order item | Review editor | Change exercise only; eligible unreviewed item |
| Seller products | Editor | Create or edit owned product |
| Admin catalogue | Seller feedback | Request changes; seller sees feedback in workspace |

## Round 8 · Isolated review change
Add one authenticated buyer page: Review editor /orders/:id/items/:itemId/review. It supports one review per delivered purchased item, a 1–5 rating and optional comment; submit returns to Order details. Embed the read-only rating/review block in Product details; hide aggregate ratings when there are no reviews. Add a moderation tab inside existing Admin catalogue, with hidden/published state. No standalone review list/detail pages are necessary for a small catalogue.
Baseline remains 15 pages; changed architecture is 16. Review creation, persistence and moderation are proposed P1 after change approval, and are not silently added to PRD v1. This resolves the manual's change exercise without pretending the baseline scope already included reviews.

## Retrospective
Candidate-first exposes options and merges before a polished diagram discourages changes; a direct page tree is faster but can conceal unnecessary routes. Rendered diagrams support spatial inspection; reading them checks colours, missing boxes and crossing lines. Exact topology here is rendered from explicit source rather than image generation, so this is an adapted diagram workflow, not a completed generative-image experiment.
Principles: stable global destinations; contextual task actions; server-enforced permissions. Prompt advice: supply access rules; require merge/cut reasoning; compare explicit page counts before/after changes.
Suggested takeaways: I can distinguish a route from a tab. I can justify Cart in mobile navigation. I can add reviews without rebuilding the whole page tree.
