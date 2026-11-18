# Task 4 · Rounds 7–8 · Final flow explanation

Buyers browse publicly and sign in at cart entry. Checkout reserves stock and shows the full rand total and working-day estimate. Confirmed simulated EFT or accepted eligible COD releases an order for seller dispatch. Receipt and payment collection remain separate, followed by an optional refund case.

| Step | English label | Actor | Action | Exceptions |
|---|---|---|---|---|
| 1 | Browse products | Buyer | Public list/detail | No results: adjust filters; unavailable: disable purchase |
| 2 | Add to Cart | Buyer/System | Authenticate and add quantity | Signed out: sign in and resume; unavailable: show stock message |
| 3 | Place order | System | Validate address, total and atomic stock reservation | Stock shortage: return to cart; invalid address: correct fields |
| 4 | Payment | Buyer/System | Baseline simulated EFT; final EFT or COD eligibility | EFT failure: system offers retry; COD rejected: offer EFT |
| 5 | Seller ships | Seller | Pack eligible order and record tracking | Unconfirmed EFT: block; overdue dispatch: flag for review |
| 6 | Confirm receipt | Buyer | Record delivered event | Parcel missing: report issue; confirmation must not manufacture COD collection |
| 7 | Refund channel | Buyer/System | Create request; route case decision | Reject: show reason and support route; approve: return/intake then simulate refund |

## Final payment branch
EFT: Awaiting EFT → failed/pending (retry or expiry), or Confirmed → dispatch permitted.
COD: postcode/order eligibility rejected → choose EFT or cancel; accepted → payment Due on Delivery and dispatch permitted. At delivery, record simulated cash collection separately; failed collection keeps payment outstanding and flags exception, rather than marking Paid merely because a parcel was dispatched. The diagram's COD node refers to eligibility acceptance, not money received.

## Terminology (English-only adaptation)
| Diagram label | Meaning |
|---|---|
| Browse | Search/list and inspect approved products |
| Add to Cart | Authenticated quantity selection |
| Place order | Validate and atomically reserve stock |
| Payment route | Select and validate EFT or COD |
| EFT result | Confirmed or failed/pending simulated payment |
| COD accepted? | Delivery/order eligibility, not collection |
| Seller ships | Eligible order dispatched with manual tracking |
| Confirm receipt | Buyer records delivery; payment recorded separately |
| Refund decision | Optional case; recorded off-diagram admin decision |
| Closed case | Decision and next steps recorded; no real transfer |

Rules beyond the picture: server enforces role/ownership and reservation expiry; retries and status changes must be idempotent. Admin reviews and real courier/payment operations are intentionally abstracted. Refund approval may require return receipt; simulate completion only after the applicable return rule. No refund request leaves a delivered order completed without a case.
