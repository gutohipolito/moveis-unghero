import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getQuotes } from "@/app/actions/quotes";
import QuotesList from "@/components/QuotesList";

export default async function QuotesPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  }).catch(() => null);

  const companyId = session?.user?.company_id || "mock-company-id";
  const response = await getQuotes();
  const quotes = response.success ? response.data : [];

  return (
    <QuotesList 
      initialQuotes={quotes as any} 
      companyId={companyId} 
      isDbOffline={false}
    />
  );
}
