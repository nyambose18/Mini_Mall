# Round 8 · Scenario walkthrough

## Lerato, seller
I create an L298N listing on my phone [Create listing]. I add the model, voltage and connections and send it for review [Submit listing]. Priya requests one correction, so I edit and resubmit it [Review feedback and edit listing]. After approval and a counter sale, I adjust the available quantity [Stock editor]. Thabo's EFT order appears, but I wait until payment is confirmed [Order queue]. Once the order becomes ready to dispatch, I pack it, enter the tracking number and mark it dispatched [Shipping and tracking].

## Thabo, buyer
I search for a motor driver on my phone [Search]. I check the specifications and add one to my cart [Product detail and cart]. I enter my postcode and see the total and a working-day delivery estimate [Delivery estimate and checkout]. I select EFT, place the order and copy its reference [Order placement and EFT]. I check that payment is confirmed and track the shipment [Order history and tracking]. When I open the parcel and check the item, I confirm receipt [Confirm receipt]. If the motor driver is faulty, I can open an item-level refund request from that order [Request refund].

| Breakpoint | Missing decision or interface | Proposed project decision |
|---|---|---|
| Reviewer returns the listing | Seller needs a correction reason and resubmission path | Add reviewer feedback and resubmission |
| Counter sale uses the last unit while the buyer is checking out | Cart stock can become stale | Recheck stock at order placement and explain any quantity change |
| EFT remains pending | Seller needs a clear release rule | Allow dispatch after confirmed EFT or accepted eligible cash on delivery |
| A postcode is ineligible for cash on delivery | Buyer needs to know before committing | Check at checkout and offer EFT when available |
| A cash-on-delivery order misses its dispatch estimate | Buyer and admin need a way to act | Flag overdue dispatch for admin follow-up and surface status to the buyer |
| Faulty return reaches the seller | Admin needs evidence of receipt | Record seller acknowledgement against the refund case |
