import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getTransportData } from "@/lib/sectors.functions";
import {
  createContract,
  createRoute as createRouteFn,
  deleteRecord,
  updateContractStatus,
  updateRouteStatus,
} from "@/lib/crud.functions";
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

const transportOptions = queryOptions({
  queryKey: ["sector", "transporte"],
  queryFn: () => getTransportData(),
});

export const Route = createFileRoute("/_authenticated/transporte")({
  head: () => ({
    meta: [
      { title: "Transporte Escolar — Kilombwe" },
      { name: "description", content: "Contratos com escolas, rotas, motoristas e alunos." },
      { property: "og:title", content: "Transporte Escolar — Kilombwe" },
      { property: "og:description", content: "Contratos com escolas, rotas, motoristas e alunos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(transportOptions);
  },
  component: TransportePage,
});

const CONTRACT_STATES = ["Activo", "Pendente", "Suspenso", "Terminado"];
const ROUTE_STATES = ["Em curso", "Concluída", "Parada"];

function TransportePage() {
  const { data } = useSuspenseQuery(transportOptions);
  const qc = useQueryClient();
  const addContract = useServerFn(createContract);
  const addRoute = useServerFn(createRouteFn);
  const setContractStatus = useServerFn(updateContractStatus);
  const setRouteStatus = useServerFn(updateRouteStatus);
  const removeRecord = useServerFn(deleteRecord);

  const [form, setForm] = useState<"none" | "contract" | "route">("none");
  const [saving, setSaving] = useState(false);

  async function run(fn: () => Promise<unknown>, message: string) {
    setSaving(true);
    try {
      await fn();
      toast.success(message);
      setForm("none");
      await qc.invalidateQueries({ queryKey: ["sector", "transporte"] });
      await qc.invalidateQueries({ queryKey: ["finance"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar.");
    } finally {
      setSaving(false);
    }
  }

  function onContract(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(
      () =>
        addContract({
          data: {
            school_name: String(f.get("school_name")),
            route_code: String(f.get("route_code")),
            student_count: Number(f.get("student_count")),
            monthly_fee: Number(f.get("monthly_fee")),
            status: String(f.get("status")),
          },
        }),
      "Contrato registado.",
    );
  }

  function onRoute(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(
      () =>
        addRoute({
          data: {
            route_code: String(f.get("route_code")),
            driver_name: String(f.get("driver_name")),
            vehicle: String(f.get("vehicle")),
            student_count: Number(f.get("student_count")),
            status: String(f.get("status")),
          },
        }),
      "Rota registada.",
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader
        dot="bg-transport"
        title="Transporte Escolar"
        subtitle="Contratos, rotas e alunos"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setForm(form === "route" ? "none" : "route")}
              className="px-3 py-1.5 text-sm font-medium rounded-md ring-1 ring-edge text-foreground hover:bg-white/5"
            >
              + Rota
            </button>
            <button
              onClick={() => setForm(form === "contract" ? "none" : "contract")}
              className="px-3 py-1.5 text-sm font-medium text-primary-foreground bg-transport rounded-md hover:bg-transport/90"
            >
              + Novo contrato
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-5">
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Kpi label="Contratos activos" value={data.activeContracts} />
          <Kpi label="Contratos pendentes" value={data.pendingContracts} tone="text-warning" />
          <Kpi label="Alunos transportados" value={data.totalStudents} />
          <Kpi label="Receita mensal" value={formatMoney(data.monthlyRevenue)} />
        </section>

        <SectorCash slug="transporte" />

        <FormPanel open={form === "contract"} title="Novo contrato" saving={saving} onSubmit={onContract}>
          <Field label="Escola">
            <input name="school_name" required className={inputClass} placeholder="Colégio São José" />
          </Field>
          <Field label="Código da rota">
            <input name="route_code" required className={inputClass} placeholder="R-01" />
          </Field>
          <Field label="Nº de alunos">
            <input name="student_count" type="number" min={0} defaultValue={0} required className={inputClass} />
          </Field>
          <Field label="Mensalidade (Kz)">
            <input name="monthly_fee" type="number" min={0} required className={inputClass} />
          </Field>
          <Field label="Estado">
            <select name="status" className={inputClass} defaultValue="Activo">
              {CONTRACT_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </FormPanel>

        <FormPanel open={form === "route"} title="Nova rota" saving={saving} onSubmit={onRoute}>
          <Field label="Código">
            <input name="route_code" required className={inputClass} placeholder="R-01" />
          </Field>
          <Field label="Motorista">
            <input name="driver_name" required className={inputClass} />
          </Field>
          <Field label="Viatura">
            <input name="vehicle" required className={inputClass} placeholder="Hiace — LD-00-00-AA" />
          </Field>
          <Field label="Nº de alunos">
            <input name="student_count" type="number" min={0} defaultValue={0} required className={inputClass} />
          </Field>
          <Field label="Estado">
            <select name="status" className={inputClass} defaultValue="Em curso">
              {ROUTE_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </FormPanel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card title="Contratos por escola">
            <table className="w-full text-sm">
              <thead className="border-b border-edge text-left">
                <tr>
                  <Th>Escola</Th>
                  <Th>Rota</Th>
                  <Th>Alunos</Th>
                  <Th>Mensalidade</Th>
                  <Th>Estado</Th>
                  <Th>Acção</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {data.contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <Td>{c.school_name}</Td>
                    <Td>{c.route_code}</Td>
                    <Td>{c.student_count}</Td>
                    <Td>{formatMoney(c.monthly_fee)}</Td>
                    <Td>
                      <select
                        value={c.status}
                        onChange={(e) =>
                          void run(
                            () => setContractStatus({ data: { id: c.id, status: e.target.value } }),
                            "Estado actualizado.",
                          )
                        }
                        className="rounded-md bg-ink ring-1 ring-edge px-2 py-1 text-xs text-foreground"
                      >
                        {CONTRACT_STATES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Td>
                    <Td>
                      <ActionButton
                        onClick={() =>
                          void run(
                            () => removeRecord({ data: { table: "school_contracts", id: c.id } }),
                            "Contrato removido.",
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

          <Card title="Rotas">
            <table className="w-full text-sm">
              <thead className="border-b border-edge text-left">
                <tr>
                  <Th>Rota</Th>
                  <Th>Motorista</Th>
                  <Th>Viatura</Th>
                  <Th>Alunos</Th>
                  <Th>Estado</Th>
                  <Th>Acção</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {data.routes.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <Td className="font-medium">{r.route_code}</Td>
                    <Td>{r.driver_name}</Td>
                    <Td>{r.vehicle}</Td>
                    <Td>{r.student_count}</Td>
                    <Td>
                      <select
                        value={r.status}
                        onChange={(e) =>
                          void run(
                            () => setRouteStatus({ data: { id: r.id, status: e.target.value } }),
                            "Estado actualizado.",
                          )
                        }
                        className="rounded-md bg-ink ring-1 ring-edge px-2 py-1 text-xs text-foreground"
                      >
                        {ROUTE_STATES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Td>
                    <Td>
                      <ActionButton
                        onClick={() =>
                          void run(
                            () => removeRecord({ data: { table: "school_routes", id: r.id } }),
                            "Rota removida.",
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
