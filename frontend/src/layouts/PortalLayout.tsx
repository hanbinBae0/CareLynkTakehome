import { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

interface PortalLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function PortalLayout({ title, subtitle, children }: PortalLayoutProps) {
  const { user, clearSession } = useAuth();

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" to="/">
            CareLynk
          </Link>
          <p className="muted">{subtitle}</p>
        </div>
        <div className="topbar-actions">
          {user && (
            <>
              <span className="user-badge">
                {user.firstName} {user.lastName}
              </span>
              <button className="secondary-button" onClick={clearSession}>
                Log out
              </button>
            </>
          )}
        </div>
      </header>
      {user?.role === "caregiver" && (
        <nav className="portal-nav" aria-label="Caregiver portal">
          <NavLink
            className={({ isActive }) => (isActive ? "portal-nav-link active" : "portal-nav-link")}
            to="/caregiver/dashboard"
          >
            Dashboard
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "portal-nav-link active" : "portal-nav-link")}
            to="/caregiver/profile"
          >
            Profile
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "portal-nav-link active" : "portal-nav-link")}
            to="/caregiver/requests"
          >
            Care requests
          </NavLink>
        </nav>
      )}
      {user?.role === "care_seeker" && (
        <nav className="portal-nav" aria-label="Care seeker portal">
          <NavLink
            className={({ isActive }) => (isActive ? "portal-nav-link active" : "portal-nav-link")}
            to="/care-seeker/dashboard"
          >
            Dashboard
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "portal-nav-link active" : "portal-nav-link")}
            to="/care-seeker/profile"
          >
            Profile
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "portal-nav-link active" : "portal-nav-link")}
            end
            to="/care-seeker/jobs"
          >
            My jobs
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "portal-nav-link active" : "portal-nav-link")}
            to="/care-seeker/jobs/new"
          >
            Create job
          </NavLink>
        </nav>
      )}
      <main className="content">
        <section className="hero-card">
          <p className="eyebrow">Homecare MVP</p>
          <h1>{title}</h1>
        </section>
        {children}
      </main>
    </div>
  );
}
