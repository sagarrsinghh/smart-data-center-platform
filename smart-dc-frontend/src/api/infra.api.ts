import api from "./axios";

export const getInfraDashboard = () => api.get("/infra-analytics/dashboard");

export const getProjectSummary = () => api.get("/projects/summary");

export const getProjectDeployments = (params?: Record<string, string>) =>
  api.get("/projects/deployments", { params });

export const getProjectTopConsumers = () => api.get("/projects/top-consumers");

export const getStorageSummary = () => api.get("/storage/summary");

export const getStorageAssets = () => api.get("/storage/assets");

export const getComputeTrends = () => api.get("/infra-analytics/trends/compute");

export const getStorageTrends = () => api.get("/infra-analytics/trends/storage");

export const getAlerts = () => api.get("/infra-analytics/alerts");

export const getNotifications = (limit = 12) =>
  api.get("/notifications", { params: { limit } });

export const markNotificationRead = (id: number) =>
  api.post(`/notifications/${id}/read`);
