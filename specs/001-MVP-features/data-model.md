# Data Model: Crypto Portfolio Tracker MVP

**Date**: 2025-10-04  
**Feature**: 001-MVP-features  
**Source**: Extracted from spec.md Key Entities + research.md decisions

## Entity Definitions

### User
**Source**: Supabase Auth managed table

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PK, auto-generated | Supabase auth user ID |
| email | text | UNIQUE, NOT NULL | User email address |
| auth_provider | text | NOT NULL | 'email' or 'google' |
| created_at | timestamptz | NOT NULL, default NOW() | Account creation timestamp |

**Notes**:
- Managed by Supabase Auth; no direct manipulation
- email verified via Supabase email confirmation flow
- OAuth user metadata stored in auth.users.raw_user_meta_data

**RLS Policy**: N/A (Supabase Auth table)

---

### Portfolio
**Source**: FR-003, FR-025 (multiple portfolios per user)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PK, auto-generated | Portfolio unique ID |
| user_id | uuid | FK → auth.users.id, NOT NULL | Owner user ID |
| name | text | NOT NULL, CHECK(length(name) <= 100) | Portfolio display name |
| description | text | NULL | Optional portfolio notes |
| base_currency | text | NOT NULL, default 'USD' | Base currency (USD only for MVP) |
| created_at | timestamptz | NOT NULL, default NOW() | Creation timestamp |
| updated_at | timestamptz | NOT NULL, default NOW() | Last update timestamp |

**Indexes**:
- `CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);`

**RLS Policy**:
```sql
CREATE POLICY "Users can CRUD own portfolios"
  ON portfolios FOR ALL
  USING (auth.uid() = user_id);
```

**Validation Rules** (from FR-003):
- name: required, max 100 characters
- description: optional
- base_currency: must be 'USD' (enforce in application, FK constraint future-proofed for multi-currency)

**State Transitions**: None (simple CRUD entity)

---

### Transaction
**Source**: FR-004, FR-005, FR-006, FR-007, FR-019 (BUY/SELL transactions)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PK, auto-generated | Transaction unique ID |
| portfolio_id | uuid | FK → portfolios.id, NOT NULL, ON DELETE CASCADE | Parent portfolio |
| symbol | text | NOT NULL, CHECK(length(symbol) <= 10) | Crypto symbol (e.g., 'BTC', 'ETH') |
| side | text | NOT NULL, CHECK(side IN ('BUY', 'SELL')) | Transaction type |
| quantity | numeric(20,8) | NOT NULL, CHECK(quantity > 0) | Asset quantity |
| price | numeric(20,8) | NOT NULL, CHECK(price > 0) | Execution price per unit (USD) |
| executed_at | timestamptz | NOT NULL, CHECK(executed_at <= NOW()) | Transaction execution time |
| created_at | timestamptz | NOT NULL, default NOW() | Record creation timestamp |
| updated_at | timestamptz | NOT NULL, default NOW() | Last edit timestamp |

**Indexes**:
- `CREATE INDEX idx_transactions_portfolio_executed ON transactions(portfolio_id, executed_at DESC);`
- `CREATE INDEX idx_transactions_portfolio_symbol ON transactions(portfolio_id, symbol);`

**RLS Policy**:
```sql
CREATE POLICY "Users can CRUD own transactions"
  ON transactions FOR ALL
  USING (portfolio_id IN (
    SELECT id FROM portfolios WHERE user_id = auth.uid()
  ));
```

**Validation Rules**:
- **FR-004**: symbol, quantity > 0, price > 0, executed_at <= NOW()
- **FR-005**: SELL quantity validation (application-level: check total holdings before insert)
- **FR-006**: All fields editable except id, created_at (updated_at auto-bumped on UPDATE trigger)
- **FR-019**: Pagination at 100 transactions via cursor-based query

**Business Logic**:
- **SELL Validation** (FR-005): Before INSERT/UPDATE SELL transaction, calculate current holdings for symbol and reject if `txn.quantity > holdings.totalQuantity`.
- **Idempotency** (NFR-008): Use unique constraint on `(portfolio_id, symbol, executed_at, side, quantity, price)` to prevent exact duplicates? **Decision**: No DB constraint (false positives on legitimate duplicates); enforce via application-level transaction deduplication (check within 5s window).

**State Transitions**: None (immutable event log; edits create new audit trail via updated_at)

**Audit Trail** (FR-018): Implement via Supabase Realtime or separate audit_log table:
```sql
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  entity_type text NOT NULL, -- 'transaction', 'portfolio'
  entity_id uuid NOT NULL,
  action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT NOW()
);
```

---

