# FundsRoom PERN Mini ERP — Manufacturing & Supply Chain Operations Portal

## 🌐 Live Production Deployments

- 🖥️ **Live Web Application (Frontend)**: [https://pern-stack-beta.vercel.app](https://pern-stack-beta.vercel.app)
- ⚙️ **Live REST API (Backend)**: [https://pern-stack-r5yy.onrender.com/api](https://pern-stack-r5yy.onrender.com/api)
- 🩺 **API Health Check**: [https://pern-stack-r5yy.onrender.com/health](https://pern-stack-r5yy.onrender.com/health)
- 📦 **GitHub Repository**: [https://github.com/CHETHCODEX/-PERN-stack](https://github.com/CHETHCODEX/-PERN-stack)
- 🗄️ **Database**: Cloud PostgreSQL on Neon.tech (Dedicated Schema pern_erp)

---
A production-grade, full-stack Mini ERP designed for industrial equipment manufacturing and wholesale supply. Built strictly on the **PERN stack (PostgreSQL, Express.js, React.js, Node.js + TypeScript)**, implementing strict ACID transactions with pessimistic row-locking to guarantee 100% stock integrity across high-concurrency order confirmations.

---

## 💼 Business Scenario & End-to-End Workflow

```
Customer Enquiry ──▶ Commercial Quotation ──▶ Sales Order ──▶ Inventory Reservation ──▶ Dispatch
```

1. **Customer Enquiry**: Sales executives log requirements from business clients specifying multi-product line quantities and target delivery dates.
2. **Commercial Quotation**: Pricing engine applies unit rates, discount percentages, and GST. Quotation amounts and line totals are strictly calculated and validated on the backend.
3. **Quotation to Sales Order**: Accepted quotations transition into traceable Sales Orders (1:1 relationship enforced at schema level; DRAFT/REJECTED quotations cannot convert).
4. **Inventory Reservation (Pessimistic Row-Locking)**: Operations Admins confirm orders. Backend locks inventory rows with `SELECT ... FOR UPDATE` ordered by `product_id ASC` to prevent deadlocks and race conditions. Physical stock remains unchanged while Reserved stock increments.
5. **Dispatch Execution**: Confirmed orders are dispatched with vehicle and driver details, simultaneously reducing both Physical and Reserved inventory.

---

## 🏗️ System Architecture & Tech Stack

```
   ┌──────────────────────────────────────────────────────────┐
   │         React 18 + Vite + TypeScript Client SPA          │
   │    (4 Screens: Login, Enquiries, Quotations, Orders)     │
   └────────────────────────────┬─────────────────────────────┘
                                │ REST APIs + Bearer JWT
                                ▼
   ┌──────────────────────────────────────────────────────────┐
   │            Express.js + Node.js API (TypeScript)         │
   │   - JWT Auth & RBAC Middleware (ADMIN vs. SALES)         │
   │   - Zod Input Validation & Error Handling                │
   │   - Backend-calculated Commercial Pricing Engine         │
   └────────────────────────────┬─────────────────────────────┘
                                │ ACID Transactions + Row Locks
                                ▼
   ┌──────────────────────────────────────────────────────────┐
   │             PostgreSQL Relational Database               │
   │  - Dedicated Schema: pern_erp                            │
   │  - Pessimistic Row Locks: SELECT ... FOR UPDATE          │
   │  - Stock formula: Available = Physical - Reserved        │
   └──────────────────────────────────────────────────────────┘
```

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons | Responsive 4-screen operations dashboard |
| **Backend** | Node.js 22, Express.js, TypeScript | Type-safe REST APIs, strict RBAC authorization |
| **ORM / Data** | Prisma ORM 5.22 + Raw PostgreSQL Transactions | Relational schema management with pessimistic row locking |
| **Database** | Cloud PostgreSQL (Neon Serverless) | ACID transactions, unique constraints, foreign keys |
| **Testing** | Vitest + Supertest | 6 automated tests (including concurrency race test) |

---

## 👥 Default Evaluation Accounts

| Persona | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@fundsroom.com` | `password123` | View all, adjust stock, confirm orders (reserve inventory), process dispatches, cancel orders |
| **Sales User** | `sales@fundsroom.com` | `password123` | Create customers, log enquiries, generate quotations, accept/reject quotations, convert to Sales Orders |

*(The login screen includes 1-click evaluation buttons for both accounts)*

---

## 🚀 Quickstart: Local Setup & Running

### Prerequisites
- Node.js v18+ (tested on Node v22.21)
- npm v10+
- PostgreSQL database (or use the preconfigured cloud Neon database)

---

### Step 1: Database Setup & Seeding
Navigate into the backend directory:
```bash
cd backend
npm install
npm run db:push
npm run db:seed
```
*Seeds 2 users (Admin & Sales), 6 industrial products with physical and reserved inventory, and sample industrial customers in PostgreSQL schema `pern_erp`.*

---

### Step 2: Running Backend API Server
```bash
cd backend
npm run dev
```
- API Base URL: `http://localhost:5001/api`
- Health Check: `http://localhost:5001/health`

---

### Step 3: Running Frontend Client
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Automated Test Suite (6 Passing Tests)

Run the automated test suite from the backend directory:
```bash
cd backend
npm test
```

### Verified Test Cases:
1. **Test 1 — Backend Calculation Integrity**: Verifies line item base amounts, discount deductions, GST additions, and grand totals are strictly calculated by the backend.
2. **Test 2 — Quotation State Enforcement**: Verifies that DRAFT or REJECTED quotations are rejected with HTTP 400 when attempting conversion to Sales Orders.
3. **Test 3 — Idempotency & Duplicate Prevention**: Verifies that the same quotation cannot generate duplicate Sales Orders (HTTP 409 Conflict).
4. **Test 4 — Stock Over-Reservation Prevention**: Verifies that orders requesting more than available inventory (`physical - reserved`) are rejected with HTTP 400 and code `INSUFFICIENT_STOCK`.
5. **Test 5 — Role-Based Access Control (RBAC)**: Verifies that a Sales user attempting to confirm orders or process dispatches receives HTTP 403 Forbidden.
6. **Bonus Test — Concurrent Inventory Reservation Race Condition**: Uses `Promise.all` to launch simultaneous reservation requests for the same limited stock. PostgreSQL pessimistic row-locking (`SELECT ... FOR UPDATE`) guarantees only one succeeds and the other safely fails with zero data corruption.

---

## 🔒 Concurrency & Stock Deduction Logic

When an Admin confirms a Sales Order:
```sql
BEGIN;

-- 1. Sort product IDs to prevent distributed deadlocks
SELECT product_id, physical_qty, reserved_qty 
FROM pern_erp.inventory 
WHERE product_id = ANY($1::int[]) 
ORDER BY product_id ASC 
FOR UPDATE;

-- 2. Verify: physical_qty - reserved_qty >= requested_qty
-- If insufficient: ROLLBACK and return HTTP 400 (INSUFFICIENT_STOCK)

-- 3. Reserve stock (physical quantity does not decrease)
UPDATE pern_erp.inventory 
SET reserved_qty = reserved_qty + $qty, updated_at = NOW() 
WHERE product_id = $productId;

-- 4. Mark Sales Order as CONFIRMED
UPDATE pern_erp.sales_orders SET status = 'CONFIRMED' WHERE id = $orderId;

COMMIT;
```

When an order is Dispatched:
```sql
BEGIN;

-- Lock inventory
SELECT ... FOR UPDATE;

-- Decrement both physical and reserved quantities
UPDATE pern_erp.inventory 
SET physical_qty = physical_qty - $qty, 
    reserved_qty = reserved_qty - $qty, 
    updated_at = NOW() 
WHERE product_id = $productId;

-- Insert dispatch record and update order to DISPATCHED
INSERT INTO pern_erp.dispatches ...
UPDATE pern_erp.sales_orders SET status = 'DISPATCHED' WHERE id = $orderId;

COMMIT;
```

---

## 📮 Postman API Collection

A complete Postman collection is provided in `postman/pern-erp.postman_collection.json`:
1. Import `pern-erp.postman_collection.json` into Postman.
2. Run `1. Authentication -> Login - Admin`. The JWT token will automatically be captured into the collection environment.
3. Test Enquiry creation, Quotation generation, Order conversion, Confirmation, and Dispatch.

---

## ☁️ Deployment Roadmap

- **Database**: Cloud PostgreSQL on Neon.tech (serverless) / Supabase.
- **Backend API**: Render.com Web Service (`npm install && npm run build`, start command: `npm start`, environment variables: `DATABASE_URL`, `JWT_SECRET`, `PORT=5001`).
- **Frontend SPA**: Vercel (`npm run build`, output directory: `dist`, environment variable: `VITE_API_URL`).

---

## 🎬 5-Minute Demo Video Script / Workflow

1. **Login (0:00 - 0:45)**:
   - Demonstrate 1-click login as `sales@fundsroom.com`.
   - Highlight role badge in the top navigation bar.
2. **Customer Enquiry (0:45 - 1:45)**:
   - Navigate to Enquiries.
   - Click "New Enquiry", select a customer, add multiple industrial products (e.g., 10x Industrial Ball Valves, 2x Induction Motors), specify required delivery date.
   - Save enquiry and show `NEW` status badge.
3. **Quotation & Commercial Pricing (1:45 - 2:45)**:
   - Click "Generate Quotation".
   - Modify discount percentage and review the real-time preview.
   - Save as `DRAFT` quotation.
   - Advance status: `DRAFT` ➔ `SENT` ➔ `ACCEPTED`.
4. **Sales Order Conversion (2:45 - 3:30)**:
   - Click "Convert to Sales Order".
   - Transition to Sales Orders screen; observe order in `PENDING CONFIRMATION` status.
5. **Inventory Reservation & Pessimistic Locking (3:30 - 4:15)**:
   - Log out and log in as `admin@fundsroom.com`.
   - Inspect the Live Warehouse Stock Master bar (Physical, Reserved, Available).
   - Click "Confirm Order & Reserve Stock".
   - Show that **Reserved stock increases** while **Physical stock stays constant** and Available stock drops.
6. **Dispatch (4:15 - 5:00)**:
   - Click "Process Dispatch", enter vehicle number and driver name.
   - Confirm dispatch: observe order changes to `DISPATCHED`.
   - Show that **both Physical and Reserved stock decrease**, completing the full ERP lifecycle.

---

## 📄 License
MIT License. Built for FundsRoom Technical Evaluation.
