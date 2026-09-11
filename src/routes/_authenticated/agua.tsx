import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getWaterData } from "@/lib/sectors.functions";

const waterOptions = queryOptions({
  queryKey: ["sector", "agua"],
  queryFn: () => getWaterData(),
});

export const Route = createFileRoute("/_authenticated/agua")({
  head: () => ({
    meta: [
      { title: "Estação de Água — Kilombwe" },
      { name: "description", content: "Gestão de vendas e stock de água." },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(waterOptions);
  },
  component: AguaPage,
});

function formatMoney(value: number) {
  return value.toLocaleString("pt-AO");
}

function AguaPage() {
  const { data } = useSuspenseQuery(waterOptions);
  const pending = data.sales.filter((s) => s.status === "Pendente").length;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 shrink-0 bg-panel/80 border-b border-edge flex items-center justify-between px-6">
        <div>
          <h1 className="font-display font-semibold text-lg uppercase tracking-wide text-foreground inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-water" />Estação de Água
          </h1>
          <p className="text-[11px] text-muted-foreground">Vendas, stock e entregas</p>
        </div>
        <button className="px-3 py-1.5 text-sm font-medium text-primary-foreground bg-water rounded-md hover:bg-water/90">
          + Nova venda
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-5">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Vendas hoje</p>
            <p className="font-display font-semibold text-2xl text-foreground mt-2">{formatMoney(data.todayRevenue)} Kz</p>
          </div>
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Vendas hoje</p>
            <p className="font-display font-semibold text-2xl text-foreground mt-2">{data.todaySalesCount}</p>
          </div>
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Entregas pendentes</p>
            <p className="font-display font-semibold text-2xl text-warning mt-2">{pending}</p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-5">
            <h2 className="font-display font-semibold text-base uppercase tracking-wide text-foreground mb-4">Preços e stock</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b border-edge text-left">
                  <th className="px-3 py-2.5">Produto</th>
                  <th className="px-3 py-2.5">Preço</th>
                  <th className="px-3 py-2.5">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {data.products.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-3 text-foreground">{p.name}</td>
                    <td className="px-3 py-3 text-foreground/80">{formatMoney(p.price)} Kz/{p.unit}</td>
                    <td className="px-3 py-3 text-muted-foreground">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-5">
            <h2 className="font-display font-semibold text-base uppercase tracking-wide text-foreground mb-4">Vendas recentes</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b border-edge text-left">
                  <th className="px-3 py-2.5">Item</th>
                  <th className="px-3 py-2.5">Cliente</th>
                  <th className="px-3 py-2.5">Valor</th>
                  <th className="px-3 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {data.sales.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-3 text-foreground">
                      {(s.water_products as unknown as { name: string })?.name} × {s.quantity}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{s.client_name || "—"}</td>
                    <td className="px-3 py-3 text-foreground/80">{formatMoney(s.total)} Kz</td>
                    <td className="px-3 py-3 text-muted-foreground">{s.status}</td>
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
