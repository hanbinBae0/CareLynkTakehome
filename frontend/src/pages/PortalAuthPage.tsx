import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import { InputField } from "../components/InputField";
import { PortalLayout } from "../layouts/PortalLayout";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types/api";

interface PortalAuthPageProps {
  role: UserRole;
  mode: "login" | "register";
}

export function PortalAuthPage({ role, mode }: PortalAuthPageProps) {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";
  const portalName = role === "caregiver" ? "Caregiver" : "Care seeker";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const data = isRegister
        ? await api.register({
            role,
            email: form.email,
            password: form.password,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
          })
        : await api.login({
            email: form.email,
            password: form.password,
          });

      if (data.user.role !== role) {
        throw new Error(`This account belongs to the ${data.user.role === "caregiver" ? "caregiver" : "care seeker"} portal.`);
      }

      setSession(data.token, data.user);
      navigate(role === "caregiver" ? "/caregiver/profile" : "/care-seeker/dashboard");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to continue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalLayout
      title={`${portalName} ${isRegister ? "sign up" : "login"}`}
      subtitle={`Separate ${portalName.toLowerCase()} flow with role-aware access`}
    >
      <section className="panel">
        <form className="stack" onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <InputField label="First name" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} />
              <InputField label="Last name" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} />
              <InputField label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
            </>
          )}

          <InputField label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
          <InputField label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />

          {error && <p className="error-text">{error}</p>}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Working..." : isRegister ? "Create account" : "Log in"}
          </button>
        </form>

        <p className="muted">
          {isRegister ? "Already have an account?" : "Need an account?"}{" "}
          <Link to={`/${role === "caregiver" ? "caregiver" : "care-seeker"}/${isRegister ? "login" : "register"}`}>
            {isRegister ? "Log in" : "Register"}
          </Link>
        </p>
      </section>
    </PortalLayout>
  );
}

