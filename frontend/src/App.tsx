import { BrowserRouter, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { PortalAuthPage } from "./pages/PortalAuthPage";
import { CaregiverProfilePage } from "./pages/CaregiverProfilePage";
import { CareSeekerDashboardPage } from "./pages/CareSeekerDashboardPage";
import { JobMatchesPage } from "./pages/JobMatchesPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/caregiver/register" element={<PortalAuthPage role="caregiver" mode="register" />} />
        <Route path="/caregiver/login" element={<PortalAuthPage role="caregiver" mode="login" />} />
        <Route
          path="/caregiver/profile"
          element={
            <ProtectedRoute role="caregiver">
              <CaregiverProfilePage />
            </ProtectedRoute>
          }
        />

        <Route path="/care-seeker/register" element={<PortalAuthPage role="care_seeker" mode="register" />} />
        <Route path="/care-seeker/login" element={<PortalAuthPage role="care_seeker" mode="login" />} />
        <Route
          path="/care-seeker/dashboard"
          element={
            <ProtectedRoute role="care_seeker">
              <CareSeekerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/care-seeker/jobs/:jobId"
          element={
            <ProtectedRoute role="care_seeker">
              <JobMatchesPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

