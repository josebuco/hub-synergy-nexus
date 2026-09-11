import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  getDashboardStats,
  getRevenueBySector,
  getRecentActivity,
  getTransportContracts,
  getDailyOperations,
} from "@/lib/dashboard.functions";

const statsOptions = queryOptions({
  queryKey: ["dashboard", "stats"],
  queryFn: () => getDashboardStats(),
});

const revenueOptions = queryOptions({
  queryKey: ["dashboard", "revenue"],
  queryFn: () => getRevenueBySector(),
});

const activityOptions = queryOptions({
  queryKey: ["dashboard", "activity"],
  queryFn: () => getRecentActivity(),
});

const transportOptions = queryOptions({
  queryKey: ["dashboard", "transport"],
  queryFn: () => getTransportContracts(),
});

const operationsOptions = queryOptions({
  queryKey: ["dashboard", "operations"],
  queryFn: () => getDailyOperations(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel Geral — Kilombwe" },
      { name: "description", content: "Visão operativa dos setores da empresa." },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(statsOptions),
      context.queryClient.ensureQueryData(revenueOptions),
      context.queryClient.ensureQueryData(activityOptions),
      context.queryClient.ensureQueryData(transportOptions),
      context.queryClient.ensureQueryData(operationsOptions),
    ]);
  },
  component: DashboardPage,
});

const sectorMeta = {
  Água: { color: "bg-water", label: "Água" },
  Restaurante: { color: "bg-restaurant", label: "Restaurante" },
  Lavagem: { color: "bg-wash", label: "Lavagem" },
  "Transporte Escolar": { color: "bg-transport", label: "Transporte" },
};

function statusColor(status: string) {
  const s = status?.toLowerCase() || "";
  if (s.includes("pago") || s.includes("conclu") || s.includes("activo") || s.includes("entregue")) {
    return "text-success bg-success/10 ring-success/20";
  }
  if (s.includes("curso") || s.includes("espera") || s.includes("pendente") || s.includes("atrasada")) {
    return "text-warning bg-warning/10 ring-warning/20";
  }
  if (s.includes("cancel") || s.includes("recus")) {
    return "text-danger bg-danger/10 ring-danger/20";
  }
  return "text-muted-foreground bg-white/5 ring-white/10";
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-AO");
}

function formatRelative(date: string) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (hours < 24) return `há ${hours} h`;
  return `há ${days} dia${days > 1 ? "s" : ""}`;
}

