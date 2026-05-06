import api from "./axios";

export const getReports = () => api.get("/reports");

export const generateReport = (payload: any) =>
  api.post("/reports/generate", payload);

export const downloadReport = (id: string) =>
  api.get(`/reports/${id}/download`, {
    responseType: "blob",
  });

export const deleteReport = (id: string) =>
  api.delete(`/reports/${id}`);
