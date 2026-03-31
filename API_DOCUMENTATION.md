# API Documentation

Base URL: `/api/v1`

All responses follow this format:

```json
{
  "success": true,
  "message": "...",
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }  // only for paginated endpoints
}
```

Error responses:

```json
{
  "success": false,
  "message": "...",
  "errorCode": "ERR_001"
}
```

---

## 1. Customer / Auth

### 1.1 Send OTP

```
POST /customers/auth/send-otp
```

**Rate Limited:** 20 requests per 15 minutes.

**Body:**

| Field | Type   | Required | Description        |
|-------|--------|----------|--------------------|
| phone | string | Yes      | Phone number       |

**Internal Flow:**

1. Generate OTP → `"000000"` in dev, random 6-digit in production
2. Store OTP in memory map with 5-minute expiry, keyed by phone
3. Log OTP (in production, would send via SMS provider)
4. Return success message

**Response:** `200 OK`

```json
{ "success": true, "message": "OTP sent successfully", "data": { "message": "OTP sent successfully" } }
```

---

### 1.2 Verify OTP

```
POST /customers/auth/verify-otp
```

**Rate Limited:** 20 requests per 15 minutes.

**Body:**

| Field | Type   | Required | Description                 |
|-------|--------|----------|-----------------------------|
| phone | string | Yes      | Phone number                |
| otp   | string | Yes      | 6-digit OTP                 |
| name  | string | No       | Name (used for new accounts) |

**Internal Flow:**

