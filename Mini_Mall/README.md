# Mini Mall

A mobile-first teaching marketplace for IT networking, robotics and mechatronics parts in South Africa.
It demonstrates a complete marketplace loop with three fictional personas:

| Persona | Role | Demo email | Demo password |
|---|---|---|---|
| **Lerato Mokoena** | Seller | `lerato@minimall.test` | `Seller123!` |
| **Thabo Dlamini** | Buyer | `thabo@minimall.test` | `Buyer123!` |
| **Priya Naidoo** | Administrator | `priya@minimall.test` | `Admin123!` |

A fourth seller, `sipho@minimall.test`, exists only as seeded fixture data so Priya's seller
filter is meaningful. Sipho is not one of the three personas.

The loop is:

> Lerato lists a part → Priya approves it → Thabo finds it and orders → simulated EFT or eligible
> cash on delivery → Lerato dispatches → Thabo confirms receipt → a refund case can be opened and
> decided → Priya sees separate paid, pending and refunded totals.

Everything is simulated. **No real money is transferred and no real courier is contacted.**

## IT and mechatronics catalogue

The demo includes six additional categories: IT routers, network switches, network cables,
mechatronics motors and actuators, mechanical parts, and control modules. Twelve approved demo
listings include Wi-Fi and wired routers, 5-port and 8-port switches, Cat6 cables, a stepper
kit, geared motors and wheels, a robot chassis, timing belts, relays and limit switches.
Prices and Mini Mall networking model codes are fictional teaching examples.

Starting the server adds missing demo items automatically. Existing listings, stock, orders,
category activation and moderation decisions are preserved. `npm run seed` also applies this
additive update without resetting the database. The update alone can be run with
`npm run seed:marketplace`; stop the local server first, or set `MONGO_URI` to the running
database so a second MongoDB process does not try to use the same data files.

## Product photos

