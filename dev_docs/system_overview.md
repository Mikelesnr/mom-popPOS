# System Design Document: Mom&Pop POS
*Revision 2 — reflects the provisioned database and the account/onboarding flow*

## 1. Executive Metadata & Deployment Constraints
* **Lead Engineer:** Michael N. Mwanza
* **Target Region/Context:** SADC Region (Primary operational parity mapping: Harare, Zimbabwe)
* **Architecture Strategy:** High-Performance Modern Monolith (Laravel 11.x Backend Engine + React Native Client Edge Store)
* **Design Core:** Multi-tenant structural data isolation combined with a strict ledger-first auditing layer.
* **Offline Resiliency:** Network-agnostic edge state continuity using an embedded client SQLite container.

---

## 2. Infrastructure & Local Development Lifecycle
To optimize system resources for a solo developer, the environments are completely decoupled across OS bounds while maintaining exact schema and logical parity:
* **Primary Productivity Workspace (Linux/Ubuntu):** Native execution of the headless Laravel monolithic framework API. The structural database engine relies on a lightweight, isolated containerized Docker MySQL instance rather than a heavy background service.
* **Gaming/Administrative Dual Configuration (Windows):** Maintained using symmetric version-controlled branch tracking. Development continuity is guaranteed through cross-branch git pulls and clean reverse merges back to `main`.
* **Database Migration & Network Sync:** Primary keys (`id`) across all ledger and master catalog records use `UUIDv4` tokens generated natively on the React Native edge client. This prevents relational mapping collapse, primary key collision, or duplication during micro-batch synchronization over unstable mobile infrastructure (e.g., Econet/NetOne).

---

## 3. Account Hierarchy & Roles

Every `users` row belongs to exactly one tier. `shop_id` is nullable specifically to support the two tiers that sit *above* an individual storefront:

| Role | `shop_id` | Can create | Notes |
|---|---|---|---|
| **System Admin** | `NULL` | — | Platform-level. Not shop-scoped, not tied to any tenant. |
| **Owner** | `NULL` | Shops, Shop Managers | Created at signup. Can hold equity across many shops via `shop_owners`. Not meant for daily operational use. |
| **Shop Manager** | set | Other Shop Managers, Managers, staff | The account an owner should actually work from day-to-day. First one is created by the Owner during shop setup. |
| **Manager** | set | Staff accounts (cashiers, bartenders, servers) | Scoped to one shop. Can adjust catalog/pricing per existing user stories. |
| **Staff** (Cashier / Bartender / Server) | set | — | Runs shifts, tabs, and checkouts. |

**Design rule:** an Owner account is intentionally kept separate from operations. Once the first Shop Manager account exists for a shop, the Owner is expected to log out of the Owner account and log back in as the Shop Manager for all routine work — the Owner login stays reserved for cross-shop admin tasks (adding shops, adding co-owners, high-level reporting).

`users.role` is currently a free-text `VARCHAR`, not a DB-level enum (unlike `expenses.type`, which is). Worth deciding whether to lock the role column down to an enum or a lookup table once the role set above is final, so a typo in application code can't silently create an unrecognized role.

---

## 4. Onboarding & Authentication Flow

### 4.1 First-Time Setup (Owner)
1. **Sign up** — a person registers a new Owner account (`users` row, `shop_id = NULL`, `role = 'owner'`).
2. **Create a shop** — the Owner creates a `shops` row (name, type, geofence lat/long/radius). The `shop_owners` bridge row is created linking the Owner to this shop.
3. **Create the first Shop Manager account** — still logged in as Owner, they create a `users` row with `shop_id` set to the new shop and `role = 'shop_manager'`, with a real username/password.
4. **Log out / log in as Shop Manager** — the Owner explicitly logs out of the Owner session and logs back in with the Shop Manager credentials. This is the account they should use going forward for day-to-day work.

