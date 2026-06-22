# CareLynk Backend API

A Node.js + TypeScript REST API for a homecare platform MVP that connects caregivers with care seekers through rule-based intelligent matching.

## Project Overview

CareLynk Backend powers a two-portal system where:

- **Caregivers** create profiles with skills, experience, availability, and certifications
- **Care Seekers** post care jobs specifying location, schedule, and required skills
- **Matching Engine** automatically computes compatible caregiver-job pairs based on location, availability, and skills

The backend handles authentication, profile management, job lifecycle, and deterministic matching logic.



## Architecture Overview

### Layered Architecture Pattern

```
┌─────────────────────────────────────────┐
│           HTTP Client / Frontend         │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      Express App with CORS & Auth       │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      Routes (/api/auth, /api/jobs)      │
│   Delegates to controllers per resource │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│    Controllers (Validate & Route)       │
│   Parse input, call services, return    │
│     responses with HTTP status codes    │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│     Services (Business Logic Layer)     │
│  Orchestrate transactions, rules,       │
│  coordinate repositories, handle side   │
│  effects (e.g., recomputing matches)    │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   Repositories (Data Access Layer)      │
│  Encapsulate all SQL queries,           │
│  map DB rows to domain models,          │
│  abstract persistence details           │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│       PostgreSQL Database (14+)         │
│   Relational schema with types,         │
│   constraints, indexes, transactions    │
└──────────────────────────────────────────┘
```

### Why This Architecture?

1. **Separation of Concerns**
   - Controllers handle HTTP contract (parsing, validation, response formatting)
   - Services encapsulate business rules and orchestration
   - Repositories isolate SQL and DB interaction
   - Result: easy to test, maintain, and refactor

2. **Transaction Safety**
   - Services use `withTransaction` for multi-step operations (job accept, match recompute)
   - Repositories receive transaction client to participate in same transaction
   - Prevents partial failures and race conditions

3. **Clean Dependency Flow**
   - Controllers depend on Services
   - Services depend on Repositories
   - Repositories depend on Database
   - Unidirectional → easy to reason about, no circular deps

4. **Scalability & Testability**
   - Mock repositories for service tests
   - Mock services for controller tests
   - Use test DB for integration tests
   - Swap implementations without breaking layers

## Folder Structure

```
backend/
├── src/
│   ├── app.ts                      # Express app setup (routes, CORS, middleware)
│   ├── server.ts                   # Server startup (listen)
│   ├── config/
│   │   └── env.ts                  # Environment variables loader
│   ├── middleware/
│   │   ├── auth.ts                 # JWT authentication & role-based access control
│   │   └── errorHandler.ts         # Centralized error handling (Zod, AppError)
│   ├── routes/
│   │   ├── authRoutes.ts           # POST /register, /login, GET /me
│   │   ├── caregiverRoutes.ts      # GET/PUT profile, requests endpoints
│   │   ├── careSeekerRoutes.ts     # GET/PUT profile endpoints
│   │   └── jobRoutes.ts            # Job CRUD + matches + requests
│   ├── controllers/
│   │   ├── authController.ts       # Delegates register/login to authService
│   │   ├── caregiverController.ts  # Delegates profile ops to caregiverService
│   │   ├── careSeekerController.ts # Delegates profile ops to careSeekerService
│   │   ├── jobController.ts        # Delegates job CRUD & matches to jobService
│   │   └── jobRequestController.ts # Delegates request lifecycle to jobRequestService
│   ├── services/
│   │   ├── authService.ts          # register/login with hashing & token generation
│   │   ├── caregiverService.ts     # Caregiver profile orchestration
│   │   ├── careSeekerService.ts    # Care seeker profile orchestration
│   │   ├── jobService.ts           # Job CRUD + match recompute orchestration
│   │   ├── jobRequestService.ts    # Job request lifecycle (send/accept/decline)
│   │   └── matchingService.ts      # Core matching algorithm (deterministic rules)
│   ├── repositories/
│   │   ├── userRepository.ts       # Query/insert users, map to domain model
│   │   ├── caregiverRepository.ts  # Query caregivers with aggregated availabilities
│   │   ├── careSeekerRepository.ts # Query/upsert care seeker profiles
│   │   ├── jobRepository.ts        # CRUD jobs, locking for concurrency
│   │   ├── jobRequestRepository.ts # Query/update job requests with complex joins
│   │   └── matchRepository.ts      # Persist/retrieve matches
│   ├── db/
│   │   └── pool.ts                 # pg connection pool + withTransaction helper
│   ├── schemas/
│   │   ├── authSchemas.ts          # Zod schemas for register/login
│   │   ├── caregiverSchemas.ts     # Zod schemas for caregiver profile
│   │   ├── careSeekerSchemas.ts    # Zod schemas for care seeker profile
│   │   ├── jobSchemas.ts           # Zod schemas for job creation/update
│   │   └── jobRequestSchemas.ts    # Zod schemas for requests
│   ├── types/
│   │   ├── domain.ts               # Core domain types (Job, Caregiver, MatchResult)
│   │   └── express.d.ts            # Express Request type augmentation (request.user)
│   ├── utils/
│   │   ├── asyncHandler.ts         # Wraps async route handlers to catch errors
│   │   ├── errors.ts               # AppError custom error class
│   │   ├── password.ts             # hashPassword/verifyPassword using scrypt
│   │   └── token.ts                # Custom HMAC-signed JWT creation/verification
│   └── sql/
│       └── schema.sql              # PostgreSQL DDL (tables, enums, indexes) [DEPRECATED]
├── migrations/
│   ├── 001_initial_schema.sql      # Base schema with TEXT + CHECK constraints
│   └── 002_architecture_decision_enums.md # Documentation of enum→TEXT decision
├── tsconfig.json                   # TypeScript compiler config
├── package.json                    # Dependencies & scripts
└── .env.example                    # Example environment variables
```

