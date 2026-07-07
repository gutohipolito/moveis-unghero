import { getCachedSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getCachedSession();
  redirect(session?.user ? "/crm" : "/login");
}
