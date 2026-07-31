import { getAuthContext } from "@/lib/auth-guard";
import { homePathForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function Home() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  redirect(homePathForRole(auth.cargo));
}
