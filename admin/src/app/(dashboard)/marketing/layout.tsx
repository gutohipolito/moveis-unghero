import MarketingSectionTabs from "@/components/marketing/MarketingSectionTabs";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <MarketingSectionTabs />
      {children}
    </div>
  );
}
