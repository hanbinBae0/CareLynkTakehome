import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="shell">
      <main className="content">
        <section className="hero-card">
          <p className="eyebrow">Take-home MVP</p>
          <h1>Two focused portals for homecare onboarding and matching.</h1>
          <p className="lead">
            Caregivers can onboard and publish matchable profiles. Care seekers can complete their profile,
            create care jobs, and review ranked caregiver matches.
          </p>
        </section>

        <section className="portal-grid">
          <article className="portal-card">
            <h2>Caregiver portal</h2>
            <p>Register, complete onboarding, and maintain a matchable profile.</p>
            <div className="card-actions">
              <Link className="primary-button" to="/caregiver/register">
                Sign up
              </Link>
              <Link className="secondary-button" to="/caregiver/login">
                Log in
              </Link>
            </div>
          </article>

          <article className="portal-card">
            <h2>Care seeker portal</h2>
            <p>Complete your profile, create jobs, and view matched caregivers.</p>
            <div className="card-actions">
              <Link className="primary-button" to="/care-seeker/register">
                Sign up
              </Link>
              <Link className="secondary-button" to="/care-seeker/login">
                Log in
              </Link>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

