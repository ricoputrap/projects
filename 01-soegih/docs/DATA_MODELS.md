# Data Models

Database schema and entity relationships. Auto-generated from [backend/prisma/schema.prisma](../backend/prisma/schema.prisma).

## Entity Relationship Diagram

```
┌──────────────┐
│    User      │
│  (Supabase)  │
├──────────────┤
│ id (UUID)    │ ◄─────────┐
│ created_at   │           │
│ updated_at   │           │
│ deleted_at   │           │
└──────────────┘           │
      │                    │
      │ 1:N                │
      ├─────────────────┐  │
      │                 │  │
      ▼                 ▼  │
┌──────────────┐   ┌──────────────┐
│    Wallet    │   │  Category    │
├──────────────┤   ├──────────────┤
│ id (UUID)    │   │ id (UUID)    │
│ user_id ─────┼───┤ user_id ─────┴───(to User.id)
│ name         │   │ name
│ balance      │   │ description
│ type         │   │ type (expense|income)
│ created_at   │   │ created_at
│ updated_at   │   │ updated_at
│ deleted_at   │   │ deleted_at
└──────────────┘   └──────────────┘
      │
      │ 1:N
      │
      ▼
┌────────────────────┐
│    Posting         │
│ (Wallet impact)    │
├────────────────────┤
│ id (UUID)          │
│ wallet_id ────────────────────────┐
│ event_id ──────────┐              │
│ amount (Decimal)   │              │
│ created_at         │              │
│ updated_at         │              │
│ deleted_at         │              │
└────────────────────┘              │
      │                             │
      └──────────────┬──────────────┘
                     │
                     │ 1:N
                     │
                     ▼
        ┌─────────────────────────┐
        │  TransactionEvent       │
        │ (A transaction)         │
        ├─────────────────────────┤
        │ id (UUID)               │
        │ type (expense|income|   │
        │       transfer)         │
        │ note (optional)         │
        │ category_id ───────┐    │
        │ occurred_at        │    │
        │ created_at         │    │
        │ updated_at         │    │
        │ deleted_at         │    │
        └─────────────────────────┘
              │
              │ (to Category.id)
              └─────────────┐
                            │
                    (optional)
```

## Tables

### `users` (Auto-synced with Supabase Auth)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | Supabase UID (not auto-generated) |
| `created_at` | DateTime | NOT NULL, DEFAULT now() | |
| `updated_at` | DateTime | NOT NULL, DEFAULT now() | Auto-updated |
| `deleted_at` | DateTime | NULL | Soft delete marker |

**Relationships:**
- 1:N with `wallet`
- 1:N with `category`

**Notes:**
- User record created automatically when Supabase Auth creates a user
- All user data is scoped to this user_id
- Soft deleted, never hard deleted

---

### `wallet`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT uuid() | |
| `user_id` | UUID | FK → users.id, NOT NULL | |
| `name` | String | NOT NULL | "Main", "Savings", etc. |
| `balance` | Decimal(15,2) | NOT NULL | Current balance |
| `type` | Enum | NOT NULL | cash \| bank \| e_wallet \| other |
| `created_at` | DateTime | NOT NULL, DEFAULT now() | |
| `updated_at` | DateTime | NOT NULL, DEFAULT now() | |
| `deleted_at` | DateTime | NULL | Soft delete |

**Constraints:**
- Partial unique index: `(user_id, name, type)` WHERE `deleted_at IS NULL`
  - Prevents duplicate wallet names per user/type (but allows soft-deleted dupes)

**Relationships:**
- N:1 with `users`
- 1:N with `posting`

**Notes:**
- Balance updated atomically during transaction creation
- Soft deleted when user removes wallet

---

### `category`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT uuid() | |
| `user_id` | UUID | FK → users.id, NOT NULL | |
| `name` | String | NOT NULL | "Food", "Rent", etc. |
| `description` | String | NULL | Optional description |
| `type` | Enum | NOT NULL | expense \| income |
| `created_at` | DateTime | NOT NULL, DEFAULT now() | |
| `updated_at` | DateTime | NOT NULL, DEFAULT now() | |
| `deleted_at` | DateTime | NULL | Soft delete |

**Constraints:**
- Partial unique index: `(user_id, name, type)` WHERE `deleted_at IS NULL`

**Relationships:**
- N:1 with `users`
- 1:N with `transaction_event`

**Notes:**
- Soft deleted when user removes category
- Required for expense/income transactions (optional for transfers)

---