### 4.2 Delegated Staff Creation
From the Shop Manager account:
* Can create additional **Shop Manager** accounts (peer-level).
* Can create **Manager** accounts.
* Can create **Staff** accounts (Cashier / Bartender / Server), each scoped to the same `shop_id`.

Managers, in turn, can create Staff accounts but not other Managers or Shop Managers — matching the existing "Manager can update catalog/pricing" story without granting account-creation upward.

### 4.3 Device Pairing (already implemented)
This is the mechanism that lets a physical terminal skip full login after the first time:

1. **First login on a device** requires full credentials (username + password) for any account that has a non-null `shop_id`.
2. On successful login, the client **caches `shop_id` in local device storage**. This effectively "pairs" that device to that shop.
3. **Every subsequent login on that device** shows a **4-digit PIN pad** instead of the username/password form. The client sends the PIN along with the cached `shop_id`; the server looks up a `users` row matching `(shop_id, pin)` within that shop.
4. Owner and System Admin accounts (`shop_id IS NULL`) are excluded from this flow by definition — there's no shop to cache, so they always authenticate with full credentials.

This means, functionally, **a device becomes bound to one shop the first time any shop-scoped account logs into it.** Any staff member working that physical terminal afterward authenticates with PIN only, scoped to whichever shop is cached.