Product images are real photographs stored locally in `client/public/images/photos/`.
Original sources, authors and license details are recorded in `sources.json` and linked
from the site's **Photo credits** page. Generic kits and fictional Mini Mall networking
models use representative photos; specifications and package contents remain demo data.
Startup replaces only the old seeded illustrations and preserves seller-uploaded images.
The optional `python scripts/download-product-photos.py` maintenance command downloads
missing originals and rebuilds the credits page (uses Windows' verified HTTPS client).

## Home page

The banner rotates through eight local component photographs in a shuffled order, with
pause, previous and next controls. Autoplay stops when the tab is hidden and starts disabled
when reduced motion is requested. Social icons open Twitter/X, Facebook, Instagram and
WhatsApp Web in a new tab. Their platform URLs are in `SOCIAL_LINKS` in `client/src/pages/Home.jsx`;
replace those URLs with shop profile links when available.

Social brand icons are from [Font Awesome Free](https://fontawesome.com/license/free),
with the original attribution and license in `client/public/images/social/`. Slideshow
controls use Lucide icons.

## What you need

- Node.js 18 or newer (this machine has Node 26)
- npm 7 or newer
- Internet access on the first start, so `mongodb-memory-server` can download its local MongoDB
  binary. After that, the app runs offline.

You do **not** need to install MongoDB separately. The server starts its own MongoDB process and
keeps its data in `Mini_Mall/data/`.

## First-time setup

Open a terminal in this folder (`d:\ai-coding-projects\Mini_Mall`):

```bash
npm install
```

That installs both the React client and the Express server because they are npm workspaces.

If you want to change the configuration first:

```bash
cp server/.env.example server/.env
```

The defaults work without a `.env` file.

## Run the app

```bash
npm run dev
```

- Browser app: <http://localhost:5173>
- API: <http://localhost:4000>

The first start downloads the MongoDB binary and seeds the demo data. Stop the app with `Ctrl+C`
in the terminal.

To run only one side:

```bash
npm run dev:server
npm run dev:client
```

## Sign in

Use `/auth` to sign in with an email and password, or choose **Create account**.
Buyers can register and shop immediately. Sellers register with a contact number and remain
signed out until the administrator approves their application under **Seller applications**.
The administrator can approve or decline an application, with a reason required for a decline.
Pending and declined sellers are blocked at login and on every authenticated server request.

Passwords use bcrypt hashes, are never returned by account APIs, and are not visible to the
administrator. New passwords must contain at least 12 characters and at most 72 UTF-8 bytes.
Administrator accounts cannot be created through public signup. The local administrator is
`priya@minimall.test` with password `Admin123!`; the other existing demo accounts remain in
the table above. Existing seeded sellers remain approved when upgrading the database.

Password-free demo access is disabled by default (`DEMO_LOGIN=false`) and there are no public
persona credentials or one-click login buttons in the app. Keep this setting disabled when
using buyer registration and seller approval. Email verification and password recovery are
not part of this local demo.

Role and record ownership are checked by the server, not only hidden in the interface. For
example, a buyer request to an administrator endpoint receives **403**.

## Suggested demonstration

1. **Lerato (seller)** → *My listings* → **New listing**. Save a draft, add the missing voltage,
   connector and other required fields, then **Save and submit for review**.
2. **Priya (admin)** → *Catalogue* → approve the new listing, or request a correction and watch
   Lerato see the feedback in her workspace.
3. **Thabo (buyer)** → *Products* → search for a model such as `L298N`, check the specifications,
   add it to the cart and change the quantity.
4. **Checkout** with postcode `2001` (COD is available) and then with `9000` (COD is refused and
   EFT remains). Place an EFT order and try a failed simulated payment followed by a retry.
5. **Priya** → *Orders & refunds* → confirm the simulated EFT. **Lerato** can now dispatch with a
   tracking number. A COD order can be dispatched while its payment is still due on delivery.
6. **Thabo** → open the order → confirm receipt. The parcel becomes delivered but COD is **not**
   marked paid. **Lerato** records the cash collection separately.
7. On a delivered item, **Thabo** requests a refund with a reason and optional image. **Priya**
   approves or rejects it with a reason. If approved, **Lerato** records the returned item, and
   **Priya** completes the simulated refund.
8. **Priya** → *Statistics* → use the date presets and seller filter. Paid, pending and refunded
   amounts are shown separately.

Seeded orders already cover each state, so you can demonstrate any step without starting from the
beginning.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the API and the Vite web app together |
| `npm run dev:server` | Start only the API on port 4000 |
| `npm run dev:client` | Start only the web app on port 5173 |
| `npm run seed` | Seed an empty database or add missing IT and mechatronics demo items |
| `npm run seed:marketplace` | Add only the IT and mechatronics demo items, preserving existing data |
| `npm run seed:reset` | Delete and rebuild all demo data |
| `npm run test` | Run the server integration tests |
| `npm run build` | Build the React app into `client/dist` |
| `npm start` | Start the API and serve the built client (run `npm run build` first) |

## How the project is organised

```
Mini_Mall/
  server/
    src/app.js             Express routes and static file serving
    src/index.js           starts the API, database and seed check
    src/db.js              real MongoDB URI or auto-started local MongoDB
    src/config.js          delivery fees, COD postcodes, expiry and refund rules
    src/models/            mongoose models
    src/services/          stock, cart, order, refund and statistics rules
    src/routes/            auth, catalogue, cart, orders, refunds, seller, admin, uploads
    src/seed/seed.js       the three personas and the demo orders
    tests/                 integration tests with an in-memory MongoDB
  client/
    src/pages/             the 15 baseline pages
    src/components/        layout, navigation, badges, cards, timeline, route guard
    src/context/           sign-in and toast state
    src/styles/            mobile-first light/dark stylesheet
    public/images/         local SVG product illustrations
  data/                    local MongoDB files (ignored by git)
```

The API uses an httpOnly JWT cookie, bcrypt password hashes and server-side role/ownership
checks. Order totals are stored in integer cents. Payment and fulfilment statuses are stored
separately and every change is appended to an order or refund timeline.

## Demo rules

These defaults are configuration, not claims about South African law:

- Rand prices; delivery fee R50 in major areas and R75 for outlying postcodes.
- Working-day delivery estimate based on the postcode.
- COD is accepted only for the demo postcodes in `server/src/config.js`.
- EFT reservations expire after 24 hours and release stock once.
- COD orders not dispatched within 2 working days are flagged as overdue.
- Refunds are item-level, available for 7 days after delivery.
- One seller per checkout. A mixed-seller cart is blocked with an explanation.
- Refund approval, returned-item receipt and the simulated refund are separate events.

Reviews, wishlists, coupons, real payment gateways and courier
integration are deliberately out of scope, matching the design pack.

## Tests

The tests use their own temporary MongoDB, so your demo data is untouched:

```bash
npm run test
```

They cover role/ownership 403s, listing review and approval, stock-race checkout, mixed-seller
checkout, COD eligibility, failed-EFT retry, dispatch gating, receipt idempotency, separate COD
collection, EFT expiry, refund eligibility and steps, and separate dashboard totals.

## Reset or move the data

- Rebuild the demo data: `npm run seed:reset`
- Start completely fresh: stop the app, delete `Mini_Mall/data/`, then start it again.
- Use an existing MongoDB instead of the auto-started one: set `MONGO_URI` in `server/.env`.
- Keep password-free demo sign-in disabled: use `DEMO_LOGIN=false` (the default).

## Troubleshooting

| Problem | What to do |
|---|---|
| Port 4000 or 5173 is already in use | Stop the other process, or change `PORT` and the Vite proxy port |
| First start is slow or fails while downloading MongoDB | Check the internet connection and rerun `npm run dev`; or set `MONGO_URI` to a real MongoDB |
| An old process still holds the data folder | Stop all Node processes, then start again. The local database recovers its files on the next start. |
| I changed the seed and want to see it | Run `npm run seed:reset` while the server is stopped, then start the server |
| I want a production build | `npm run build` then `npm start`; set a long random `JWT_SECRET` first |

## Design source

The personas, 15 features, page tree and acceptance rules come from the pack in
`../Mini_Mall_Task_1_Rounds/` and `../Mini_Mall_Tasks_2_3_4/`. The most useful files are:

- `25-PRD-v1.md` and `24-PRD-user-stories.md`
- `07-Page-Tree.md` and `11-Navigation-and-Architecture-Notes.md`
- `05-flow-explanation-document.md`
- `21-persona-design-spec.md`, `12-persona-seller.md`, `13-persona-buyer.md`,
  `14-persona-administrator.md`

The application is a teaching demonstration, not a production marketplace.
