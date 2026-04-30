import { redirect } from "next/navigation";

export default async function AdminLoginPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const nextPath = resolvedSearchParams?.next;
  const destination =
    nextPath && nextPath.startsWith("/") ? `/dashboard/login?next=${encodeURIComponent(nextPath)}` : "/dashboard/login";
  redirect(destination);
}
