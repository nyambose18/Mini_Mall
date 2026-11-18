# Task 4 · Round 2 · Baseline flow

| Step | English label | Actor | Action | Exceptions |
|---|---|---|---|---|
| 1 | Browse products | Buyer | Public list/detail | No results: adjust filters; unavailable: disable purchase |
| 2 | Add to Cart | Buyer/System | Authenticate and add quantity | Signed out: sign in and resume; unavailable: show stock message |
| 3 | Place order | System | Validate address, total and atomic stock reservation | Stock shortage: return to cart; invalid address: correct fields |
| 4 | Payment | Buyer/System | Baseline simulated EFT; final EFT or COD eligibility | EFT failure: system offers retry; COD rejected: offer EFT |
| 5 | Seller ships | Seller | Pack eligible order and record tracking | Unconfirmed EFT: block; overdue dispatch: flag for review |
| 6 | Confirm receipt | Buyer | Record delivered event | Parcel missing: report issue; confirmation must not manufacture COD collection |
| 7 | Refund channel | Buyer/System | Create request; route case decision | Reject: show reason and support route; approve: return/intake then simulate refund |

Baseline diagram is the teaching exercise's online-only simulated EFT path. Final R7 restores COD already required by our personas; it is a comparison exercise, not a new discovery. Shown lanes are Buyer, Seller and System. Administrator remains the actual refund adjudicator and payment/exception operator in the requirements; System nodes represent the recorded result of these off-diagram decisions. A system node does not imply automatic refund rejection.

Proposed checkpoints: public browsing; login at cart; one seller per order; atomic stock reservation; confirmed demo EFT before dispatch; record payment and fulfilment separately. Stock failure returns to Cart. Failed simulated payment offers a retry on the same order; the buyer chooses whether to retry. Refund rejection leaves the order delivered with a rejected case and visible reason.
