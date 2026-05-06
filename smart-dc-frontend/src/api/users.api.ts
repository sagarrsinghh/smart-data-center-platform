import api from "./axios";

export interface UserRecord {
  id: string;
  name?: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "VIEWER";
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRecord["role"];
}

export interface UpdateUserDto {
  name?: string;
  role?: UserRecord["role"];
}

export const getUsers = () => api.get("/users");
export const createUser = (data: CreateUserDto) => api.post("/users", data);
export const updateUser = (id: string, data: UpdateUserDto) => api.put(`/users/${id}`, data);
export const deleteUser = (id: string) => api.delete(`/users/${id}`);
