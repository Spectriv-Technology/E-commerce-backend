---
name: Express TypeScript Modular Architecture
description: Conventions, patterns, and rules for building Node.js + Express + TypeScript backend APIs using a module-based architecture with Prisma, Zod, and role-based access control.
---

# Express TypeScript Modular Architecture Skill

This skill defines the complete set of industry-standard conventions, patterns, and rules for building production-grade backend APIs with Node.js, Express, and TypeScript. **Every new module, endpoint, and code change MUST follow these guidelines.**

---

## 1. Project Structure

```
├── .env.example                # Environment variable template (committed)
├── .env                        # Local environment variables (NEVER committed)
├── .eslintrc.json              # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── .gitignore
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── tsconfig.json
├── package.json
├── prisma/
│   ├── schema.prisma           # Single source of truth for DB schema
│   ├── seed.ts                 # Database seeder
│   └── migrations/             # Auto-generated migrations
├── src/
│   ├── server.ts               # Entry point: bootstraps and starts the server
│   ├── app.ts                  # Express app setup (middleware, routes, error handler)
│   ├── routes.ts               # Root route aggregator (/api/v1/*)
│   │
│   ├── config/                 # App-wide configuration
│   │   ├── env.config.ts       # Env vars validated via Zod (single source of truth)
│   │   ├── database.config.ts  # Prisma client singleton
│   │   ├── logger.config.ts    # Winston/Pino logger setup
│   │   └── cors.config.ts     # CORS whitelist configuration
│   │
│   ├── middlewares/            # Shared middleware
│   │   ├── auth.middleware.ts

│   │   ├── errorHandler.middleware.ts
│   │   ├── rateLimiter.middleware.ts
│   │   ├── requestId.middleware.ts
│   │   ├── requestLogger.middleware.ts
│   │   └── validate.middleware.ts
│   │
│   ├── modules/                # Feature modules (each self-contained)
│   │   ├── auth/
│   │   │   ├── auth.route.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts     # Zod schemas for request validation
│   │   │   │   └── service.dto.ts     # TypeScript types for service I/O
│   │   │   └── models/
│   │   │       └── auth.model.ts      # Prisma select/include shapes & types
│   │   ├── users/
│   │   │   └── ... (same structure)
│   │   └── ... (other modules)
│   │
│   ├── shared/                 # Shared utilities, types, constants
│   │   ├── types/
│   │   │   ├── express.d.ts    # Express `req.user` augmentation
│   │   │   └── common.types.ts # Shared types (Pagination, SortOrder, etc.)
│   │   ├── utils/
│   │   │   ├── controllerWrapper.ts
│   │   │   ├── apiResponse.ts
│   │   │   ├── pagination.ts
│   │   │   └── httpErrors.ts
│   │   ├── constants/
│   │   │   ├── httpStatus.ts
│   │   │   ├── errorCodes.ts   # App-specific error codes (e.g., AUTH_001)
│   │   │   └── permissions.ts
│   │   └── enums/
│   │       └── roles.enum.ts
│   │
│   └── tests/                  # Test files (mirrors src/modules structure)
│       ├── setup.ts            # Global test setup
│       ├── helpers/            # Test utilities, factories, mocks
│       │   ├── testClient.ts   # Supertest app instance
│       │   └── factories.ts   # Test data factories
│       └── modules/
│           ├── auth/
│           │   ├── auth.controller.test.ts
│           │   └── auth.service.test.ts
│           └── users/
│               └── ...
```

---

## 2. Module Structure & Naming

Every feature MUST be a self-contained module inside `src/modules/<moduleName>/`.

### 2.1 Required Files Per Module

| File | Purpose |
|---|---|
| `<module>.route.ts` | Express routes + middleware application |
| `<module>.controller.ts` | Request parsing → service call → response |
| `<module>.service.ts` | Business logic + Prisma queries |
| `dto/request.dto.ts` | Zod validation schemas for body/params/query |
| `dto/service.dto.ts` | TypeScript interfaces for controller ↔ service data |
| `models/<module>.model.ts` | *(Optional)* Prisma select/include objects, derived types |

### 2.2 Naming Rules

