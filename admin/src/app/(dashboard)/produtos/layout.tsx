import ProdutosSectionTabs from "@/components/produtos/ProdutosSectionTabs";

export default function ProdutosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <ProdutosSectionTabs />
      {children}
    </div>
  );
}
