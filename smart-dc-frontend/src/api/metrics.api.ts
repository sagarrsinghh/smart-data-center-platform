import api from "./axios";

export interface MetricsQuery {
  serverId?: string;
  range?: string;
}

export const getMetricsHistory = (params?: MetricsQuery) =>
  api.get("/metrics/history", { params });

export const getLatestMetrics = () =>
  api.get("/metrics/latest");

export const getMetricsByServer = (id: string) =>
  api.get(`/metrics/by-server/${id}`);