| Thing | In Code | In Database | Example |
|---|---|---|---|
| Files & folders | `camelCase` | — | `feedbackForms.route.ts` |
| Interfaces / Types | `PascalCase` | — | `CreateUserServiceDto` |
| Functions / Variables | `camelCase` | — | `getUserById` |
| Constants | `UPPER_SNAKE_CASE` | — | `MAX_PAGE_SIZE` |
| Enums | `PascalCase` / `UPPER_SNAKE` | — | `Role.SYSTEM_ADMIN` |
| DB table names | `PascalCase` (Prisma model) | `snake_case` (via `@@map`) | `AuthUser` → `auth_user` |
| DB column names | `camelCase` (Prisma field) | `snake_case` (via `@map`) | `firstName` → `first_name` |

---

## 3. Database Table Conventions

Every table in the database MUST follow these rules.

### 3.1 Dual-ID Pattern

Every table has **two** identity columns:

| Column | Type | Purpose | Exposed to API? |
|---|---|---|---|
| `id` | Auto-increment `Int` | Internal use only — JOINs, foreign keys, indexes | **NEVER** |
| `uuid` | `String` (UUID v4, auto-generated) | Public identifier — shown to users, used in API URLs/responses | **ALWAYS** |

**Rules:**
- Internal queries, relations, and JOINs use the `id` (integer) for performance.
- All API endpoints accept and return `uuid` — the client **never** sees the integer `id`.
- In API responses, return the `uuid` field **as** `id` (rename in select/DTO).
- Foreign key columns are always integer-based (e.g., `userId Int`).

### 3.2 Audit Columns

Every table MUST have these four audit columns:

| Column | Type | Purpose |
|---|---|---|
| `createdAt` | `DateTime` | Auto-set on creation (`@default(now())`) |
| `createdBy` | `Int` | The `id` (integer) of the user who created the record |
| `updatedAt` | `DateTime` | Auto-updated on every change (`@updatedAt`) |
| `updatedBy` | `Int` | The `id` (integer) of the user who last updated the record |

**System Actions:**
- When the **system** performs an action (not a real user), set `createdBy = 0` and `updatedBy = 0`.
- `0` is a reserved sentinel value meaning "system/automated".

### 3.3 Naming Mapping (Code ↔ Database)

| Aspect | In Code (Prisma/TypeScript) | In Database | How |
|---|---|---|---|
| Table name | `PascalCase` singular | `snake_case` singular | `@@map("snake_case")` |
| Column name | `camelCase` | `snake_case` | `@map("snake_case")` |
| Relation field | `camelCase` | — (virtual, not in DB) | No `@map` needed |

### 3.4 Prisma Schema Example

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model AuthUser {
  id        Int      @id @default(autoincrement()) @map("id")
  uuid      String   @unique @default(uuid()) @map("uuid")
  email     String   @unique @map("email")
  password  String   @map("password")
  firstName String   @map("first_name")
  lastName  String   @map("last_name")
  role      String   @default("USER") @map("role")
  isActive  Boolean  @default(true) @map("is_active")

  // Audit columns
  createdAt DateTime @default(now()) @map("created_at")
  createdBy Int      @default(0) @map("created_by")
  updatedAt DateTime @updatedAt @map("updated_at")
  updatedBy Int      @default(0) @map("updated_by")

  // Relations (use integer id for FK)
  loginHistory LoginHistory[]

  @@map("auth_user")
}

model LoginHistory {
  id        Int      @id @default(autoincrement()) @map("id")
  uuid      String   @unique @default(uuid()) @map("uuid")
  userId    Int      @map("user_id")
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")

  // Audit columns
  createdAt DateTime @default(now()) @map("created_at")
  createdBy Int      @default(0) @map("created_by")
  updatedAt DateTime @updatedAt @map("updated_at")
  updatedBy Int      @default(0) @map("updated_by")

  // Relations
  user AuthUser @relation(fields: [userId], references: [id])

  @@map("login_history")
}
```

### 3.5 Key Rules Summary

| Rule | Details |
|---|---|
| **Internal JOINs** | Always use `id` (integer) for relations and foreign keys |
| **API exposure** | Always return `uuid` as the public identifier, never `id` |
| **System actions** | `createdBy = 0`, `updatedBy = 0` |
| **Naming** | Code: `camelCase` fields, `PascalCase` models. DB: `snake_case` everything |
| **Relations** | FK columns are integers pointing to `id`, named `<related>Id` (e.g., `userId`) |
| **Timestamps** | `createdAt` auto-set, `updatedAt` auto-updated by Prisma |
| **UUID** | Auto-generated via `@default(uuid())`, never user-supplied |

---

## 4. Layer Responsibilities (STRICT Separation)

```
Request → Route → Middleware → Controller → Service → Prisma → Response
```

### 3.1 Route Layer (`<module>.route.ts`)

- Defines `Router` with all endpoints.
- Applies middleware in order: **auth → validate → controller**.
- **NEVER** contains logic. Only wiring.
- **Default export** the configured router.

```typescript
import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";
import * as authController from "./auth.controller";
import { registerSchema, loginSchema } from "./dto/request.dto";

