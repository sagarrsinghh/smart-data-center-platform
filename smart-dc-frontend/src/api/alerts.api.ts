import api from "./axios";

export const getAlerts = () => api.get("/alerts");
export const getActiveAlerts = () => api.get("/alerts/active");
export const generateAlerts = () => api.post("/alerts/generate");
export const acknowledgeAlert = (id: string) =>
  api.patch(`/alerts/${id}/acknowledge`);
export const resolveAlert = (id: string) =>
  api.patch(`/alerts/${id}/resolve`);
export const getAlertStats = () => api.get("/alerts/stats");
