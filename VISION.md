# 🛒 E-Commerce Backend — Project Vision

## Overview

A production-grade e-commerce backend API built with Node.js, Express, TypeScript, and Prisma. The system powers a complete online shopping experience — from product discovery to order fulfillment.

---

## Core Objectives

1. **Robust Product Catalog** — Hierarchical categories, searchable/filterable product listings with variants, pricing, and inventory tracking.
2. **Seamless Cart & Checkout** — Persistent shopping cart with real-time stock validation and smooth order placement.
3. **Secure Payments** — Integration-ready payment processing with transaction tracking and refund support.
4. **Order Lifecycle Management** — Full order tracking from placement through processing, shipping, and delivery.
5. **User Management** — Secure authentication (JWT), user profiles, address book, and order history.
6. **Extensible Architecture** — Modular design that makes adding future capabilities (admin panel, analytics, etc.) straightforward.

---

## Planned Modules

| # | Module | Description | Key Endpoints |
|---|---|---|---|
| 1 | **Auth** | Registration, login, JWT tokens, password reset | `/auth/register`, `/auth/login`, `/auth/refresh-token` |
| 2 | **Users** | Profile management, addresses, account settings | `/users/me`, `/users/addresses` |
| 3 | **Categories** | Hierarchical product categories (parent/child) | `/categories`, `/categories/:uuid` |
| 4 | **Products** | Product CRUD, search, filters, variants, images | `/products`, `/products/:uuid`, `/products/search` |
| 5 | **Cart** | Add/remove/update cart items, cart summary | `/cart`, `/cart/items`, `/cart/clear` |
| 6 | **Orders** | Place order, order history, order details, status | `/orders`, `/orders/:uuid`, `/orders/:uuid/cancel` |
| 7 | **Payments** | Payment processing, transaction records, refunds | `/payments/initiate`, `/payments/verify`, `/payments/webhook` |
| 8 | **Reviews** | Product ratings & reviews by verified buyers | `/products/:uuid/reviews` |
| 9 | **Wishlist** | Save products for later | `/wishlist` |

> [!NOTE]
> **Admin operations** (product/category creation, order status updates, user management) will be handled **directly via database** for now. The modular architecture allows adding a dedicated Admin module later with minimal effort — just create `src/modules/admin/` following the standard module structure.

---

## Database Design (High-Level)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  AuthUser   │──────▶│   Address    │       │  Category   │
│             │       └─────────────┘       │  (self-ref) │
│             │                              └──────┬──────┘
│             │       ┌─────────────┐              │
│             │──────▶│   Order     │       ┌──────▼──────┐
│             │       │             │◀──────│  Product    │
│             │       │             │       │             │
│             │       └──────┬──────┘       └──────┬──────┘
│             │              │                     │
│             │       ┌──────▼──────┐       ┌──────▼──────┐
│             │       │ OrderItem   │       │ProductVariant│
│             │       └─────────────┘       └─────────────┘
│             │
│             │──────▶│  CartItem   │──────▶│  Product    │
│             │       └─────────────┘       └─────────────┘
│             │
│             │──────▶│   Review    │──────▶│  Product    │
│             │       └─────────────┘       └─────────────┘
│             │
│             │──────▶│  Payment    │──────▶│   Order     │
└─────────────┘       └─────────────┘       └─────────────┘
```

**Every table follows the project conventions:**
- Dual-ID: auto-increment `id` (internal) + `uuid` (public API)
- Audit: `createdAt`, `createdBy`, `updatedAt`, `updatedBy`
- Naming: `camelCase` in code → `snake_case` in DB via `@map`/`@@map`

---

## User Roles

| Role | Access | Managed Via |
|---|---|---|
| `CUSTOMER` | Browse, cart, checkout, order history, reviews, profile | API |
| `ADMIN` | Full access — reserved for future admin panel | Database (direct) for now |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (v20+) |
| Framework | Express.js |
| Language | TypeScript (strict mode) |
| ORM | Prisma |
| Database | PostgreSQL |
| Validation | Zod |
| Auth | JWT (access + refresh tokens) |
| Logging | Winston |
| Testing | Vitest + Supertest |
| Containerization | Docker + docker-compose |

---

## API Design Principles

- RESTful with `/api/v1` base path
- Standardized JSON responses (`success`, `message`, `data`, `meta`)
- Zod-validated request inputs on every endpoint
- JWT-protected routes with role-based access
- Paginated list endpoints with search & filters
- UUID-based public resource identifiers
- Conventional commits & atomic branching

---

## Development Phases

### Phase 1 — Foundation
- [x] Project structure & skill conventions
- [ ] Express app setup, middleware stack, error handling
- [ ] Prisma schema (AuthUser, Category, Product)
- [ ] Auth module (register, login, JWT, refresh)
- [ ] Users module (profile, addresses)

### Phase 2 — Catalog
- [ ] Categories module (CRUD, hierarchy)
- [ ] Products module (CRUD, search, filters, images)
- [ ] Product variants & inventory tracking

### Phase 3 — Commerce
- [ ] Cart module (add, remove, update, clear)
- [ ] Orders module (place, list, detail, cancel)
- [ ] Payments module (initiate, verify, webhook)

### Phase 4 — Engagement & Polish
- [ ] Reviews module (create, list, verified buyer badge)
- [ ] Wishlist module
- [ ] Performance optimization (caching, query tuning)
- [ ] API rate limiting fine-tuning
- [ ] Comprehensive test coverage

### Phase 5 *(Future)* — Admin Panel
> Not in current scope. Admin operations are managed directly in the database.
> When ready, create `src/modules/admin/` following standard module conventions.
- [ ] Admin module (dashboard, management, analytics)
- [ ] Role-based admin endpoints
- [ ] Business reporting & metrics

---

## Success Criteria

- All endpoints follow the modular architecture defined in `SKILL.md`
- Clean separation: route → controller → service → Prisma
- Type-safe end-to-end with Zod + TypeScript + Prisma
- Zero `any` types, zero `console.log`, zero hardcoded secrets
- 80%+ test coverage on business logic
- Production-ready Docker deployment
