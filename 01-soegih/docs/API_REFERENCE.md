# API Reference

All backend endpoints use the prefix `/api/v1`. Base URL: `http://localhost/api/v1` (local) or `https://yourdomain.app/api/v1` (production).

**Authentication:** All protected endpoints require `Authorization: Bearer <supabase_jwt_token>` header.

---

## Authentication Endpoints

### Login (via Supabase Frontend)

No backend endpoint. Use Supabase client:

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

The JWT token is automatically managed by Supabase client and attached to API requests.

---

## Wallet Endpoints

### List All Wallets

```
GET /wallets
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Main Account",
    "balance": "1500.50",
    "type": "bank",
    "created_at": "2026-03-13T10:00:00Z",
    "updated_at": "2026-03-13T10:00:00Z",
    "deleted_at": null
  }
]
```

---

### Get Wallet by ID

```
GET /wallets/{id}
Authorization: Bearer <token>
```

**Response:** Single wallet object (see above).

---

### Create Wallet

```
POST /wallets
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Savings",
  "type": "bank"
}
```

**Response:** Created wallet object.

---

### Update Wallet

```
PATCH /wallets/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Name",
  "type": "e_wallet"
}
```

**Response:** Updated wallet object.

---

### Delete Wallet (Soft Delete)

```
DELETE /wallets/{id}
Authorization: Bearer <token>
```

**Response:** 200 OK

**Note:** Sets `deleted_at` timestamp; data is not permanently removed.

---

## Category Endpoints

Same structure as Wallet endpoints:

```
GET /categories
GET /categories/{id}
POST /categories
PATCH /categories/{id}
DELETE /categories/{id}
```

**Create body:**
```json
{
  "name": "Groceries",
  "description": "Food and household items",
  "type": "expense"
}
```

---

## Transaction Endpoints

### List Transactions (Paginated)

```
GET /transactions?page=1&limit=20&sort_by=occurred_at&sort_order=desc&month=2026-03&search=coffee
Authorization: Bearer <token>
```

**Query parameters:**
- `page` (number, default: 1) — Page number for pagination
- `limit` (number, default: 20) — Items per page
- `sort_by` (enum: occurred_at | amount | type, default: occurred_at)
- `sort_order` (enum: asc | desc, default: desc)
- `search` (string) — Filter by note (contains, case-insensitive)
- `month` (string, format: YYYY-MM) — Filter by month

**Response:**
```json
{
  "data": [
    {
      "id": "tx-uuid-1",
      "type": "expense",
      "note": "Coffee at Starbucks",
      "occurred_at": "2026-03-13T09:30:00Z",
      "category": {
        "id": "cat-uuid-1",
        "name": "Food & Drink",
        "type": "expense"
      },
      "postings": [
        {
          "id": "post-uuid-1",
          "wallet_id": "wallet-uuid-1",
          "amount": "-5.50",
          "wallet": {
            "id": "wallet-uuid-1",
            "name": "Main",
            "balance": "1495.00",
            "type": "bank"
          }
        }
      ]
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "total_pages": 3
  }
}
```

---

### Get Transaction by ID

```
GET /transactions/{id}
Authorization: Bearer <token>
```

**Response:** Single transaction object.

---

### Create Transaction

```
POST /transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "expense",
  "amount": 45.50,
  "wallet_id": "wallet-uuid-1",
  "category_id": "cat-uuid-1",
  "note": "Dinner",
  "occurred_at": "2026-03-13T19:00:00Z"
}
```

**For transfer:**
```json
{
  "type": "transfer",
  "amount": 500.00,
  "wallet_id": "wallet-uuid-1",
  "destination_wallet_id": "wallet-uuid-2",
  "occurred_at": "2026-03-13T12:00:00Z"
}
```

**Response:** Created transaction object with postings.

**Validation:**
- `type: expense|income` requires `category_id`
- `type: transfer` requires `destination_wallet_id`
- Wallet and category must belong to authenticated user
- Transaction is created atomically with balance updates

---

### Update Transaction (Limited Fields Only)

```
PATCH /transactions/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 55.00,
  "wallet_id": "wallet-uuid-1",
  "category_id": "cat-uuid-2",
  "note": "Dinner at new restaurant"
}
```

**Editable fields:**
- `amount` — Update transaction amount (reverses original posting, creates new with delta)
- `wallet_id` — Change wallet (source for expense/income, or source for transfer)
- `category_id` — Change category (expense/income only; NULL for transfer)
- `note` — Update note text

**Non-editable fields (locked after creation):**
- `type` — Cannot change between expense/income/transfer
- `occurred_at` — Cannot change transaction date

**Response:** Updated transaction object with recalculated postings.

**Validation:**
- `type` must remain the same (expense/income/transfer cannot change)
- If `type` is transfer, `destination_wallet_id` is immutable
- For expense/income, `category_id` is required
- For transfer, `category_id` must be NULL
- Wallet must belong to authenticated user
- Amount must be positive

---

### Delete Transaction (Soft Delete)

```
DELETE /transactions/{id}
Authorization: Bearer <token>
```

**Response:** 200 OK

**Note:** Reverses all postings (undoes balance updates) and marks transaction as deleted.

---

## Dashboard Endpoint

### Get Current Month Summary

```
GET /dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "net_worth": 3500.75,
  "total_income": 5000.00,
  "total_expense": 250.50,
  "expense_by_category": [
    {
      "name": "Food & Drink",
      "amount": 120.50
    },
    {
      "name": "Transport",
      "amount": 80.00
    }
  ],
  "month": "2026-03"
}
```

**Calculation:**
- `net_worth` = sum of all wallet balances
- `total_income` = sum of positive postings from income transactions in current month
- `total_expense` = sum of negative postings from expense transactions in current month
- `expense_by_category` = grouped by category.name, only expense type transactions

---

## AI Chat Endpoints

### Parse Transaction via AI

```
POST /ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "spent $50 on coffee yesterday"
}
```

**Response:**
```json
{
  "parsed": {
    "transaction_type": "expense",
    "amount": 50.00,
    "wallet_id": "wallet-uuid-1",
    "category_id": "cat-uuid-1",
    "note": "coffee",
    "occurred_at": "2026-03-12T00:00:00Z"
  },
  "summary": "Record expense of $50.00"
}
```

**Note:** The backend forwards to the Python AI service. The AI service automatically includes wallet and category context from the database.

---

### Confirm AI-Parsed Transaction

```
POST /ai/chat/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "transaction_type": "expense",
  "amount": 50.00,
  "wallet_id": "wallet-uuid-1",
  "category_id": "cat-uuid-1",
  "note": "coffee",
  "occurred_at": "2026-03-12T00:00:00Z"
}
```

**Response:** Created transaction object.

**Note:** This is identical to `POST /transactions`, but used after AI parsing confirmation.

---

## Error Responses

All errors follow this format:

```json
{
  "status_code": 400,
  "message": "Wallet not found",
  "timestamp": "2026-03-13T10:00:00Z"
}
```

**Common status codes:**
- `400` Bad Request — Validation error or missing required field
- `401` Unauthorized — Missing or invalid JWT token
- `404` Not Found — Resource not found or doesn't belong to user
- `500` Internal Server Error — Unexpected server error

---

**Last updated:** [Auto-updated after API changes]
**Source:** Backend controllers in [backend/src/modules/](../backend/src/modules/)