const router = Router();

// Public routes
router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);

// Protected routes
router.post("/logout", authMiddleware, authController.logout);
router.post("/change-password", authMiddleware, authController.changePassword);
router.get("/sessions", authMiddleware, authController.getActiveSessions);

export default router;
```

### 3.2 Controller Layer (`<module>.controller.ts`)

- Extracts data from `req` (body, params, query, user context).
- Maps request data → service DTO.
- Calls service → returns standardized response via `apiResponse`.
- **ALWAYS** wrapped in `controllerWrapper` (handles async errors).
- **NEVER** contains business logic, database calls, or Prisma imports.

```typescript
import { Request, Response } from "express";
import { controllerWrapper } from "@/shared/utils/controllerWrapper";
import { apiResponse } from "@/shared/utils/apiResponse";
import { HttpStatus } from "@/shared/constants/httpStatus";
import * as authService from "./auth.service";
import { RegisterServiceDto, LoginServiceDto } from "./dto/service.dto";

export const register = controllerWrapper(async (req: Request, res: Response) => {
  const data: RegisterServiceDto = {
    email: req.body.email,
    password: req.body.password,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
  };

  const result = await authService.register(data);

  return apiResponse(res, {
    statusCode: HttpStatus.CREATED,
    message: "User registered successfully",
    data: result,
  });
});

export const login = controllerWrapper(async (req: Request, res: Response) => {
  const data: LoginServiceDto = {
    email: req.body.email,
    password: req.body.password,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] || "unknown",
  };

  const result = await authService.login(data);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Login successful",
    data: result,
  });
});

export const logout = controllerWrapper(async (req: Request, res: Response) => {
  await authService.logout(req.user!.userId, req.headers.authorization!);

  return apiResponse(res, {
    statusCode: HttpStatus.OK,
    message: "Logged out successfully",
  });
});
```

### 3.3 Service Layer (`<module>.service.ts`)

- **ALL business logic lives here.**
- Receives typed DTOs, returns typed results.
- Interacts with Prisma for DB operations.
- Throws `HttpError` for expected errors.
- **NEVER** accesses `req`, `res`, or any Express types.
- Use Prisma transactions for multi-table writes.

```typescript
import { prisma } from "@/config/database.config";
import { logger } from "@/config/logger.config";
import { env } from "@/config/env.config";
import { HttpError } from "@/shared/utils/httpErrors";
import { HttpStatus } from "@/shared/constants/httpStatus";
import { ErrorCode } from "@/shared/constants/errorCodes";
import { RegisterServiceDto, LoginServiceDto, AuthTokensResultDto } from "./dto/service.dto";
import { userPublicSelect } from "./models/auth.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 12;

export const register = async (data: RegisterServiceDto): Promise<AuthTokensResultDto> => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existingUser) {
    throw new HttpError(HttpStatus.CONFLICT, "Email already registered", ErrorCode.AUTH_EMAIL_EXISTS);
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
    },
    select: userPublicSelect,
  });

  const tokens = generateTokenPair(user.id, user.email);

  logger.info("User registered successfully", { userId: user.id });

  return { ...tokens, user };
};

