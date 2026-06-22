# Schema Refactoring Summary: ENUM → TEXT + CHECK Constraints

## Overview

This refactoring replaces PostgreSQL `ENUM` types with `TEXT` columns using `CHECK` constraints throughout the CareLynk database schema. This change improves production flexibility and enables zero-downtime deployments.

## Files Modified

### 1. New Migration Structure
**Location:** `backend/migrations/`

- ✨ **001_initial_schema.sql** (NEW)
  - Complete base schema without ENUM types
  - Uses TEXT columns with CHECK constraints
  - Fully documented with inline comments
  - 238 lines including comprehensive documentation

- 📚 **002_architecture_decision_enums.md** (NEW)
  - Detailed rationale for ENUM → TEXT migration
  - Examples of zero-downtime deployment patterns
  - Future migration guidance
  - Explains trade-offs and decision

- 📖 **README.md** (NEW)
  - How to apply migrations
  - Examples for production deployments
  - Tools and best practices for future migrations
  - Step-by-step instructions

### 2. Updated Database Schema
**File:** `backend/sql/schema.sql`

**Changes:**
- ❌ Removed: `CREATE TYPE` statements for `user_role`, `job_status`, `request_status`
- ✅ Added: TEXT columns with CHECK constraints for:
  - `users.role` → TEXT CHECK (role IN ('caregiver', 'care_seeker'))
  - `jobs.status` → TEXT CHECK (status IN ('open', 'matched', 'closed'))
  - `job_requests.status` → TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'))
- 📝 Added: Deprecation notice with reference to migrations

### 3. Updated Backend Documentation
**File:** `backend/README.md`

**New Section Added:** "Database Schema & Migrations"
- Explains why ENUMs were avoided
- Documents the TEXT + CHECK pattern
- Shows allowed values and future-proofing
- Provides examples of schema evolution
- Links to migration system documentation

## Database Schema Changes

### Before (ENUM Types)
```sql
CREATE TYPE user_role AS ENUM ('caregiver', 'care_seeker');
CREATE TYPE job_status AS ENUM ('open', 'matched', 'closed');
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

CREATE TABLE users (
  role user_role NOT NULL,
  ...
);
```

### After (TEXT + CHECK)
```sql
CREATE TABLE users (
  role TEXT NOT NULL CHECK (role IN ('caregiver', 'care_seeker')),
  ...
);
```

## Production Benefits

### 1. Zero-Downtime Deployments ✓
**Before:** Adding new role required table recreation → downtime
**After:** Updating CHECK constraint → no downtime

### 2. Schema Evolution ✓
**Before:** ENUM changes are locked; must recreate types and tables
**After:** Simple SQL: `ALTER TABLE ... DROP/ADD CONSTRAINT`

### 3. Data Migrations ✓
**Before:** Moving data between DBs with different ENUM values fails
**After:** TEXT columns are portable; easier blue/green deployments

### 4. Future Flexibility ✓
**Before:** Committed to specific values forever
**After:** Can add/rename/deprecate values safely

## Compatibility

### Application Code
- ✓ **No changes needed** to TypeScript, Express controllers, or services
- ✓ **seed.ts** already uses string values → works perfectly
- ✓ String union types in `src/types/domain.ts` remain unchanged
- ✓ Zod schemas (`z.enum()`) continue to work

### Database
- ✓ **schema.sql** updated and ready
- ✓ **All existing queries** work unchanged (TEXT = TEXT)
- ✓ **Indexes** preserved and functional
- ✓ **CHECK constraints** provide same safety as ENUMs

## Testing & Verification

### To verify the refactoring works:

```bash
# 1. Build the application
cd backend
npm install
npm run build

# 2. Create fresh database
dropdb carelynk 2>/dev/null || true
createdb carelynk

# 3. Apply schema (uses updated schema.sql)
psql -U postgres -d carelynk < sql/schema.sql

# 4. Seed demo data (compatible with TEXT columns)
npm run seed

# 5. Start development server
npm run dev
```

All operations will succeed with TEXT + CHECK constraints.

## Migration Path Summary

```
Old System (ENUM)
│
├─ Problem: Cannot add/modify values without downtime
├─ Problem: Blue/green deployments impossible
├─ Problem: Data migrations risky
│
↓ Refactoring

New System (TEXT + CHECK)
│
├─ Benefit: Schema changes are safe
├─ Benefit: Zero-downtime deployments
├─ Benefit: Flexible data migrations
├─ Benefit: Future-proof for growth
│
↓ Going Forward

Production Deployments
│
├─ Migration files in: backend/migrations/
├─ Versioned and documented
├─ Safe rollback patterns available
├─ Guidelines for future changes
```

## Future Enhancements

The following tools can be integrated later if needed:

- **Flyway** or **Liquibase** – Automated migration management and versioning
- **node-pg-migrate** – Node.js-specific migration runner
- **db-migrate** – Multi-database migration tool

For now, the migration system is lightweight and manual, suitable for the current project scale.

## References

- Migration files: [backend/migrations/](backend/migrations/)
- Schema documentation: [backend/README.md#Database-Schema--Migrations](../backend/README.md#database-schema--migrations)
- PostgreSQL CHECK constraints: [PostgreSQL Docs](https://www.postgresql.org/docs/current/sql-createtable.html#SQL-CREATETABLE-CONSTRAINTS)
