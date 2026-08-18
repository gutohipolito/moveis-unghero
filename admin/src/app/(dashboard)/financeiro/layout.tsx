import FinanceSectionTabs from "@/components/finance/FinanceSectionTabs";

export default function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <FinanceSectionTabs />
      {children}
    </div>
  );
}
