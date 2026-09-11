import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getTransportData } from "@/lib/sectors.functions";

const transportOptions = queryOptions({
  queryKey: ["sector", "transporte"],
  queryFn: () => getTransportData(),
});

export const Route = createFileRoute("/_authenticated/transporte")({
  head: () => ({
    meta: [
      { title: "Transporte Escolar — Kilombwe" },
      { name: "description", content: "Gestão de contratos, rotas e alunos." },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(transportOptions);
  },
  component: TransportePage,
});

function formatMoney(value: number) {
  return value.toLocaleString("pt-AO");
}

function TransportePage() {
  const { data } = useSuspenseQuery(transportOptions);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 shrink-0 bg-panel/80 border-b border-edge flex items-center justify-between px-6">
        <div>
          <h1 className="font-display font-semibold text-lg uppercase tracking-wide text-foreground inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-transport" />Transporte Escolar
          </h1>
          <p className="text-[11px] text-muted-foreground">Contratos, rotas e alunos</p>
        </div>
        <button className="px-3 py-1.5 text-sm font-medium text-primary-foreground bg-transport rounded-md hover:bg-transport/90">
          + Novo contrato
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-5">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Contratos activos</p>
            <p className="font-display font-semibold text-2xl text-foreground mt-2">{data.activeContracts}</p>
          </div>
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Alunos transportados</p>
            <p className="font-display font-semibold text-2xl text-foreground mt-2">{data.totalStudents}</p>
          </div>
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Receita mensal</p>
            <p className="font-display font-semibold text-2xl text-foreground mt-2">{formatMoney(data.monthlyRevenue)} Kz</p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-lg bg-panel ring-1 ring-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-edge">
              <h2 className="font-display font-semibold text-base uppercase tracking-wide text-foreground">Contratos por escola</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b border-edge text-left">
                  <th className="px-5 py-2.5">Escola</th>
                  <th className="px-3 py-2.5">Rota</th>
                  <th className="px-3 py-2.5">Alunos</th>
                  <th className="px-3 py-2.5">Mensalidade</th>
                  <th className="px-5 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {data.contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-foreground">{c.school_name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{c.route_code}</td>
                    <td className="px-3 py-3 text-muted-foreground">{c.student_count}</td>
                    <td className="px-3 py-3 text-foreground/80">{formatMoney(c.monthly_fee)} Kz</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg bg-panel ring-1 ring-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-edge">
              <h2 className="font-display font-semibold text-base uppercase tracking-wide text-foreground">Rotas de hoje</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b border-edge text-left">
                  <th className="px-5 py-2.5">Rota</th>
                  <th className="px-3 py-2.5">Motorista</th>
                  <th className="px-3 py-2.5">Viatura</th>
                  <th className="px-3 py-2.5">Alunos</th>
                  <th className="px-5 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {data.routes.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-foreground font-medium">{r.route_code}</td>
                    <td className="px-3 py-3 text-muted-foreground">{r.driver_name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{r.vehicle}</td>
                    <td className="px-3 py-3 text-muted-foreground">{r.student_count}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
