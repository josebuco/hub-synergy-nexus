import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getWashData } from "@/lib/sectors.functions";
import { createWashEntry, createWashService, deleteRecord, updateWashStatus } from "@/lib/crud.functions";
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

const washOptions = queryOptions({
  queryKey: ["sector", "lavagem"],
  queryFn: () => getWashData(),
});

export const Route = createFileRoute("/_authenticated/lavagem")({
  head: () => ({
    meta: [
      { title: "Lavagem de Carros — Kilombwe" },
      { name: "description", content: "Fila de lavagem, serviços e receitas do dia." },
      { property: "og:title", content: "Lavagem de Carros — Kilombwe" },
      { property: "og:description", content: "Fila de lavagem, serviços e receitas do dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(washOptions);
  },
  component: LavagemPage,
});

const STATES = ["Em espera", "Em curso", "Concluído", "Cancelado"];

function LavagemPage() {
  const { data } = useSuspenseQuery(washOptions);
  const qc = useQueryClient();
  const addEntry = useServerFn(createWashEntry);
  const addService = useServerFn(createWashService);
  const setStatus = useServerFn(updateWashStatus);
  const removeRecord = useServerFn(deleteRecord);

  const [form, setForm] = useState<"none" | "car" | "service">("none");
  const [saving, setSaving] = useState(false);

  async function run(fn: () => Promise<unknown>, message: string) {
    setSaving(true);
    try {
      await fn();
      toast.success(message);
      setForm("none");
      await qc.invalidateQueries({ queryKey: ["sector", "lavagem"] });
      await qc.invalidateQueries({ queryKey: ["finance"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar.");
    } finally {
      setSaving(false);
    }
  }

  function onCar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(
      () =>
        addEntry({
          data: {
            car_description: String(f.get("car_description")),
            service_id: String(f.get("service_id")),
            status: String(f.get("status")),
          },
        }),
      "Carro adicionado à fila.",
    );
  }

  function onService(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(
      () => addService({ data: { name: String(f.get("name")), price: Number(f.get("price")) } }),
      "Serviço criado.",
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader
        dot="bg-wash"
        title="Lavagem"
        subtitle="Fila de serviços e preços"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setForm(form === "service" ? "none" : "service")}
              className="px-3 py-1.5 text-sm font-medium rounded-md ring-1 ring-edge text-foreground hover:bg-white/5"
            >
              + Serviço
            </button>
            <button
              onClick={() => setForm(form === "car" ? "none" : "car")}
              className="px-3 py-1.5 text-sm font-medium text-primary-foreground bg-wash rounded-md hover:bg-wash/90"
            >
              + Adicionar carro
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-5">
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Kpi label="Serviços hoje" value={data.todayServices} />
          <Kpi label="Fila de espera" value={data.waiting} tone="text-warning" />
          <Kpi label="Em curso" value={data.inProgress} />
          <Kpi label="Receita hoje" value={formatMoney(data.todayRevenue)} />
        </section>

        <FormPanel open={form === "car"} title="Novo carro na fila" saving={saving} onSubmit={onCar}>
          <Field label="Veículo">
            <input name="car_description" required className={inputClass} placeholder="Toyota Hilux — LD-00-00-AA" />
          </Field>
          <Field label="Serviço">
            <select name="service_id" required className={inputClass}>
              {data.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatMoney(s.price)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select name="status" className={inputClass} defaultValue="Em espera">
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </FormPanel>

        <FormPanel open={form === "service"} title="Novo serviço" saving={saving} onSubmit={onService}>
          <Field label="Nome">
            <input name="name" required className={inputClass} placeholder="Lavagem completa" />
          </Field>
          <Field label="Preço (Kz)">
            <input name="price" type="number" min={0} required className={inputClass} />
          </Field>
        </FormPanel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card title="Fila de lavagem">
            <table className="w-full text-sm">
              <thead className="border-b border-edge text-left">
                <tr>
                  <Th>Veículo</Th>
                  <Th>Serviço</Th>
                  <Th>Valor</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {data.queue.map((q) => (
                  <tr key={q.id} className="hover:bg-white/[0.02]">
                    <Td>{q.car_description}</Td>
                    <Td>{(q.wash_services as unknown as { name: string })?.name}</Td>
                    <Td>{formatMoney(q.total)}</Td>
                    <Td>
                      <select
                        value={q.status}
                        onChange={(e) =>
                          void run(
                            () => setStatus({ data: { id: q.id, status: e.target.value } }),
                            "Estado actualizado.",
                          )
                        }
                        className="rounded-md bg-ink ring-1 ring-edge px-2 py-1 text-xs text-foreground"
                      >
                        {STATES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Serviços e preços">
            <table className="w-full text-sm">
              <thead className="border-b border-edge text-left">
                <tr>
                  <Th>Serviço</Th>
                  <Th>Preço</Th>
                  <Th>Acção</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {data.services.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <Td>{s.name}</Td>
                    <Td>{formatMoney(s.price)}</Td>
                    <Td>
                      <ActionButton
                        onClick={() =>
                          void run(
                            () => removeRecord({ data: { table: "wash_services", id: s.id } }),
                            "Serviço removido.",
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
    </div>
  );
}
