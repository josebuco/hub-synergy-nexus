import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getWashData } from "@/lib/sectors.functions";

const washOptions = queryOptions({
  queryKey: ["sector", "lavagem"],
  queryFn: () => getWashData(),
});

export const Route = createFileRoute("/_authenticated/lavagem")({
  head: () => ({
    meta: [
      { title: "Lavagem de Carros — Kilombwe" },
      { name: "description", content: "Gestão de fila de lavagem e serviços." },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(washOptions);
  },
  component: LavagemPage,
});

function formatMoney(value: number) {
  return value.toLocaleString("pt-AO");
}

function LavagemPage() {
  const { data } = useSuspenseQuery(washOptions);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 shrink-0 bg-panel/80 border-b border-edge flex items-center justify-between px-6">
        <div>
          <h1 className="font-display font-semibold text-lg uppercase tracking-wide text-foreground inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-wash" />Lavagem
          </h1>
          <p className="text-[11px] text-muted-foreground">Fila de serviços e preços</p>
        </div>
        <button className="px-3 py-1.5 text-sm font-medium text-primary-foreground bg-wash rounded-md hover:bg-wash/90">
          + Adicionar carro
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-5">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Serviços hoje</p>
            <p className="font-display font-semibold text-2xl text-foreground mt-2">{data.todayServices}</p>
          </div>
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Fila de espera</p>
            <p className="font-display font-semibold text-2xl text-warning mt-2">{data.waiting}</p>
          </div>
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Receita hoje</p>
            <p className="font-display font-semibold text-2xl text-foreground mt-2">{formatMoney(data.todayRevenue)} Kz</p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-5">
            <h2 className="font-display font-semibold text-base uppercase tracking-wide text-foreground mb-4">Fila de lavagem</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b border-edge text-left">
                  <th className="px-3 py-2.5">Veículo</th>
                  <th className="px-3 py-2.5">Serviço</th>
                  <th className="px-3 py-2.5">Valor</th>
                  <th className="px-3 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {data.queue.map((q) => (
                  <tr key={q.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-3 text-foreground">{q.car_description}</td>
                    <td className="px-3 py-3 text-muted-foreground">{(q.wash_services as unknown as { name: string })?.name}</td>
                    <td className="px-3 py-3 text-foreground/80">{formatMoney(q.total)} Kz</td>
                    <td className="px-3 py-3 text-muted-foreground">{q.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-5">
            <h2 className="font-display font-semibold text-base uppercase tracking-wide text-foreground mb-4">Serviços e preços</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b border-edge text-left">
                  <th className="px-3 py-2.5">Serviço</th>
                  <th className="px-3 py-2.5">Preço</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {data.services.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-3 text-foreground">{s.name}</td>
                    <td className="px-3 py-3 text-foreground/80">{formatMoney(s.price)} Kz</td>
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
