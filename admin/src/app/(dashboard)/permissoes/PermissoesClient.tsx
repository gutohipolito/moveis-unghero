"use client";

import React, { useState } from "react";
import { Check, Save, Loader2, CheckCircle2 } from "lucide-react";
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

function isModuleBlocked(role: Role, key: string): boolean {
  if (role === "VIEWER" && VIEWER_BLOCKED_MODULES.has(key)) return true;
  if (role === "PRODUCAO" && PRODUCAO_BLOCKED_MODULES.has(key)) return true;
  return false;
}

function blockedNote(role: Role): string | null {
  if (role === "VIEWER") {
    return "Algumas áreas sensíveis ficam sempre bloqueadas para contas somente leitura.";
  }
  if (role === "PRODUCAO") {
    return "Projetistas e Arquitetos ficam bloqueados para o cargo Fábrica.";
  }
  return null;
}

export default function PermissoesClient({ initial }: PermissoesClientProps) {
  const [activeRole, setActiveRole] = useState<Role>(EDITABLE_ROLES[0]);
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

  function discardRole(role: Role) {
    setSelected((prev) => ({
      ...prev,
      [role]: new Set(savedBase[role] ?? []),
    }));
  }

  function selectRole(next: Role) {
    if (next === activeRole) return;
    if (isDirty(activeRole)) {
      const label = ROLE_LABELS[activeRole];
      const ok = window.confirm(
        `Há alterações não salvas em ${label}. Descartar e trocar de cargo?`
      );
      if (!ok) return;
      discardRole(activeRole);
    }
    setActiveRole(next);
    setSavedRole(null);
    setError(null);
  }

  function toggle(key: string) {
    if (isModuleBlocked(activeRole, key)) return;
    setSelected((prev) => {
      const next = new Set(prev[activeRole]);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [activeRole]: next };
    });
    setSavedRole(null);
    setError(null);
  }

  function setAll(on: boolean) {
    const keys = CONFIGURABLE_MODULES.map((m) => m.key).filter(
      (k) => !isModuleBlocked(activeRole, k)
    );
    setSelected((prev) => ({
      ...prev,
      [activeRole]: on ? new Set(keys) : new Set(),
    }));
    setSavedRole(null);
    setError(null);
  }

  function restoreDefaults() {
    setSelected((prev) => ({
      ...prev,
      [activeRole]: new Set(getDefaultConfigurableModules(activeRole)),
    }));
    setSavedRole(null);
    setError(null);
  }

  async function handleSave() {
    const role = activeRole;
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

  const dirty = isDirty(activeRole);
  const count = selected[activeRole].size;
  const note = blockedNote(activeRole);
  const totalModules = CONFIGURABLE_MODULES.length;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">Permissões por cargo</p>
        <p className="text-[12px] text-slate-500 font-medium mt-1 max-w-2xl leading-relaxed">
          Escolha um cargo e marque as áreas liberadas. Itens desmarcados somem do menu e
          ficam bloqueados por URL. A Diretoria sempre tem acesso total. As mudanças valem
          para todos os usuários do cargo.
        </p>
      </div>

      <div
        className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1"
        role="tablist"
        aria-label="Cargos"
      >
        {EDITABLE_ROLES.map((role) => {
          const active = role === activeRole;
          const roleDirty = isDirty(role);
          return (
            <button
              key={role}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectRole(role)}
              className={`relative shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {ROLE_LABELS[role]}
              {roleDirty && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    active ? "bg-amber-300" : "bg-amber-500"
                  }`}
                  title="Alterações não salvas"
                  aria-label="Alterações não salvas"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200/80 rounded-[var(--radius-md)] shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-black text-slate-800">{ROLE_LABELS[activeRole]}</h2>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {count} de {totalModules} áreas liberadas
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={restoreDefaults}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            >
              Padrão
            </button>
            <button
              type="button"
              onClick={() => setAll(true)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            >
              Tudo
            </button>
            <button
              type="button"
              onClick={() => setAll(false)}
              className="text-[11px] font-bold text-slate-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            >
              Nada
            </button>
          </div>
        </div>

        {note && (
          <p className="px-5 py-2.5 text-[11px] font-medium text-slate-500 bg-slate-50/80 border-b border-slate-100">
            {note}
          </p>
        )}

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {sections.map((section) => {
            const mods = CONFIGURABLE_MODULES.filter((m) => m.section === section);
            if (mods.length === 0) return null;
            return (
              <div key={section} className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {section}
                </p>
                <div className="space-y-1">
                  {mods.map((mod) => {
                    const on = selected[activeRole].has(mod.key);
                    const blocked = isModuleBlocked(activeRole, mod.key);
                    return (
                      <button
                        key={mod.key}
                        type="button"
                        onClick={() => toggle(mod.key)}
                        disabled={blocked}
                        title={
                          blocked
                            ? activeRole === "PRODUCAO"
                              ? "Bloqueado para o cargo Fábrica"
                              : "Bloqueado para contas somente leitura"
                            : undefined
                        }
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-all ${
                          blocked
                            ? "opacity-45 cursor-not-allowed border-slate-150 bg-slate-50"
                            : on
                              ? "border-slate-300 bg-slate-50 cursor-pointer"
                              : "border-slate-150 bg-white hover:bg-slate-50 cursor-pointer"
                        }`}
                      >
                        <span
                          className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            on && !blocked
                              ? "bg-slate-900 border-slate-900"
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
          {savedRole === activeRole ? (
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
            onClick={handleSave}
            disabled={!dirty || savingRole === activeRole}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {savingRole === activeRole ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3.5 py-2 rounded-xl">
          {error}
        </p>
      )}
    </div>
  );
}
