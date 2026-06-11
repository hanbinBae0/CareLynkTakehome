import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="shell landing-shell">
      <main className="landing-content">
        <section className="landing-intro">
          <Link className="brand" to="/">
            CareLynk
          </Link>
          <h1>Find the right care connection.</h1>
          <p>Choose how you want to continue.</p>
        </section>

        <section className="landing-options">
          <article className="landing-option">
            <div>
              <p className="eyebrow">For Caregivers</p>
              <h2>Offer care</h2>
              <p>Create your profile and respond to care requests.</p>
            </div>
            <Link className="primary-button" to="/caregiver/login">
              Caregiver portal
            </Link>
            <Link className="landing-signup-link" to="/caregiver/register">
              Create caregiver account
            </Link>
          </article>

          <article className="landing-option">
            <div>
              <p className="eyebrow">For Care Seekers</p>
              <h2>Find care</h2>
              <p>Create a care job and connect with matching caregivers.</p>
            </div>
            <Link className="primary-button" to="/care-seeker/login">
              Care seeker portal
            </Link>
            <Link className="landing-signup-link" to="/care-seeker/register">
              Create care seeker account
            </Link>
          </article>
        </section>
      </main>
    </div>
  );
}

