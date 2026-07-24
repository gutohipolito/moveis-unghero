"use client";

import { useState } from "react";
import {
  BellRing,
  Check,
  LayoutPanelTop,
  Loader2,
  Monitor,
  Smartphone,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useNotificationContext } from "@/context/NotificationContext";

export default function NotificationChannelSettings() {
  const [browserTest, setBrowserTest] = useState<"idle" | "ok" | "fail">("idle");
  const [pushTest, setPushTest] = useState<"idle" | "ok" | "fail">("idle");
  const {
    prefs,
    browserPermission,
    browserSupported,
    enablingBrowser,
    enableBrowserNotifications,
    disableBrowserNotifications,
    toggleNotificationSound,
    testBrowserNotification,
    testInAppToast,
    pushSupported,
    pushConfigured,
    pushActive,
    enablingPush,
    enablePushNotifications,
    disablePushNotifications,
    testPushNotification,
  } = useNotificationContext();

  const browserActive = prefs.browser && browserPermission === "granted";
  const permissionBlocked = browserPermission === "denied";

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5 px-1">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Canais de alerta
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Escolha onde receber as notificações do sistema.
          </p>
        </div>
        <BellRing className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      </div>

      <div className="rounded-xl border border-border bg-background/70 p-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <LayoutPanelTop className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Alerta no painel</p>
              <p className="text-[10px] text-muted-foreground">
                Toast sticky no estilo macOS (botão Opções).
              </p>
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => testInAppToast()}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[10px] font-bold text-primary-foreground"
              >
                Testar toast
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/70 p-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Monitor className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
              <div className="min-w-0 flex-1 basis-[8rem]">
                <p className="text-xs font-bold text-foreground">Alertas no navegador</p>
                <p className="text-[10px] text-muted-foreground">Enquanto estiver usando este dispositivo.</p>
              </div>
              {browserActive && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                  <Check className="h-2.5 w-2.5" /> Ativo
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {permissionBlocked ? (
                <span className="text-[10px] font-medium text-red-700">
                  Bloqueado nas configurações do navegador
                </span>
              ) : !browserSupported ? (
                <span className="text-[10px] text-muted-foreground">Não disponível neste navegador</span>
              ) : browserActive ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      setBrowserTest("idle");
                      setBrowserTest((await testBrowserNotification()) ? "ok" : "fail");
                    }}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Testar
                  </button>
                  <button
                    type="button"
                    onClick={toggleNotificationSound}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {prefs.sound ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                    Som {prefs.sound ? "ativo" : "desligado"}
                  </button>
                  <button
                    type="button"
                    onClick={disableBrowserNotifications}
                    className="text-[10px] font-semibold text-muted-foreground hover:text-red-700"
                  >
                    Desativar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={enablingBrowser}
                  onClick={() => void enableBrowserNotifications()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[10px] font-bold text-primary-foreground disabled:opacity-60"
                >
                  {enablingBrowser && <Loader2 className="h-3 w-3 animate-spin" />}
                  {enablingBrowser ? "Aguardando…" : "Ativar"}
                </button>
              )}
            </div>

            {browserTest !== "idle" && (
              <p className={`mt-2 text-[10px] font-medium ${browserTest === "ok" ? "text-emerald-700" : "text-red-700"}`}>
                {browserTest === "ok" ? "Alerta de teste enviado." : "Não foi possível exibir o alerta."}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/70 p-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Smartphone className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
              <div className="min-w-0 flex-1 basis-[8rem]">
                <p className="text-xs font-bold text-foreground">Push mobile</p>
                <p className="text-[10px] text-muted-foreground">Mesmo com o painel fechado.</p>
              </div>
              {pushActive && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                  <Check className="h-2.5 w-2.5" /> Ativo
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {!pushConfigured ? (
                <span className="text-[10px] font-medium text-amber-700">Indisponível no servidor</span>
              ) : !pushSupported ? (
                <span className="text-[10px] text-muted-foreground">
                  Instale o painel no celular para ativar
                </span>
              ) : permissionBlocked ? (
                <span className="text-[10px] font-medium text-red-700">
                  Bloqueado nas configurações do dispositivo
                </span>
              ) : pushActive ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      setPushTest("idle");
                      setPushTest((await testPushNotification()) ? "ok" : "fail");
                    }}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Testar
                  </button>
                  <button
                    type="button"
                    onClick={() => void disablePushNotifications()}
                    className="text-[10px] font-semibold text-muted-foreground hover:text-red-700"
                  >
                    Desativar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={enablingPush}
                  onClick={() => void enablePushNotifications()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[10px] font-bold text-primary-foreground disabled:opacity-60"
                >
                  {enablingPush && <Loader2 className="h-3 w-3 animate-spin" />}
                  {enablingPush ? "Aguardando…" : "Ativar"}
                </button>
              )}
            </div>

            {pushTest !== "idle" && (
              <p className={`mt-2 text-[10px] font-medium ${pushTest === "ok" ? "text-emerald-700" : "text-red-700"}`}>
                {pushTest === "ok" ? "Push de teste enviado." : "Não foi possível enviar o push."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
