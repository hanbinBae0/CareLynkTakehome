# CareLynk Homecare MVP

This repository implements the take-home MVP as a small monorepo with:

- `backend/`: Node.js + TypeScript REST API
- `frontend/`: React + TypeScript client
- `backend/sql/schema.sql`: PostgreSQL schema

## 1. PDF Requirement Summary

The assignment asks for a simple homecare platform MVP with two separate portals:

- Caregiver portal:
  Capture caregiver onboarding and profile details including contact info, location, skills, experience, availability, and certifications.
- Care seeker portal:
  Capture care seeker profile details and allow creation of a care request/job.
- Matching:
  After a job is created, show suitable caregivers using simple rule-based matching based on location, availability, and relevant skills/experience.

Out of scope for the MVP:

- Messaging
- Payments
- Advanced workflow/operations features

Technical expectations from the PDF:

- Backend: Node.js with TypeScript
- Database: PostgreSQL
- Frontend: React.js with TypeScript
- Clear API structure and code organization
- Basic validation and error handling
- README with setup steps and assumptions

## 2. System Architecture

The implementation uses a small layered monorepo:

- React client for the two portals and job/match views
- Express API for auth, profiles, jobs, and matching
- PostgreSQL for persistence

Backend layers:

- `routes/`: HTTP route wiring
- `controllers/`: request/response handling
- `services/`: business logic and orchestration
- `repositories/`: PostgreSQL query logic
- `schemas/`: request validation with `zod`
- `middleware/`: auth and error handling

Frontend structure:

- `pages/`: route-level screens
- `components/`: reusable form/display components
- `context/`: lightweight auth/session state
- `api/`: typed fetch helpers

Auth approach:

- Separate registration/login flows by role
- Signed bearer token using Node crypto
- Role-guarded endpoints and route protection

## 3. PostgreSQL Schema

Core tables:

- `users`
  Shared auth/account table with `role`
- `caregiver_profiles`
  One-to-one with `users`
- `caregiver_availabilities`
  One-to-many availability slots for caregivers
- `care_seeker_profiles`
  One-to-one with `users`
- `jobs`
  Care requests created by care seekers
- `job_matches`
  Persisted computed matches for a job

Relationship summary:

- `users (1) -> (1) caregiver_profiles`
- `users (1) -> (1) care_seeker_profiles`
- `caregiver_profiles (1) -> (many) caregiver_availabilities`
- `care_seeker_profiles (1) -> (many) jobs`
- `jobs (1) -> (many) job_matches`
- `caregiver_profiles (1) -> (many) job_matches`

The full schema is in [backend/sql/schema.sql](/Users/hanbinbae/Desktop/CareLynk_Takehome/backend/sql/schema.sql).

## 4. API Design

REST endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/caregiver/profile`
- `PUT /api/caregiver/profile`
- `GET /api/care-seeker/profile`
- `PUT /api/care-seeker/profile`
- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/:jobId`
- `GET /api/jobs/:jobId/matches`
- `GET /api/health`

## 5. Frontend Page Structure

Pages implemented:

- Landing page
- Caregiver register page
- Caregiver login page
- Caregiver profile/onboarding page
- Care seeker register page
- Care seeker login page
- Care seeker dashboard/profile page
- Job detail + caregiver matches page

Portal separation:

- `/caregiver/*` for caregiver flows
- `/care-seeker/*` for care seeker flows

## 6. Matching Logic

The MVP uses a deterministic matching algorithm with the following rules:

- Caregiver state must match the job state
- Caregiver availability must overlap the requested schedule
- Required skills must match caregiver skills or appear in the caregiver’s headline/bio
- Matching results are stored in `job_matches`
- All matches currently receive the same score and are sorted by caregiver name

Computed matches are stored in `job_matches` and returned alphabetically by caregiver last name, then first name.

## 7. Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### Environment

Real `.env` files are intentionally not committed. Create them locally from the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Use these local development values.

Backend `backend/.env`:

```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/carelynk
JWT_SECRET=carelynk-local-dev-secret-123
CLIENT_URL=http://localhost:5173
```

Frontend `frontend/.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

### Install

```bash
npm install
```

### Database

Ensure PostgreSQL is running, then create the local database and apply the schema:

```bash
createdb carelynk
psql "postgres://postgres:postgres@localhost:5432/carelynk" -f backend/sql/schema.sql
```

If `createdb carelynk` reports that the database already exists, keep the existing database or recreate it manually.

### Seed Reviewer Data

After configuring `backend/.env`, run:

```bash
npm run db:seed
```

The command applies the schema, resets only the demo accounts below, and
creates profiles, availability, jobs, computed matches, and request states. It
is safe to run repeatedly.

All demo accounts use:

```text
Password: CareLynk123!
```

| Account | Portal | Purpose |
| --- | --- | --- |
| `seeker.demo@carelynk.test` | Care seeker | Completed profile, three jobs, matches, and request workflows |
| `caregiver.demo@carelynk.test` | Caregiver | Completed companionship and meal-support profile with a pending request |
| `caregiver.james@carelynk.test` | Caregiver | Completed dementia-care profile with an accepted request |
| `caregiver.new@carelynk.test` | Caregiver | Blank profile for testing onboarding |

Suggested reviewer flow:

1. Use `caregiver.new@carelynk.test` to test caregiver onboarding.
2. Use `seeker.demo@carelynk.test` to create, edit, delete, and match jobs.
3. Open the seeded jobs to inspect matches and request statuses.
4. Use `caregiver.demo@carelynk.test` to respond to the pending request.

### Run

Backend:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev:frontend
```

### Verification

Confirm the backend is reachable and the project compiles cleanly:

```bash
curl http://localhost:4000/api/health
npm run typecheck
npm run build
```

### Reviewer Quick Test

Run `npm run db:seed`, start both applications, and use the demo credentials
above to test onboarding, job management, matching, and caregiver requests.

### Build

```bash
npm run build
```

## 8. Assumptions

- “Separate portals” means clearly separated role-specific flows within one frontend application.
- Matching uses exact city/state comparison instead of geospatial distance for MVP simplicity.
- Availability matching uses weekday overlap plus optional time windows.
- The UI favors clarity and workflow coverage over design polish.
- Messaging, payments, and operational workflows are intentionally excluded because the PDF marks them as out of scope.
