import { guardModule } from "@/lib/moduleAccess";
import { getAuthContext } from "@/lib/auth-guard";
import { listEmailMailboxesForUser } from "@/app/actions/emailMailboxes";
import EmailsClient from "./EmailsClient";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  await guardModule("emails");
  const auth = await getAuthContext();
  const mailboxes = await listEmailMailboxesForUser();

  return (
    <EmailsClient
      initialMailboxes={mailboxes.data || []}
      isAdmin={auth?.cargo === "ADMIN"}
    />
  );
}
