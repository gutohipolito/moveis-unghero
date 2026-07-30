"use client";

import React, { useRef, useState } from "react";
import { Camera, KeyRound, Loader2, Save, User as UserIcon } from "lucide-react";
import {
  changeMyPasswordAction,
  updateMyProfileAction,
} from "@/app/actions/perfil";

interface PerfilClientProps {
  initial: {
    name: string;
    email: string;
    image: string | null;
    cargoLabel: string;
  };
}

export default function PerfilClient({ initial }: PerfilClientProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial.name);
  const [image, setImage] = useState<string | null>(initial.image);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setProfileError(null);
    setProfileMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/perfil/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setProfileError(data.error || "Falha no upload da foto.");
        return;
      }
      setImage(data.url);
      const save = await updateMyProfileAction({ name, image: data.url });
      if (!save.success) {
        setProfileError(save.error);
        return;
      }
      setProfileMsg("Foto atualizada.");
    } catch {
      setProfileError("Não foi possível enviar a foto.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileMsg(null);
    try {
      const res = await updateMyProfileAction({ name, image });
      if (!res.success) {
        setProfileError(res.error);
        return;
      }
      setProfileMsg("Perfil salvo.");
    } catch {
      setProfileError("Não foi possível salvar o perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("A confirmação não confere com a nova senha.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await changeMyPasswordAction({ currentPassword, newPassword });
      if (!res.success) {
        setPasswordError(res.error);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg("Senha alterada com sucesso.");
    } catch {
      setPasswordError("Não foi possível alterar a senha.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl">
      <form
        onSubmit={handleSaveProfile}
        className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-black text-slate-800">Dados do perfil</h2>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Nome e foto exibidos no painel
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center shrink-0">
              {image ? (
                <img src={image} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-7 w-7 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-700 truncate">{initial.email}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">
                {initial.cargoLabel}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                {uploading ? "Enviando..." : "Trocar foto"}
              </button>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-600">Nome</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </label>

          {profileError && (
            <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
              {profileError}
            </p>
          )}
          {profileMsg && (
            <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
              {profileMsg}
            </p>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/40 flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition-all disabled:opacity-50 cursor-pointer"
          >
            {savingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar perfil
          </button>
        </div>
      </form>

      <form
        onSubmit={handleChangePassword}
        className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-slate-500" />
            Alterar senha
          </h2>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Use uma senha com pelo menos 8 caracteres
          </p>
        </div>

        <div className="p-5 space-y-3.5">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-600">Senha atual</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-600">Nova senha</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-600">Confirmar nova senha</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </label>

          {passwordError && (
            <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
              {passwordError}
            </p>
          )}
          {passwordMsg && (
            <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
              {passwordMsg}
            </p>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/40 flex justify-end">
          <button
            type="submit"
            disabled={savingPassword}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold transition-all disabled:opacity-50 cursor-pointer"
          >
            {savingPassword ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Alterar senha
          </button>
        </div>
      </form>
    </div>
  );
}
