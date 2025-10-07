# API Contracts: Crypto Portfolio Tracker MVP

**Date**: 2025-10-04  
**Feature**: 001-MVP-features  
**Base URL**: `/api/v1`  
**Authentication**: Supabase JWT in `Authorization: Bearer <token>` header

## Overview

All endpoints return JSON. Standard error format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

Standard success responses include `data` envelope.

---

## Authentication Endpoints

### POST /api/auth/register
Register new user with email/password.

**Request**:
```json
{
  "email": "user@testuser.com",
  "password": "securePassword123"
}
```

**Response 201**:
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@testuser.com",
      "created_at": "2025-10-04T12:00:00Z"
    },
    "session": {
      "access_token": "jwt-token",
      "refresh_token": "refresh-token",
      "expires_at": 1696425600
    }
  }
}
```

**Errors**:
- `400 INVALID_EMAIL`: Invalid email format
- `400 WEAK_PASSWORD`: Password doesn't meet requirements
- `409 EMAIL_EXISTS`: Email already registered

---

### POST /api/auth/login
Login with email/password.

**Request**:
```json
{
  "email": "user@testuser.com",
  "password": "securePassword123"
}
```

**Response 200**: Same as register

**Errors**:
- `401 INVALID_CREDENTIALS`: Wrong email or password
- `403 EMAIL_NOT_CONFIRMED`: Email verification pending

---

### POST /api/auth/google
Initiate Google OAuth flow.

**Response 200**:
```json
{
  "data": {
    "url": "https://accounts.google.com/oauth/..."
  }
}
```

---

### POST /api/auth/logout
Logout current session.

**Request**: None (uses session token)

**Response 204**: No content

---

## Portfolio Endpoints

### GET /api/portfolios
List user's portfolios.

**Query Parameters**:
- `limit` (optional): Max results, default 50
- `offset` (optional): Pagination offset, default 0

**Response 200**:
```json
{
  "data": {
    "portfolios": [
      {
        "id": "uuid",
        "name": "My Crypto Portfolio",
        "description": "Main trading account",
        "base_currency": "USD",
        "total_value": 15234.56,
        "unrealized_pl": 1234.56,
        "created_at": "2025-10-01T10:00:00Z",
        "updated_at": "2025-10-04T12:00:00Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Missing or invalid token

---

### GET /api/portfolios/:id
Get portfolio details with current holdings.

**Response 200**:
```json
{
  "data": {
    "portfolio": {
      "id": "uuid",
      "name": "My Crypto Portfolio",
      "description": "Main trading account",
      "base_currency": "USD",
      "created_at": "2025-10-01T10:00:00Z",
      "updated_at": "2025-10-04T12:00:00Z"
    },
    "holdings": [
      {
        "symbol": "BTC",
        "total_quantity": 0.5,
        "average_cost": 28000.00,
        "market_value": 15000.00,
        "unrealized_pl": 1000.00,
        "current_price": 30000.00,
        "price_change_24h_pct": 2.5
      }
    ],
    "summary": {
      "total_value": 15234.56,
      "total_cost": 14000.00,
      "unrealized_pl": 1234.56,
      "total_pl_pct": 8.81
    }
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Missing or invalid token
- `403 FORBIDDEN`: Portfolio doesn't belong to user
- `404 NOT_FOUND`: Portfolio not found

---

### POST /api/portfolios
Create new portfolio.

**Request**:
```json
{
  "name": "New Portfolio",
  "description": "Optional description"
}
```

**Response 201**:
```json
{
  "data": {
    "id": "uuid",
    "name": "New Portfolio",
    "description": "Optional description",
    "base_currency": "USD",
    "created_at": "2025-10-04T12:00:00Z",
    "updated_at": "2025-10-04T12:00:00Z"
  }
}
```

**Errors**:
- `400 INVALID_NAME`: Name empty or > 100 chars
- `401 UNAUTHORIZED`: Missing or invalid token

---

### PATCH /api/portfolios/:id
Update portfolio details.

**Request**:
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response 200**: Same as POST response

**Errors**:
- `400 INVALID_NAME`: Name empty or > 100 chars
- `401 UNAUTHORIZED`: Missing or invalid token
- `403 FORBIDDEN`: Portfolio doesn't belong to user
- `404 NOT_FOUND`: Portfolio not found

---

### DELETE /api/portfolios/:id
Delete portfolio and all transactions (CASCADE).

**Response 204**: No content

**Errors**:
- `401 UNAUTHORIZED`: Missing or invalid token
- `403 FORBIDDEN`: Portfolio doesn't belong to user
- `404 NOT_FOUND`: Portfolio not found

---

## Transaction Endpoints

### GET /api/portfolios/:portfolioId/transactions
List transactions for portfolio with pagination.

**Query Parameters**:
- `cursor` (optional): Base64-encoded cursor for pagination
- `limit` (optional): Results per page, default 20, max 100
- `symbol` (optional): Filter by symbol (e.g., 'BTC')
- `start_date` (optional): Filter by executed_at >= ISO date
- `end_date` (optional): Filter by executed_at <= ISO date

**Response 200**:
```json
{
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "portfolio_id": "uuid",
        "symbol": "BTC",
        "side": "BUY",
        "quantity": 0.5,
        "price": 28000.00,
        "executed_at": "2025-10-01T10:30:00Z",
        "notes": "Initial purchase",
        "created_at": "2025-10-01T10:31:00Z",
        "updated_at": "2025-10-01T10:31:00Z"
      }
    ],
    "pagination": {
      "next_cursor": "base64-encoded-cursor",
      "has_more": true,
      "limit": 20
    }
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Missing or invalid token
- `403 FORBIDDEN`: Portfolio doesn't belong to user
- `404 NOT_FOUND`: Portfolio not found

---

### POST /api/portfolios/:portfolioId/transactions
Create new transaction.

**Request**:
```json
{
  "symbol": "BTC",
  "side": "BUY",
  "quantity": 0.5,
  "price": 28000.00,
  "executed_at": "2025-10-01T10:30:00Z",
  "notes": "Initial purchase from Coinbase"
}
```

**Response 201**:
```json
{
  "data": {
    "id": "uuid",
    "portfolio_id": "uuid",
    "symbol": "BTC",
    "side": "BUY",
    "quantity": 0.5,
    "price": 28000.00,
    "executed_at": "2025-10-01T10:30:00Z",
    "notes": "Initial purchase from Coinbase",
    "created_at": "2025-10-04T12:00:00Z",
    "updated_at": "2025-10-04T12:00:00Z"
  }
}
```

**Errors**:
- `400 INVALID_SYMBOL`: Symbol not in supported list
- `400 INVALID_QUANTITY`: Quantity <= 0
- `400 INVALID_PRICE`: Price <= 0
- `400 INVALID_NOTES`: Notes exceed 1000 characters
- `400 FUTURE_DATE`: executed_at is in the future
- `400 INSUFFICIENT_HOLDINGS`: SELL quantity > current holdings
- `401 UNAUTHORIZED`: Missing or invalid token
- `403 FORBIDDEN`: Portfolio doesn't belong to user
- `404 NOT_FOUND`: Portfolio not found

---

### PATCH /api/portfolios/:portfolioId/transactions/:id
Update transaction (unrestricted edit window per clarifications).

**Request**:
```json
{
  "quantity": 0.6,
  "price": 29000.00,
  "executed_at": "2025-10-01T11:00:00Z",
  "notes": "Updated quantity and price"
}
```

**Response 200**: Same as POST response

**Errors**: Same as POST, plus:
- `404 NOT_FOUND`: Transaction not found

---

### DELETE /api/portfolios/:portfolioId/transactions/:id
Delete transaction.

**Response 204**: No content

**Errors**:
- `401 UNAUTHORIZED`: Missing or invalid token
- `403 FORBIDDEN`: Transaction doesn't belong to user's portfolio
- `404 NOT_FOUND`: Transaction not found

---

### POST /api/portfolios/:portfolioId/transactions/bulk
Bulk import transactions.

**Request**:
```json
{
  "transactions": [
    {
      "symbol": "BTC",
      "side": "BUY",
      "quantity": 0.5,
      "price": 28000.00,
      "executed_at": "2025-10-01T10:30:00Z",
      "notes": "Initial purchase"
    },
    {
      "symbol": "ETH",
      "side": "BUY",
      "quantity": 10.0,
      "price": 1800.00,
      "executed_at": "2025-10-01T11:00:00Z",
      "notes": "Diversification trade"
    }
  ]
}
```

**Response 201**:
```json
{
  "data": {
    "imported": 2,
    "failed": 0,
    "transactions": [
      { "id": "uuid1", "symbol": "BTC", ... },
      { "id": "uuid2", "symbol": "ETH", ... }
    ]
  }
}
```

**Errors**:
- `400 TOO_MANY_TRANSACTIONS`: Exceeds 100 transaction limit (deferred clarification)
- `400 VALIDATION_ERRORS`: Array of per-transaction validation errors
- `401 UNAUTHORIZED`: Missing or invalid token
- `403 FORBIDDEN`: Portfolio doesn't belong to user

---

## Price Data Endpoints

### GET /api/prices
Get latest prices for supported symbols.

**Query Parameters**:
- `symbols` (optional): Comma-separated list (e.g., 'BTC,ETH'). If omitted, returns all 30+ symbols.

**Response 200**:
```json
{
  "data": {
    "prices": [
      {
        "symbol": "BTC",
        "price": 30000.00,
        "change_24h_abs": 750.00,
        "change_24h_pct": 2.5,
        "received_at": "2025-10-04T12:00:00Z",
        "is_stale": false
      }
    ],
    "updated_at": "2025-10-04T12:00:00Z"
  }
}
```

**Errors**: None (public endpoint)

---

### GET /api/prices/:symbol
Get latest price for single symbol.

**Response 200**:
```json
{
  "data": {
    "symbol": "BTC",
    "price": 30000.00,
    "change_24h_abs": 750.00,
    "change_24h_pct": 2.5,
    "received_at": "2025-10-04T12:00:00Z",
    "is_stale": false
  }
}
```

**Errors**:
- `404 NOT_FOUND`: Symbol not supported

---

## Chart Data Endpoints

### GET /api/portfolios/:portfolioId/chart
Get portfolio value snapshots for charting.

**Query Parameters**:
- `interval` (required): '24h' | '7d' | '30d' | '90d' | 'all'

**Response 200**:
```json
{
  "data": {
    "interval": "30d",
    "snapshots": [
      {
        "captured_at": "2025-09-04T00:00:00Z",
        "total_value": 14000.00
      },
      {
        "captured_at": "2025-09-05T00:00:00Z",
        "total_value": 14250.00
      }
    ],
    "current_value": 15234.56,
    "start_value": 14000.00,
    "change_abs": 1234.56,
    "change_pct": 8.81
  }
}
```

**Errors**:
- `400 INVALID_INTERVAL`: Interval not in allowed set
- `401 UNAUTHORIZED`: Missing or invalid token
- `403 FORBIDDEN`: Portfolio doesn't belong to user
- `404 NOT_FOUND`: Portfolio not found

---

## Supported Symbols

### GET /api/symbols
List all supported cryptocurrency symbols.

**Response 200**:
```json
{
  "data": {
    "symbols": [
      {
        "symbol": "BTC",
        "name": "Bitcoin",
        "logo_url": "https://..."
      },
      {
        "symbol": "ETH",
        "name": "Ethereum",
        "logo_url": "https://..."
      }
    ],
    "total": 30
  }
}
```

**Errors**: None (public endpoint)

---

## Rate Limiting

All authenticated endpoints: **100 requests per minute per user**

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696425600
```

**Error 429**:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Retry after 60 seconds.",
    "retry_after": 60
  }
}
```

---

## Contract Test Files

Contract tests (MSW mocks + Vitest) to be created in `__tests__/contract/`:

1. `auth.contract.test.ts` - Register, login, logout flows
2. `portfolios.contract.test.ts` - Portfolio CRUD operations
3. `transactions.contract.test.ts` - Transaction CRUD + bulk import
4. `prices.contract.test.ts` - Price data fetching
5. `charts.contract.test.ts` - Chart data endpoints

All tests must **fail initially** (TDD) and validate:
- Request/response schemas (Zod validation)
- Error codes and messages
- Authentication headers
- Rate limiting behaviors
