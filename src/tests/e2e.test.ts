import crypto from "crypto";
import { describe, it, expect, beforeAll } from "vitest";
import { env } from "../config/env.config.js";
import { razorpay } from "../config/razorpay.config.js";
import {
  request,
  getAuthToken,
  authGet,
  authPost,
  authPatch,
  authDelete,
} from "./helpers/setup.js";

// ─── Shared state ─────────────────────────────────────────────────────────────
const ctx: Record<string, string> = {};

// Helper to create a valid webhook request with HMAC signature
function webhookRequest(payload: object) {
  const bodyString = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(bodyString)
    .digest("hex");

  return request
    .post("/api/v1/payments/webhook/razorpay")
    .set("x-razorpay-signature", signature)
    .send(payload);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP — Auth + Address + Product IDs needed by later tests
// ═══════════════════════════════════════════════════════════════════════════════
beforeAll(async () => {
  // Auth — get token
  const auth = await getAuthToken("9999900001", "E2E Test User");
  ctx.token = auth.token;
  ctx.customerId = auth.customerId;

  // Create address for orders
  const addrRes = await authPost(
    "/api/v1/customers/me/addresses",
    ctx.token
  ).send({
    label: "E2E Home",
    addressLine1: "123 Test Street",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
  });
  ctx.addressId = addrRes.body.data.id;

  // Find an in-stock product
  const prodRes = await request.get("/api/v1/products?inStock=true&limit=5");
  ctx.productId = prodRes.body.data[0].id;

  // Find out-of-stock product (if exists)
  const oosRes = await request.get("/api/v1/products?inStock=false");
  if (oosRes.body.data?.length > 0) {
    ctx.outOfStockProductId = oosRes.body.data[0].id;
  }

  // Find a second in-stock product
  const otherProducts = prodRes.body.data.filter(
    (p: { id: string }) => p.id !== ctx.productId
  );
  if (otherProducts.length > 0) {
    ctx.secondProductId = otherProducts[0].id;
  }

  // Get a category ID
  const catRes = await request.get("/api/v1/categories");
  ctx.categoryId = catRes.body.data[0].id;
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════════
describe("Health Check", () => {
  it("GET /health → 200", async () => {
    const res = await request.get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. AUTH FLOW
// ═══════════════════════════════════════════════════════════════════════════════
describe("Auth — OTP Flow", () => {
  const phone = "9999900002"; // separate phone for auth-specific tests

  it("POST /send-otp → success", async () => {
    const res = await request
      .post("/api/v1/customers/auth/send-otp")
      .send({ phone });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /send-otp → validation error (missing phone)", async () => {
    const res = await request
      .post("/api/v1/customers/auth/send-otp")
      .send({});
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it("POST /verify-otp → wrong OTP → AUTH_008", async () => {
    await request.post("/api/v1/customers/auth/send-otp").send({ phone });
    const res = await request
      .post("/api/v1/customers/auth/verify-otp")
      .send({ phone, otp: "111111" });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("AUTH_008");
  });

  it("POST /verify-otp → success", async () => {
    await request.post("/api/v1/customers/auth/send-otp").send({ phone });
    const res = await request
      .post("/api/v1/customers/auth/verify-otp")
      .send({ phone, otp: "000000", name: "Auth Test" });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.customer.phone).toBe(phone);
  });

  it("POST /verify-otp → existing customer → 200", async () => {
    await request.post("/api/v1/customers/auth/send-otp").send({ phone });
    const res = await request
      .post("/api/v1/customers/auth/verify-otp")
      .send({ phone, otp: "000000" });
    expect(res.status).toBe(200);
    expect(res.body.data.isNewCustomer).toBe(false);
  });

  it("Protected route without token → 401", async () => {
    const res = await request.get("/api/v1/customers/me");
    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe("AUTH_004");
  });

  it("Protected route with invalid token → 401", async () => {
    const res = await request
      .get("/api/v1/customers/me")
      .set("Authorization", "Bearer invalid-token");
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CUSTOMER PROFILE
// ═══════════════════════════════════════════════════════════════════════════════
describe("Customer Profile", () => {
  it("GET /customers/me → profile", async () => {
    const res = await authGet("/api/v1/customers/me", ctx.token);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ctx.customerId);
    expect(res.body.data.phone).toBe("9999900001");
  });

  it("PATCH /customers/me → update name", async () => {
    const res = await authPatch("/api/v1/customers/me", ctx.token).send({
      name: "Updated Name",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Name");
  });

  it("PATCH /customers/me → update email", async () => {
    const res = await authPatch("/api/v1/customers/me", ctx.token).send({
      email: "e2e@test.com",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("e2e@test.com");
    expect(res.body.data.isEmailVerified).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ADDRESS CRUD
// ═══════════════════════════════════════════════════════════════════════════════
describe("Address Management", () => {
  let newAddrId: string;

  it("POST /addresses → create address", async () => {
    const res = await authPost(
      "/api/v1/customers/me/addresses",
      ctx.token
    ).send({
      label: "Office",
      addressLine1: "456 Work Road",
      city: "New Delhi",
      state: "Delhi",
      postalCode: "110001",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.label).toBe("Office");
    expect(res.body.data.id).toBeDefined();
    newAddrId = res.body.data.id;
  });

  it("GET /addresses → list all", async () => {
    const res = await authGet("/api/v1/customers/me/addresses", ctx.token);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /addresses/:id → single address", async () => {
    const res = await authGet(
      `/api/v1/customers/me/addresses/${newAddrId}`,
      ctx.token
    );
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(newAddrId);
  });

  it("PATCH /addresses/:id → update address", async () => {
    const res = await authPatch(
      `/api/v1/customers/me/addresses/${newAddrId}`,
      ctx.token
    ).send({ label: "Office Updated", landmark: "Near Metro" });
    expect(res.status).toBe(200);
    expect(res.body.data.label).toBe("Office Updated");
    expect(res.body.data.landmark).toBe("Near Metro");
  });

  it("PATCH /addresses/:id → set as default", async () => {
    const res = await authPatch(
      `/api/v1/customers/me/addresses/${newAddrId}`,
      ctx.token
    ).send({ isDefault: true });
    expect(res.status).toBe(200);
    expect(res.body.data.isDefault).toBe(true);
  });

  it("GET /addresses/:id → not found", async () => {
    const res = await authGet(
      "/api/v1/customers/me/addresses/00000000-0000-0000-0000-000000000000",
      ctx.token
    );
    expect(res.status).toBe(404);
  });

  it("DELETE /addresses/:id → delete address", async () => {
    const res = await authDelete(
      `/api/v1/customers/me/addresses/${newAddrId}`,
      ctx.token
    );
    expect(res.status).toBe(200);
  });

  it("GET deleted address → 404", async () => {
    const res = await authGet(
      `/api/v1/customers/me/addresses/${newAddrId}`,
      ctx.token
    );
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════
describe("Categories", () => {
  it("GET /categories → list all active", async () => {
    const res = await request.get("/api/v1/categories");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it("GET /categories/:id → single category", async () => {
    const res = await request.get(`/api/v1/categories/${ctx.categoryId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ctx.categoryId);
  });

  it("GET /categories/:id → not found", async () => {
    const res = await request.get(
      "/api/v1/categories/00000000-0000-0000-0000-000000000000"
    );
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════
describe("Products", () => {
  it("GET /products → default list with pagination", async () => {
    const res = await request.get("/api/v1/products");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
  });

  it("GET /products?search=earbuds → search filter", async () => {
    const res = await request.get("/api/v1/products?search=earbuds");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].name.toLowerCase()).toContain("earbuds");
  });

  it("GET /products?categoryId=... → category filter", async () => {
    const res = await request.get(
      `/api/v1/products?categoryId=${ctx.categoryId}`
    );
    expect(res.status).toBe(200);
    for (const p of res.body.data) {
      expect(p.category.id).toBe(ctx.categoryId);
    }
  });

  it("GET /products?featured=true → featured only", async () => {
    const res = await request.get("/api/v1/products?featured=true");
    expect(res.status).toBe(200);
    for (const p of res.body.data) {
      expect(p.isFeatured).toBe(true);
    }
  });

  it("GET /products?inStock=true → in stock only", async () => {
    const res = await request.get("/api/v1/products?inStock=true");
    expect(res.status).toBe(200);
    for (const p of res.body.data) {
      expect(p.stock).toBeGreaterThan(0);
    }
  });

  it("GET /products?minPrice=1000&maxPrice=2000 → price range", async () => {
    const res = await request.get(
      "/api/v1/products?minPrice=1000&maxPrice=2000"
    );
    expect(res.status).toBe(200);
    for (const p of res.body.data) {
      expect(Number(p.price)).toBeGreaterThanOrEqual(1000);
      expect(Number(p.price)).toBeLessThanOrEqual(2000);
    }
  });

  it("GET /products?page=1&limit=2 → pagination", async () => {
    const res = await request.get("/api/v1/products?page=1&limit=2");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.meta.limit).toBe(2);
  });

  it("GET /products/:id → product detail", async () => {
    const res = await request.get(`/api/v1/products/${ctx.productId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ctx.productId);
  });

  it("GET /products/:id → not found", async () => {
    const res = await request.get(
      "/api/v1/products/00000000-0000-0000-0000-000000000000"
    );
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. PRODUCT PINCODE — DELIVERY CHECK
// ═══════════════════════════════════════════════════════════════════════════════
describe("Product Pincode — Delivery Check", () => {
  it("deliverable pincode", async () => {
    const res = await request.get(
      `/api/v1/product-pincodes/check/${ctx.productId}/400001`
    );
    expect(res.status).toBe(200);
    expect(res.body.data.deliverable).toBe(true);
    expect(res.body.data.city).toBeDefined();
  });

  it("inactive pincode → not deliverable", async () => {
    const res = await request.get(
      `/api/v1/product-pincodes/check/${ctx.productId}/999999`
    );
    expect(res.status).toBe(200);
    expect(res.body.data.deliverable).toBe(false);
  });

  it("unknown pincode → not deliverable", async () => {
    const res = await request.get(
      `/api/v1/product-pincodes/check/${ctx.productId}/123456`
    );
    expect(res.status).toBe(200);
    expect(res.body.data.deliverable).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. COUPONS
// ═══════════════════════════════════════════════════════════════════════════════
describe("Coupons", () => {
  it("GET /coupons/offers → public featured (no auth)", async () => {
    const res = await request.get("/api/v1/coupons/offers");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    for (const c of res.body.data) {
      expect(c.isFeatured).toBe(true);
    }
  });

  it("GET /coupons → 401 without auth", async () => {
    const res = await request.get("/api/v1/coupons");
    expect(res.status).toBe(401);
  });

  it("GET /coupons → list (authenticated, no internal fields)", async () => {
    const res = await authGet("/api/v1/coupons", ctx.token);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const coupon = res.body.data[0];
    expect(coupon.code).toBeDefined();
    expect(coupon.discountType).toBeDefined();
    expect(coupon.currentUses).toBeUndefined();
    expect(coupon.maxUses).toBeUndefined();
  });

  it("validate SAVE10 → percentage discount (or limit reached)", async () => {
    const res = await authPost("/api/v1/coupons/validate", ctx.token).send({
      couponCode: "SAVE10",
      subtotal: 1000,
      paymentMethod: "COD",
    });
    if (res.status === 200) {
      expect(res.body.data.code).toBe("SAVE10");
      expect(res.body.data.discountType).toBe("PERCENTAGE");
      expect(res.body.data.discountAmount).toBe(100);
    } else {
      // maxUsesPerCustomer reached from prior runs
      expect(res.status).toBe(400);
      expect(["CPN_009", "CPN_010"]).toContain(res.body.errorCode);
    }
  });

  it("validate FLAT100 → flat 100 off (or limit reached)", async () => {
    const res = await authPost("/api/v1/coupons/validate", ctx.token).send({
      couponCode: "FLAT100",
      subtotal: 1500,
      paymentMethod: "COD",
    });
    if (res.status === 200) {
      expect(res.body.data.discountAmount).toBe(100);
    } else {
      expect(res.status).toBe(400);
      expect(["CPN_009", "CPN_010"]).toContain(res.body.errorCode);
    }
  });

  it("validate → coupon not found", async () => {
    const res = await authPost("/api/v1/coupons/validate", ctx.token).send({
      couponCode: "DOESNOTEXIST",
      subtotal: 1000,
      paymentMethod: "COD",
    });
    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe("CPN_001");
  });

  it("validate → min order not met", async () => {
    const res = await authPost("/api/v1/coupons/validate", ctx.token).send({
      couponCode: "SAVE10",
      subtotal: 100,
      paymentMethod: "COD",
    });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("CPN_008");
  });

  it("validate CODONLY50 + RAZORPAY → payment mismatch", async () => {
    const res = await authPost("/api/v1/coupons/validate", ctx.token).send({
      couponCode: "CODONLY50",
      subtotal: 1000,
      paymentMethod: "RAZORPAY",
    });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("CPN_007");
  });

  it("validate CODONLY50 + COD → success", async () => {
    const res = await authPost("/api/v1/coupons/validate", ctx.token).send({
      couponCode: "CODONLY50",
      subtotal: 1000,
      paymentMethod: "COD",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.discountAmount).toBe(50);
  });

  it("validate → max discount cap (10% of 5000=500, capped 200)", async () => {
    const res = await authPost("/api/v1/coupons/validate", ctx.token).send({
      couponCode: "SAVE10",
      subtotal: 5000,
      paymentMethod: "COD",
    });
    if (res.status === 200) {
      expect(res.body.data.discountAmount).toBe(200);
    } else {
      // per-customer usage limit reached
      expect(res.status).toBe(400);
    }
  });

  it("validate → missing fields → 400/422", async () => {
    const res = await authPost("/api/v1/coupons/validate", ctx.token).send(
      {}
    );
    expect([400, 422]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. ORDER — COD FLOW
// ═══════════════════════════════════════════════════════════════════════════════
describe("Order — COD Flow", () => {
  it("create COD order (no coupon)", async () => {
    const res = await authPost("/api/v1/orders", ctx.token).send({
      addressId: ctx.addressId,
      items: [{ productId: ctx.productId, quantity: 1 }],
      paymentMethod: "COD",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("PENDING");
    expect(res.body.data.payment.method).toBe("COD");
    expect(res.body.data.payment.status).toBe("PENDING");
    expect(Number(res.body.data.discount)).toBe(0);
    expect(res.body.data.items.length).toBe(1);
    ctx.codOrderId = res.body.data.id;
  });

  it("create COD order with coupon (if eligible)", async () => {
    // Check if CODONLY50 is still usable (no per-customer limit)
    const res = await authPost("/api/v1/orders", ctx.token).send({
      addressId: ctx.addressId,
      items: [{ productId: ctx.productId, quantity: 2 }],
      paymentMethod: "COD",
      couponCode: "CODONLY50",
    });
    if (res.status === 201) {
      expect(Number(res.body.data.discount)).toBe(50);
    } else {
      // Coupon limit reached — verify it was a coupon error, not a system error
      expect(res.status).toBe(400);
    }
  });

  it("create COD order with CODONLY50 → discount 50", async () => {
    const res = await authPost("/api/v1/orders", ctx.token).send({
      addressId: ctx.addressId,
      items: [{ productId: ctx.productId, quantity: 2 }],
      paymentMethod: "COD",
      couponCode: "CODONLY50",
    });
    expect(res.status).toBe(201);
    expect(Number(res.body.data.discount)).toBe(50);
  });

  it("invalid address → 404", async () => {
    const res = await authPost("/api/v1/orders", ctx.token).send({
      addressId: "00000000-0000-0000-0000-000000000000",
      items: [{ productId: ctx.productId, quantity: 1 }],
      paymentMethod: "COD",
    });
    expect(res.status).toBe(404);
  });

  it("out-of-stock product → 400", async () => {
    if (!ctx.outOfStockProductId) return;
    const res = await authPost("/api/v1/orders", ctx.token).send({
      addressId: ctx.addressId,
      items: [{ productId: ctx.outOfStockProductId, quantity: 1 }],
      paymentMethod: "COD",
    });
    expect(res.status).toBe(400);
  });

  it("invalid product → 404", async () => {
    const res = await authPost("/api/v1/orders", ctx.token).send({
      addressId: ctx.addressId,
      items: [
        {
          productId: "00000000-0000-0000-0000-000000000000",
          quantity: 1,
        },
      ],
      paymentMethod: "COD",
    });
    expect(res.status).toBe(404);
  });

  it("empty items → 400/422", async () => {
    const res = await authPost("/api/v1/orders", ctx.token).send({
      addressId: ctx.addressId,
      items: [],
      paymentMethod: "COD",
    });
    expect([400, 422]).toContain(res.status);
  });

  it("coupon payment mismatch → CPN_007", async () => {
    const res = await authPost("/api/v1/orders", ctx.token).send({
      addressId: ctx.addressId,
      items: [{ productId: ctx.productId, quantity: 1 }],
      paymentMethod: "RAZORPAY",
      couponCode: "CODONLY50",
    });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("CPN_007");
  });

  it("list orders", async () => {
    const res = await authGet("/api/v1/orders", ctx.token);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.meta).toBeDefined();
  });

  it("list orders paginated", async () => {
    const res = await authGet("/api/v1/orders?page=1&limit=2", ctx.token);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });

  it("get order detail", async () => {
    const res = await authGet(
      `/api/v1/orders/${ctx.codOrderId}`,
      ctx.token
    );
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ctx.codOrderId);
    expect(res.body.data.items).toBeDefined();
    expect(res.body.data.payment).toBeDefined();
    expect(res.body.data.deliveryAddress).toBeDefined();
  });

  it("get order → not found", async () => {
    const res = await authGet(
      "/api/v1/orders/00000000-0000-0000-0000-000000000000",
      ctx.token
    );
    expect(res.status).toBe(404);
  });

  it("update status → CONFIRMED", async () => {
    const res = await authPatch(
      `/api/v1/orders/${ctx.codOrderId}/status`,
      ctx.token
    ).send({ status: "CONFIRMED" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CONFIRMED");
  });

  it("cancel CONFIRMED COD order", async () => {
    const res = await authPatch(
      `/api/v1/orders/${ctx.codOrderId}/cancel`,
      ctx.token
    );
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CANCELLED");
  });

  it("cancel already cancelled → 400", async () => {
    const res = await authPatch(
      `/api/v1/orders/${ctx.codOrderId}/cancel`,
      ctx.token
    );
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. ORDER — RAZORPAY FLOW (REAL API)
// ═══════════════════════════════════════════════════════════════════════════════
describe("Order — Razorpay Flow (Real API)", () => {
  it("create Razorpay order → order created on Razorpay", async () => {
    const res = await authPost("/api/v1/orders", ctx.token).send({
      addressId: ctx.addressId,
      items: [{ productId: ctx.productId, quantity: 1 }],
      paymentMethod: "RAZORPAY",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("PENDING");
    expect(res.body.data.payment.method).toBe("RAZORPAY");
    expect(res.body.data.payment.status).toBe("PENDING");
    expect(res.body.data.razorpayCheckout).toBeDefined();
    expect(res.body.data.razorpayCheckout.razorpayOrderId).toBeDefined();
    expect(res.body.data.razorpayCheckout.razorpayKeyId).toBe(
      env.RAZORPAY_KEY_ID
    );
    expect(res.body.data.razorpayCheckout.amount).toBeGreaterThan(0);
    expect(res.body.data.razorpayCheckout.currency).toBe("INR");

    ctx.rzpOrderId = res.body.data.id;
    ctx.rzpRzpOrderId = res.body.data.razorpayCheckout.razorpayOrderId;
    ctx.rzpCheckoutAmount = res.body.data.razorpayCheckout.amount;

    console.log(
      `✅ Razorpay Order created: ${ctx.rzpRzpOrderId} (amount: ₹${ctx.rzpCheckoutAmount / 100})`
    );
  });

  it("verify order exists on Razorpay API", async () => {
    // Fetch the order directly from Razorpay to prove it was really created
    const rzpOrder = await razorpay.orders.fetch(ctx.rzpRzpOrderId);

    expect(rzpOrder.id).toBe(ctx.rzpRzpOrderId);
    expect(rzpOrder.amount).toBe(Number(ctx.rzpCheckoutAmount));
    expect(rzpOrder.currency).toBe("INR");
    expect(rzpOrder.status).toBe("created"); // No payment yet
    expect(rzpOrder.amount_paid).toBe(0);
    expect(rzpOrder.amount_due).toBe(Number(ctx.rzpCheckoutAmount));

    console.log(
      `✅ Razorpay Order verified: id=${rzpOrder.id}, status=${rzpOrder.status}, amount=₹${rzpOrder.amount / 100}`
    );
  });

  it("no payments on Razorpay yet (payment happens via Checkout.js on frontend)", async () => {
    // Fetch payments for this order on Razorpay — should be empty
    const payments = await razorpay.orders.fetchPayments(ctx.rzpRzpOrderId);

    expect(payments.count).toBe(0);
    expect(payments.items).toHaveLength(0);

    console.log(
      `✅ Razorpay order ${ctx.rzpRzpOrderId} has 0 payments (expected — payment requires frontend Checkout.js)`
    );
  });

  it("Razorpay order with coupon (if eligible)", async () => {
    const validateRes = await authPost(
      "/api/v1/coupons/validate",
      ctx.token
    ).send({
      couponCode: "SAVE10",
      subtotal: 5000,
      paymentMethod: "RAZORPAY",
    });

    if (validateRes.status !== 200) {
      const res = await authPost("/api/v1/orders", ctx.token).send({
        addressId: ctx.addressId,
        items: [{ productId: ctx.productId, quantity: 1 }],
        paymentMethod: "RAZORPAY",
      });
      expect(res.status).toBe(201);
      expect(res.body.data.razorpayCheckout).toBeDefined();

      // Verify this order also exists on Razorpay
      const rzpOrder = await razorpay.orders.fetch(
        res.body.data.razorpayCheckout.razorpayOrderId
      );
      expect(rzpOrder.status).toBe("created");
      console.log(
        `✅ Razorpay Order (no coupon fallback): ${rzpOrder.id}, amount=₹${rzpOrder.amount / 100}`
      );
    } else {
      const res = await authPost("/api/v1/orders", ctx.token).send({
        addressId: ctx.addressId,
        items: [{ productId: ctx.productId, quantity: 1 }],
        paymentMethod: "RAZORPAY",
        couponCode: "SAVE10",
      });
      expect(res.status).toBe(201);
      expect(Number(res.body.data.discount)).toBeGreaterThan(0);
      expect(res.body.data.razorpayCheckout).toBeDefined();

      // Verify on Razorpay — amount should reflect discount
      const rzpOrder = await razorpay.orders.fetch(
        res.body.data.razorpayCheckout.razorpayOrderId
      );
      expect(rzpOrder.status).toBe("created");
      expect(rzpOrder.amount).toBe(
        res.body.data.razorpayCheckout.amount
      );
      console.log(
        `✅ Razorpay Order (with SAVE10 coupon): ${rzpOrder.id}, amount=₹${rzpOrder.amount / 100} (after discount)`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10b. RAZORPAY — LIST ORDERS ON RAZORPAY DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
describe("Razorpay — Verify Orders on Razorpay Dashboard", () => {
  it("fetch recent orders from Razorpay API", async () => {
    const result = await razorpay.orders.all({ count: 5 });

    expect(result.count).toBeGreaterThanOrEqual(1);
    expect(result.items.length).toBeGreaterThanOrEqual(1);

    console.log(`\n📋 Recent Razorpay Orders (last 5):`);
    for (const order of result.items) {
      console.log(
        `   ${order.id} | ₹${order.amount / 100} | status: ${order.status} | receipt: ${order.receipt}`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. RAZORPAY WEBHOOK — PAYMENT CAPTURED (simulated)
// Note: Real payments require Checkout.js on the frontend. The webhook
// simulation below tests our server-side handler with a self-signed HMAC.
// The Razorpay order IS real — only the payment event is simulated.
// ═══════════════════════════════════════════════════════════════════════════════
describe("Razorpay Webhook — Payment Captured (simulated)", () => {
  it("invalid signature (correct length) → 400", async () => {
    const fakeSignature = "a".repeat(64);
    const res = await request
      .post("/api/v1/payments/webhook/razorpay")
      .set("x-razorpay-signature", fakeSignature)
      .send({
        event: "payment.captured",
        payload: {
          payment: {
            entity: { id: "pay_test", order_id: ctx.rzpRzpOrderId },
          },
        },
      });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("PAY_001");
  });

  it("payment.captured → order CONFIRMED, payment PAID", async () => {
    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test_captured_001",
            order_id: ctx.rzpRzpOrderId,
          },
        },
      },
    };
    const res = await webhookRequest(payload);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");

    // Verify DB state
    const orderRes = await authGet(
      `/api/v1/orders/${ctx.rzpOrderId}`,
      ctx.token
    );
    expect(orderRes.body.data.status).toBe("CONFIRMED");
    expect(orderRes.body.data.payment.status).toBe("PAID");

    // Verify Razorpay order is still "created" (no real payment happened)
    const rzpOrder = await razorpay.orders.fetch(ctx.rzpRzpOrderId);
    expect(rzpOrder.status).toBe("created"); // Would be "paid" if a real payment was made
    console.log(
      `ℹ️  Razorpay order ${ctx.rzpRzpOrderId} status on Razorpay: "${rzpOrder.status}" (webhook was simulated, no real payment on Razorpay)`
    );
  });

  it("duplicate webhook → idempotent 200", async () => {
    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test_captured_001",
            order_id: ctx.rzpRzpOrderId,
          },
        },
      },
    };
    const res = await webhookRequest(payload);
    expect(res.status).toBe(200);

    const orderRes = await authGet(
      `/api/v1/orders/${ctx.rzpOrderId}`,
      ctx.token
    );
    expect(orderRes.body.data.status).toBe("CONFIRMED");
  });

  it("cancel Razorpay PAID order → 400 (must request refund)", async () => {
    const res = await authPatch(
      `/api/v1/orders/${ctx.rzpOrderId}/cancel`,
      ctx.token
    );
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. RAZORPAY WEBHOOK — PAYMENT FAILED (simulated)
// ═══════════════════════════════════════════════════════════════════════════════
describe("Razorpay Webhook — Payment Failed (simulated)", () => {
  it("create order, then fail payment via webhook", async () => {
    // Create a fresh Razorpay order (this hits the REAL Razorpay API)
    const orderRes = await authPost("/api/v1/orders", ctx.token).send({
      addressId: ctx.addressId,
      items: [{ productId: ctx.productId, quantity: 1 }],
      paymentMethod: "RAZORPAY",
    });
    expect(orderRes.status).toBe(201);
    const failedOrderId = orderRes.body.data.id;
    const failedRzpOrderId =
      orderRes.body.data.razorpayCheckout.razorpayOrderId;

    // Verify this order exists on Razorpay
    const rzpOrder = await razorpay.orders.fetch(failedRzpOrderId);
    expect(rzpOrder.id).toBe(failedRzpOrderId);
    expect(rzpOrder.status).toBe("created");
    console.log(
      `✅ Razorpay order for failed-payment test: ${failedRzpOrderId}, amount=₹${rzpOrder.amount / 100}`
    );

    // Send simulated payment.failed webhook
    const payload = {
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_test_failed_001",
            order_id: failedRzpOrderId,
          },
        },
      },
    };
    const res = await webhookRequest(payload);
    expect(res.status).toBe(200);

    // Verify payment FAILED in DB, order still PENDING
    const detail = await authGet(
      `/api/v1/orders/${failedOrderId}`,
      ctx.token
    );
    expect(detail.body.data.payment.status).toBe("FAILED");
    expect(detail.body.data.status).toBe("PENDING");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 13. ORDER STATUS TRANSITIONS (full lifecycle)
// ═══════════════════════════════════════════════════════════════════════════════
describe("Order — Status Lifecycle", () => {
  let orderId: string;

  it("create COD order", async () => {
    const res = await authPost("/api/v1/orders", ctx.token).send({
      addressId: ctx.addressId,
      items: [{ productId: ctx.productId, quantity: 1 }],
      paymentMethod: "COD",
    });
    expect(res.status).toBe(201);
    orderId = res.body.data.id;
  });

  it("PENDING → CONFIRMED", async () => {
    const res = await authPatch(
      `/api/v1/orders/${orderId}/status`,
      ctx.token
    ).send({ status: "CONFIRMED" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CONFIRMED");
  });

  it("CONFIRMED → PROCESSING", async () => {
    const res = await authPatch(
      `/api/v1/orders/${orderId}/status`,
      ctx.token
    ).send({ status: "PROCESSING" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("PROCESSING");
  });

  it("PROCESSING → SHIPPED", async () => {
    const res = await authPatch(
      `/api/v1/orders/${orderId}/status`,
      ctx.token
    ).send({ status: "SHIPPED" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("SHIPPED");
  });

  it("SHIPPED → OUT_FOR_DELIVERY", async () => {
    const res = await authPatch(
      `/api/v1/orders/${orderId}/status`,
      ctx.token
    ).send({ status: "OUT_FOR_DELIVERY" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("OUT_FOR_DELIVERY");
  });

  it("OUT_FOR_DELIVERY → DELIVERED", async () => {
    const res = await authPatch(
      `/api/v1/orders/${orderId}/status`,
      ctx.token
    ).send({ status: "DELIVERED" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("DELIVERED");
  });

  it("cancel DELIVERED order → 400", async () => {
    const res = await authPatch(
      `/api/v1/orders/${orderId}/cancel`,
      ctx.token
    );
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 14. ORDER — MULTIPLE ITEMS + NOTES
// ═══════════════════════════════════════════════════════════════════════════════
describe("Order — Multiple Items & Notes", () => {
  it("order with 2 products + notes", async () => {
    if (!ctx.secondProductId) return;
    const res = await authPost("/api/v1/orders", ctx.token).send({
      addressId: ctx.addressId,
      items: [
        { productId: ctx.productId, quantity: 1 },
        { productId: ctx.secondProductId, quantity: 2 },
      ],
      paymentMethod: "COD",
      notes: "Please deliver after 6 PM",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.items.length).toBe(2);
    expect(res.body.data.notes).toBe("Please deliver after 6 PM");
    expect(Number(res.body.data.totalAmount)).toBe(
      Number(res.body.data.subtotal) -
        Number(res.body.data.discount) +
        Number(res.body.data.deliveryCharge)
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 15. 404 ROUTE
// ═══════════════════════════════════════════════════════════════════════════════
describe("404 Handler", () => {
  it("GET /api/v1/nonexistent → 404", async () => {
    const res = await request.get("/api/v1/nonexistent");
    expect(res.status).toBe(404);
  });
});