export const login = async (data: LoginServiceDto): Promise<AuthTokensResultDto> => {
  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (!user || !(await bcrypt.compare(data.password, user.password))) {
    throw new HttpError(HttpStatus.UNAUTHORIZED, "Invalid credentials", ErrorCode.AUTH_INVALID_CREDENTIALS);
  }

  if (!user.isActive) {
    throw new HttpError(HttpStatus.FORBIDDEN, "Account is deactivated", ErrorCode.AUTH_ACCOUNT_DEACTIVATED);
  }

  const tokens = generateTokenPair(user.id, user.email);

  // Track login for audit
  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  });

  logger.info("User logged in", { userId: user.id, ip: data.ipAddress });

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  };
};

// --- Private helpers (not exported) ---

function generateTokenPair(userId: string, email: string) {
  const accessToken = jwt.sign(
    { userId, email, type: "access" },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN, issuer: env.APP_NAME }
  );

  const refreshToken = jwt.sign(
    { userId, type: "refresh" },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN, issuer: env.APP_NAME }
  );

  return { accessToken, refreshToken };
}
```

---

## 5. DTO Conventions

### 5.1 Request DTOs (`dto/request.dto.ts`) — Zod Schemas

- Define **runtime validation** with Zod.
- Export both the **schema** and the **inferred TypeScript type**.
- Group body/params/query in a single object matching `{ body?, params?, query? }`.
- Add meaningful error messages to every rule.
- Use `.trim()` on string inputs, `.toLowerCase()` on emails.

```typescript
import { z } from "zod";

// === Register ===
const registerBody = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      "Password must contain uppercase, lowercase, number, and special character"
    ),
  firstName: z.string().min(1, "First name is required").max(50).trim(),
  lastName: z.string().min(1, "Last name is required").max(50).trim(),
});

export const registerSchema = { body: registerBody };
export type RegisterRequestBody = z.infer<typeof registerBody>;

