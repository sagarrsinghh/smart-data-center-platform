import api from "./axios";

export const getOverview = () => api.get("/dashboard/overview");
export const getStats = () => api.get("/dashboard/stats");
export const getDashboardAlerts = () => api.get("/dashboard/alerts");
export const getDashboardMetrics = () => api.get("/dashboard/metrics");
export const getDashboardPrediction = () => api.get("/dashboard/prediction");
export const getRealtime = () => api.get("/dashboard/real-time");
export const getServerDashboard = (id: string) =>
  api.get(`/dashboard/server/${id}`);