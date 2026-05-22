import { LockKeyhole } from "lucide-react";
import { loginAdmin } from "@/app/actions";
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) redirect("/admin");
  const params = await searchParams;

  return (
    <div className="auth-wrap">
      <form className="auth-card" action={loginAdmin}>
        <div className="auth-icon">
          <LockKeyhole size={22} />
        </div>
        <h1>Admin Login</h1>
        <p>Public pages are open. This password only protects pool edits.</p>
        {params.error ? <p className="form-error">Incorrect admin password.</p> : null}
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="button button-primary" type="submit">
          Enter admin portal
        </button>
        <small>Default local password is admin. Set ADMIN_PASSWORD on Vercel.</small>
      </form>
    </div>
  );
}
