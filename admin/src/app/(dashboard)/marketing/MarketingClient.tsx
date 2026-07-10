"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Activity,
  AlertCircle,
  Clock,
  Globe,
  MousePointerClick,
  Settings2,
  Users,
} from "lucide-react";
import { getMarketingDashboard } from "@/app/actions/marketing";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { SegmentControl } from "@/components/ui/segment-control";
import {
  channelLabel,
  formatDuration,
  formatGa4Date,
  type MarketingDashboardData,
  type MarketingPeriod,
} from "@/lib/marketing";
import { useLiveSync } from "@/hooks/useLiveSync";

interface MarketingClientProps {
  initialData: MarketingDashboardData;
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

export default function MarketingClient({ initialData }: MarketingClientProps) {
  const [data, setData] = useState(initialData);
  const [period, setPeriod] = useState<MarketingPeriod>(initialData.period);
  const [isPending, startTransition] = useTransition();

  const syncMarketing = useCallback(async () => {
    const next = await getMarketingDashboard(period);
    setData(next);
  }, [period]);

  useLiveSync({
    sync: syncMarketing,
    enabled: !isPending,
    pollVisibleMs: 60_000,
    pollHiddenMs: 5 * 60_000,
  });

  function handlePeriodChange(next: MarketingPeriod) {
    setPeriod(next);
    startTransition(async () => {
      const nextData = await getMarketingDashboard(next);
      setData(nextData);
    });
  }

  if (!data.configured) {
    return (
      <Card className="p-[var(--space-6)] space-y-[var(--space-4)] max-w-3xl">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Settings2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-headline text-foreground">Google Analytics não configurado</h2>
            <p className="text-caption text-muted-foreground">
              Configure a integração server-side com a GA4 Data API para exibir sessões, canais e páginas do site.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-2">
          <p>
            <strong>Measurement ID:</strong> {data.measurementId ?? "G-2M5NMQ84HK"}
          </p>
          <p className="text-muted-foreground">
            A tag do site ainda não foi instalada — o painel pode exibir poucos dados até a publicação do site.
          </p>
        </div>

        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>No Google Cloud, crie uma <strong className="text-foreground">Service Account</strong> (não OAuth).</li>
          <li>Ative a <strong className="text-foreground">Google Analytics Data API</strong> no projeto.</li>
          <li>No GA4 → Admin → Gerenciamento de acesso à propriedade, adicione o e-mail da service account como <strong className="text-foreground">Leitor</strong>.</li>
          <li>Copie o <strong className="text-foreground">Property ID numérico</strong> (Admin → Detalhes da propriedade).</li>
          <li>Defina as variáveis na Vercel ou no <code className="text-xs bg-muted px-1 rounded">.env.local</code>:</li>
        </ol>

        <pre className="text-xs bg-slate-950 text-slate-100 rounded-xl p-4 overflow-x-auto">
{`GA4_PROPERTY_ID=415410108

# Opção recomendada na Vercel — cole o JSON inteiro:
GA4_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Ou separado (e-mail deve bater com a chave):
GA4_CLIENT_EMAIL=ga4-reader@moveis-unghero-admin.iam.gserviceaccount.com
GA4_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n`}
        </pre>
        <p className="text-xs text-muted-foreground">
          Na Vercel, <strong>não use aspas</strong> em volta da chave. Use <code className="bg-muted px-1 rounded">\\n</code> literais
          ou cole o arquivo JSON completo da service account.
        </p>
      </Card>
    );
  }

  if (data.error) {
    return (
      <Card className="p-[var(--space-6)] space-y-3 max-w-2xl border-destructive/30">
        <div className="flex items-start gap-3 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-headline">Erro ao carregar GA4</h2>
            <p className="text-sm mt-1 text-muted-foreground">{data.error}</p>
            <p className="text-xs mt-3 text-muted-foreground">
              Verifique se a service account tem permissão de Leitor na propriedade GA4 e se o
              Property ID está correto na Vercel.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const summary = data.summary!;
  const daily = data.daily ?? [];
  const channels = data.channels ?? [];
  const pages = data.pages ?? [];
  const maxSessions = Math.max(...daily.map((d) => d.sessions), 1);
  const maxChannelSessions = Math.max(...channels.map((c) => c.sessions), 1);

  return (
    <div className={`space-y-6 pb-8 ${isPending ? "opacity-70" : ""}`}>
      {/* Banner Informativo Premium - moveisunghero.com.br */}
      <div className="p-6 bg-gradient-to-r from-primary/10 via-amber-500/5 to-transparent border border-primary/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Canal de Origem Ativo</h4>
          </div>
          <p className="text-base font-extrabold text-slate-900 leading-tight">
            Análise de tráfego do site institucional <span className="text-primary underline decoration-2 font-black">moveisunghero.com.br</span>
          </p>
          <p className="text-xs font-semibold text-slate-450 max-w-xl leading-relaxed">
            Métricas de captação de leads e visualizações do site principal da Móveis Unghero via Google Analytics 4.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 z-10">
          <span className="text-[10px] font-bold text-slate-500 bg-white/80 border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-xs">
            Google Analytics 4 API
          </span>
        </div>
        <div className="absolute right-0 top-0 h-32 w-32 bg-primary/5 rounded-full blur-2xl -z-10" />
      </div>

      {/* Filtros e Horário de Atualização */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="overflow-x-auto pb-1 -mb-1">
          <SegmentControl
            value={period}
            onChange={handlePeriodChange}
            aria-label="Período do relatório"
            className="min-w-max"
            options={[
              { value: "live", label: "Ao vivo" },
              { value: "7", label: "7 dias" },
              { value: "30", label: "30 dias" },
              { value: "90", label: "90 dias" },
            ]}
          />
        </div>
        <p className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200/40 px-3 py-1.5 rounded-xl w-fit">
          Property ID: {data.measurementId}
          {data.cachedAt
            ? ` • Atualizado em ${new Date(data.cachedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </p>
      </div>

      {/* KPI GRID PERSONALIZADO E ULTRA MODERNO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sessões / Usuários em tempo real */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-150 p-5 rounded-2xl shadow-xs hover:shadow-sm hover:scale-[1.01] transition-all flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <MousePointerClick className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">
              {period === "live" ? "Visitas (30 min)" : "Sessões Totais"}
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatNumber(summary.sessions)}
            </h3>
            <p className="text-[10px] text-slate-450 font-bold leading-normal">
              {period === "live" ? "Sessões ativas no site" : "Cliques e visitas na home"}
            </p>
          </div>
        </div>

        {/* Card 2: Visitantes Ativos */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-150 p-5 rounded-2xl shadow-xs hover:shadow-sm hover:scale-[1.01] transition-all flex items-start gap-4">
          <div className="p-3 rounded-xl bg-sky-100 text-sky-600 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">
              {period === "live" ? "Visitantes Únicos" : "Usuários Ativos"}
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatNumber(summary.activeUsers)}
            </h3>
            <p className="text-[10px] text-slate-450 font-bold leading-normal">
              {period === "live" ? "Acessos individuais" : `${formatNumber(summary.newUsers)} novos usuários`}
            </p>
          </div>
        </div>

        {/* Card 3: Engajamento */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-150 p-5 rounded-2xl shadow-xs hover:shadow-sm hover:scale-[1.01] transition-all flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">
              {period === "live" ? "Status do GA4" : "Taxa de Engajamento"}
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {period === "live" ? "Conectado" : `${summary.engagementRate.toFixed(1)}%`}
            </h3>
            <p className="text-[10px] text-slate-450 font-bold leading-normal">
              {period === "live" ? "Monitorando em tempo real" : "Leads altamente engajados"}
            </p>
          </div>
        </div>

        {/* Card 4: Tempo da Sessão */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-150 p-5 rounded-2xl shadow-xs hover:shadow-sm hover:scale-[1.01] transition-all flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-100 text-amber-600 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">
              {period === "live" ? "Tempo de Resposta" : "Tempo Médio da Sessão"}
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {period === "live" ? "Sub-segundo" : formatDuration(summary.avgSessionDurationSeconds)}
            </h3>
            <p className="text-[10px] text-slate-450 font-bold leading-normal">
              {period === "live" ? "Integração via Cloud" : "Duração média no site"}
            </p>
          </div>
        </div>
      </div>

      {/* GRÁFICO DIÁRIO E REALTIME */}
      <Card className="p-6 bg-white/70 backdrop-blur-md border border-slate-150 rounded-2xl shadow-xs space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              {period === "live" ? (
                <>
                  <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  Tempo Real: Usuários por Minuto
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 text-primary shrink-0" />
                  Sessões Diárias
                </>
              )}
            </h3>
            <p className="text-[11px] text-slate-450 font-semibold mt-1">
              {period === "live"
                ? "Volume de usuários navegando nas páginas do site minuto a minuto nos últimos 30 minutos."
                : "Volume diário de visitas consolidadas no período selecionado."}
            </p>
          </div>
          {period === "live" && (
            <span className="text-[9px] font-black uppercase text-red-600 bg-red-50 border border-red-200/50 px-2 py-0.5 rounded-md tracking-wider animate-pulse shrink-0">
              Ao Vivo
            </span>
          )}
        </div>

        {daily.length === 0 ? (
          <p className="text-xs text-slate-400 font-semibold py-12 text-center">
            Nenhuma sessão registrada neste período. Os dados aparecerão após a tag GA4 estar ativa no site publicado.
          </p>
        ) : (
          <div className="flex items-end gap-1.5 h-44 overflow-x-auto pb-2 scrollbar-thin">
            {daily.map((point) => {
              const height = Math.max(4, (point.sessions / maxSessions) * 100);
              return (
                <div
                  key={point.date}
                  className="flex flex-col items-center gap-2 min-w-[32px] flex-1 group cursor-pointer"
                  title={`${formatGa4Date(point.date)}: ${point.sessions} usuários`}
                >
                  <div className="w-full flex items-end justify-center h-32 relative">
                    {/* Hover Sessions Tooltip */}
                    <div className="absolute bottom-[calc(height%+4px)] bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {point.sessions}
                    </div>
                    <div
                      className="w-full max-w-5 rounded-t-lg bg-gradient-to-t from-primary to-primary/45 group-hover:from-primary/95 group-hover:to-primary/65 transition-all duration-300 shadow-xs"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-slate-450 group-hover:text-primary transition-colors whitespace-nowrap">
                    {formatGa4Date(point.date).replace(".", "")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ORIGENS DE TRÁFEGO E PÁGINAS MAIS VISITADAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Origem / Canal */}
        <Card className="p-6 bg-white/70 backdrop-blur-md border border-slate-150 rounded-2xl shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Canais de Origem {period === "live" && "Ao Vivo"}
            </h3>
            <p className="text-[11px] text-slate-450 font-semibold mt-1">
              De onde vêm os visitantes navegando nas páginas da marcenaria.
            </p>
          </div>

          {channels.length === 0 ? (
            <p className="text-xs text-slate-450 font-semibold py-4">Nenhum canal ativo registrado no momento.</p>
          ) : (
            <div className="space-y-4.5">
              {channels.map((row) => {
                const pct = (row.sessions / maxChannelSessions) * 100;
                return (
                  <div key={row.channel} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {channelLabel(row.channel)}
                      </span>
                      <span className="text-slate-900 font-extrabold">{formatNumber(row.sessions)} visitas</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary animate-pulse-once"
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Páginas Mais Visitadas */}
        <Card className="p-6 bg-white/70 backdrop-blur-md border border-slate-150 rounded-2xl shadow-xs space-y-6">
          <div className="flex items-start gap-2">
            <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                Páginas Populares {period === "live" && "Ao Vivo"}
              </h3>
              <p className="text-[11px] text-slate-450 font-semibold mt-1">
                URLs públicas do site institucional com maior volume de acessos.
              </p>
            </div>
          </div>

          {pages.length === 0 ? (
            <p className="text-xs text-slate-450 font-semibold py-4">Nenhuma página visitada no momento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 font-black uppercase tracking-widest text-[9px] border-b border-slate-100 pb-2.5">
                    <th className="pb-2">URL / Página</th>
                    <th className="pb-2 text-right">Visualizações</th>
                    <th className="pb-2 text-right">Usuários</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {pages.map((row, idx) => (
                    <tr key={row.path} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 pr-2 font-mono text-[11px] text-slate-800 truncate max-w-[240px] flex items-center gap-2" title={row.path}>
                        <span className="inline-flex items-center justify-center h-4.5 w-4.5 rounded bg-slate-100 text-[10px] text-slate-500 font-bold shrink-0">
                          {idx + 1}
                        </span>
                        {row.path}
                      </td>
                      <td className="py-3.5 text-right font-black text-slate-950">{formatNumber(row.views)}</td>
                      <td className="py-3.5 text-right text-slate-400">
                        {formatNumber(row.activeUsers)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
