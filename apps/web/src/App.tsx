import { lazy } from "react";
import { Route, Routes } from "react-router";
import { RequireRole } from "./auth/RequireRole";
import { Layout } from "./components/Layout";
import { DashboardRedirect } from "./pages/DashboardRedirect";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { MockLoginPage } from "./pages/MockLoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { VerifyPage } from "./pages/VerifyPage";

// Role-specific pages load on demand so the public verification page stays small.
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage })));
const SignerDashboardPage = lazy(() => import("./pages/signer/SignerDashboardPage").then((module) => ({ default: module.SignerDashboardPage })));
const StaffDashboardPage = lazy(() => import("./pages/staff/StaffDashboardPage").then((module) => ({ default: module.StaffDashboardPage })));
const StaffRequestPage = lazy(() => import("./pages/staff/StaffRequestPage").then((module) => ({ default: module.StaffRequestPage })));
const MyDocumentsPage = lazy(() => import("./pages/student/MyDocumentsPage").then((module) => ({ default: module.MyDocumentsPage })));
const MyRequestsPage = lazy(() => import("./pages/student/MyRequestsPage").then((module) => ({ default: module.MyRequestsPage })));
const NewRequestPage = lazy(() => import("./pages/student/NewRequestPage").then((module) => ({ default: module.NewRequestPage })));
const RequestDetailsPage = lazy(() => import("./pages/student/RequestDetailsPage").then((module) => ({ default: module.RequestDetailsPage })));
const StudentDashboardPage = lazy(() => import("./pages/student/StudentDashboardPage").then((module) => ({ default: module.StudentDashboardPage })));

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="dev/mock-login" element={<MockLoginPage />} />
        <Route path="dashboard" element={<DashboardRedirect />} />
        <Route path="verify" element={<VerifyPage />} />
        <Route path="verify/:token" element={<VerifyPage />} />

        <Route path="student" element={<RequireRole roles={["STUDENT"]}><StudentDashboardPage /></RequireRole>} />
        <Route path="student/requests" element={<RequireRole roles={["STUDENT"]}><MyRequestsPage /></RequireRole>} />
        <Route path="student/requests/new" element={<RequireRole roles={["STUDENT"]}><NewRequestPage /></RequireRole>} />
        <Route path="student/requests/:requestId" element={<RequireRole roles={["STUDENT"]}><RequestDetailsPage /></RequireRole>} />
        <Route path="student/documents" element={<RequireRole roles={["STUDENT"]}><MyDocumentsPage /></RequireRole>} />

        <Route
          path="staff"
          element={<RequireRole roles={["SPECIALIST", "ACCOUNTANT", "AUTHORIZED_SIGNER"]}><StaffDashboardPage /></RequireRole>}
        />
        <Route
          path="staff/requests/:requestId"
          element={
            <RequireRole roles={["SPECIALIST", "ACCOUNTANT", "AUTHORIZED_SIGNER", "SYSTEM_ADMIN"]}>
              <StaffRequestPage />
            </RequireRole>
          }
        />
        <Route path="signer" element={<RequireRole roles={["AUTHORIZED_SIGNER"]}><SignerDashboardPage /></RequireRole>} />
        <Route path="admin" element={<RequireRole roles={["SYSTEM_ADMIN"]}><AdminDashboardPage /></RequireRole>} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
