import { guardModule } from "@/lib/moduleAccess";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getQuotes } from "@/app/actions/quotes";
import { getUserPreferences } from "@/app/actions/preferences";
import QuotesList from "@/components/QuotesList";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

export default async function QuotesPage() {
  await guardModule("quotes");
  const session = await auth.api.getSession({
    headers: await headers()
  }).catch(() => null);

  const companyId = session?.user?.company_id || "mock-company-id";
  const [response, preferences] = await Promise.all([
    getQuotes(),
    getUserPreferences(),
  ]);
  const quotes = response.success ? response.data : [];

  const storedPageSize = Number(preferences?.quotesPageSize);
  const initialPageSize = PAGE_SIZE_OPTIONS.includes(storedPageSize)
    ? storedPageSize
    : DEFAULT_PAGE_SIZE;

  return (
    <QuotesList 
      initialQuotes={quotes as any} 
      companyId={companyId}
      initialPageSize={initialPageSize}
    />
  );
}
