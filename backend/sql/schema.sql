CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('caregiver', 'care_seeker');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE job_status AS ENUM ('open', 'matched', 'closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  status job_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    preferred_start_time IS NULL
    OR preferred_end_time IS NULL
    OR preferred_start_time < preferred_end_time
  )
);

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS requested_availabilities JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE jobs
ALTER COLUMN schedule_summary SET DEFAULT '',
ALTER COLUMN frequency SET DEFAULT '';

CREATE TABLE IF NOT EXISTS job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  caregiver_user_id UUID NOT NULL REFERENCES caregiver_profiles(user_id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0),
  reasons TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, caregiver_user_id)
);

CREATE TABLE IF NOT EXISTS job_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  caregiver_user_id UUID NOT NULL REFERENCES caregiver_profiles(user_id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'pending',
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (job_id, caregiver_user_id)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_jobs_care_seeker_user_id ON jobs(care_seeker_user_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_job_id ON job_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_job_id ON job_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_caregiver_user_id ON job_requests(caregiver_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_requests_one_accepted
  ON job_requests(job_id)
  WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_caregiver_availability_user_id ON caregiver_availabilities(caregiver_user_id);

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