// === Login ===
const loginBody = z.object({
  email: z.string().email("Invalid email").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const loginSchema = { body: loginBody };
export type LoginRequestBody = z.infer<typeof loginBody>;

// === Paginated List (reusable query schema) ===
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().trim().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

// === Path Param (reusable) ===
export const idParam = z.object({
  id: z.string().uuid("Invalid ID format"),
});
export type IdParam = z.infer<typeof idParam>;
```

### 5.2 Service DTOs (`dto/service.dto.ts`) — Pure TypeScript

- Define what controller passes **to** service and what service **returns**.
- Name: `<Action><Module>ServiceDto` for input, `<Module>ResultDto` for output.
- **NEVER** include Express types.
- Auth-derived values (`userId`, `organizationId`, `role`) are passed explicitly here.

```typescript
export interface RegisterServiceDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginServiceDto {
  email: string;
  password: string;
  ipAddress: string;
  userAgent: string;
}

export interface AuthTokensResultDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}
```

---

## 6. Models (`models/<module>.model.ts`)

- Define Prisma `select` and `include` objects for reuse across queries.
- Derive TypeScript types from Prisma to stay in sync with schema.
- Keeps Prisma query shapes DRY.
- **ALWAYS** select `uuid` (public ID) — **NEVER** select `id` (internal) in API-facing queries.
- **NEVER** select `password` or sensitive fields.

```typescript
import { Prisma } from "@prisma/client";

// Reusable select for public user data
// NOTE: selects `uuid` (public), excludes `id` (internal) and `password`
export const userPublicSelect = Prisma.validator<Prisma.AuthUserSelect>()({
  uuid: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export type UserPublic = Prisma.AuthUserGetPayload<{ select: typeof userPublicSelect }>;

// Internal select (includes integer `id` for JOINs/logic, NOT for API response)
export const userInternalSelect = Prisma.validator<Prisma.AuthUserSelect>()({
  id: true,       // internal integer
  uuid: true,     // public UUID
  email: true,
  password: true, // only for auth verification
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
});

export type UserInternal = Prisma.AuthUserGetPayload<{ select: typeof userInternalSelect }>;
```

---

## 7. Shared Utilities

### 7.1 Controller Wrapper

Catches async errors so controllers never need `try/catch`.

```typescript
// src/shared/utils/controllerWrapper.ts
import { Request, Response, NextFunction } from "express";

type AsyncController = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const controllerWrapper = (fn: AsyncController) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

### 7.2 API Response

Standardizes **all** JSON responses.

```typescript
// src/shared/utils/apiResponse.ts
import { Response } from "express";

interface ApiResponseOptions {
  statusCode: number;
  message: string;
  data?: unknown;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const apiResponse = (res: Response, options: ApiResponseOptions) => {
  const { statusCode, message, data, meta } = options;

  return res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    message,
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  });
};
```

### 7.3 HTTP Error

```typescript
// src/shared/utils/httpErrors.ts
export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, errorCode?: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode || "UNKNOWN_ERROR";
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, HttpError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### 7.4 Error Codes

Application-specific error codes for programmatic handling by frontend.

```typescript
// src/shared/constants/errorCodes.ts
export enum ErrorCode {
  // Auth
  AUTH_EMAIL_EXISTS = "AUTH_001",
  AUTH_INVALID_CREDENTIALS = "AUTH_002",
  AUTH_TOKEN_EXPIRED = "AUTH_003",
  AUTH_TOKEN_INVALID = "AUTH_004",
  AUTH_ACCOUNT_DEACTIVATED = "AUTH_005",
  AUTH_INSUFFICIENT_PERMISSION = "AUTH_006",

  // Validation
  VALIDATION_FAILED = "VAL_001",

  // Resource
  RESOURCE_NOT_FOUND = "RES_001",
  RESOURCE_ALREADY_EXISTS = "RES_002",

  // Server
  INTERNAL_ERROR = "SRV_001",
  SERVICE_UNAVAILABLE = "SRV_002",
}
```

### 7.5 Validation Middleware

```typescript
// src/middlewares/validate.middleware.ts
import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { HttpStatus } from "@/shared/constants/httpStatus";

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export const validate = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Record<string, string[]> = {};

    for (const [key, schema] of Object.entries(schemas)) {
      if (!schema) continue;
      const result = schema.safeParse(req[key as keyof Request]);
      if (!result.success) {
        errors[key] = result.error.errors.map(
          (e) => `${e.path.join(".")}: ${e.message}`
        );
      } else {
        (req as any)[key] = result.data; // Replace with parsed/coerced values
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Validation failed",
        errorCode: "VAL_001",
        errors,
      });
    }

    next();
  };
};
```

### 7.6 Request ID Middleware

Tracks every request with a unique ID for logging/debugging.

```typescript
// src/middlewares/requestId.middleware.ts
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const id = (req.headers["x-request-id"] as string) || randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
};
```

### 7.7 Error Handler Middleware

Global error handler — MUST be registered **last** in the middleware chain.

```typescript
// src/middlewares/errorHandler.middleware.ts
import { Request, Response, NextFunction } from "express";
import { HttpError } from "@/shared/utils/httpErrors";
import { logger } from "@/config/logger.config";
import { Prisma } from "@prisma/client";
import { HttpStatus } from "@/shared/constants/httpStatus";

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Known operational errors
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
    });
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(HttpStatus.CONFLICT).json({
        success: false,
        message: "Resource already exists",
        errorCode: "RES_002",
      });
    }
    if (err.code === "P2025") {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: "Resource not found",
        errorCode: "RES_001",
      });
    }
  }

  // Unexpected errors — log full stack, return generic message
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.path,
    method: req.method,
  });

  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Internal server error",
    errorCode: "SRV_001",
  });
};
```

---

## 8. Configuration

### 8.1 Environment Variables (`env.config.ts`)

- **Single source of truth** — all env vars validated here with Zod.
- **NEVER** access `process.env` anywhere else.
- Crash at startup if required vars are missing.

```typescript
// src/config/env.config.ts
import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  APP_NAME: z.string().default("api"),

  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // CORS
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 min
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

### 8.2 Logger (`logger.config.ts`)

Use **Winston** (structured JSON in production, pretty in development).

```typescript
// src/config/logger.config.ts
import winston from "winston";
import { env } from "./env.config";

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) =>
    `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`
  )
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === "production" ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
  defaultMeta: { service: env.APP_NAME },
});
```

### 8.3 Database (`database.config.ts`)

```typescript
// src/config/database.config.ts
import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.config";

export const prisma = new PrismaClient({
  log: [
    { level: "error", emit: "event" },
    { level: "warn", emit: "event" },
  ],
});

prisma.$on("error", (e) => logger.error("Prisma error", { error: e.message }));
prisma.$on("warn", (e) => logger.warn("Prisma warning", { warning: e.message }));
```

