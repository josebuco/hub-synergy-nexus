import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getRestaurantData } from "@/lib/sectors.functions";
import { createMenuItem, createOrder, createTable, deleteRecord, updateOrderStatus } from "@/lib/crud.functions";
import {
  ActionButton,
  Card,
  Field,
  FormPanel,
  Kpi,
  PageHeader,
  Td,
  Th,
  formatMoney,
  inputClass,
} from "@/components/panel";
import { SectorCash } from "@/components/sector-cash";

const restaurantOptions = queryOptions({
  queryKey: ["sector", "restaurante"],
  queryFn: () => getRestaurantData(),
});

export const Route = createFileRoute("/_authenticated/restaurante")({
  head: () => ({
    meta: [
      { title: "Restaurante — Kilombwe" },
      { name: "description", content: "Gestão de mesas, pedidos e menu do restaurante." },
      { property: "og:title", content: "Restaurante — Kilombwe" },
      { property: "og:description", content: "Gestão de mesas, pedidos e menu do restaurante." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(restaurantOptions);
  },
  component: RestaurantePage,
});

const ORDER_STATES = ["Em curso", "Pronto", "Fechado", "Cancelado"];

function RestaurantePage() {
  const { data } = useSuspenseQuery(restaurantOptions);
  const qc = useQueryClient();
  const addOrder = useServerFn(createOrder);
  const addTable = useServerFn(createTable);
  const addMenuItem = useServerFn(createMenuItem);
  const setStatus = useServerFn(updateOrderStatus);
  const removeRecord = useServerFn(deleteRecord);

  const [form, setForm] = useState<"none" | "order" | "table" | "menu">("none");
  const [saving, setSaving] = useState(false);
  const avgTicket = data.todayOrders > 0 ? Math.round(data.todayRevenue / data.todayOrders) : 0;

  async function run(fn: () => Promise<unknown>, message: string) {
    setSaving(true);
    try {
      await fn();
      toast.success(message);
      setForm("none");
      await qc.invalidateQueries({ queryKey: ["sector", "restaurante"] });
      await qc.invalidateQueries({ queryKey: ["finance"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar.");
    } finally {
      setSaving(false);
    }
  }

  function onOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const tableId = String(f.get("table_id") || "");
    void run(
      () =>
        addOrder({
          data: {
            table_id: tableId || null,
            total: Number(f.get("total")),
            status: String(f.get("status")),
          },
        }),
      "Pedido registado.",
    );
  }

  function onTable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(
      () =>
        addTable({
          data: {
            number: Number(f.get("number")),
            capacity: Number(f.get("capacity")),
            status: String(f.get("status")),
          },
        }),
      "Mesa criada.",
    );
  }

  function onMenu(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(
      () => addMenuItem({ data: { name: String(f.get("name")), price: Number(f.get("price")) } }),
      "Prato adicionado.",
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader
        dot="bg-restaurant"
        title="Restaurante"
        subtitle="Mesas, pedidos e menu"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setForm(form === "menu" ? "none" : "menu")}
              className="px-3 py-1.5 text-sm font-medium rounded-md ring-1 ring-edge text-foreground hover:bg-white/5"
            >
              + Prato
            </button>
            <button
              onClick={() => setForm(form === "table" ? "none" : "table")}
              className="px-3 py-1.5 text-sm font-medium rounded-md ring-1 ring-edge text-foreground hover:bg-white/5"
            >
              + Mesa
            </button>
            <button
              onClick={() => setForm(form === "order" ? "none" : "order")}
              className="px-3 py-1.5 text-sm font-medium text-primary-foreground bg-restaurant rounded-md hover:bg-restaurant/90"
            >
              + Novo pedido
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-5">
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Kpi label="Vendas hoje" value={formatMoney(data.todayRevenue)} />
          <Kpi label="Pedidos hoje" value={data.todayOrders} />
          <Kpi label="Mesas ocupadas" value={`${data.occupied} / ${data.tables.length}`} />
          <Kpi label="Ticket médio" value={formatMoney(avgTicket)} />
        </section>

        <SectorCash slug="restaurante" />

        <FormPanel open={form === "order"} title="Novo pedido" saving={saving} onSubmit={onOrder}>
          <Field label="Mesa">
            <select name="table_id" className={inputClass} defaultValue="">
              <option value="">Sem mesa (balcão / take-away)</option>
              {data.tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Mesa {t.number}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Total (Kz)">
            <input name="total" type="number" min={0} required className={inputClass} />
          </Field>
          <Field label="Estado">
            <select name="status" className={inputClass} defaultValue="Em curso">
              {ORDER_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </FormPanel>

        <FormPanel open={form === "table"} title="Nova mesa" saving={saving} onSubmit={onTable}>
          <Field label="Número">
            <input name="number" type="number" min={1} required className={inputClass} />
          </Field>
          <Field label="Lugares">
            <input name="capacity" type="number" min={1} defaultValue={4} required className={inputClass} />
          </Field>
          <Field label="Estado">
            <select name="status" className={inputClass} defaultValue="Livre">
              <option>Livre</option>
              <option>Ocupada</option>
              <option>Reservada</option>
            </select>
          </Field>
        </FormPanel>

        <FormPanel open={form === "menu"} title="Novo prato" saving={saving} onSubmit={onMenu}>
          <Field label="Prato">
            <input name="name" required className={inputClass} placeholder="Calulu de peixe" />
          </Field>
          <Field label="Preço (Kz)">
            <input name="price" type="number" min={0} required className={inputClass} />
          </Field>
        </FormPanel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card title="Estado das mesas">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-5">
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
                  <p
                    className={`text-xs mt-2 font-medium ${
                      t.status === "Ocupada"
                        ? "text-restaurant"
                        : t.status === "Reservada"
                          ? "text-warning"
                          : "text-muted-foreground"
                    }`}
                  >
                    {t.status}
                  </p>
                  <p className="text-xs text-foreground/80 mt-1">
                    {t.current_order_value ? formatMoney(t.current_order_value) : "—"}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Pedidos de hoje">
            <table className="w-full text-sm">
              <thead className="border-b border-edge text-left">
                <tr>
                  <Th>Mesa</Th>
                  <Th>Total</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {data.orders.length === 0 ? (
                  <tr>
                    <Td className="text-muted-foreground">Sem pedidos hoje.</Td>
                    <Td>—</Td>
                    <Td>—</Td>
                  </tr>
                ) : (
                  data.orders.map((o) => (
                    <tr key={o.id} className="hover:bg-white/[0.02]">
                      <Td>
                        {(o.restaurant_tables as unknown as { number: number })?.number
                          ? `Mesa ${(o.restaurant_tables as unknown as { number: number }).number}`
                          : "Balcão"}
                      </Td>
                      <Td>{formatMoney(o.total)}</Td>
                      <Td>
                        <select
                          value={o.status}
                          onChange={(e) =>
                            void run(
                              () => setStatus({ data: { id: o.id, status: e.target.value } }),
                              "Estado actualizado.",
                            )
                          }
                          className="rounded-md bg-ink ring-1 ring-edge px-2 py-1 text-xs text-foreground"
                        >
                          {ORDER_STATES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>

        <Card title="Menu principal">
          <table className="w-full text-sm">
            <thead className="border-b border-edge text-left">
              <tr>
                <Th>Prato</Th>
                <Th>Preço</Th>
                <Th>Acção</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/60">
              {data.menuItems.map((m) => (
                <tr key={m.id} className="hover:bg-white/[0.02]">
                  <Td>{m.name}</Td>
                  <Td>{formatMoney(m.price)}</Td>
                  <Td>
                    <ActionButton
                      onClick={() =>
                        void run(
                          () => removeRecord({ data: { table: "restaurant_menu_items", id: m.id } }),
                          "Prato removido.",
                        )
                      }
                    >
                      Apagar
                    </ActionButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
