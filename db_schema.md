# CareLynk Database Schema

CareLynk uses PostgreSQL. The executable schema is defined in
[`backend/sql/schema.sql`](backend/sql/schema.sql).

## Overview

The database supports:

- Shared authentication for caregivers and care seekers
- Role-specific user profiles
- Caregiver weekly availability
- Care jobs created by care seekers
- Computed caregiver matches
- Care requests sent to matched caregivers
- Acceptance, decline, and cancellation workflows

UUID primary keys are generated with PostgreSQL's `pgcrypto` extension.

## Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o| caregiver_profiles : "has caregiver role"
    users ||--o| care_seeker_profiles : "has care seeker role"
    caregiver_profiles ||--o{ caregiver_availabilities : has
    care_seeker_profiles ||--o{ jobs : creates
    jobs ||--o{ job_matches : produces
    caregiver_profiles ||--o{ job_matches : appears_in
    jobs ||--o{ job_requests : receives
    caregiver_profiles ||--o{ job_requests : receives

    users {
        uuid id PK
        user_role role
        text email UK
        text password_hash
        text first_name
        text last_name
        text phone
        timestamptz created_at
        timestamptz updated_at
    }

    caregiver_profiles {
        uuid user_id PK,FK
        text headline
        text city
        text state
        text zip_code
        text bio
        integer years_experience
        text_array skills
        text_array certifications
        boolean accepting_new_jobs
    }

    caregiver_availabilities {
        uuid id PK
        uuid caregiver_user_id FK
        smallint weekday
        time start_time
        time end_time
    }

    care_seeker_profiles {
        uuid user_id PK,FK
        text preferred_contact_method
        text care_recipient_name
        text relationship_to_recipient
        text city
        text state
        text zip_code
        text notes
    }

    jobs {
        uuid id PK
        uuid care_seeker_user_id FK
        text title
        text care_type
        text location_city
        text location_state
        text zip_code
        text duration
        jsonb requested_availabilities
        text_array required_skills
        text notes
        job_status status
    }

    job_matches {
        uuid id PK
        uuid job_id FK
        uuid caregiver_user_id FK
        integer score
        text_array reasons
    }

    job_requests {
        uuid id PK
        uuid job_id FK
        uuid caregiver_user_id FK
        request_status status
        text message
        timestamptz responded_at
    }
```

## Enums

### `user_role`

| Value | Description |
| --- | --- |
| `caregiver` | User who creates a caregiver profile and receives care requests |
| `care_seeker` | User who creates care jobs and sends requests |

### `job_status`

| Value | Description |
| --- | --- |
| `open` | Job can be edited, deleted, matched, and used to send requests |
| `matched` | A caregiver has accepted a request for the job |
| `closed` | Job is no longer active |

Finding suitable caregivers does not change a job to `matched`. A job becomes
`matched` only after a caregiver accepts a request.

### `request_status`

| Value | Description |
| --- | --- |
| `pending` | Request is awaiting the caregiver's response |
| `accepted` | Caregiver accepted the request |
| `declined` | Caregiver declined the request |
| `cancelled` | Request was cancelled by the care seeker or workflow |

## Tables

### `users`

Shared authentication and identity table.

| Column | Type | Constraints / Notes |
| --- | --- | --- |
| `id` | `UUID` | Primary key; generated with `gen_random_uuid()` |
| `role` | `user_role` | Required |
| `email` | `TEXT` | Required and unique |
| `password_hash` | `TEXT` | Required; plaintext passwords are never stored |
| `first_name` | `TEXT` | Required |
| `last_name` | `TEXT` | Required |
| `phone` | `TEXT` | Required |
| `created_at` | `TIMESTAMPTZ` | Defaults to `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | Defaults to `NOW()` |

### `caregiver_profiles`

One-to-one extension of `users` for caregiver-specific information.

| Column | Type | Constraints / Notes |
| --- | --- | --- |
| `user_id` | `UUID` | Primary key; references `users(id)` |
| `headline` | `TEXT` | Defaults to empty string |
| `city` | `TEXT` | Used by matching |
| `state` | `TEXT` | Used by matching |
| `zip_code` | `TEXT` | Defaults to empty string |
| `bio` | `TEXT` | May also be searched for required experience |
| `years_experience` | `INTEGER` | Must be zero or greater |
| `skills` | `TEXT[]` | Used by matching |
| `certifications` | `TEXT[]` | Caregiver qualifications |
| `accepting_new_jobs` | `BOOLEAN` | Only true profiles are considered for matching |
| `created_at` | `TIMESTAMPTZ` | Defaults to `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | Defaults to `NOW()` |

Deleting the user cascades to the caregiver profile.

### `caregiver_availabilities`

Stores one or more weekly time periods for a caregiver.

| Column | Type | Constraints / Notes |
| --- | --- | --- |
| `id` | `UUID` | Primary key |
| `caregiver_user_id` | `UUID` | References `caregiver_profiles(user_id)` |
| `weekday` | `SMALLINT` | `0` through `6`; Sunday is `0` |
| `start_time` | `TIME` | Required |
| `end_time` | `TIME` | Required and later than `start_time` |
| `created_at` | `TIMESTAMPTZ` | Defaults to `NOW()` |

The combination of caregiver, weekday, start time, and end time is unique.

### `care_seeker_profiles`

One-to-one extension of `users` for care seeker and recipient information.

| Column | Type | Constraints / Notes |
| --- | --- | --- |
| `user_id` | `UUID` | Primary key; references `users(id)` |
| `preferred_contact_method` | `TEXT` | Phone, text, email, or another preference |
| `care_recipient_name` | `TEXT` | Person receiving care |
| `relationship_to_recipient` | `TEXT` | Care seeker's relationship to the recipient |
| `city` | `TEXT` | Profile location |
| `state` | `TEXT` | Profile location |
| `zip_code` | `TEXT` | Defaults to empty string |
| `notes` | `TEXT` | Additional profile context |
| `created_at` | `TIMESTAMPTZ` | Defaults to `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | Defaults to `NOW()` |

Deleting the user cascades to the care seeker profile and its jobs.

### `jobs`

Care jobs created by care seekers.

| Column | Type | Constraints / Notes |
| --- | --- | --- |
| `id` | `UUID` | Primary key |
| `care_seeker_user_id` | `UUID` | References `care_seeker_profiles(user_id)` |
| `title` | `TEXT` | Required |
| `care_type` | `TEXT` | Required |
| `location_city` | `TEXT` | Required |
| `location_state` | `TEXT` | Required and used by matching |
| `zip_code` | `TEXT` | Defaults to empty string |
| `duration` | `TEXT` | Required |
| `requested_availabilities` | `JSONB` | Per-day requested time periods |
| `required_skills` | `TEXT[]` | All listed skills must match |
| `notes` | `TEXT` | Additional job requirements |
| `status` | `job_status` | Defaults to `open` |
| `created_at` | `TIMESTAMPTZ` | Defaults to `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | Defaults to `NOW()` |

`requested_availabilities` contains objects in this form:

```json
[
  {
    "weekday": 1,
    "startTime": "09:00",
    "endTime": "12:00"
  }
]
```

The schema retains these legacy compatibility columns:

| Column | Purpose |
| --- | --- |
| `schedule_summary` | Retained with an empty-string default; no longer used by the application |
| `frequency` | Retained with an empty-string default; no longer used by the application |
| `requested_weekdays` | Derived from requested availability days for compatibility |
| `preferred_start_time` | Legacy shared time range; new jobs use `requested_availabilities` |
| `preferred_end_time` | Legacy shared time range; new jobs use `requested_availabilities` |

### `job_matches`

Stores the latest computed caregiver candidates for a job.

| Column | Type | Constraints / Notes |
| --- | --- | --- |
| `id` | `UUID` | Primary key |
| `job_id` | `UUID` | References `jobs(id)` |
| `caregiver_user_id` | `UUID` | References `caregiver_profiles(user_id)` |
| `score` | `INTEGER` | Must be zero or greater |
| `reasons` | `TEXT[]` | Human-readable matching reasons |
| `created_at` | `TIMESTAMPTZ` | Defaults to `NOW()` |

A caregiver can appear only once per job. Match rows are replaced whenever
matching is recomputed, so persistent request state is stored separately.

### `job_requests`

Stores requests sent from care seekers to matched caregivers.

| Column | Type | Constraints / Notes |
| --- | --- | --- |
| `id` | `UUID` | Primary key |
| `job_id` | `UUID` | References `jobs(id)` |
| `caregiver_user_id` | `UUID` | References `caregiver_profiles(user_id)` |
| `status` | `request_status` | Defaults to `pending` |
| `message` | `TEXT` | Optional care seeker message |
| `created_at` | `TIMESTAMPTZ` | Defaults to `NOW()` |
| `responded_at` | `TIMESTAMPTZ` | Set when resolved or cancelled |

Only one request can be created for a given job and caregiver. A partial unique
index ensures that no job can have more than one accepted request.

## Matching Data

The matching service currently requires:

1. The caregiver is accepting new jobs.
2. The caregiver state matches the job state.
3. Every requested job time period overlaps a caregiver availability period on
   the same weekday.
4. Every required skill matches a caregiver skill, headline, or bio.

`job_matches` represents computed candidates. `job_requests` represents the
persistent business workflow after a care seeker chooses a candidate.

## Request Workflow

1. A care seeker creates an `open` job.
2. Matching replaces the job's `job_matches` rows.
3. The care seeker sends a `pending` request to a matched caregiver.
4. The caregiver accepts or declines the request.
5. Acceptance changes the job to `matched`.
6. Other pending requests for that job are changed to `cancelled`.
7. The unique accepted-request index prevents multiple caregivers from
   accepting the same job.

Editing an open job cancels its pending requests and recomputes matches. Only
open jobs can be edited or deleted.

## Cascading Deletes

- Deleting a user deletes its role profile.
- Deleting a caregiver profile deletes availability, match, and request rows.
- Deleting a care seeker profile deletes its jobs.
- Deleting a job deletes its match and request rows.

## Indexes

| Index | Purpose |
| --- | --- |
| `idx_users_role` | Filters users by portal role |
| `idx_jobs_care_seeker_user_id` | Lists jobs belonging to a care seeker |
| `idx_job_matches_job_id` | Retrieves matches for a job |
| `idx_job_requests_job_id` | Retrieves requests for a job |
| `idx_job_requests_caregiver_user_id` | Retrieves a caregiver's request inbox |
| `idx_job_requests_one_accepted` | Enforces one accepted caregiver per job |
| `idx_caregiver_availability_user_id` | Retrieves caregiver availability |

## Applying the Schema

From the repository root:

```bash
psql "postgres://postgres:postgres@localhost:5432/carelynk" \
  -f backend/sql/schema.sql
```

The schema uses `IF NOT EXISTS` where possible so it can be applied to an
existing local development database.

## Seed Data

Reviewer-ready demo data can be created from the repository root:

```bash
npm run db:seed
```

The seed implementation is in
[`backend/src/scripts/seed.ts`](backend/src/scripts/seed.ts). It applies the
schema, resets only known demo accounts, inserts deterministic workflow data,
and recomputes `job_matches` through the application matching service.
