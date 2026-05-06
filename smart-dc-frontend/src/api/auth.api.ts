import api from "./axios";

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateProfileDto {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export const loginApi = (data: LoginDto) =>
  api.post("/auth/login", data);

export const registerApi = (data: any) =>
  api.post("/auth/register", data);

export const getProfileApi = () =>
  api.get("/auth/profile");

export const updateProfileApi = (data: UpdateProfileDto) =>
  api.patch("/auth/profile", data);
