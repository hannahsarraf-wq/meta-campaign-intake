export function isAdminUser(user: { role?: string } | null | undefined): boolean {
  return user?.role === "admin";
}
