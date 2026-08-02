import { redirect } from "next/navigation";
import { guardModule } from "@/lib/moduleAccess";
import { getAuthContext } from "@/lib/auth-guard";
import { listAllEmailMailboxesAdmin } from "@/app/actions/emailMailboxes";
import { listEmailDocumentTemplates } from "@/app/actions/emailDocumentTemplates";
import EmailMailboxesConfigClient from "./EmailMailboxesConfigClient";

export const maxDuration = 60;

export default async function EmailsConfigPage() {
  await guardModule("emails");
  const auth = await getAuthContext();
  if (auth?.cargo !== "ADMIN") {
    redirect("/emails");
  }
  const [mailboxesRes, templatesRes] = await Promise.all([
    listAllEmailMailboxesAdmin(),
    listEmailDocumentTemplates(),
  ]);

  return (
    <EmailMailboxesConfigClient
      initialMailboxes={mailboxesRes.data || []}
      initialTemplates={templatesRes.data || []}
    />
  );
}