## Database Schema & Migrations

### Why TEXT Columns Instead of PostgreSQL ENUMs?

This project deliberately avoids PostgreSQL `ENUM` types for role and status columns in favor of **TEXT columns with CHECK constraints**. This design decision prioritizes **production flexibility and zero-downtime deployments**.

#### The Problem with ENUMs in Production

PostgreSQL ENUM types are **immutable**. Modifying them requires:
- Recreating the type with new values
- Dropping and recreating dependent columns  
- Locking tables during the migration

This causes **downtime** and makes **zero-downtime deployments impossible**:

```sql
-- ❌ Cannot add new enum value at will
ALTER TYPE user_role ADD VALUE 'admin'; -- Locks tables, causes downtime

-- ❌ Cannot remove values
ALTER TYPE user_role DROP VALUE 'care_seeker'; -- Not supported!

-- ✗ Result: All-or-nothing cutover required, high risk in production
```

#### The Solution: TEXT + CHECK Constraints

Instead, we use TEXT columns with CHECK constraints:

```sql
-- ✓ Simple to add new values (no table recreation)
role TEXT NOT NULL CHECK (role IN ('caregiver', 'care_seeker', 'admin'));

-- ✓ Zero-downtime deployment: 
--   1. Update CHECK constraint to include new role
--   2. Deploy new code (old code still works)
--   3. Gradually migrate data/traffic
--   4. Remove old values from CHECK constraint
```

### Migration System

All database schema changes are versioned and tracked in `backend/migrations/`:

- **`001_initial_schema.sql`** – Complete base schema using TEXT + CHECK pattern
- **`002_architecture_decision_enums.md`** – Detailed rationale and examples for future schema changes

**How to add new migrations:**

1. Create a new file: `003_your_migration.sql`
2. Include comments explaining the changes and rationale
3. Use transactions (`BEGIN; ... COMMIT;`) for safety
4. Test thoroughly in development before production

### Currently Managed Values

The following columns use TEXT + CHECK pattern for production flexibility:

| Column | Table | Allowed Values | Future-Proof For |
|--------|-------|-----------------|------------------|
| `role` | `users` | `caregiver`, `care_seeker` | `admin`, `support`, `supervisor` |
| `status` | `jobs` | `open`, `matched`, `closed` | `archived`, `paused`, `cancelled` |
| `status` | `job_requests` | `pending`, `accepted`, `declined`, `cancelled` | `expired`, `withdrawn`, `completed` |

### TypeScript Domain Types

Application-level validation is maintained via TypeScript union types in `src/types/domain.ts`:

```typescript
export type UserRole = "caregiver" | "care_seeker";
export type JobStatus = "open" | "matched" | "closed";
export type JobRequestStatus = "pending" | "accepted" | "declined" | "cancelled";
```

These provide IDE autocomplete and type safety without imposing database constraints. Update these when adding new enum values to production.

### Running the Schema

For a fresh database:

```bash
# Apply migration 001
psql -U postgres -d carelynk < backend/migrations/001_initial_schema.sql

# Then seed data (uses TEXT values, fully compatible)
npm run seed
```