### `transaction_event`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT uuid() | |
| `type` | Enum | NOT NULL, **IMMUTABLE** | expense \| income \| transfer (locked after creation) |
| `note` | String | NULL | User-provided note ("coffee at Starbucks") — **EDITABLE** |
| `category_id` | UUID | FK → category.id, NULL | Required for expense/income, NULL for transfer — **EDITABLE** |
| `occurred_at` | DateTime | NOT NULL, **IMMUTABLE** | When transaction happened (locked after creation) |
| `created_at` | DateTime | NOT NULL, DEFAULT now() | |
| `updated_at` | DateTime | NOT NULL, DEFAULT now() | |
| `deleted_at` | DateTime | NULL | Soft delete |

**Relationships:**
- N:1 with `category` (optional)
- 1:N with `posting`

**Mutable Fields (User can edit after creation):**
- `note` — Can change at any time
- `category_id` — Can change if transaction type allows (expense/income only, must be NULL for transfer)

**Immutable Fields (Locked after creation):**
- `type` — Cannot change between expense/income/transfer
- `occurred_at` — Transaction date is permanent

**Notes:**
- A single logical transaction (e.g., "spent $50 on food")
- Links to 1 or 2 postings depending on type:
  - **Expense**: 1 posting (debit source wallet)
  - **Income**: 1 posting (credit source wallet)
  - **Transfer**: 2 postings (debit source, credit destination)
- Soft deleted when user removes transaction
- Deletion triggers reversal of all postings (balance updates)

---

### `posting`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT uuid() | |
| `event_id` | UUID | FK → transaction_event.id, NOT NULL | |
| `wallet_id` | UUID | FK → wallet.id, NOT NULL | **EDITABLE** (via transaction update) |
| `amount` | Decimal(15,2) | NOT NULL | Signed; **EDITABLE** (via transaction update) |
| `created_at` | DateTime | NOT NULL, DEFAULT now() | |
| `updated_at` | DateTime | NOT NULL, DEFAULT now() | |
| `deleted_at` | DateTime | NULL | Soft delete |

**Relationships:**
- N:1 with `transaction_event`
- N:1 with `wallet`

**Editable via Transaction Update:**
- `wallet_id` — Can change source wallet for expense/income, or source wallet for transfer
- `amount` — Can change transaction amount (triggers balance reversal and recalculation)

**Notes:**
- Represents a single wallet impact within a transaction
- Amount is signed:
  - **Expense**: negative (e.g., -50.00)
  - **Income**: positive (e.g., 1000.00)
  - **Transfer source**: negative (e.g., -100.00)
  - **Transfer destination**: positive (e.g., 100.00)
- Wallet balance is updated **atomically** when posting is created or updated
- When transaction amount changes: original posting is reversed (balance adjustment), new posting created with delta
- Soft deleted when transaction is deleted; balance is reversed

---

## Enums

### `WalletType`
```
cash      | Physical cash
bank      | Bank account
e_wallet  | Digital wallet (Apple Pay, Google Pay, etc.)
other     | Custom wallet type
```

### `CategoryType`
```
expense   | Spending category
income    | Income category
```

### `TransactionType`
```
expense   | Single-wallet debit (e.g., "spent $50 on food")
income    | Single-wallet credit (e.g., "earned $1000 salary")
transfer  | Two-wallet transfer (e.g., "moved $500 from checking to savings")
```

---

## Constraints & Indexes

### Unique Indexes (Partial)

```sql
-- Allow same wallet name across different types for one user
CREATE UNIQUE INDEX "wallet_user_id_name_type_active_key"
  ON "wallet"("user_id", "name", "type")
  WHERE "deleted_at" IS NULL;

-- Same for categories
CREATE UNIQUE INDEX "category_user_id_name_type_active_key"
  ON "category"("user_id", "name", "type")
  WHERE "deleted_at" IS NULL;
```

### Foreign Keys

All FK relationships have implicit cascading behavior via Prisma:
- Deleting a user doesn't auto-delete wallets (soft delete only)
- Deleting a transaction_event soft-deletes all postings
- Deleting a category doesn't remove transactions (category_id can be NULL)

---

## Data Isolation & Soft Deletion

All queries in the backend include `deleted_at: null` in WHERE clauses to filter out soft-deleted records:

```sql
WHERE user_id = $1 AND deleted_at IS NULL
```

This ensures:
- Deleted data is never returned
- Data can be recovered if needed
- Referential integrity is maintained

---

**Last updated:** [Auto-updated after schema changes]
**Source:** [backend/prisma/schema.prisma](../backend/prisma/schema.prisma)
