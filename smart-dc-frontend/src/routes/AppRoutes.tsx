import { BrowserRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

import PrivateRoute from "./PrivateRoute";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Dashboard from "../pages/dashboard/Dashboard";
import Upload from "../pages/upload/Upload";
import Metrics from "../pages/metrics/Metrics";
import Analytics from "../pages/analytics/Analytics";
import Alerts from "../pages/alerts/Alerts";
import Prediction from "../pages/prediction/Prediction";
import Profile from "../pages/profile/Profile";
import Reports from "../pages/reports/Reports";
import Servers from "../pages/servers/Servers";
import Users from "../pages/users/Users";
import { ALL_ROLES, OPERATOR_ROLES, SUPER_ADMIN_ONLY } from "../utils/roles";

const withAuth = (element: ReactNode, allowedRoles = ALL_ROLES) => (
  <PrivateRoute allowedRoles={allowedRoles}>{element}</PrivateRoute>
);

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={withAuth(<Dashboard />)} />
        <Route path="/upload" element={withAuth(<Upload />, OPERATOR_ROLES)} />
        <Route path="/metrics" element={withAuth(<Metrics />)} />
        <Route path="/analytics" element={withAuth(<Analytics />)} />
        <Route path="/alerts" element={withAuth(<Alerts />)} />
        <Route path="/prediction" element={withAuth(<Prediction />)} />
        <Route path="/profile" element={withAuth(<Profile />)} />
        <Route path="/reports" element={withAuth(<Reports />)} />
        <Route path="/servers" element={withAuth(<Servers />, OPERATOR_ROLES)} />
        <Route path="/users" element={withAuth(<Users />, SUPER_ADMIN_ONLY)} />
      </Routes>
    </BrowserRouter>
  );
}