function DashboardPage() {
  const { data: stats } = useSuspenseQuery(statsOptions);
  const { data: revenue } = useSuspenseQuery(revenueOptions);
  const { data: activity } = useSuspenseQuery(activityOptions);
  const { data: transportContracts } = useSuspenseQuery(transportOptions);
  const { data: dailyOps } = useSuspenseQuery(operationsOptions);

  const kpiData = [
    { label: "Receita", value: stats.revenue, unit: "Kz", trend: "▲ 12,4% vs mês", trendColor: "text-success" },
    { label: "Água", value: stats.water, unit: "Kz", trend: "▲ 8,1% vs mês", trendColor: "text-success" },
    { label: "Restaurante", value: stats.restaurant, unit: "Kz", trend: "▲ 5,2% vs mês", trendColor: "text-success" },
    { label: "Lavagem", value: stats.wash, unit: "Kz", trend: "▼ 3,4% vs mês", trendColor: "text-danger" },
  ];

  const chartData = [
    { label: "Água", value: revenue.water, color: "bg-water" },
    { label: "Restaurante", value: revenue.restaurant, color: "bg-restaurant" },
    { label: "Transporte", value: revenue.transport, color: "bg-transport" },
    { label: "Lavagem", value: revenue.wash, color: "bg-wash" },
  ];

  const maxChart = Math.max(...chartData.map((b) => b.value), 1);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 shrink-0 bg-panel/80 border-b border-edge flex items-center gap-4 px-6">
        <div className="leading-tight">
          <h1 className="font-display font-semibold text-lg uppercase tracking-wide text-foreground">
            Painel geral
          </h1>
          <p className="text-[11px] text-muted-foreground">Visão operativa dos setores</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center rounded-md bg-ink ring-1 ring-edge p-0.5">
            {["Hoje", "7 dias", "30 dias", "Mês"].map((period, i) => (
              <button
                key={period}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  i === 3
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
          <button className="py-2 pr-3 pl-2 text-sm font-medium text-foreground bg-panel ring-1 ring-edge rounded-md hover:bg-ink inline-flex items-center gap-2">
            <span className="text-base leading-none">↻</span> Exportar
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {/* KPI GRID */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {kpiData.map((kpi) => (
            <div key={kpi.label} className="rounded-lg bg-panel ring-1 ring-black/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {kpi.label}
                </p>
                <span className="size-2 rounded-full bg-primary" />
              </div>
              <p className="font-display font-semibold text-2xl text-foreground mt-2">
                {formatMoney(kpi.value)} <span className="text-sm text-muted-foreground">{kpi.unit}</span>
              </p>
              <p className={`text-xs mt-1 ${kpi.trendColor}`}>{kpi.trend}</p>
            </div>
          ))}
        </section>

        {/* CHART + ACTIVITY */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
          <div className="lg:col-span-2 rounded-lg bg-panel ring-1 ring-black/5 p-5">
            <div className="flex flex-wrap items-center justify-between mb-5 gap-3">
              <div>
                <h2 className="font-display font-semibold text-base uppercase tracking-wide text-foreground">
                  Receita por sector
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Total mensal em Kwanza (AOA)</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-water" />Água</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-restaurant" />Restaurante</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-wash" />Lavagem</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-transport" />Transporte</span>
              </div>
            </div>

            <div className="relative h-48 flex items-end gap-6 px-1">
              <div className="absolute inset-x-0 top-0 border-t border-dashed border-edge" />
              <div className="absolute inset-x-0 top-1/3 border-t border-dashed border-edge" />
              <div className="absolute inset-x-0 top-2/3 border-t border-dashed border-edge" />
              {chartData.map((bar) => {
                const height = Math.max((bar.value / maxChart) * 100, 4);
                return (
                  <div key={bar.label} className="flex-1 flex flex-col justify-end items-center h-full">
                    <span className="text-xs font-medium text-foreground mb-1">{formatMoney(bar.value)}</span>
                    <div className="w-full max-w-[46px] rounded-t-sm bg-primary" style={{ height: `${height}%`, backgroundColor: undefined }}>
                      <div className={`w-full h-full ${bar.color} rounded-t-sm`} />
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-2">{bar.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-5 flex flex-col">
            <h2 className="font-display font-semibold text-base uppercase tracking-wide text-foreground mb-4">
              Actividade recente
            </h2>
            <ul className="space-y-3.5 text-sm">
              {activity.map((item) => {
                const meta = sectorMeta[item.sector as keyof typeof sectorMeta] || { color: "bg-primary", label: item.sector };
                return (
                  <li key={item.id} className="flex gap-3">
                    <span className={`size-2 rounded-full mt-1.5 shrink-0 ${meta.color}`} />
                    <div className="min-w-0">
                      <p className="text-foreground">{item.action}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatRelative(item.created_at)} · {item.amount ? `${formatMoney(item.amount)} Kz` : meta.label}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* TABLES */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-lg bg-panel ring-1 ring-black/5 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
              <div>
                <h2 className="font-display font-semibold text-base uppercase tracking-wide text-foreground inline-flex items-center gap-2">
                  <span className="size-2 rounded-full bg-transport" />Transporte escolar
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Contratos activos por escola</p>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground bg-ink ring-1 ring-edge rounded px-2 py-1">{transportContracts.length} contratos</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b border-edge">
                  <th className="text-left font-semibold px-5 py-2.5">Escola</th>
                  <th className="text-left font-semibold px-3 py-2.5">Alunos</th>
                  <th className="text-left font-semibold px-3 py-2.5">Mensalidade</th>
                  <th className="text-left font-semibold px-5 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {transportContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-foreground">{contract.school_name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{contract.student_count}</td>
                    <td className="px-3 py-3 text-foreground/80">{formatMoney(contract.monthly_fee)} Kz</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded px-2 py-0.5 ring-1 ${statusColor(contract.status)}`}>
                        <span className="size-1.5 rounded-full bg-current" />
                        {contract.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg bg-panel ring-1 ring-black/5 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
              <div>
                <h2 className="font-display font-semibold text-base uppercase tracking-wide text-foreground inline-flex items-center gap-2">
                  <span className="size-2 rounded-full bg-wash" />Operação diária
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Registos de restaurante e lavagem</p>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground bg-ink ring-1 ring-edge rounded px-2 py-1">{dailyOps.length} serviços</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b border-edge">
                  <th className="text-left font-semibold px-5 py-2.5">Serviço</th>
                  <th className="text-left font-semibold px-3 py-2.5">Setor</th>
                  <th className="text-left font-semibold px-3 py-2.5">Valor</th>
                  <th className="text-left font-semibold px-5 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {dailyOps.map((op) => (
                  <tr key={op.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-foreground">{op.service}</td>
                    <td className="px-3 py-3 text-muted-foreground">{op.sector}</td>
                    <td className="px-3 py-3 text-foreground/80">{formatMoney(op.value)} Kz</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded px-2 py-0.5 ring-1 ${statusColor(op.status)}`}>
                        <span className="size-1.5 rounded-full bg-current" />
                        {op.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