1. Look up OTP from in-memory store by phone → `AUTH_OTP_EXPIRED` if not found
2. Check expiry → `AUTH_OTP_EXPIRED` if expired, deletes entry
3. Compare OTP value → `AUTH_OTP_INVALID` if mismatch
4. Delete OTP from store (single use)
5. Find customer by phone in DB
6. If customer exists but `isActive = false` → `AUTH_CUSTOMER_DEACTIVATED`
7. If customer does not exist → create new customer with `name` (or "Customer" as default), `isPhoneVerified = true`
8. If customer exists but `isPhoneVerified = false` → update to `true`
9. Generate JWT access token (14-day expiry) containing `{ customerId, phone, type: "access" }`
10. Return customer profile, token, and `isNewCustomer` flag

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "customer": { "id": "...", "name": "...", "phone": "...", "email": null, "isPhoneVerified": true, "isEmailVerified": false, "createdAt": "...", "updatedAt": "..." },
    "token": "eyJhbG...",
    "isNewCustomer": true
  }
}
```

**Error Codes:** `AUTH_OTP_EXPIRED`, `AUTH_OTP_INVALID`, `AUTH_CUSTOMER_DEACTIVATED`

---

### 1.3 Get Profile

```
GET /customers/me
```

**Auth:** Bearer token required (customer)

**Internal Flow:**

1. Extract `customerId` from JWT
2. Find customer by ID → `RESOURCE_NOT_FOUND` if not found
3. Return customer profile

**Response:** `200 OK`

---

### 1.4 Update Profile

```
PATCH /customers/me
```

**Auth:** Bearer token required (customer)

**Body:**

| Field | Type   | Required | Description     |
|-------|--------|----------|-----------------|
| name  | string | No       | Updated name    |
| email | string | No       | Updated email   |

**Internal Flow:**

1. Extract `customerId` from JWT
2. Update customer record — if email changes, `isEmailVerified` resets to `false`
3. Return updated profile

**Response:** `200 OK`

---

## 2. Address

All address endpoints require **Bearer token (customer)**.

### 2.1 List Addresses

```
GET /customers/me/addresses
```

**Internal Flow:**

1. Fetch all addresses for `customerId`
2. Sort by `isDefault DESC`, then `createdAt DESC`
3. Return array

**Response:** `200 OK`

---

### 2.2 Get Address

```
GET /customers/me/addresses/:id
```

**Internal Flow:**

1. Find address by `id` AND `customerId` (ownership check) → `RESOURCE_NOT_FOUND` if not found
2. Return address

**Response:** `200 OK`

**Error Codes:** `RESOURCE_NOT_FOUND`

---

### 2.3 Create Address

```
POST /customers/me/addresses
```

**Body:**

| Field        | Type    | Required | Description             |
|--------------|---------|----------|-------------------------|
| addressLine1 | string  | Yes      | Primary address line    |
| addressLine2 | string  | No       | Secondary address line  |
| landmark     | string  | No       | Nearby landmark         |
| city         | string  | Yes      | City                    |
| state        | string  | Yes      | State                   |
| postalCode   | string  | Yes      | Postal/ZIP code         |
| label        | string  | No       | Label (Home, Work, etc) |
| phone        | string  | No       | Contact phone           |
| latitude     | number  | No       | Latitude coordinate     |
| longitude    | number  | No       | Longitude coordinate    |
| isDefault    | boolean | No       | Set as default address  |

**Internal Flow:**

1. If `isDefault = true` → unset all other default addresses for this customer
2. Count existing addresses for customer
3. If this is the first address → auto-set `isDefault = true` regardless of input
4. Create address record
5. Return created address

**Response:** `201 Created`

---

### 2.4 Update Address

```
PATCH /customers/me/addresses/:id
```

**Body:** Same fields as create, all optional.

**Internal Flow:**

1. Find address by `id` + `customerId` → `RESOURCE_NOT_FOUND` if not found
2. If `isDefault = true` → unset all other defaults for this customer (except this one)
3. Update address record
4. Return updated address

**Response:** `200 OK`

**Error Codes:** `RESOURCE_NOT_FOUND`

---

### 2.5 Delete Address

```
DELETE /customers/me/addresses/:id
```

**Internal Flow:**

1. Find address by `id` + `customerId` → `RESOURCE_NOT_FOUND` if not found
2. Delete address
3. If deleted address was the default → find the most recent remaining address and set it as default

**Response:** `200 OK`

**Error Codes:** `RESOURCE_NOT_FOUND`

---

## 3. Category

### 3.1 List Categories

```
GET /categories
```

**Auth:** None

**Internal Flow:**

1. Fetch all categories where `isActive = true`
2. Sort by `sortOrder ASC`, then `name ASC`
3. Return array with product counts

**Response:** `200 OK`

---

### 3.2 Get Category

```
GET /categories/:id
```

**Auth:** None

**Internal Flow:**

1. Find category by `id` where `isActive = true` → `RESOURCE_NOT_FOUND` if not found
2. Return category with children array

**Response:** `200 OK`

**Error Codes:** `RESOURCE_NOT_FOUND`

---

## 4. Product

### 4.1 List Products

```
GET /products
```

**Auth:** None

**Query Parameters:**

| Param      | Type    | Default | Description                    |
|------------|---------|---------|--------------------------------|
| page       | number  | 1       | Page number                    |
| limit      | number  | 20      | Items per page (max 100)       |
| search     | string  | —       | Search in name & description   |
| categoryId | string  | —       | Filter by category UUID        |
| minPrice   | number  | —       | Minimum price filter           |
| maxPrice   | number  | —       | Maximum price filter           |
| featured   | boolean | —       | Filter featured products       |
| inStock    | boolean | —       | Filter by stock availability   |

**Internal Flow:**

1. Build `where` clause: `isActive = true` always applied
2. If `search` → add `OR` condition on `name CONTAINS` and `description CONTAINS`
3. If `categoryId` → filter by category
4. If `minPrice`/`maxPrice` → filter price range
5. If `featured` → filter `isFeatured`
6. If `inStock = true` → `stock > 0`; if `false` → `stock <= 0`
7. Run parallel queries: paginated product list + total count
8. Sort by `isFeatured DESC`, then `createdAt DESC`
9. Return products array with pagination meta

**Response:** `200 OK` with `meta`

---

### 4.2 Get Product

```
GET /products/:id
```

**Auth:** None

**Internal Flow:**

1. Find product by `id` where `isActive = true` → `RESOURCE_NOT_FOUND` if not found
2. Return product with full details (SKU, all images, category)

**Response:** `200 OK`

**Error Codes:** `RESOURCE_NOT_FOUND`

---

## 5. Product Pincode (Delivery Check)

### 5.1 Check Delivery Availability

```
GET /product-pincodes/check/:productId/:pincode
```

**Auth:** None

**Internal Flow:**

1. Find product by `productId` → `RESOURCE_NOT_FOUND` if not found
2. Look up pincode in `serviceablePincode` table
3. If pincode not found or `isActive = false` → return `{ deliverable: false }`
4. Check `productPincode` mapping for this product + pincode combination
5. If mapping exists → `deliverable: true` with city/state info
6. If no mapping → `deliverable: false` with city/state info

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Delivery availability checked",
  "data": { "deliverable": true, "pincode": "110001", "city": "New Delhi", "state": "Delhi" }
}
```

