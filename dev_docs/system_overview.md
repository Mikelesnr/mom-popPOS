# System Design Document: Mom&Pop POS

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

## 3. Core User Stories & Operational Context

### 3.1 Business Owners & Multi-Tenancy
* **Multi-Store Management:** As a Business Owner, I can register multiple physical shops and link co-owners or equity partners to my storefront portfolios, allowing unified administrative oversight across operations.
* **Menu/Catalog Control:** As a Manager or Business Owner, I can update base product listings, cost margins, and selling retail prices, forcing instantaneous catalog distributions down to the edge registers.

### 3.2 Shift Workers & Cashiers
* **Isolated Session Check-In:** As a Cashier, I can open a dedicated shift terminal session at my assigned physical shop, establishing an absolute tracking timeline for my individual operational actions.
* **Geofenced Accountability:** As a Cashier, my check-in attempt will be rejected if my device's spatial location does not align within the shop's strict geofence radius, ensuring staff are physically on-site.
* **Blind Closing Audit:** As a Cashier closing out a session, I must manually tally the physical currency and verify my digital wallet statements (EcoCash, OneMoney, Swipe, Cash) and enter them blindly into the terminal without knowing the system's exact internal tally. This protects the ledger from targeted manual adjustments.

### 3.3 Hospitality Operations
* **Flexible Table Tabs:** As a Bartender or Server, I can open running transaction tabs bound directly to named tables or customer counters, allowing items to be safely added incrementally over a duration before a checkout payment is selected.
* **Volumetric Drink Tracking:** As a Bartender, I can log fluid hospitality inventory levels by placing open liquor bottles on a digital mass scale. The system converts gross weight grams back to fluid milliliters based on tare metrics to accurately detect shot-pour variances.

---

## 4. Architectural Rules & Operational Guardrails

### 4.1 Ledger-First Immutability
Mom&Pop POS functions as an absolute digital ledger. All successful checkouts recording Cash, EcoCash, Swipe, or OneMoney balances are written as immutable transaction lines. The backend completely excludes integration with active client-side payment gateways during operational runs, serving as a clean terminal recorder for statement-matched processing.

### 4.2 Fractional Units & Volumetrics
* **Kitchen & Bulk Retail Partials:** Quantities are recorded using strict `DECIMAL(10,3)` precision fields, preserving precise tracking data down to fractions of a unit (e.g., writing off `0.350 kg` of a bulk product).
* **Fluid Asset Scales:** Open hospitality inventory evaluates mass data using linear tare-to-gross subtraction formulas to calculate current fluid milliliter metrics dynamically.

---

## 5. System Schema Dictionary

### 5.1 `users` (Staff & Administration)
System accounts across multiple tiers (Cashier, Manager, Admin, Owner).
* **Multi-Tenancy Isolation Mapping:** The `shop_id` foreign key field is explicitly nullable to cleanly support multi-venue business owners who operate globally outside an individual storefront’s roster.

### 5.2 `shops` (Core Tenant Container)
The foundational structural bounding container for multi-tenancy configurations.
* **Location Rules:** Houses explicit `latitude`, `longitude`, and `allowed_radius` parameters required to enforce geofence compliance checks using Haversine formulas at shift start.

### 5.3 `shop_owners` (Equity Cross-Mapping)
A dedicated many-to-many bridge table linking `users` to `shops`. This allows multiple business partners to concurrently view, configure, and pull reports from multiple storefront catalogs.

### 5.4 `shifts` (Staff Sessions)
Tracks active user timeline boundaries. Retains blind validation fields (`blind_cash_reported`, `blind_ecocash_reported`, `blind_swipe_reported`, `blind_onemoney_reported`) updated during shift finalization.

### 5.5 `tables` (Hospitality Running Tabs)
Represents open transactional tabs or physical dining counters bound strictly to active `shifts` to guarantee structural staff allocation continuity.
* **Tab Reference Pattern:** Includes a nullable `current_order_id` field that functions as a structural pointer mapping directly to an active, un-finalized record within the `orders` model layout.

### 5.6 `orders` (Transaction Envelopes)
The foundational transactional ledger wrapper record. Tracks total ledger footprint via `total_amount` (forced decimal validation) alongside state attributes (`status` e.g., `open`, `closed`).

### 5.7 `order_items` (Sales Item Lines)
Itemized sales lines linked back to an active parent order envelope container. Formatted with strict `DECIMAL(10,3)` attributes on quantity vectors to provide seamless native handling for fractional unit lines.

### 5.8 `products` (Master Catalog Sheet)
The master store inventory catalog sheet mapping wholesale cost margins against final customer shelf-pricing specifications. Contains `is_perishable` flags for automated inventory warning lookups.

### 5.9 `bottles` (Hospitality Volumetrics)
An extension layer specifically optimized for hospitality or bar venues. Houses tare, gross, and volume metadata metrics necessary for scale-weight stock translations.

### 5.10 `units` (Retail Unit Conversions)
A processing table handling loose catalog unit conversions (e.g., scaling six-packs, single cases, or pallets back to structural product configurations).

### 5.11 `stocks` (On-Hand Counters)
Maintains a single explicit structural counter tracking exactly what inventory quantity is currently present on site for a given product profile.

### 5.12 `shot_sizes` (Pour Dimensions)
Defines operational pour-volume dimensions in milliliters (e.g., standard `25ml` or `30ml` options) matching specific venue requirements.

### 5.13 `waste_logs` (Audit Write-Off Trails)
An absolute audit trail tracing shrink, breaks, or kitchen spoilage out of the catalog tracking pool without matching order transactions.

---

## 6. Critical Concurrency & Safety Guidelines

### 6.1 Pessimistic Concurrency Gates
Due to volatile mobile network behavior where clients may re-send requests due to packet drops, all state-changing transaction endpoints must use a pessimistic database lock wrapper (`SELECT ... FOR UPDATE` via Laravel’s `lockForUpdate()`) enclosed within a database transaction block. An early idempotency guard must inspect the `status` string immediately after acquiring the row lock; if the index state matches `closed`, the process must bypass subsequent execution paths to safely deliver an early success confirmation back to the frontend edge.

### 6.2 Data Cascade Safeguards
Cascading deletions (`ON DELETE CASCADE`) are restricted to catalog configuration and structural grouping tables (`shops`, `products`, `bottles`, `units`, `shot_sizes`). Transactional ledger components, specifically `orders`, `order_items`, and `shifts`, exclude automated data-wipe cascades to safeguard financial tracking profiles from administrative alterations and preserve historical accounting integrity.