---

## 9. App & Route Setup

### 9.1 app.ts

```typescript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { requestId } from "./middlewares/requestId.middleware";
import { requestLogger } from "./middlewares/requestLogger.middleware";
import { rateLimiter } from "./middlewares/rateLimiter.middleware";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { env } from "./config/env.config";
import routes from "./routes";

const app = express();

// --- Security ---
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS.split(","), credentials: true }));

// --- Parsing ---
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// --- Request tracking & logging ---
app.use(requestId);
app.use(requestLogger);

// --- Rate limiting ---
app.use(rateLimiter);

// --- API Routes ---
app.use("/api/v1", routes);

// --- Health Check ---
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- 404 Handler ---
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// --- Global Error Handler (MUST be last) ---
app.use(errorHandler);

export default app;
```

### 9.2 routes.ts

```typescript
import { Router } from "express";
import authRoutes from "./modules/auth/auth.route";
import usersRoutes from "./modules/users/users.route";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);

export default router;
```

### 9.3 server.ts

```typescript
import app from "./app";
import { env } from "./config/env.config";
import { logger } from "./config/logger.config";
import { prisma } from "./config/database.config";

const startServer = async () => {
  try {
    // Verify DB connection
    await prisma.$connect();
    logger.info("Database connected");

    app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
});

startServer();
```

---

## 10. API Rules

### 10.1 URL Conventions

| Rule | Example |
|---|---|
| Base path | `/api/v1` |
| Plural, kebab-case resources | `/api/v1/feedback-forms` |
| Path params for specific items | `/api/v1/users/:id` |
| Max 2-level nesting | `/api/v1/orgs/:orgId/users` |
| Query params for filtering | `?page=1&limit=20&sort=createdAt:desc` |

### 10.2 HTTP Methods & Status Codes

| Method | Purpose | Success Code |
|---|---|---|
| `GET` | Retrieve | `200 OK` |
| `POST` | Create | `201 Created` |
| `PUT` | Full replace | `200 OK` |
| `PATCH` | Partial update | `200 OK` |
| `DELETE` | Remove | `200 OK` |

### 10.3 Standard Response Shapes

**Success:**
```json
{ "success": true, "message": "User created", "data": { ... } }
```

**Paginated:**
```json
{
  "success": true, "message": "Users fetched", "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

**Error:**
```json
{ "success": false, "message": "Invalid credentials", "errorCode": "AUTH_002" }
```

**Validation Error:**
```json
{
  "success": false, "message": "Validation failed", "errorCode": "VAL_001",
  "errors": { "body": ["email: Invalid email format"] }
}
```

### 10.4 Pagination Defaults

- Default `page = 1`, `limit = 20`, max `limit = 100`.
- Always return `meta` with paginated responses.
- Use Prisma `skip`/`take` internally.

### 10.5 Auth Context Rules

- User info is on `req.user` after `authMiddleware`.
- **NEVER** accept `userId`, `organizationId`, `role` from request body when they should come from auth context.
- Pass auth values explicitly via service DTOs.

---

## 11. Security Rules

| Rule | Details |
|---|---|
| **Auth** | `authMiddleware` on ALL protected routes |

| **Secrets** | NEVER expose password, tokens, secrets in responses — use Prisma `select` |
| **Validation** | Zod validation on EVERY endpoint that accepts input |
| **Trust** | NEVER trust client data for auth decisions |
| **Headers** | `helmet` for HTTP security headers |
| **Rate limit** | Stricter limits on auth endpoints (login, register, forgot-password) |
| **CORS** | Whitelist specific origins only, never `*` in production |
| **Passwords** | bcrypt with cost factor ≥ 12, enforce complexity via Zod |
| **JWT** | Short-lived access tokens (15m), longer refresh tokens (7d), `type` claim to prevent token confusion |
| **Logging** | NEVER log passwords, tokens, or PII. Log `requestId` for traceability |
| **SQL Injection** | Not applicable with Prisma (parameterized), but NEVER use `$queryRawUnsafe` with user input |

---

## 12. Logging Standards

- Use the centralized `logger` — **NEVER** use `console.log/warn/error`.
- Include structured metadata (userId, requestId, action).
- Log levels:
  - `error` — Failures that need attention (unhandled errors, DB failures)
  - `warn` — Suspicious but recoverable (rate limit hit, deprecated usage)
  - `info` — Important business events (user registered, payment processed)
  - `debug` — Development details (query results, request bodies)
- **NEVER** log passwords, tokens, credit card numbers, or PII.

```typescript
// ✅ Good
logger.info("User registered", { userId: user.id, email: user.email });
logger.error("Payment failed", { userId, orderId, error: err.message });

