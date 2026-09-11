import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getRestaurantData } from "@/lib/sectors.functions";

const restaurantOptions = queryOptions({
  queryKey: ["sector", "restaurante"],
  queryFn: () => getRestaurantData(),
});

export const Route = createFileRoute("/_authenticated/restaurante")({
  head: () => ({
    meta: [
      { title: "Restaurante — Kilombwe" },
      { name: "description", content: "Gestão de mesas, pedidos e cozinha." },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(restaurantOptions);
  },
  component: RestaurantePage,
});

function formatMoney(value: number) {
  return value.toLocaleString("pt-AO");
}

function RestaurantePage() {
  const { data } = useSuspenseQuery(restaurantOptions);
  const avgTicket = data.todayOrders > 0 ? Math.round(data.todayRevenue / data.todayOrders) : 0;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 shrink-0 bg-panel/80 border-b border-edge flex items-center justify-between px-6">
        <div>
          <h1 className="font-display font-semibold text-lg uppercase tracking-wide text-foreground inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-restaurant" />Restaurante
          </h1>
          <p className="text-[11px] text-muted-foreground">Mesas, pedidos e menu</p>
        </div>
        <button className="px-3 py-1.5 text-sm font-medium text-primary-foreground bg-restaurant rounded-md hover:bg-restaurant/90">
          + Novo pedido
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-5">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Vendas hoje</p>
            <p className="font-display font-semibold text-2xl text-foreground mt-2">{formatMoney(data.todayRevenue)} Kz</p>
          </div>
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mesas ocupadas</p>
            <p className="font-display font-semibold text-2xl text-foreground mt-2">{data.occupied} / {data.tables.length}</p>
          </div>
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ticket médio</p>
            <p className="font-display font-semibold text-2xl text-foreground mt-2">{formatMoney(avgTicket)} Kz</p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-5">
            <h2 className="font-display font-semibold text-base uppercase tracking-wide text-foreground mb-4">Estado das mesas</h2>
            <div className="grid grid-cols-3 gap-3">
              {data.tables.map((t) => (
                <div
                  key={t.id}
                  className={`rounded-md p-3 ring-1 ${
                    t.status === "Ocupada"
                      ? "bg-restaurant/10 ring-restaurant/30"
                      : t.status === "Reservada"
                      ? "bg-warning/10 ring-warning/30"
                      : "bg-ink ring-edge"
                  }`}
                >
                  <p className="font-display font-semibold text-foreground">Mesa {t.number}</p>
                  <p className="text-[11px] text-muted-foreground">{t.capacity} lugares</p>
                  <p className={`text-xs mt-2 font-medium ${
                    t.status === "Ocupada" ? "text-restaurant" : t.status === "Reservada" ? "text-warning" : "text-muted-foreground"
                  }`}>{t.status}</p>
                  <p className="text-xs text-foreground/80 mt-1">{t.current_order_value ? `${formatMoney(t.current_order_value)} Kz` : "—"}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-panel ring-1 ring-black/5 p-5">
            <h2 className="font-display font-semibold text-base uppercase tracking-wide text-foreground mb-4">Menu principal</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b border-edge text-left">
                  <th className="px-3 py-2.5">Prato</th>
                  <th className="px-3 py-2.5">Preço</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {data.menuItems.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-3 text-foreground">{m.name}</td>
                    <td className="px-3 py-3 text-foreground/80">{formatMoney(m.price)} Kz</td>
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
