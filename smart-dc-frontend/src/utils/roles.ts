export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  VIEWER: "VIEWER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const OPERATOR_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
export const ALL_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.VIEWER];
export const SUPER_ADMIN_ONLY: Role[] = [ROLES.SUPER_ADMIN];
