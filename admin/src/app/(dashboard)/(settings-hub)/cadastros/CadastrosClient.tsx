"use client";

import React, { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  createCatalogItem,
  deleteCatalogItem,
  updateCatalogItem,
  type CatalogGroupDTO,
  type CatalogItemDTO,
} from "@/app/actions/cadastros";
import { getCadastrosLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { FIXED_CATALOG_REFERENCES, getCatalogGroupMeta } from "@/lib/catalogGroups";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import {
  BookMarked,
  ChevronRight,
  ExternalLink,
  Info,
  Layers,
  Package,
  Plus,
  Trash2,
  Truck,
  Pencil,
  Check,
  X,
} from "lucide-react";

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  veiculos: Truck,
  categorias_estoque: Package,
  tipos_comodo: Layers,
};

interface CadastrosClientProps {
  initialGroups: CatalogGroupDTO[];
  companyId: string;
  initialGroupSlug?: string;
}

export default function CadastrosClient({
  initialGroups,
  companyId,
  initialGroupSlug,
}: CadastrosClientProps) {
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;

  const [groups, setGroups] = useState(initialGroups);
  const [activeSlug, setActiveSlug] = useState(
    initialGroupSlug && initialGroups.some((g) => g.slug === initialGroupSlug)
      ? initialGroupSlug
      : initialGroups[0]?.slug ?? "veiculos"
  );
  const [newItemLabel, setNewItemLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [loading, setLoading] = useState(false);

  const syncCadastros = useCallback(async () => {
    const result = await getCadastrosLiveSnapshot(companyId);
    if (result.success && result.groups) {
      setGroups(result.groups);
    }
  }, [companyId]);

  useLiveEntity("cadastros", {
    sync: syncCadastros,
    enabled: !loading && !editingId,
  });

  const activeGroup = useMemo(
    () => groups.find((g) => g.slug === activeSlug),
    [groups, activeSlug]
  );
  const activeMeta = getCatalogGroupMeta(activeSlug);

  const refreshGroupItems = (slug: string, items: CatalogItemDTO[]) => {
    setGroups((prev) => prev.map((g) => (g.slug === slug ? { ...g, items } : g)));
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLabel.trim() || !activeGroup) return;

    setLoading(true);
    const res = await createCatalogItem(companyId, activeGroup.slug, { label: newItemLabel });
    setLoading(false);

    if (!res.success || !res.item) {
      showError("Não foi possível cadastrar", res.error || "Erro desconhecido.");
      return;
    }

    const newItem: CatalogItemDTO = {
      id: res.item.id,
      label: res.item.label,
      slug: res.item.slug,
      ordem: res.item.ordem,
      ativo: res.item.ativo,
      parentId: res.item.parent_id,
    };

    refreshGroupItems(activeGroup.slug, [...activeGroup.items, newItem]);
    setNewItemLabel("");
    showSuccess("Item cadastrado", `"${newItem.label}" foi adicionado à lista.`);
  };

  const handleSaveEdit = async (item: CatalogItemDTO) => {
    if (!editingLabel.trim()) return;

    setLoading(true);
    const res = await updateCatalogItem(item.id, { label: editingLabel });
    setLoading(false);

    if (!res.success || !activeGroup) {
      showError("Não foi possível salvar", res.error || "Erro desconhecido.");
      return;
    }

    refreshGroupItems(
      activeGroup.slug,
      activeGroup.items.map((i) => (i.id === item.id ? { ...i, label: editingLabel.trim() } : i))
    );
    setEditingId(null);
    setEditingLabel("");
    showSuccess("Item atualizado", "Alteração salva com sucesso.");
  };

  const handleToggleActive = async (item: CatalogItemDTO) => {
    if (!activeGroup) return;

    setLoading(true);
    const res = await updateCatalogItem(item.id, { ativo: !item.ativo });
    setLoading(false);

    if (!res.success) {
      showError("Não foi possível alterar", res.error || "Erro desconhecido.");
      return;
    }

    refreshGroupItems(
      activeGroup.slug,
      activeGroup.items.map((i) => (i.id === item.id ? { ...i, ativo: !item.ativo } : i))
    );
  };

  const handleDelete = (item: CatalogItemDTO) => {
    if (!activeGroup) return;

    confirmAction({
      title: "Excluir item?",
      message: `Remover "${item.label}" da lista? Campos que já usam este valor manterão o texto antigo.`,
      confirmLabel: "Excluir",
      onConfirm: async () => {
        setLoading(true);
        const res = await deleteCatalogItem(item.id);
        setLoading(false);

        if (!res.success) {
          showError("Não foi possível excluir", res.error || "Erro desconhecido.");
          return;
        }

        refreshGroupItems(
          activeGroup.slug,
          activeGroup.items.filter((i) => i.id !== item.id)
        );
        showSuccess("Item excluído", "Removido da lista de cadastros.");
      },
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        <Card className="glass-card border-border p-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
            Listas editáveis
          </p>
          {groups.map((group) => {
            const Icon = GROUP_ICONS[group.slug] || BookMarked;
            const isActive = group.slug === activeSlug;

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveSlug(group.slug)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-secondary/80"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">{group.nome}</span>
                <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                  {group.items.filter((i) => i.ativo).length}
                </span>
              </button>
            );
          })}

          <div className="pt-3 mt-2 border-t border-border/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
              Referências do sistema
            </p>
            <p className="text-[11px] text-muted-foreground px-2 pb-2 leading-relaxed">
              Algumas listas são fixas no código. Veja abaixo onde cada uma é usada.
            </p>
          </div>
        </Card>

        <div className="space-y-6 min-w-0">
          {activeGroup && (
            <Card className="glass-card border-border overflow-hidden">
              <div className="p-5 border-b border-border/60 bg-secondary/20 space-y-2">
                <h2 className="text-lg font-bold text-foreground">{activeGroup.nome}</h2>
                <p className="text-sm text-muted-foreground">{activeGroup.descricao}</p>
                <div className="flex items-start gap-2 text-xs text-primary bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-semibold">Usado em:</strong> {activeGroup.usadoEm}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <form onSubmit={handleCreateItem} className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    placeholder={
                      activeMeta?.slug === "veiculos"
                        ? "Ex.: Caminhão 2 - VW Delivery"
                        : "Nome do item..."
                    }
                    className="flex-1 bg-secondary/40"
                    disabled={loading}
                  />
                  <Button type="submit" disabled={loading || !newItemLabel.trim()} className="shrink-0">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Adicionar
                  </Button>
                </form>

                {activeGroup.items.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                    Nenhum item cadastrado. Adicione o primeiro acima.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {activeGroup.items.map((item) => (
                      <li
                        key={item.id}
                        className={`flex items-center gap-2 p-3 rounded-xl border ${
                          item.ativo ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-70"
                        }`}
                      >
                        {editingId === item.id ? (
                          <>
                            <Input
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              className="flex-1 h-8 text-sm"
                              autoFocus
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSaveEdit(item)}
                              disabled={loading}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setEditingLabel("");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{item.label}</p>
                              {item.slug && (
                                <p className="text-[10px] text-muted-foreground font-mono">{item.slug}</p>
                              )}
                            </div>
                            {!item.ativo && (
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                Inativo
                              </span>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(item.id);
                                setEditingLabel(item.label);
                              }}
                              disabled={loading}
                              title="Renomear"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleActive(item)}
                              disabled={loading}
                              title={item.ativo ? "Desativar" : "Reativar"}
                            >
                              {item.ativo ? "Desativar" : "Ativar"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(item)}
                              disabled={loading}
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Outras categorias do sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FIXED_CATALOG_REFERENCES.map((ref) => (
                <Card key={ref.nome} className="p-4 glass-card border-border/80 space-y-2">
                  <p className="text-sm font-bold text-foreground">{ref.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground/80">Usado em:</strong> {ref.usadoEm}
                  </p>
                  <p className="text-xs text-muted-foreground">{ref.ondeCadastrar}</p>
                  {ref.itens.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {ref.itens.map((item) => (
                        <span
                          key={item}
                          className="text-[10px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-md"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                  {"linkHref" in ref && ref.linkHref && (
                    <Link
                      href={ref.linkHref}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1"
                    >
                      {ref.linkLabel} <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ActionDialogHost dialog={dialog} />
    </>
  );
}
