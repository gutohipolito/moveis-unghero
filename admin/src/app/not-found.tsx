import { getAuthContext } from "@/lib/auth-guard";
import { homePathForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function NotFound() {
  const auth = await getAuthContext();
  redirect(auth ? homePathForRole(auth.cargo) : "/login");
}