**Error Codes:** `RESOURCE_NOT_FOUND`

---

## 6. Coupon

### 6.1 Validate Coupon

```
POST /coupons/validate
```

**Auth:** Bearer token required (customer)

**Body:**

| Field         | Type   | Required | Description                      |
|---------------|--------|----------|----------------------------------|
| couponCode    | string | Yes      | Coupon code (auto trimmed & uppercased) |
| subtotal      | number | Yes      | Cart subtotal (must be positive) |
| paymentMethod | string | Yes      | `"COD"` or `"RAZORPAY"`         |

**Internal Flow (10-step validation):**

1. **Find coupon** by code (uppercased) → `CPN_001 COUPON_NOT_FOUND` if not found
2. **Check active** → `CPN_002 COUPON_INACTIVE` if `isActive = false`
3. **Check validFrom** → `CPN_004 COUPON_NOT_YET_VALID` if `validFrom > now`
4. **Check validUntil** → `CPN_003 COUPON_EXPIRED` if `validUntil < now`
5. **Customer restriction** → `CPN_006 COUPON_CUSTOMER_RESTRICTED` if coupon has `customerId` set and it doesn't match the requesting customer
6. **Payment method restriction** → `CPN_007 COUPON_PAYMENT_METHOD_MISMATCH` if coupon is locked to a specific payment method that doesn't match input
7. **Minimum order amount** → `CPN_008 COUPON_MIN_ORDER_NOT_MET` if `subtotal < minOrderAmount`
8. **First order only** → count customer's non-cancelled orders; `CPN_005 COUPON_FIRST_ORDER_ONLY` if count > 0
9. **Global max uses** → `CPN_009 COUPON_MAX_USES_REACHED` if `currentUses >= maxUses`
10. **Per-customer max uses** → count `CouponUsage` for this customer + coupon; `CPN_010 COUPON_MAX_USES_PER_CUSTOMER_REACHED` if limit reached
11. **Calculate discount:**
    - `PERCENTAGE` → `subtotal * discountValue / 100`, capped at `maxDiscountAmount` if set
    - `FLAT` → `min(discountValue, subtotal)` (discount can't exceed subtotal)
12. Return discount preview

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Coupon applied successfully",
  "data": {
    "couponId": "uuid",
    "code": "FIRST50",
    "description": "50% off on first order",
    "discountType": "PERCENTAGE",
    "discountValue": 50,
    "discountAmount": 150,
    "message": "Coupon applied successfully"
  }
}
```

**Error Codes:** `CPN_001` through `CPN_010`

---

## 7. Order

All order endpoints require **Bearer token (customer)**.

### 7.1 Create Order

```
POST /orders
```

**Body:**

| Field         | Type   | Required | Description                              |
|---------------|--------|----------|------------------------------------------|
| addressId     | string | Yes      | UUID of customer's address               |
| items         | array  | Yes      | At least 1 item                          |
| items[].productId | string | Yes  | Product UUID                             |
| items[].quantity  | number | Yes  | Positive integer                         |
| paymentMethod | string | Yes      | `"COD"` or `"RAZORPAY"`                 |
| couponCode    | string | No       | Coupon code (auto trimmed & uppercased)  |
| notes         | string | No       | Order notes (max 1000 chars)             |

**Internal Flow:**

1. **Validate customer** — find by `customerId` from JWT → `RESOURCE_NOT_FOUND` if not found
2. **Check customer active** → `AUTH_CUSTOMER_DEACTIVATED` if `isActive = false`
3. **Validate address** — find by `addressId` + `customerId` (ownership) → `RESOURCE_NOT_FOUND` if not found
4. **Fetch all products** by product IDs from items array
5. **Validate each product:**
   - Exists → `RESOURCE_NOT_FOUND` if missing
   - `isActive = true` → `VALIDATION_FAILED` if inactive
   - `stock >= quantity` → `VALIDATION_FAILED` if insufficient stock
6. **Calculate subtotal** — for each item: `productPrice × quantity`, sum all
7. **Set delivery charge** → `0` (hardcoded for now)
8. **Validate coupon** (if `couponCode` provided):
   - Call `validateCoupon(customerId, { couponCode, subtotal, paymentMethod })`
   - Runs all 10 validation steps from Section 6.1
   - Get `discountAmount` and `couponId`
   - If no coupon → discount = 0
9. **Calculate totalAmount** → `subtotal + deliveryCharge - discount`
10. **Create Razorpay order** (if `paymentMethod = "RAZORPAY"`):
    - Call Razorpay API with `amount` in paise (`totalAmount × 100`)
    - Get `razorpayOrderId` → `PAYMENT_RAZORPAY_ORDER_FAILED` on failure
11. **Snapshot delivery address** — copy address fields (not a reference, so future address changes don't affect the order)
12. **Execute database transaction:**
    - Generate order number (`ORD-{timestamp}{random}`)
    - Create `Order` with subtotal, deliveryCharge, discount, totalAmount, deliveryAddress snapshot, notes
    - Create `OrderItem` records (product name, image, price snapshots)
    - Create `Payment` record (method, status = PENDING, razorpayOrderId if applicable)
    - **Decrement stock** for each product
    - **Create CouponUsage** record (if coupon was applied) — links coupon, customer, and order
    - **Increment coupon `currentUses`** (if coupon was applied)
13. **Return order** — full order detail with items, payment info
14. **If Razorpay** → also return `razorpayCheckout` object (razorpayOrderId, razorpayKeyId, amount in paise, currency)

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-ABC123",
    "customerId": "uuid",
    "status": "PENDING",
    "subtotal": 500,
    "deliveryCharge": 0,
    "discount": 150,
    "totalAmount": 350,
    "deliveryAddress": { "addressLine1": "...", "city": "...", "state": "...", "postalCode": "..." },
    "notes": null,
    "items": [
      { "id": "uuid", "productId": "uuid", "productName": "...", "productImage": "...", "productPrice": 500, "quantity": 1, "totalPrice": 500 }
    ],
    "payment": { "id": "uuid", "method": "COD", "status": "PENDING", "amount": 350, "razorpayOrderId": null, "razorpayPaymentId": null },
    "couponUsage": { "coupon": { "code": "FIRST50", "description": "...", "discountType": "PERCENTAGE", "discountValue": 50 } },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

For `RAZORPAY` payment method, `data` also includes:

```json
{
  "razorpayCheckout": {
    "razorpayOrderId": "order_abc123",
    "razorpayKeyId": "rzp_...",
    "amount": 35000,
    "currency": "INR"
  }
}
```

**Error Codes:** `RESOURCE_NOT_FOUND`, `AUTH_CUSTOMER_DEACTIVATED`, `VALIDATION_FAILED`, `PAYMENT_RAZORPAY_ORDER_FAILED`, `CPN_001`–`CPN_010`

---

### 7.2 List Orders

```
GET /orders
```

**Query Parameters:**

| Param | Type   | Default | Description              |
|-------|--------|---------|--------------------------|
| page  | number | 1       | Page number              |
| limit | number | 20      | Items per page (max 100) |

**Internal Flow:**

1. Fetch orders for `customerId` with pagination
2. Sort by `createdAt DESC`
3. Return order summaries (no items detail, includes item count and payment)

**Response:** `200 OK` with `meta`

---

### 7.3 Get Order Detail

```
GET /orders/:id
```

**Internal Flow:**

1. Find order by `id` + `customerId` (ownership) → `RESOURCE_NOT_FOUND` if not found
2. Return full order with items, payment, coupon usage

**Response:** `200 OK`

**Error Codes:** `RESOURCE_NOT_FOUND`

---

### 7.4 Update Order Status

```
PATCH /orders/:id/status
```

**Body:**

| Field  | Type   | Required | Description                                                            |
|--------|--------|----------|------------------------------------------------------------------------|
| status | string | Yes      | One of: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `RETURNED` |

**Internal Flow:**

1. Find order by `id` + `customerId` → `RESOURCE_NOT_FOUND` if not found
2. Update order status
3. Return updated order

**Response:** `200 OK`

**Error Codes:** `RESOURCE_NOT_FOUND`

---

### 7.5 Cancel Order

```
PATCH /orders/:id/cancel
```

**Internal Flow:**

1. Find order by `id` + `customerId` with items and payment → `RESOURCE_NOT_FOUND` if not found
2. **Check status** → `VALIDATION_FAILED` if status is not `PENDING` or `CONFIRMED`
3. **Check Razorpay payment** → `VALIDATION_FAILED` if payment method is RAZORPAY and status is PAID (must request refund instead)
4. **Execute database transaction:**
   - Set order status to `CANCELLED`
   - **Restore stock** for each order item (increment by quantity)
   - If payment exists and status is `PENDING` → set payment status to `FAILED`
5. Return cancelled order

**Response:** `200 OK`

**Error Codes:** `RESOURCE_NOT_FOUND`, `VALIDATION_FAILED`

---

## 8. Payment

### 8.1 Razorpay Webhook

```
POST /payments/webhook/razorpay
```

**Auth:** None (validated via webhook signature)

**Headers:**

| Header                    | Description               |
|---------------------------|---------------------------|
| x-razorpay-signature      | HMAC-SHA256 signature     |

**Internal Flow:**

1. **Verify signature** — compute HMAC-SHA256 of raw body using webhook secret, timing-safe compare → `PAYMENT_WEBHOOK_INVALID_SIGNATURE` if mismatch
2. **Extract payment entity** from webhook payload (event, order_id, payment_id)
3. **Find payment** by `razorpayOrderId` → log warning and return if not found
4. **Idempotency check** → skip if payment already `PAID` or `FAILED`
5. **If event = `payment.captured`:**
   - **Transaction:** update payment status to `PAID` + set `razorpayPaymentId`, update order status to `CONFIRMED`
6. **If event = `payment.failed`:**
   - Update payment status to `FAILED` + set `razorpayPaymentId`

**Response:** `200 OK`

```json
{ "success": true, "message": "Webhook processed" }
```

**Error Codes:** `PAYMENT_WEBHOOK_INVALID_SIGNATURE`

---

## Authentication

Two types of auth middleware:

| Middleware               | Used By                                    | Token Payload                        |
|--------------------------|--------------------------------------------|--------------------------------------|
| `customerAuthMiddleware` | Addresses, Orders, Coupons, Customer profile | `{ customerId, phone, type: "access" }` |
| `authMiddleware`         | Admin endpoints (if applicable)            | `{ userId, email, type: "access" }`  |

Token is passed via `Authorization: Bearer <token>` header.

**Token errors:**
- Missing/malformed → `401` with `AUTH_TOKEN_INVALID`
- Expired → `401` with `AUTH_TOKEN_EXPIRED`
- Wrong type → `401` with `AUTH_TOKEN_INVALID`

---

## Error Code Reference

| Code      | Constant                            | Description                                   |
|-----------|-------------------------------------|-----------------------------------------------|
| AUTH_001  | AUTH_EMAIL_EXISTS                    | Email already registered                      |
| AUTH_002  | AUTH_INVALID_CREDENTIALS            | Invalid login credentials                     |
| AUTH_003  | AUTH_TOKEN_EXPIRED                  | JWT token has expired                         |
| AUTH_004  | AUTH_TOKEN_INVALID                  | JWT token is invalid or malformed             |
| AUTH_005  | AUTH_ACCOUNT_DEACTIVATED            | Admin account deactivated                     |
| AUTH_006  | AUTH_INSUFFICIENT_PERMISSION        | Insufficient role/permissions                 |
| AUTH_007  | AUTH_OTP_EXPIRED                    | OTP not found or expired                      |
| AUTH_008  | AUTH_OTP_INVALID                    | OTP code doesn't match                        |
| AUTH_009  | AUTH_PHONE_REQUIRED                 | Phone number required                         |
| AUTH_010  | AUTH_CUSTOMER_DEACTIVATED           | Customer account deactivated                  |
| VAL_001   | VALIDATION_FAILED                   | Request body/params validation failed         |
| RES_001   | RESOURCE_NOT_FOUND                  | Requested resource not found                  |
| RES_002   | RESOURCE_ALREADY_EXISTS             | Resource already exists (duplicate)           |
| CPN_001   | COUPON_NOT_FOUND                    | Coupon code doesn't exist                     |
| CPN_002   | COUPON_INACTIVE                     | Coupon is deactivated                         |
| CPN_003   | COUPON_EXPIRED                      | Coupon validity period has ended              |
| CPN_004   | COUPON_NOT_YET_VALID                | Coupon validity period hasn't started          |
| CPN_005   | COUPON_FIRST_ORDER_ONLY             | Coupon is for first orders only               |
| CPN_006   | COUPON_CUSTOMER_RESTRICTED          | Coupon is assigned to a different customer    |
| CPN_007   | COUPON_PAYMENT_METHOD_MISMATCH      | Coupon doesn't support the chosen payment method |
| CPN_008   | COUPON_MIN_ORDER_NOT_MET            | Subtotal is below coupon minimum              |
| CPN_009   | COUPON_MAX_USES_REACHED             | Coupon global usage limit reached             |
| CPN_010   | COUPON_MAX_USES_PER_CUSTOMER_REACHED | Customer has used this coupon max times       |
| PAY_001   | PAYMENT_WEBHOOK_INVALID_SIGNATURE   | Razorpay webhook signature mismatch           |
| PAY_002   | PAYMENT_RAZORPAY_ORDER_FAILED       | Failed to create Razorpay order               |
| SRV_001   | INTERNAL_ERROR                      | Unexpected server error                       |
| SRV_002   | SERVICE_UNAVAILABLE                 | Service temporarily unavailable               |

---

## Complete Endpoint Summary

| Method | Endpoint                                    | Auth     | Description                   |
|--------|---------------------------------------------|----------|-------------------------------|
| POST   | `/customers/auth/send-otp`                  | No       | Send OTP to phone             |
| POST   | `/customers/auth/verify-otp`                | No       | Verify OTP & login/register   |
| GET    | `/customers/me`                             | Customer | Get profile                   |
| PATCH  | `/customers/me`                             | Customer | Update profile                |
| GET    | `/customers/me/addresses`                   | Customer | List addresses                |
| GET    | `/customers/me/addresses/:id`               | Customer | Get address                   |
| POST   | `/customers/me/addresses`                   | Customer | Create address                |
| PATCH  | `/customers/me/addresses/:id`               | Customer | Update address                |
| DELETE | `/customers/me/addresses/:id`               | Customer | Delete address                |
| GET    | `/categories`                               | No       | List categories               |
| GET    | `/categories/:id`                           | No       | Get category detail           |
| GET    | `/products`                                 | No       | List products (paginated)     |
| GET    | `/products/:id`                             | No       | Get product detail            |
| GET    | `/product-pincodes/check/:productId/:pincode` | No    | Check delivery availability   |
| POST   | `/coupons/validate`                         | Customer | Validate coupon & preview discount |
| POST   | `/orders`                                   | Customer | Create order                  |
| GET    | `/orders`                                   | Customer | List orders (paginated)       |
| GET    | `/orders/:id`                               | Customer | Get order detail              |
| PATCH  | `/orders/:id/status`                        | Customer | Update order status           |
| PATCH  | `/orders/:id/cancel`                        | Customer | Cancel order                  |
| POST   | `/payments/webhook/razorpay`                | Webhook  | Razorpay payment webhook      |