// ❌ Bad
console.log("user registered");
logger.info("Login", { password: data.password }); // NEVER log passwords
```

---

## 13. Testing Standards

### 13.1 Framework & Tools

- **Vitest** or **Jest** for unit + integration tests.
- **Supertest** for HTTP endpoint testing.
- Use a separate test database (set via `DATABASE_URL` in `.env.test`).

### 13.2 File Naming

- `<module>.service.test.ts` — Unit tests for service business logic.
- `<module>.controller.test.ts` — Integration tests for endpoints.

### 13.3 Test Structure (AAA Pattern)

```typescript
describe("AuthService", () => {
  describe("register", () => {
    it("should create a new user and return tokens", async () => {
      // Arrange
      const input: RegisterServiceDto = {
        email: "test@example.com",
        password: "P@ssw0rd!",
        firstName: "John",
        lastName: "Doe",
      };

      // Act
      const result = await authService.register(input);

      // Assert
      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe("test@example.com");
    });

    it("should throw CONFLICT if email exists", async () => {
      // Arrange: create user first
      // Act & Assert
      await expect(authService.register(input)).rejects.toThrow(HttpError);
    });
  });
});
```

### 13.4 Coverage

- Minimum coverage target: **80%** for services, **70%** overall.
- Run: `npm run test:coverage`

---

## 14. Commit Policy

### 14.1 Conventional Commits Format

```
<type>(<scope>): <description>

[optional body]