### Holding (Derived View)
**Source**: FR-008 (derived holdings per portfolio+symbol)

**Not a database table**. Computed on-demand in application layer from Transaction records.

**Calculation Algorithm** (from research.md):
```typescript
interface Holding {
  portfolio_id: string;
  symbol: string;
  total_quantity: number;
  average_cost: number;
  market_value: number;      // total_quantity * latest_price
  unrealized_pl: number;     // market_value - (total_quantity * average_cost)
}

function calculateHoldings(
  transactions: Transaction[], 
  currentPrices: Map<string, number>
): Holding[] {
  // Group by symbol
  const grouped = groupBy(transactions, 'symbol');
  
  return Object.entries(grouped).map(([symbol, txns]) => {
    // Sort chronologically
    const sorted = txns.sort((a, b) => 
      a.executed_at.getTime() - b.executed_at.getTime()
    );
    
    let totalQuantity = 0;
    let totalCost = 0;
    
    for (const txn of sorted) {
      if (txn.side === 'BUY') {
        totalQuantity += txn.quantity;
        totalCost += txn.quantity * txn.price;
      } else {
        // SELL: reduce quantity and proportional cost
        const avgCost = totalCost / totalQuantity;
        totalQuantity -= txn.quantity;
        totalCost -= txn.quantity * avgCost;
      }
    }
    
    const currentPrice = currentPrices.get(symbol) || 0;
    const market_value = totalQuantity * currentPrice;
    const average_cost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
    const unrealized_pl = market_value - totalCost;
    
    return {
      portfolio_id: txns[0].portfolio_id,
      symbol,
      total_quantity: totalQuantity,
      average_cost,
      market_value,
      unrealized_pl
    };
  });
}
```

**Performance**: O(n log n) for sorting + O(n) for iteration. Cache result per portfolio with React Query (invalidate on transaction CRUD).

**Test Coverage**: 100% (critical calculation path per constitution).

---

### PriceEvent
**Source**: FR-009, FR-011, FR-012, FR-015 (real-time price data)

**Database Storage Decision**: Postgres table for recent prices (7 days retention) + in-memory cache (client-side React Query).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PK, auto-generated | Event unique ID |
| symbol | text | NOT NULL | Crypto symbol |
| price | numeric(20,8) | NOT NULL, CHECK(price > 0) | Current price (USD) |
| change_24h_abs | numeric(20,8) | NULL | Absolute 24h price change |
| change_24h_pct | numeric(10,4) | NULL | Percentage 24h price change |
| received_at | timestamptz | NOT NULL, default NOW() | Price data timestamp |

**Indexes**:
- `CREATE UNIQUE INDEX idx_prices_symbol_received ON price_events(symbol, received_at DESC);`
- Partial index: `CREATE INDEX idx_prices_recent ON price_events(symbol, received_at) WHERE received_at > NOW() - INTERVAL '7 days';`

**RLS Policy**: Public read (no auth required for price data viewing).

**Data Retention**: Cron job to delete records older than 7 days (Supabase Edge Function scheduled weekly).

**Client Caching Strategy**:
- React Query: 30s stale time for active portfolio view
- 5min stale time for dashboard ticker
- Refetch on window focus for active portfolio

**Stale Data Logic** (FR-012, FR-015):
```typescript
const isPriceStale = (priceEvent: PriceEvent): boolean => {
  return Date.now() - new Date(priceEvent.received_at).getTime() > 30000; // 30s threshold
};
```

---

### PortfolioValueSnapshot
**Source**: FR-013, FR-016 (value-over-time chart data)

**Database Storage Decision**: Materialized snapshots for historical data; calculate current value on-demand.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PK, auto-generated | Snapshot unique ID |
| portfolio_id | uuid | FK → portfolios.id, NOT NULL, ON DELETE CASCADE | Portfolio reference |
| total_value | numeric(20,8) | NOT NULL, CHECK(total_value >= 0) | Portfolio total value (USD) |
| captured_at | timestamptz | NOT NULL, default NOW() | Snapshot timestamp |

**Indexes**:
- `CREATE UNIQUE INDEX idx_snapshots_portfolio_captured ON portfolio_value_snapshots(portfolio_id, captured_at DESC);`

**RLS Policy**:
```sql
CREATE POLICY "Users can read own snapshots"
  ON portfolio_value_snapshots FOR SELECT
  USING (portfolio_id IN (
    SELECT id FROM portfolios WHERE user_id = auth.uid()
  ));
```

**Snapshot Generation Strategy**:
- **Daily snapshots**: Cron job (Supabase Edge Function) runs at midnight UTC, captures value for all portfolios
- **On-demand snapshots**: Triggered after bulk transaction import or significant events
- **Retention**: Keep all snapshots (no deletion policy for MVP; revisit post-launch)

