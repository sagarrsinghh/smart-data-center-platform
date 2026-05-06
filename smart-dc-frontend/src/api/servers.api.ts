import api from "./axios";

export const getServers = () => api.get("/servers");
export const createServer = (data: any) =>
  api.post("/servers", data);
export const deleteServer = (id: string) =>
  api.delete(`/servers/${id}`);