A couple of implementation details worth locking down explicitly, since they're security-relevant and not really optional:
* **PIN uniqueness** should be enforced *per shop* (two staff at the same shop can't share a PIN), not globally — otherwise PIN lookup is ambiguous.
* **Rate limiting / lockout** on the PIN pad is worth having, since a 4-digit PIN is a much smaller search space than a password — even scoped to one shop, this is a "few thousand tries" attack.
* **Re-pairing / clearing a device** — worth having an explicit "log out and forget this shop" action (clears the cached `shop_id`) for cases like a device being repurposed, sold, or lost.

### 4.4 Welcome / Login Screen States
The redesigned welcome page needs to branch on **whether this device has a cached `shop_id`**, not on account type:

| Device state | Screen shown | Fields |
|---|---|---|
| No cached `shop_id` (fresh device, or Owner/Admin flow) | Full login | Username or email + password |
| No cached `shop_id`, no account yet | Sign up | New Owner registration |
| Cached `shop_id` present | PIN login | 4-digit PIN pad only, shop name/logo shown for confirmation |
| Cached `shop_id` present, user wants to log in as Owner/Admin from this device | "Use a different account" link off the PIN screen | Falls back to full login |

That last row matters: an Owner may occasionally need to log into a paired shop terminal with their Owner account (e.g., troubleshooting on-site). The PIN screen shouldn't be a dead end — it needs an escape hatch back to full credential login without wiping the device pairing.

---

## 5. Core User Stories & Operational Context

### 5.1 Business Owners & Multi-Tenancy
* **Account Bootstrapping:** As a new Business Owner, I can sign up, create my first shop, and create the initial Shop Manager account for that shop in one connected flow, then hand day-to-day operation off to the Shop Manager login.
* **Multi-Store Management:** As a Business Owner, I can register multiple physical shops and link co-owners or equity partners to my storefront portfolios, allowing unified administrative oversight across operations.
* **Menu/Catalog Control:** As a Manager, Shop Manager, or Business Owner, I can update base product listings, cost margins, and selling retail prices, forcing instantaneous catalog distributions down to the edge registers.

### 5.2 Shop Managers
* **Delegated Staffing:** As a Shop Manager, I can create additional Shop Manager, Manager, and Staff accounts for my shop, so the Owner doesn't need to be involved in day-to-day staffing changes.
* **Operational Home Base:** As a Shop Manager, I perform routine store operations from this account rather than the Owner account, keeping the Owner login reserved for cross-shop administration.

### 5.3 Shift Workers & Cashiers
* **Fast Device Login:** As a Staff member on a shop's paired terminal, I log in with a 4-digit PIN rather than typing a username and password each shift.
* **Isolated Session Check-In:** As a Cashier, I can open a dedicated shift terminal session at my assigned physical shop, establishing an absolute tracking timeline for my individual operational actions.
* **Geofenced Accountability:** As a Cashier, my check-in attempt will be rejected if my device's spatial location does not align within the shop's strict geofence radius, ensuring staff are physically on-site.
* **Blind Closing Audit:** As a Cashier closing out a session, I must manually tally the physical currency and verify my digital wallet statements (EcoCash, OneMoney, Swipe, Cash) and enter them blindly into the terminal without knowing the system's exact internal tally. This protects the ledger from targeted manual adjustments.

### 5.4 Hospitality Operations
* **Flexible Table Tabs:** As a Bartender or Server, I can open running transaction tabs bound directly to named tables or customer counters, allowing items to be safely added incrementally over a duration before a checkout payment is selected.
* **Volumetric Drink Tracking:** As a Bartender, I can log fluid hospitality inventory levels by placing open liquor bottles on a digital mass scale. The system converts gross weight grams back to fluid milliliters based on tare metrics to accurately detect shot-pour variances.

---

## 6. Architectural Rules & Operational Guardrails

### 6.1 Ledger-First Immutability
Mom&Pop POS functions as an absolute digital ledger. All successful checkouts recording Cash, EcoCash, Swipe, or OneMoney balances are written as immutable transaction lines. The backend completely excludes integration with active client-side payment gateways during operational runs, serving as a clean terminal recorder for statement-matched processing.

### 6.2 Fractional Units & Volumetrics
* **Kitchen & Bulk Retail Partials:** Quantities are recorded using strict `DECIMAL(10,3)` precision fields, preserving precise tracking data down to fractions of a unit (e.g., writing off `0.350 kg` of a bulk product).
* **Fluid Asset Scales:** Open hospitality inventory evaluates mass data using linear tare-to-gross subtraction formulas to calculate current fluid milliliter metrics dynamically.

### 6.3 Shop Deletion & Data Lifecycle
Deleting a shop is a deliberate two-stage process, not an immediate hard delete:
1. **Disable** — the shop is marked disabled (not deleted). It stops appearing for operational use, but every record tied to it (staff, shifts, orders, tabs, waste logs, catalog) stays intact and reversible.
2. **30-day grace window** — if the Owner changes their mind within that window, the shop can be re-enabled with everything intact.
3. **Purge** — after 30 days, a cleanup job hard-deletes the shop, cascading through everything tied to `shop_id` — **except** the Owner's `users` row and their `shop_owners` link to any *other* shops they hold, which are left untouched.

Note this isn't fully wired up at the database level yet: `shops.status`/`disabled_at`/`purge_after`-style columns and a scheduled purge job still need to be added, and two existing foreign keys (`shifts.shop_id`, `waste_logs.shop_id`) currently have no `ON DELETE` behavior specified (defaults to `RESTRICT` in MySQL), which would block a hard delete on any shop with operating history until those are updated to `CASCADE` or cleared explicitly by the purge job first.

---

## 7. System Schema Dictionary

### 7.1 `users` (Staff & Administration)
System accounts across the tier structure in §3 (System Admin, Owner, Shop Manager, Manager, Staff).
* **Multi-Tenancy Isolation Mapping:** The `shop_id` foreign key field is explicitly nullable to cleanly support System Admin and Owner accounts that operate outside an individual storefront's roster.
* **PIN Auth:** The `pin` field backs the device-pairing PIN login described in §4.3, looked up as `(shop_id, pin)` once a device is paired.

### 7.2 `shops` (Core Tenant Container)
The foundational structural bounding container for multi-tenancy configurations.
* **Location Rules:** Houses explicit `latitude`, `longitude`, and `allowed_radius` parameters required to enforce geofence compliance checks using Haversine formulas at shift start.
* **Lifecycle:** Subject to the disable → grace-window → purge flow in §6.3.

### 7.3 `shop_owners` (Equity Cross-Mapping)
A dedicated many-to-many bridge table linking `users` to `shops`. This allows multiple business partners to concurrently view, configure, and pull reports from multiple storefront catalogs, and is what's checked (not `users.shop_id`) when deciding whether an Owner survives a shop purge.

### 7.4 `shifts` (Staff Sessions)
Tracks active user timeline boundaries. Retains blind validation fields (`blind_cash_reported`, `blind_ecocash_reported`, `blind_swipe_reported`, `blind_onemoney_reported`) updated during shift finalization.

### 7.5 `tables` (Hospitality Running Tabs)
Represents open transactional tabs or physical dining counters bound strictly to active `shifts` to guarantee structural staff allocation continuity. Line items attach directly via `order_items`' polymorphic relation rather than through a separate `current_order_id` pointer.

### 7.6 `orders` (Transaction Envelopes)
The foundational transactional ledger wrapper record. Tracks total ledger footprint via `total_amount` (forced decimal validation) alongside state attributes (`status`, e.g. `open`, `closed`).

### 7.7 `order_items` (Sales Item Lines)
Itemized sales lines linked back to a parent `order` or `table` via a polymorphic `orderable_type`/`orderable_id` pair. Formatted with strict `DECIMAL(10,3)` attributes on quantity vectors to provide seamless native handling for fractional unit lines.

### 7.8 `products` (Master Catalog Sheet)
The master store inventory catalog sheet mapping wholesale cost margins against final customer shelf-pricing specifications. Contains `is_perishable` flags for automated inventory warning lookups.

### 7.9 `categories` (Catalog Grouping)
Per-shop product categorization (unique per shop by slug), referenced optionally by `products`.

### 7.10 `bottles` (Hospitality Volumetrics)
A 1:1 extension layer specifically optimized for hospitality or bar venues. Houses tare, gross, and volume metadata metrics necessary for scale-weight stock translations.

### 7.11 `units` (Retail Unit Conversions)
A shared, shop-agnostic processing table handling loose catalog unit conversions (e.g., scaling six-packs, single cases, or pallets back to structural product configurations).

### 7.12 `stocks` (On-Hand Counters)
Maintains a structural counter tracking exactly what inventory quantity is currently present on site for a given product profile.

### 7.13 `shot_sizes` (Pour Dimensions)
Defines operational pour-volume dimensions in milliliters for a venue.

### 7.14 `stock_variances` (Variance Audit Trail)
Records over/under counts discovered per product over time, independent of a specific waste event.

### 7.15 `waste_logs` (Audit Write-Off Trails)
An absolute audit trail tracing shrink, breaks, or kitchen spoilage out of the catalog tracking pool without matching order transactions.

### 7.16 `expenses` (Operating Costs)
Fixed, salary, and variable cost tracking per shop.

---

## 8. Critical Concurrency & Safety Guidelines

### 8.1 Pessimistic Concurrency Gates
Due to volatile mobile network behavior where clients may re-send requests due to packet drops, all state-changing transaction endpoints must use a pessimistic database lock wrapper (`SELECT ... FOR UPDATE` via Laravel's `lockForUpdate()`) enclosed within a database transaction block. An early idempotency guard must inspect the `status` string immediately after acquiring the row lock; if the index state matches `closed`, the process must bypass subsequent execution paths to safely deliver an early success confirmation back to the frontend edge.

### 8.2 Data Cascade Safeguards
Cascading deletions (`ON DELETE CASCADE`) are used across catalog configuration and structural grouping tables (`shops`, `products`, `bottles`, `units`, `shot_sizes`, `categories`) and, per the shop-purge design in §6.3, deliberately extend into transactional records (`orders`, `order_items`, `tables`, staff `users`) *specifically as part of the intentional 30-day-delayed purge flow* — not as an incidental side effect of routine administrative changes. `shifts` and `waste_logs` still need their `ON DELETE` behavior updated to actually support that purge (see §6.3).