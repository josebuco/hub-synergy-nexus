import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SECTOR_LABELS: Record<string, string> = {
  agua: "Água",
  restaurante: "Restaurante",
  lavagem: "Lavagem",
  transporte: "Transporte Escolar",
  geral: "Geral / Administração",
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export const getFinance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const from = new Date();
    from.setMonth(from.getMonth() - 5);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    const fromIso = from.toISOString();

    const [sales, orders, wash, contracts, expenses] = await Promise.all([
      context.supabase
        .from("water_sales")
        .select("total, created_at, client_name, status")
        .gte("created_at", fromIso),
      context.supabase.from("restaurant_orders").select("total, created_at, status").gte("created_at", fromIso),
      context.supabase.from("wash_queue").select("total, created_at, status, car_description").gte("created_at", fromIso),
      context.supabase.from("school_contracts").select("monthly_fee, status, school_name, created_at"),
      context.supabase.from("expenses").select("*").gte("expense_date", fromIso.slice(0, 10)),
    ]);

    const months: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const d = new Date(from);
      d.setMonth(from.getMonth() + i);
      months.push(monthKey(d));
    }

    const empty = () => Object.fromEntries(months.map((m) => [m, 0])) as Record<string, number>;
    const revenue: Record<string, Record<string, number>> = {
      agua: empty(),
      restaurante: empty(),
      lavagem: empty(),
      transporte: empty(),
      geral: empty(),
    };
    const expense: Record<string, Record<string, number>> = {
      agua: empty(),
      restaurante: empty(),
      lavagem: empty(),
      transporte: empty(),
      geral: empty(),
    };

    const add = (bag: Record<string, Record<string, number>>, sector: string, when: string, amount: number) => {
      const key = monthKey(new Date(when));
      if (bag[sector] && key in bag[sector]) bag[sector][key] += amount || 0;
    };

    const entries: Array<{
      sector: string;
      kind: "receita" | "despesa";
      date: string;
      description: string;
      amount: number;
      status: string;
    }> = [];

    for (const s of sales.data || []) {
      add(revenue, "agua", s.created_at, s.total || 0);
      entries.push({
        sector: "agua",
        kind: "receita",
        date: s.created_at,
        description: `Venda de água${s.client_name ? ` — ${s.client_name}` : ""}`,
        amount: s.total || 0,
        status: s.status || "—",
      });
    }
    for (const o of orders.data || []) {
      add(revenue, "restaurante", o.created_at, o.total || 0);
      entries.push({
        sector: "restaurante",
        kind: "receita",
        date: o.created_at,
        description: "Pedido no restaurante",
        amount: o.total || 0,
        status: o.status || "—",
      });
    }
    for (const w of wash.data || []) {
      if (w.status === "Cancelado") continue;
      add(revenue, "lavagem", w.created_at, w.total || 0);
      entries.push({
        sector: "lavagem",
        kind: "receita",
        date: w.created_at,
        description: `Lavagem — ${w.car_description}`,
        amount: w.total || 0,
        status: w.status || "—",
      });
    }
    const activeContracts = (contracts.data || []).filter((c) => c.status === "Activo");
    for (const m of months) {
      for (const c of activeContracts) {
        revenue["transporte"]![m] = (revenue["transporte"]![m] || 0) + (c.monthly_fee || 0);
      }
    }
    for (const c of activeContracts) {
      entries.push({
        sector: "transporte",
        kind: "receita",
        date: new Date().toISOString(),
        description: `Mensalidade — ${c.school_name}`,
        amount: c.monthly_fee || 0,
        status: "Activo",
      });
    }
    for (const e of expenses.data || []) {
      add(expense, e.sector, e.expense_date, e.amount || 0);
      entries.push({
        sector: e.sector,
        kind: "despesa",
        date: e.expense_date,
        description: e.description,
        amount: e.amount || 0,
        status: e.status,
      });
    }

    entries.sort((a, b) => (a.date < b.date ? 1 : -1));

    const sectors = Object.keys(SECTOR_LABELS).map((slug) => {
      const rev = months.reduce((s, m) => s + (revenue[slug]?.[m] || 0), 0);
      const exp = months.reduce((s, m) => s + (expense[slug]?.[m] || 0), 0);
      const current = months[months.length - 1]!;
      return {
        slug,
        label: SECTOR_LABELS[slug]!,
        revenue: rev,
        expense: exp,
        balance: rev - exp,
        monthRevenue: revenue[slug]?.[current] || 0,
        monthExpense: expense[slug]?.[current] || 0,
        series: months.map((m) => ({
          month: m.slice(5) + "/" + m.slice(2, 4),
          receitas: revenue[slug]?.[m] || 0,
          despesas: expense[slug]?.[m] || 0,
          saldo: (revenue[slug]?.[m] || 0) - (expense[slug]?.[m] || 0),
        })),
      };
    });

    return {
      sectors,
      entries: entries.slice(0, 400),
      totals: {
        revenue: sectors.reduce((s, x) => s + x.revenue, 0),
        expense: sectors.reduce((s, x) => s + x.expense, 0),
        balance: sectors.reduce((s, x) => s + x.balance, 0),
      },
    };
  });
