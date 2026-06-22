# CareLynk Frontend

A React + TypeScript single-page application providing separate portals for caregivers and care seekers to manage profiles, post/apply for care jobs, and view intelligent matches.

## Project Overview

CareLynk Frontend delivers two distinct user experiences:

- **Caregiver Portal** (`/caregiver/*`)
  - Create and manage caregiver profile (skills, availability, experience)
  - View incoming job requests from care seekers
  - Accept or decline job opportunities

- **Care Seeker Portal** (`/care-seeker/*`)
  - Create and manage care seeker profile
  - Post care jobs specifying location, schedule, required skills
  - View matching caregivers
  - Send job requests to matched caregivers
  - Manage job requests and view caregiver responses

- **Shared Components**
  - Role-based authentication (register/login with role selection)
  - Protected routes enforcing authentication
  - Centralized API client with typed responses


## Folder Structure

```
frontend/
├── src/
│   ├── main.tsx                    # Vite entry point, renders <App />
│   ├── App.tsx                     # Root component with routing setup
│   ├── vite-env.d.ts               # Vite environment types
│   ├── api/
│   │   └── client.ts               # Typed API client (all backend calls)
│   ├── components/
│   │   ├── InputField.tsx          # Reusable text input component
│   │   ├── TextAreaField.tsx       # Reusable textarea component
│   │   └── ProtectedRoute.tsx      # Wrapper to enforce auth + role
│   ├── context/
│   │   └── AuthContext.tsx         # Auth state: token + user + setSession/logout
│   ├── layouts/
│   │   └── PortalLayout.tsx        # Shared layout wrapper for pages (header, title)
│   ├── pages/
│   │   ├── LandingPage.tsx         # "/" - Welcome, role selection for auth
│   │   ├── PortalAuthPage.tsx      # "/caregiver/register", "/caregiver/login", etc.
│   │   ├── CaregiverDashboardPage.tsx     # "/caregiver/dashboard" - Profile view
│   │   ├── CaregiverProfilePage.tsx       # "/caregiver/profile" - Profile edit
│   │   ├── CaregiverRequestsPage.tsx      # "/caregiver/requests" - Incoming requests
│   │   ├── CareSeekerDashboardPage.tsx    # "/care-seeker/dashboard" - Profile view
│   │   ├── CareSeekerProfilePage.tsx      # "/care-seeker/profile" - Profile edit
│   │   ├── CareSeekerJobsPage.tsx         # "/care-seeker/jobs" - List my jobs
│   │   ├── CreateCareSeekerJobPage.tsx    # "/care-seeker/jobs/new" - Create job form
│   │   └── JobMatchesPage.tsx             # "/care-seeker/jobs/:jobId/matches" - View matches
│   ├── styles/
│   │   └── index.css               # Global styles
│   ├── types/
│   │   └── api.ts                  # TypeScript types for API responses
│   ├── tsconfig.json               # TypeScript configuration
│   ├── tsconfig.node.json          # TypeScript for Vite config
│   ├── vite.config.ts              # Vite build/dev configuration
│   ├── index.html                  # HTML entry point
│   ├── package.json                # Dependencies & scripts
│   └── .env.example                # Example environment variables
```

## State Management Strategy

### Lightweight Context-Based Approach

Instead of Redux or complex state management, this app uses **React Context + hooks** for simplicity:

```
┌─────────────────────────────────────────┐
│      AuthContext (useAuth hook)         │
├─────────────────────────────────────────┤
│ State:                                  │
│  - token: string | null                 │
│  - user: User | null                    │
│  - isLoading: boolean                   │
│                                         │
│ Methods:                                │
│  - setSession(token, user): void        │
│  - logout(): void                       │
│                                         │
│ Provider:                               │
│  <AuthProvider> wraps <App />           │
└─────────────────────────────────────────┘
         ↓
   Components call useAuth()
         ↓
   get { token, user, setSession, logout }
```

### Why This Approach?

✅ **Minimal Boilerplate**: No Redux actions/reducers/thunks  
✅ **Easy to Understand**: Token + user state is self-evident  
✅ **TypeScript-Friendly**: Direct type inference from Context  
✅ **Good for MVP**: Small app, few components need shared state  

**Trade-off**: Not suitable for large complex apps with many state mutations; would migrate to Zustand, Jotai, or Redux if app grows.

