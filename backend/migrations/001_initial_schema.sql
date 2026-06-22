-- ============================================================================
-- Migration 001: Initial Schema
-- ============================================================================
-- This migration creates the base CareLynk database schema.
--
-- NOTE: This schema deliberately avoids PostgreSQL ENUM types in favor of
-- TEXT columns with CHECK constraints. This provides better production flexibility:
--
-- ✓ Easier schema evolution (add/remove values without table rewrites)
-- ✓ Zero-downtime deployments (new code and old code coexist safely)
-- ✓ Data migration flexibility (moving between environments is safer)
-- ✓ Backward compatibility (no breaking schema changes)
-- 
-- For more details, see: backend/README.md#Schema-Migration-Strategy
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- Users Table
-- ============================================================================
-- Stores authentication and core user information for both caregivers 
-- and care seekers. The 'role' column determines which profile table applies.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Role is stored as TEXT with CHECK constraint instead of ENUM
  -- Allowed values: 'caregiver', 'care_seeker'
  role TEXT NOT NULL CHECK (role IN ('caregiver', 'care_seeker')),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Caregiver Profiles
-- ============================================================================
-- Role-specific profile for caregivers. One-to-one relationship with users.
CREATE TABLE IF NOT EXISTS caregiver_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  zip_code TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  years_experience INTEGER NOT NULL DEFAULT 0 CHECK (years_experience >= 0),
  skills TEXT[] NOT NULL DEFAULT '{}',
  certifications TEXT[] NOT NULL DEFAULT '{}',
  accepting_new_jobs BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Caregiver Availabilities
-- ============================================================================
-- Weekly availability slots for caregivers. Supports recurring weekly schedules.
-- weekday: 0 (Sunday) to 6 (Saturday)
CREATE TABLE IF NOT EXISTS caregiver_availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_user_id UUID NOT NULL REFERENCES caregiver_profiles(user_id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (caregiver_user_id, weekday, start_time, end_time),
  CHECK (start_time < end_time)
);

-- ============================================================================
-- Care Seeker Profiles
-- ============================================================================
-- Role-specific profile for care seekers. One-to-one relationship with users.
CREATE TABLE IF NOT EXISTS care_seeker_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_contact_method TEXT NOT NULL DEFAULT '',
  care_recipient_name TEXT NOT NULL DEFAULT '',
  relationship_to_recipient TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  zip_code TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Jobs
-- ============================================================================
-- Care jobs posted by care seekers. Includes location, timing, and requirements.
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_seeker_user_id UUID NOT NULL REFERENCES care_seeker_profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  care_type TEXT NOT NULL,
  location_city TEXT NOT NULL,
  location_state TEXT NOT NULL,
  zip_code TEXT NOT NULL DEFAULT '',
  schedule_summary TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL,
  requested_weekdays SMALLINT[] NOT NULL DEFAULT '{}',
  preferred_start_time TIME,
  preferred_end_time TIME,
  requested_availabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  -- Status is stored as TEXT with CHECK constraint instead of ENUM
  -- Allowed values: 'open', 'matched', 'closed'
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    preferred_start_time IS NULL
    OR preferred_end_time IS NULL
    OR preferred_start_time < preferred_end_time
  )
);

-- ============================================================================
-- Job Matches
-- ============================================================================
-- Computed matches between caregivers and jobs. Used for displaying
-- relevant opportunities to caregivers.
CREATE TABLE IF NOT EXISTS job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  caregiver_user_id UUID NOT NULL REFERENCES caregiver_profiles(user_id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0),
  reasons TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, caregiver_user_id)
);

-- ============================================================================
-- Job Requests
-- ============================================================================
-- Requests sent to caregivers for specific jobs. Tracks status and communication.
CREATE TABLE IF NOT EXISTS job_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  caregiver_user_id UUID NOT NULL REFERENCES caregiver_profiles(user_id) ON DELETE CASCADE,
  -- Request status is stored as TEXT with CHECK constraint instead of ENUM
  -- Allowed values: 'pending', 'accepted', 'declined', 'cancelled'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (job_id, caregiver_user_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_jobs_care_seeker_user_id ON jobs(care_seeker_user_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_job_id ON job_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_job_id ON job_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_caregiver_user_id ON job_requests(caregiver_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_requests_one_accepted
  ON job_requests(job_id)
  WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_caregiver_availability_user_id ON caregiver_availabilities(caregiver_user_id);

-- ============================================================================
-- Data Normalization
-- ============================================================================
-- Ensure job status consistency: matched jobs without accepted requests
-- are reset to 'open' status.
UPDATE jobs
SET status = 'open',
    updated_at = NOW()
WHERE status = 'matched'
  AND NOT EXISTS (
    SELECT 1
    FROM job_requests
    WHERE job_requests.job_id = jobs.id
      AND job_requests.status = 'accepted'
  );
