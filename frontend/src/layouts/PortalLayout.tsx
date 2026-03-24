import { ReactNode } from "react";
import { Link } from "react-router-dom";

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
