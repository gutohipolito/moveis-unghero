import { Card } from "@/components/ui/card";

export default function MarketingFormulariosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-16 rounded-xl bg-muted/50" />
      <Card className="h-48 bg-muted/30" />
      <Card className="h-72 bg-muted/30" />
    </div>
  );
}
