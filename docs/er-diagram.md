# PERN Mini ERP Entity Relationship (ER) Data Model

## Relational Architecture in PostgreSQL (`schema: pern_erp`)

```mermaid
erDiagram
    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        enum role "ADMIN | SALES"
        timestamp created_at
    }

    CUSTOMERS {
        int id PK
        string company_name
        string contact_person
        string mobile
        string email
        string city
        timestamp created_at
    }

    PRODUCTS {
        int id PK
        string product_code UK
        string product_name
        string category
        string unit
        decimal base_price
        timestamp created_at
    }

    INVENTORY {
        int id PK
        int product_id FK,UK
        int physical_qty
        int reserved_qty
        timestamp updated_at
    }

    ENQUIRIES {
        int id PK
        string enquiry_number UK
        int customer_id FK
        int created_by FK
        date enquiry_date
        date required_date
        text notes
        enum status "NEW | QUOTED | WON | LOST"
        timestamp created_at
    }

    ENQUIRY_ITEMS {
        int id PK
        int enquiry_id FK
        int product_id FK
        int quantity
    }

    QUOTATIONS {
        int id PK
        string quotation_number UK
        int enquiry_id FK,UK
        int customer_id FK
        int created_by FK
        decimal grand_total
        date valid_until
        enum status "DRAFT | SENT | ACCEPTED | REJECTED"
        timestamp created_at
    }

    QUOTATION_ITEMS {
        int id PK
        int quotation_id FK
        int product_id FK
        int quantity
        decimal unit_price
        decimal discount_pct
        decimal gst_pct
        decimal line_amount
    }

    SALES_ORDERS {
        int id PK
        string order_number UK
        int customer_id FK
        int quotation_id FK,UK
        date order_date
        decimal total_amount
        enum status "PENDING | CONFIRMED | DISPATCHED | CANCELLED"
        timestamp created_at
    }

    SALES_ORDER_ITEMS {
        int id PK
        int sales_order_id FK
        int product_id FK
        int quantity
        decimal unit_price
        decimal line_amount
    }

    DISPATCHES {
        int id PK
        string dispatch_number UK
        int sales_order_id FK
        date dispatch_date
        string vehicle_number
        string driver_name
        int dispatched_by FK
        timestamp created_at
    }

    DISPATCH_ITEMS {
        int id PK
        int dispatch_id FK
        int product_id FK
        int quantity
    }

    CUSTOMERS ||--o{ ENQUIRIES : "has"
    USERS ||--o{ ENQUIRIES : "creates"
    ENQUIRIES ||--|{ ENQUIRY_ITEMS : "contains"
    PRODUCTS ||--o{ ENQUIRY_ITEMS : "referenced in"
    ENQUIRIES ||--o| QUOTATIONS : "quoted as"
    CUSTOMERS ||--o{ QUOTATIONS : "receives"
    QUOTATIONS ||--|{ QUOTATION_ITEMS : "contains"
    PRODUCTS ||--o{ QUOTATION_ITEMS : "priced in"
    QUOTATIONS ||--o| SALES_ORDERS : "converts to"
    CUSTOMERS ||--o{ SALES_ORDERS : "ordered by"
    SALES_ORDERS ||--|{ SALES_ORDER_ITEMS : "contains"
    PRODUCTS ||--o{ SALES_ORDER_ITEMS : "ordered"
    SALES_ORDERS ||--o| DISPATCHES : "dispatched via"
    DISPATCHES ||--|{ DISPATCH_ITEMS : "contains"
    PRODUCTS ||--o{ DISPATCH_ITEMS : "shipped"
    PRODUCTS ||--|| INVENTORY : "tracked in"
    USERS ||--o{ DISPATCHES : "dispatches"
```

## Concurrency & Integrity Mechanics
- **Pessimistic Row-Locking (`SELECT ... FOR UPDATE`):** When confirming orders or dispatching items, product inventory rows are locked ordered ascending by `product_id` to prevent concurrent race conditions and deadlocks.
- **Available Inventory Computation:**
  $$\text{Available Stock} = \text{Physical Quantity} - \text{Reserved Quantity}$$
- **State Transition Safeguards:**
  - Quotations in `DRAFT` or `REJECTED` cannot be converted to Sales Orders.
  - Unique constraint on `quotation_id` in `sales_orders` prevents double conversion.
  - Only `CONFIRMED` orders with reserved stock can be dispatched.
