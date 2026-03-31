import supertest from "supertest";
import app from "../../app.js";

export const request = supertest(app);

const TEST_PHONE = "9999900001";
const TEST_OTP = "000000"; // Fixed OTP in non-development environments

/**
 * Registers (or logs in) a test customer and returns the Bearer token.
 */
export async function getAuthToken(
  phone = TEST_PHONE,
  name = "Test Customer"
): Promise<{ token: string; customerId: string }> {
  // 1. Send OTP
  await request.post("/api/v1/customers/auth/send-otp").send({ phone });

  // 2. Verify OTP
  const res = await request
    .post("/api/v1/customers/auth/verify-otp")
    .send({ phone, otp: TEST_OTP, name });

  if (!res.body.data?.token) {
    throw new Error(`Auth failed: ${JSON.stringify(res.body)}`);
  }

  return {
    token: res.body.data.token,
    customerId: res.body.data.customer.id,
  };
}

/**
 * Helper to make authenticated requests.
 */
export function authGet(path: string, token: string) {
  return request.get(path).set("Authorization", `Bearer ${token}`);
}

export function authPost(path: string, token: string) {
  return request.post(path).set("Authorization", `Bearer ${token}`);
}

export function authPatch(path: string, token: string) {
  return request.patch(path).set("Authorization", `Bearer ${token}`);
}

export function authDelete(path: string, token: string) {
  return request.delete(path).set("Authorization", `Bearer ${token}`);
}
