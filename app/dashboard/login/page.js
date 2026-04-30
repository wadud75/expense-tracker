import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/auth/AdminLoginForm";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export default async function DashboardLoginPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const nextPath = resolvedSearchParams?.next;
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (session) {
    redirect(nextPath && nextPath.startsWith("/") ? nextPath : "/");
  }

  return <AdminLoginForm />;
}
