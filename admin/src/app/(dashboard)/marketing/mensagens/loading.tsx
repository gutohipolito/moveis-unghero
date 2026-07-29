import { Card } from "@/components/ui/card";

export default function MarketingMensagensLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-16 rounded-xl bg-muted/50" />
      <Card className="h-24 bg-muted/30" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card className="h-44 bg-muted/30" />
        <Card className="h-44 bg-muted/30" />
        <Card className="h-44 bg-muted/30" />
      </div>
    </div>
  );
}
