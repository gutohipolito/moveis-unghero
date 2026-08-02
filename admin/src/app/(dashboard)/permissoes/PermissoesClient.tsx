"use client";

import React, { useState } from "react";
import { Check, Save, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import type { Role } from "@prisma/client";
import {
  CONFIGURABLE_MODULES,
  EDITABLE_ROLES,
  ROLE_LABELS,
  PRODUCAO_BLOCKED_MODULES,
  VIEWER_BLOCKED_MODULES,
  getDefaultConfigurableModules,
} from "@/lib/permissions";
import { updateRolePermissionsAction } from "@/app/actions/permissions";

interface PermissoesClientProps {
  initial: Record<string, string[]>;
}

const SECTION_ORDER = [
  "Visão Geral",
  "Comercial",
  "Produção",
  "Logística",
  "Marketing",
  "Administração",
];

export default function PermissoesClient({ initial }: PermissoesClientProps) {
  const [selected, setSelected] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    for (const role of EDITABLE_ROLES) {
      map[role] = new Set(initial[role] ?? []);
    }
    return map;
  });
  const [savedBase, setSavedBase] = useState<Record<string, string[]>>(initial);
  const [savingRole, setSavingRole] = useState<Role | null>(null);
  const [savedRole, setSavedRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sections = SECTION_ORDER.filter((s) =>
    CONFIGURABLE_MODULES.some((m) => m.section === s)
  );

  function isDirty(role: Role): boolean {
    const current = selected[role];
    const base = new Set(savedBase[role] ?? []);
    if (current.size !== base.size) return true;
    for (const k of current) if (!base.has(k)) return true;
    return false;
  }

  function toggle(role: Role, key: string) {
    if (role === "VIEWER" && VIEWER_BLOCKED_MODULES.has(key)) return;
    if (role === "PRODUCAO" && PRODUCAO_BLOCKED_MODULES.has(key)) return;
    setSelected((prev) => {
      const next = new Set(prev[role]);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [role]: next };
    });
    setSavedRole(null);
    setError(null);
  }

  function setAll(role: Role, on: boolean) {
    const keys = CONFIGURABLE_MODULES.map((m) => m.key).filter(
      (k) =>
        !(role === "VIEWER" && VIEWER_BLOCKED_MODULES.has(k)) &&
        !(role === "PRODUCAO" && PRODUCAO_BLOCKED_MODULES.has(k))
    );
    setSelected((prev) => ({
      ...prev,
      [role]: on ? new Set(keys) : new Set(),
    }));
    setSavedRole(null);
    setError(null);
  }

  function restoreDefaults(role: Role) {
    setSelected((prev) => ({
      ...prev,
      [role]: new Set(getDefaultConfigurableModules(role)),
    }));
    setSavedRole(null);
    setError(null);
  }

  async function handleSave(role: Role) {
    setSavingRole(role);
    setSavedRole(null);
    setError(null);
    try {
      const res = await updateRolePermissionsAction(role, Array.from(selected[role]));
      if (res.success) {
        setSavedBase((prev) => ({ ...prev, [role]: res.permissions[role] ?? [] }));
        setSavedRole(role);
        setTimeout(() => setSavedRole((r) => (r === role ? null : r)), 2500);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSavingRole(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 text-[12px] text-indigo-900 font-medium">
        <ShieldCheck className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5" />
        <span>
          Marque as áreas que cada cargo pode acessar. Itens desmarcados ficam ocultos no menu e
          bloqueados por URL. A <span className="font-bold">Diretoria</span> sempre tem acesso total e
          não aparece aqui. As mudanças valem para todos os usuários do cargo.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {EDITABLE_ROLES.map((role) => {
          const dirty = isDirty(role);
          const count = selected[role].size;
          return (
            <div key={role} className="bg-white border border-slate-200/80 rounded-[var(--radius-md)] shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h2 className="text-sm font-black text-slate-800">{ROLE_LABELS[role]}</h2>
                  <p className="text-[11px] text-slate-450 font-medium mt-0.5">
                    {count} de {CONFIGURABLE_MODULES.length} áreas liberadas
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => restoreDefaults(role)}
                    className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => setAll(role, true)}
                    className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Tudo
                  </button>
                  <button
                    type="button"
                    onClick={() => setAll(role, false)}
                    className="text-[11px] font-bold text-slate-500 hover:text-red-600 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Nada
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {sections.map((section) => {
                  const mods = CONFIGURABLE_MODULES.filter((m) => m.section === section);
                  if (mods.length === 0) return null;
                  return (
                    <div key={section} className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{section}</p>
                      <div className="space-y-1">
                        {mods.map((mod) => {
                          const on = selected[role].has(mod.key);
                          const blocked =
                            (role === "VIEWER" && VIEWER_BLOCKED_MODULES.has(mod.key)) ||
                            (role === "PRODUCAO" && PRODUCAO_BLOCKED_MODULES.has(mod.key));
                          return (
                            <button
                              key={mod.key}
                              type="button"
                              onClick={() => toggle(role, mod.key)}
                              disabled={blocked}
                              title={
                                blocked
                                  ? role === "PRODUCAO"
                                    ? "Bloqueado para o cargo Fábrica"
                                    : "Bloqueado para contas somente leitura"
                                  : undefined
                              }
                              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-all ${
                                blocked
                                  ? "opacity-45 cursor-not-allowed border-slate-150 bg-slate-50"
                                  : on
                                    ? "border-indigo-200 bg-indigo-50/60 cursor-pointer"
                                    : "border-slate-150 bg-white hover:bg-slate-50 cursor-pointer"
                              }`}
                            >
                              <span
                                className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                  on && !blocked
                                    ? "bg-indigo-600 border-indigo-600"
                                    : "bg-white border-slate-300"
                                }`}
                              >
                                {on && !blocked && (
                                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                )}
                              </span>
                              <span
                                className={`text-xs font-semibold ${
                                  on && !blocked ? "text-slate-800" : "text-slate-500"
                                }`}
                              >
                                {mod.label}
                                {blocked ? " (bloqueado)" : ""}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-slate-50/40">
                {savedRole === role ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Salvo
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">
                    {dirty ? "Alterações não salvas" : "Sem alterações"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleSave(role)}
                  disabled={!dirty || savingRole === role}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {savingRole === role ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3.5 py-2 rounded-xl">
          {error}
        </p>
      )}
    </div>
  );
}
