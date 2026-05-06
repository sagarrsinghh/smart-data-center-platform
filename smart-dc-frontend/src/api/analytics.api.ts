import api from "./axios";

export interface AnalyticsQuery {
  serverId?: string;
  range?: string;
  year?: string;
  yearFrom?: string;
  yearTo?: string;
}

export const getAnalyticsSummary = (params?: AnalyticsQuery) =>
  api.get("/analytics/summary", { params });

export const getTrends = (params?: AnalyticsQuery) =>
  api.get("/analytics/trends", { params });

export const getUtilization = (params?: AnalyticsQuery) =>
  api.get("/analytics/utilization", { params });

export const getComparison = (params?: AnalyticsQuery) =>
  api.get("/analytics/comparison", { params });

export const getTopConsumers = (params?: AnalyticsQuery) =>
  api.get("/analytics/top-consumers", { params });

export const getHeatmap = (params?: AnalyticsQuery) =>
  api.get("/analytics/heatmap", { params });

export const getMonthlyAnalytics = (params?: AnalyticsQuery) =>
  api.get("/analytics/monthly", { params });

export const getYearlyAnalytics = (params?: AnalyticsQuery) =>
  api.get("/analytics/yearly", { params });
