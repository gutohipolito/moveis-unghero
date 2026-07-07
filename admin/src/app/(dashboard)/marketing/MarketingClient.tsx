"use client";

import { useState, useTransition } from "react";
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
    <div className={`space-y-[var(--space-6)] pb-[var(--space-8)] ${isPending ? "opacity-70" : ""}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="overflow-x-auto -mx-[var(--space-1)] px-[var(--space-1)]">
          <SegmentControl
            value={period}
            onChange={handlePeriodChange}
            aria-label="Período do relatório"
            className="min-w-max"
            options={[
              { value: "7", label: "7 dias" },
              { value: "30", label: "30 dias" },
              { value: "90", label: "90 dias" },
            ]}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {data.measurementId}
          {data.cachedAt
            ? ` · atualizado ${new Date(data.cachedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--space-3)]">
        <KpiCard
          label="Sessões"
          value={formatNumber(summary.sessions)}
          icon={MousePointerClick}
          accent="primary"
        />
        <KpiCard
          label="Usuários ativos"
          value={formatNumber(summary.activeUsers)}
          icon={Users}
          accent="info"
          trend={{ value: `${formatNumber(summary.newUsers)} novos` }}
        />
        <KpiCard
          label="Taxa de engajamento"
          value={`${summary.engagementRate.toFixed(1)}%`}
          icon={Activity}
          accent="success"
        />
        <KpiCard
          label="Tempo médio"
          value={formatDuration(summary.avgSessionDurationSeconds)}
          icon={Clock}
          accent="warning"
        />
      </div>

      <Card className="p-[var(--space-4)] space-y-[var(--space-4)]">
        <div>
          <h3 className="text-headline text-foreground">Sessões por dia</h3>
          <p className="text-caption text-muted-foreground mt-1">
            Volume diário de visitas no período selecionado.
          </p>
        </div>

        {daily.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma sessão registrada neste período. Os dados aparecerão após a tag GA4 estar ativa no site publicado.
          </p>
        ) : (
          <div className="flex items-end gap-1 h-40 overflow-x-auto pb-1">
            {daily.map((point) => {
              const height = Math.max(4, (point.sessions / maxSessions) * 100);
              return (
                <div
                  key={point.date}
                  className="flex flex-col items-center gap-1 min-w-[28px] flex-1"
                  title={`${formatGa4Date(point.date)}: ${point.sessions} sessões`}
                >
                  <div className="w-full flex items-end justify-center h-32">
                    <div
                      className="w-full max-w-6 rounded-t-md bg-gradient-to-t from-primary/80 to-primary/40 transition-all"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                    {formatGa4Date(point.date).replace(".", "")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--space-4)]">
        <Card className="p-[var(--space-4)] space-y-[var(--space-4)]">
          <div>
            <h3 className="text-headline text-foreground">Origem / canal</h3>
            <p className="text-caption text-muted-foreground mt-1">
              De onde vêm as sessões do site.
            </p>
          </div>

          {channels.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados de canal.</p>
          ) : (
            <div className="space-y-4">
              {channels.map((row) => {
                const pct = (row.sessions / maxChannelSessions) * 100;
                return (
                  <div key={row.channel} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-neutral-800">
                      <span>{channelLabel(row.channel)}</span>
                      <span>{formatNumber(row.sessions)} sessões</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600"
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-[var(--space-4)] space-y-[var(--space-4)]">
          <div className="flex items-start gap-2">
            <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="text-headline text-foreground">Páginas mais visitadas</h3>
              <p className="text-caption text-muted-foreground mt-1">
                URLs com maior volume de visualizações.
              </p>
            </div>
          </div>

          {pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados de páginas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="pb-2 font-semibold">Página</th>
                    <th className="pb-2 font-semibold text-right">Views</th>
                    <th className="pb-2 font-semibold text-right">Usuários</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((row) => (
                    <tr key={row.path} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-2 font-mono text-xs truncate max-w-[200px]" title={row.path}>
                        {row.path}
                      </td>
                      <td className="py-2.5 text-right font-semibold">{formatNumber(row.views)}</td>
                      <td className="py-2.5 text-right text-muted-foreground">
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
