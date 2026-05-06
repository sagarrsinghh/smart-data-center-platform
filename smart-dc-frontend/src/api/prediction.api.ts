import api from "./axios";

export const getForecast = () => api.get("/prediction/forecast");
export const getAnomalies = () => api.get("/prediction/anomalies");
export const getCapacity = () => api.get("/prediction/capacity");
export const analyzePrediction = () =>
  api.post("/prediction/analyze");