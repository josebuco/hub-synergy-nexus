import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getFinance } from "@/lib/finance.functions";
import { Card, Kpi, PageHeader, Td, Th, formatMoney } from "@/components/panel";

const financeOptions = queryOptions({
  queryKey: ["finance"],
  queryFn: () => getFinance(),
});

export const Route = createFileRoute("/_authenticated/faturacao")({
  head: () => ({
    meta: [
      { title: "Faturação por Setor — Kilombwe" },
      {
        name: "description",
        content: "Receitas, despesas e saldo de caixa de cada setor da empresa.",
      },
      { property: "og:title", content: "Faturação por Setor — Kilombwe" },
      {
        property: "og:description",
        content: "Receitas, despesas e saldo de caixa de cada setor da empresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(financeOptions);
  },
  component: FaturacaoPage,
});

function FaturacaoPage() {
  const { data } = useSuspenseQuery(financeOptions);
  const [tab, setTab] = useState<string>("todos");

  const sector = data.sectors.find((s) => s.slug === tab);
  const entries = tab === "todos" ? data.entries : data.entries.filter((e) => e.sector === tab);

  const revenue = sector ? sector.revenue : data.totals.revenue;
  const expense = sector ? sector.expense : data.totals.expense;
  const balance = revenue - expense;

  const series = sector
    ? sector.series
    : (data.sectors[0]?.series || []).map((_, i) => ({
        month: data.sectors[0]!.series[i]!.month,
        receitas: data.sectors.reduce((s, x) => s + (x.series[i]?.receitas || 0), 0),
        despesas: data.sectors.reduce((s, x) => s + (x.series[i]?.despesas || 0), 0),
        saldo: data.sectors.reduce((s, x) => s + (x.series[i]?.saldo || 0), 0),
      }));

  const comparison = data.sectors.map((s) => ({
    name: s.label,
    receitas: s.revenue,
    despesas: s.expense,
  }));

  return (
    <>
      <PageHeader
        dot="bg-brand"
        title="Faturação por Setor"
        subtitle="Receitas, despesas e saldo de caixa dos últimos 6 meses"
      />

      <div className="p-6 space-y-5 overflow-y-auto">
        <div className="flex flex-wrap gap-2">
          {[{ slug: "todos", label: "Todos os setores" }, ...data.sectors].map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => setTab(s.slug)}
              className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] rounded-md ring-1 transition-colors ${
                tab === s.slug
                  ? "bg-brand text-primary-foreground ring-brand"
                  : "text-muted-foreground ring-edge hover:bg-white/5"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Receitas (6 meses)" value={formatMoney(revenue)} tone="text-wash" />
          <Kpi label="Despesas (6 meses)" value={formatMoney(expense)} tone="text-destructive" />
          <Kpi
            label="Saldo de caixa"
            value={formatMoney(balance)}
            tone={balance >= 0 ? "text-brand" : "text-destructive"}
          />
          <Kpi
            label="Receita deste mês"
            value={formatMoney(
              sector
                ? sector.monthRevenue
                : data.sectors.reduce((s, x) => s + x.monthRevenue, 0),
            )}
          />
        </div>

        <Card title="Evolução mensal">
          <div className="p-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--edge))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  formatter={(v: number) => formatMoney(v)}
                  contentStyle={{
                    background: "hsl(var(--panel))",
                    border: "1px solid hsl(var(--edge))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="receitas"
                  name="Receitas"
                  stroke="hsl(var(--wash))"
                  fill="hsl(var(--wash) / 0.2)"
                />
                <Area
                  type="monotone"
                  dataKey="despesas"
                  name="Despesas"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive) / 0.15)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {tab === "todos" ? (
          <Card title="Comparação entre setores">
            <div className="p-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--edge))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    formatter={(v: number) => formatMoney(v)}
                    contentStyle={{
                      background: "hsl(var(--panel))",
                      border: "1px solid hsl(var(--edge))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--wash))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : null}

        <Card title="Caixa por setor">
          <table className="w-full text-sm">
            <thead className="bg-ink/60 text-left">
              <tr>
                <Th>Setor</Th>
                <Th>Receitas</Th>
                <Th>Despesas</Th>
                <Th>Saldo</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {data.sectors.map((s) => (
                <tr key={s.slug} className="hover:bg-white/5">
                  <Td className="font-medium">{s.label}</Td>
                  <Td className="text-wash">{formatMoney(s.revenue)}</Td>
                  <Td className="text-destructive">{formatMoney(s.expense)}</Td>
                  <Td className={s.balance >= 0 ? "text-brand font-semibold" : "text-destructive font-semibold"}>
                    {formatMoney(s.balance)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Movimentos recentes">
          <table className="w-full text-sm">
            <thead className="bg-ink/60 text-left">
              <tr>
                <Th>Data</Th>
                <Th>Descrição</Th>
                <Th>Tipo</Th>
                <Th>Estado</Th>
                <Th>Valor</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {entries.slice(0, 60).map((e, i) => (
                <tr key={`${e.date}-${i}`} className="hover:bg-white/5">
                  <Td>{new Date(e.date).toLocaleDateString("pt-AO")}</Td>
                  <Td>{e.description}</Td>
                  <Td>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${
                        e.kind === "receita" ? "bg-wash/15 text-wash" : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {e.kind}
                    </span>
                  </Td>
                  <Td className="text-muted-foreground">{e.status}</Td>
                  <Td className={e.kind === "receita" ? "text-wash" : "text-destructive"}>
                    {e.kind === "receita" ? "+" : "−"}
                    {formatMoney(e.amount)}
                  </Td>
                </tr>
              ))}
              {entries.length === 0 ? (
                <tr>
                  <Td className="text-muted-foreground">Sem movimentos registados.</Td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
