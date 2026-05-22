import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const cookieName = "wcws_admin";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "admin";
}

export function adminToken(): string {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "wcws-local-dev";
  return createHash("sha256").update(`${adminPassword()}:${secret}`).digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  return (await cookies()).get(cookieName)?.value === adminToken();
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function setAdminSession(): Promise<void> {
  (await cookies()).set(cookieName, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
