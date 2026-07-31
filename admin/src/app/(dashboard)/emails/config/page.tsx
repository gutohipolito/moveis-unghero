import { redirect } from "next/navigation";
import { guardModule } from "@/lib/moduleAccess";
import { getAuthContext } from "@/lib/auth-guard";
import { listAllEmailMailboxesAdmin } from "@/app/actions/emailMailboxes";
import EmailMailboxesConfigClient from "./EmailMailboxesConfigClient";

export default async function EmailsConfigPage() {
  await guardModule("emails");
  const auth = await getAuthContext();
  if (auth?.cargo !== "ADMIN") {
    redirect("/emails");
  }
  const res = await listAllEmailMailboxesAdmin();

  return <EmailMailboxesConfigClient initialMailboxes={res.data || []} />;
}
