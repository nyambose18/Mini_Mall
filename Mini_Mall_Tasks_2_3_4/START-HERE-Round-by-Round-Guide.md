# Mini Mall · Tasks 2, 3 and 4 · Every round explained

Prepared 17 November 2026. Based on Day1_Training_Manual_EN(1).md and the current 21-persona-design-spec.md. English throughout; robotics/electronics context retained.

This is a completed proposed design pack, not a claim that you personally approved each checkpoint. The competitor screenshot exercise is not verified because no screenshot was provided. Exact diagrams use a deterministic renderer; the manual’s generative-image/image-reading exercise is adapted. Suggested takeaways are drafts for you to personalise.

## Task 2

### Round 1 · Context
Use existing personas; propose developer/instructor audience, two-week plan, no stack selection. These answers are assumptions for review.

**Why this round matters:** Constraints prevent generic output.

### Round 2 · Competitor evidence
Document missing screenshot and proposed comparison criteria. No screenshot observation is claimed.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 3 · Source-based features
List 15 modules with specific persona/walkthrough/manual sources; keep unsupported ideas separate.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 4 · Priorities
Propose 12 P0 buyer/seller UI modules and 3 P1 admin modules; distinguish fixture UI from week-8 backend.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 5 · Stories
Write 12 Given–When–Then stories plus failure cases and 3 short P1 summaries.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 6 · Complete PRD
Specify measurable targets, access control, stock integrity, exclusions and demo configuration.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 7 · One-pager
Render all 15 IDs, priority legend, exclusions and metrics; retain draft.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 8 · Quality review
Check counts and priorities; record deterministic-render adaptation and final poster.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 9 · Change/reflection
Reject wishlist for v1 with source and cost reasoning; record lessons.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

## Task 3

### Round 1 · Conventions
Public browse, authenticated cart/orders, separate admin, maximum 3 conceptual levels; role-restricted seller workspace.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 2 · Candidates
Retain 15 route templates; cut wishlist/coupons; merge category/search and footer content.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 3 · Text hierarchy
Document paths, permissions, elements and transactional links before drawing.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 4 · Navigation
Choose Home/Products/Cart/Account mobile tabs and role-specific work menus.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 5 · Sitemap draft
Render hierarchy with public/authenticated/admin colours and explicit seller labels.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 6 · Review
Find missing mobile annotation; check table/source page count.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 7 · Repair/recheck
Add mobile annotation; retain 15 baseline routes and editable sources.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 8 · Review change
Add Review editor as route 16; embed display in product details; moderation tab stays inside existing admin page.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 9 · Notes/reflection
Explain entry relationships, route versus tab, and limited local effect of change.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

## Task 4

### Round 1 · Context
Propose buyer/seller/system diagram, public browsing, cart login, simulated money and refund channel.

**Why this round matters:** Constraints prevent generic output.

### Round 2 · Text flow
Write seven stages with actors, exception handling and off-diagram admin ownership.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 3 · Draft diagram
Render overview first; retain draft for comparison.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 4 · Review
Identify compact payment abstraction and need for explicit decision/return labels.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 5 · Repair
Separate EFT result and failed/pending branch; retain stock return and rejected refund.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 6 · Recheck
Compare corrected topology to text; document compact overview limits.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 7 · COD change
Add eligible/rejected COD path locally; distinguish acceptance from cash collection.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 8 · Explanation
Document final flow, terminology, reservation rules, retries and return intake.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

### Round 9 · Reflection
Explain text-first workflow, limits of diagrams and three suggested takeaways.

**Why this round matters:** It checks the previous decision before the next artifact makes it harder to change.

## Pack consistency and limits
PRD baseline: 15 modules (12 P0, 3 P1). Page baseline: 15 route templates; isolated reviews variant: 16. Business flow: 7 stages; final diagram has 11 meaningful nodes. AI assistant is not baseline scope. COD is baseline business scope but introduced in the flow exercise as the manual's before/after stress test. Admin is intentionally abstracted out of the flow picture, not out of the system.

Read first: 25-PRD-v1.md, 07-Page-Tree.md and 05-flow-explanation-document.md. Give these plus the stories and your original personas to your VS Code coding assistant. Start with seller listing → admin approval → buyer product detail, using fixtures first; commit the documents before application development. This pack contains planning artifacts, not a running application.