[optional footer: Closes #123]
```

### 14.2 Types

| Type | When |
|---|---|
| `feat` | New feature or endpoint |
| `fix` | Bug fix |
| `refactor` | Restructure without behavior change |
| `chore` | Deps, configs, tooling |
| `docs` | Documentation |
| `style` | Formatting only |
| `test` | Tests |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |
| `build` | Build system |
| `revert` | Revert commit |

### 14.3 Scope = Module/Area

```
feat(auth): add JWT refresh token rotation
fix(users): correct pagination offset
refactor(feedbackForms): extract field validation
chore(deps): upgrade prisma to v6
ci(docker): add multi-stage production build
```

### 14.4 Rules

1. **Atomic** — One logical change per commit.
2. **Compilable** — Code must pass `tsc --noEmit` and lint.
3. **No secrets** — Never commit `.env`, keys, or tokens.
4. **Small** — Prefer many small commits over monolithic ones.
5. **Descriptive** — Explain *what* and *why*, not *how*.
6. **Reference issues** — `Closes #123` or `Refs #456` in footer.

### 14.5 Branch Naming

```
<type>/<short-kebab-description>
```

| Pattern | Example |
|---|---|
| Feature | `feature/user-authentication` |
| Fix | `fix/token-expiry-handling` |
| Refactor | `refactor/module-restructure` |
| Hotfix | `hotfix/critical-auth-bypass` |
| Release | `release/v1.2.0` |

### 14.6 Pre-Commit Checklist

- [ ] `npx tsc --noEmit` passes (no type errors)
- [ ] `npm run lint` passes
- [ ] No `console.log` in code (use `logger`)
- [ ] No hardcoded secrets/URLs
- [ ] All new endpoints have Zod validation
- [ ] DTOs are properly typed
- [ ] Prisma schema updated if models changed
- [ ] Migrations generated if schema changed
- [ ] Tests pass: `npm test`

---

## 15. TypeScript Configuration

### 15.1 tsconfig.json (Recommended)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 15.2 Strict Rules

- **NEVER** use `any` unless absolutely unavoidable — document the reason with a `// eslint-disable-next-line` comment.
- Use `unknown` instead of `any` for catch blocks.
- Use `const` by default, `let` only when necessary, **NEVER** `var`.
- Use **async/await** — never `.then()/.catch()`.
- Use **early returns** to reduce nesting.
- Max function length: ~50 lines. Extract helpers if longer.
- No magic numbers/strings — use named constants.

---

## 16. Docker & Deployment

### 16.1 Dockerfile (Multi-Stage)

```dockerfile
# --- Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
USER appuser
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### 16.2 docker-compose.yml (Development)

```yaml
version: "3.8"
services:
  api:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [db]
    volumes: ["./src:/app/src"]
  db:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: app_dev
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

---

## 17. Import Order Convention

Organize imports in this order with blank lines between groups:

```typescript
// 1. Node.js built-ins
import path from "path";
import crypto from "crypto";

// 2. Third-party packages
import express from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";

// 3. Internal config
import { prisma } from "@/config/database.config";
import { logger } from "@/config/logger.config";
import { env } from "@/config/env.config";

// 4. Shared utilities & constants
import { HttpError } from "@/shared/utils/httpErrors";
import { HttpStatus } from "@/shared/constants/httpStatus";

// 5. Module-local imports
import { CreateUserServiceDto } from "./dto/service.dto";
import { userPublicSelect } from "./models/users.model";
```

---

## 18. Module Creation Checklist

When creating a new module, follow this exact order:

1. ☐ Define Prisma model(s) in `schema.prisma`
2. ☐ Run: `npx prisma migrate dev --name <descriptive_name>`
3. ☐ Create: `src/modules/<moduleName>/`
4. ☐ Create: `dto/request.dto.ts` (Zod schemas)
5. ☐ Create: `dto/service.dto.ts` (TypeScript types)
6. ☐ Create: `models/<module>.model.ts` (if needed)
7. ☐ Create: `<module>.service.ts` (business logic)
8. ☐ Create: `<module>.controller.ts` (request → service → response)
9. ☐ Create: `<module>.route.ts` (routes + middleware)
10. ☐ Register routes in `src/routes.ts`
11. ☐ Write tests
12. ☐ Test all endpoints
13. ☐ Commit following commit policy

---

## 19. Error Reference

| Code | Status | Constant | Use |
|---|---|---|---|
| 200 | OK | `HttpStatus.OK` | Successful GET/PUT/PATCH/DELETE |
| 201 | Created | `HttpStatus.CREATED` | Successful POST |
| 204 | No Content | `HttpStatus.NO_CONTENT` | DELETE with no body |
| 400 | Bad Request | `HttpStatus.BAD_REQUEST` | Validation failure |
| 401 | Unauthorized | `HttpStatus.UNAUTHORIZED` | Missing/invalid token |
| 403 | Forbidden | `HttpStatus.FORBIDDEN` | Insufficient permissions |
| 404 | Not Found | `HttpStatus.NOT_FOUND` | Resource not found |
| 409 | Conflict | `HttpStatus.CONFLICT` | Duplicate resource |
| 422 | Unprocessable | `HttpStatus.UNPROCESSABLE_ENTITY` | Semantically invalid |
| 429 | Too Many | `HttpStatus.TOO_MANY_REQUESTS` | Rate limit hit |
| 500 | Server Error | `HttpStatus.INTERNAL_SERVER_ERROR` | Unexpected error |

---

## 20. Quick Reference: Do's and Don'ts

### ✅ DO
- Wrap every controller in `controllerWrapper`
- Validate every input with Zod
- Use service DTOs for controller ↔ service data
- Use Prisma `select` to control response shape
- Use `HttpError` with error codes for expected errors
- Use `apiResponse` for all responses
- Derive auth context from `req.user`
- Keep services free of Express types
- Use Winston logger with structured metadata
- Follow conventional commits
- Use path aliases (`@/`) for imports
- Gracefully shut down on SIGTERM/SIGINT

### ❌ DON'T
- Use `try/catch` in controllers (controllerWrapper handles it)
- Access `req`/`res` in services
- Use `any` without documenting why
- Hardcode secrets, URLs, or magic numbers
- Return full Prisma models without `select`
- Accept auth-derived fields from request body
- Use `console.log` (use logger)
- Commit without `tsc --noEmit` and lint passing
- Skip Zod validation on new endpoints
- Nest API routes deeper than 2 levels
- Use `$queryRawUnsafe` with user input
- Log passwords, tokens, or PII