**Chart Data Query** (FR-016):
```sql
-- Example: Last 30 days
SELECT captured_at, total_value
FROM portfolio_value_snapshots
WHERE portfolio_id = $1
  AND captured_at >= NOW() - INTERVAL '30 days'
ORDER BY captured_at ASC;
```

**Intervals** (from clarifications):
- 24 hours: Hourly snapshots (24 data points)
- 7 days: 6-hour snapshots (28 data points)
- 30 days: Daily snapshots (30 data points)
- 90 days: Daily snapshots (90 data points)
- All time: Weekly snapshots (dynamic point count)

**Performance**: Pre-aggregated data, O(1) query complexity. Meets NFR-009 (≤500ms chart render).

---

## Relationships

```
auth.users (Supabase)
  ↓ (1:N)
portfolios
  ↓ (1:N)
transactions

portfolios
  ↓ (1:N)
portfolio_value_snapshots

[Derived at runtime]
transactions → holdings (via calculateHoldings function)
price_events → holdings.market_value (join by symbol)
```

---

## Migration Strategy

**Initial Schema** (Supabase migration):
```sql
-- migrations/001_initial_schema.sql

-- Portfolios table
CREATE TABLE portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL CHECK(length(name) <= 100),
  description text,
  base_currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);

-- RLS policies
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own portfolios"
  ON portfolios FOR ALL
  USING (auth.uid() = user_id);

-- Transactions table
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL CHECK(length(symbol) <= 10),
  side text NOT NULL CHECK(side IN ('BUY', 'SELL')),
  quantity numeric(20,8) NOT NULL CHECK(quantity > 0),
  price numeric(20,8) NOT NULL CHECK(price > 0),
  executed_at timestamptz NOT NULL CHECK(executed_at <= NOW()),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_portfolio_executed 
  ON transactions(portfolio_id, executed_at DESC);
CREATE INDEX idx_transactions_portfolio_symbol 
  ON transactions(portfolio_id, symbol);

-- RLS policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own transactions"
  ON transactions FOR ALL
  USING (portfolio_id IN (
    SELECT id FROM portfolios WHERE user_id = auth.uid()
  ));

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON portfolios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Price events table
CREATE TABLE price_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  price numeric(20,8) NOT NULL CHECK(price > 0),
  change_24h_abs numeric(20,8),
  change_24h_pct numeric(10,4),
  received_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_prices_symbol_received 
  ON price_events(symbol, received_at DESC);
CREATE INDEX idx_prices_recent 
  ON price_events(symbol, received_at) 
  WHERE received_at > NOW() - INTERVAL '7 days';

ALTER TABLE price_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read price events"
  ON price_events FOR SELECT
  USING (true);

-- Portfolio value snapshots table
CREATE TABLE portfolio_value_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  total_value numeric(20,8) NOT NULL CHECK(total_value >= 0),
  captured_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_snapshots_portfolio_captured 
  ON portfolio_value_snapshots(portfolio_id, captured_at DESC);

ALTER TABLE portfolio_value_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own snapshots"
  ON portfolio_value_snapshots FOR SELECT
  USING (portfolio_id IN (
    SELECT id FROM portfolios WHERE user_id = auth.uid()
  ));

-- Audit log table
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user_created ON audit_log(user_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own audit logs"
  ON audit_log FOR SELECT
  USING (auth.uid() = user_id);
```

---

## Type Generation

**Command**: `npx supabase gen types typescript --project-id <project-id> > lib/db/schema.ts`

**Output** (`lib/db/schema.ts`):
```typescript
export type Database = {
  public: {
    Tables: {
      portfolios: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          base_currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          base_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          base_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          portfolio_id: string;
          symbol: string;
          side: 'BUY' | 'SELL';
          quantity: number;
          price: number;
          executed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          symbol: string;
          side: 'BUY' | 'SELL';
          quantity: number;
          price: number;
          executed_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          symbol?: string;
          side?: 'BUY' | 'SELL';
          quantity?: number;
          price?: number;
          executed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      // ... (price_events, portfolio_value_snapshots, audit_log)
    };
  };
};
```

---

## Validation Summary

✅ All entities from spec.md Key Entities section captured  
✅ Validation rules mapped from functional requirements  
✅ State transitions documented (none for MVP)  
✅ Relationships defined with FK constraints  
✅ RLS policies enforce data isolation per constitution security standards  
✅ Indexes support NFR-002 (≤200ms API latency)  
✅ Derived holdings calculation algorithm defined (100% test coverage target)  
