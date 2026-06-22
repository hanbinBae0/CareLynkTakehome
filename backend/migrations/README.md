# Database Migrations

This directory contains all database schema migrations for CareLynk.

## Migration Files

- **`001_initial_schema.sql`** – Complete base schema with TEXT + CHECK constraints
  - Tables: users, caregiver_profiles, care_seeker_profiles, caregiver_availabilities, jobs, job_matches, job_requests
  - Indexes for performance on common queries

- **`002_architecture_decision_enums.md`** – Reference documentation
  - Explains why PostgreSQL ENUMs were avoided
  - Provides examples of how to safely add/modify values in production
  - Historical context for future maintainers

## How to Apply Migrations

### Fresh Development Database

```bash
# Create database
createdb carelynk

# Apply initial schema
psql -U postgres -d carelynk < backend/migrations/001_initial_schema.sql

# Seed demo data
cd backend
npm run seed
```

### Production Deployments

For future migrations:

1. **Test thoroughly in staging** before applying to production
2. **Include rollback logic** if the migration is reversible
3. **Add comments** explaining the change and business context
4. **Use transactions** for safety: `BEGIN; ... COMMIT;`

Example safe migration pattern:

```sql
-- migrations/003_add_admin_role.sql
-- Context: Adding admin portal for customer support

BEGIN;

-- Step 1: Expand allowed values in CHECK constraint
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('caregiver', 'care_seeker', 'admin'));

-- Step 2: Update TypeScript types (done separately in src/types/domain.ts)
-- Step 3: Deploy new code
-- Step 4: Create initial admin user(s) via API or manual insert

COMMIT;
```

## Future Considerations

### When Adding New Enum Values

1. **Database Migration**: Expand CHECK constraint
2. **Application Code**: Update TypeScript types in `src/types/domain.ts`
3. **Zod Schemas**: Update validation in `src/schemas/*.ts` if needed
4. **Deployment**: Ensure new code handles new values before using them

### When Deprecating Values

1. **Application Code**: Stop creating new records with old value
2. **Database Migration**: Migrate existing data to new value (if renaming)
3. **Monitoring**: Track old values in logs/queries
4. **Cleanup**: Remove from CHECK constraint once all data migrated

### Tools for Future Migration Management

For larger projects, consider using:
- **Flyway** – Java-based migration runner
- **Liquibase** – Database change log format
- **Migrate** – Simple CLI-based migrations
- **node-pg-migrate** – Node.js migration runner

These tools track migration history and prevent running migrations twice, which becomes important as the project scales.
