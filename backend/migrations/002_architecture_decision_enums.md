-- ============================================================================
-- Migration 002: Architecture Decision - TEXT Columns Instead of ENUMs
-- ============================================================================
-- This file documents the architectural decision made in 001_initial_schema.sql
-- to use TEXT columns with CHECK constraints instead of PostgreSQL ENUM types.
--
-- This is NOT a migration to be run - it's a reference document explaining
-- why the schema is designed the way it is.
-- ============================================================================

-- ============================================================================
-- WHY NOT PostgreSQL ENUM Types?
-- ============================================================================

-- 1. PRODUCTION SCHEMA EVOLUTION CHALLENGES
-- ──────────────────────────────────────────
--   PostgreSQL ENUMs are IMMUTABLE types. To modify them:
--   
--   ✗ Cannot add new enum values at arbitrary positions (only at end)
--   ✗ Cannot remove enum values without complex table recreation
--   ✗ Cannot easily rename enum values
--   ✗ Altering enums requires:
--       • Creating new types with new values
--       • Recreating all dependent columns and indexes
--       • Dropping old types
--   ✗ This causes TABLE LOCKS and production downtime
--
-- EXAMPLE PROBLEM:
-- ─ Initial: user_role = ENUM ('caregiver', 'care_seeker')
-- ─ Requirement: Add 'admin' role for production
-- ─ Result: 10+ minutes of downtime to recreate tables


-- 2. ZERO-DOWNTIME DEPLOYMENT INCOMPATIBILITY
-- ──────────────────────────────────────────
--   Typical zero-downtime deployment flow:
--   
--   1. Deploy new code (v2) alongside old code (v1)
--   2. Old code handles existing requests
--   3. New code handles new requests
--   4. Gradually shift traffic to v2
--   5. Remove v1
--
--   With ENUMs:
--   • If v2 needs a new enum value, changing the schema BREAKS v1 code
--   • Cannot have both versions running against same database
--   • Forced to do all-or-nothing cutover (high risk)


-- 3. DATA MIGRATION AND BACKUP COMPLEXITY
-- ──────────────────────────────────────────
--   When moving data between environments:
--   
--   ✗ If ENUM definitions differ, restore fails completely
--   ✗ Cannot gradually migrate: either exact match or restore fails
--   ✗ ETL tools struggle with ENUM types
--   ✗ Blue/green deployments become risky


-- 4. TYPE SAFETY TRADEOFF
-- ──────────────────────────────────────────
--   ENUM Pros:  Guaranteed to be one of predefined values
--   ENUM Cons:  Schema changes = downtime
--   
--   TEXT with CHECK: Both safe AND flexible
--   TEXT Pros:  Schema changes are trivial
--   TEXT Cons:  No SQL-level type safety (but CHECK constraints mitigate)


-- ============================================================================
-- THE SOLUTION: TEXT + CHECK CONSTRAINTS
-- ============================================================================

-- APPROACH:
-- ─────────
-- Instead of:  CREATE TYPE user_role AS ENUM ('caregiver', 'care_seeker');
--               role user_role NOT NULL,
--
-- Use:         role TEXT NOT NULL CHECK (role IN ('caregiver', 'care_seeker')),
--
-- ADVANTAGES:
-- ──────────
-- ✓ Adding a new role requires ONE simple statement:
--     ALTER TABLE users DROP CONSTRAINT check_constraint_name;
--     ALTER TABLE users ADD CONSTRAINT users_role_check 
--       CHECK (role IN ('caregiver', 'care_seeker', 'admin'));
--   
-- ✓ NO table recreation, NO locks, NO downtime
--
-- ✓ Zero-downtime deployments work:
--     Migration 1: Add CHECK constraint for new values
--     Deploy v2: Code now handles new role
--     Migration 2: Drop old CHECK constraint with only old values
--     Old v1 code still works (new role just passes through)
--
-- ✓ Data migrations are trivial:
--     Old DB: TEXT columns with CHECK for {'caregiver', 'care_seeker'}
--     New DB: TEXT columns with CHECK for {'caregiver', 'care_seeker', 'admin'}
--     Data moves without issues
--
-- ✓ Backward compatible:
--     SELECT * FROM users WHERE role IN ('caregiver', 'care_seeker')
--     Works the same whether role is ENUM or TEXT


-- ============================================================================
-- SPECIFIC IMPLEMENTATION IN THIS SCHEMA
-- ============================================================================

-- The following columns use TEXT + CHECK pattern:
--
-- 1. users.role
--    Allowed: 'caregiver', 'care_seeker'
--    Future-proof for: 'admin', 'support', 'supervisor'
--
-- 2. jobs.status
--    Allowed: 'open', 'matched', 'closed'
--    Future-proof for: 'archived', 'paused', 'cancelled'
--
-- 3. job_requests.status
--    Allowed: 'pending', 'accepted', 'declined', 'cancelled'
--    Future-proof for: 'expired', 'withdrawn', 'completed'


-- ============================================================================
-- MIGRATION EXAMPLE: Adding 'admin' Role (Zero-Downtime)
-- ============================================================================

-- Step 1 (Prepare database):
-- ──────────────────────────
-- ALTER TABLE users DROP CONSTRAINT users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check 
--   CHECK (role IN ('caregiver', 'care_seeker', 'admin'));
--
-- Step 2 (Deploy new application code):
--   Code now handles 'admin' role in service layer
--
-- Step 3 (Clean up old constraint if needed):
--   ALTER TABLE users DROP CONSTRAINT old_constraint_name;
--
-- Result: Zero downtime, complete backward compatibility


-- ============================================================================
-- APPLICATION-LEVEL VALIDATION
-- ============================================================================

-- TypeScript domain.ts maintains union types:
--   export type UserRole = "caregiver" | "care_seeker";
--   export type JobStatus = "open" | "matched" | "closed";
--   export type JobRequestStatus = "pending" | "accepted" | "declined" | "cancelled";
--
-- These provide:
--   ✓ IDE autocomplete and type safety in application code
--   ✓ Easy to update when schema changes
--   ✓ No runtime impact from schema flexibility


-- ============================================================================
-- SUMMARY
-- ============================================================================

-- TEXT + CHECK constraints provide:
--   ✓ Production flexibility (schema changes without downtime)
--   ✓ Type safety (via CHECK constraints + TypeScript validation)
--   ✓ Zero-downtime deployments (new and old code coexist safely)
--   ✓ Simple data migrations (TEXT is portable everywhere)
--   ✓ Maintainability (migrations are straightforward)
--
-- Trade-off: Minimal type information at SQL layer (but TypeScript compensates)
--
-- Result: Better operational safety for a growing production system
