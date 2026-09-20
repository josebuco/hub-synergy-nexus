import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SECTOR_LABELS: Record<string, string> = {
  agua: "Água",
  restaurante: "Restaurante",
  lavagem: "Lavagem",
  transporte: "Transporte Escolar",
  geral: "Geral / Administração",
};

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export const getFinance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        from: z.string().min(8),
        to: z.string().min(8),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const fromDate = new Date(`${data.from}T00:00:00`);
    const toDate = new Date(`${data.to}T23:59:59`);
    const fromIso = fromDate.toISOString();
    const toIso = toDate.toISOString();
    const spanDays = Math.max(
      1,
      Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1,
    );
    const granularity: "day" | "month" = spanDays <= 62 ? "day" : "month";

    const [sales, orders, wash, contracts, expenses] = await Promise.all([
      context.supabase
        .from("water_sales")
        .select("total, created_at, client_name, status")
        .gte("created_at", fromIso)
        .lte("created_at", toIso),
      context.supabase
        .from("restaurant_orders")
        .select("total, created_at, status")
        .gte("created_at", fromIso)
        .lte("created_at", toIso),
      context.supabase
        .from("wash_queue")
        .select("total, created_at, status, car_description")
        .gte("created_at", fromIso)
        .lte("created_at", toIso),
      context.supabase.from("school_contracts").select("monthly_fee, status, school_name, created_at"),
      context.supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", data.from)
        .lte("expense_date", data.to),
    ]);

    // build buckets
    const buckets: string[] = [];
    if (granularity === "day") {
      const cursor = new Date(fromDate);
      while (cursor <= toDate) {
        buckets.push(dayKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
      while (cursor <= toDate) {
        buckets.push(monthKey(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    const keyOf = (when: string | Date) => {
      const d = typeof when === "string" ? new Date(when.length <= 10 ? `${when}T00:00:00` : when) : when;
      return granularity === "day" ? dayKey(d) : monthKey(d);
    };

    const empty = () => Object.fromEntries(buckets.map((m) => [m, 0])) as Record<string, number>;
    const slugs = Object.keys(SECTOR_LABELS);
    const revenue: Record<string, Record<string, number>> = Object.fromEntries(
      slugs.map((s) => [s, empty()]),
    );
    const expense: Record<string, Record<string, number>> = Object.fromEntries(
      slugs.map((s) => [s, empty()]),
    );

    const add = (
      bag: Record<string, Record<string, number>>,
      sector: string,
      when: string,
      amount: number,
    ) => {
      const key = keyOf(when);
      const bucket = bag[sector];
      if (bucket && key in bucket) bucket[key] = (bucket[key] || 0) + (amount || 0);
    };

    const entries: Array<{
      sector: string;
      kind: "receita" | "despesa";
      date: string;
      description: string;
      amount: number;
      status: string;
      category?: string;
      invoice_path?: string | null;
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
      if (o.status === "Cancelado") continue;
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

    // Transport: monthly fees spread over the period
    const activeContracts = (contracts.data || []).filter((c) => c.status === "Activo");
    const monthlyTotal = activeContracts.reduce((s, c) => s + (c.monthly_fee || 0), 0);
    if (granularity === "month") {
      for (const m of buckets) revenue["transporte"]![m] = monthlyTotal;
    } else {
      const perDay = Math.round(monthlyTotal / 30);
      for (const d of buckets) revenue["transporte"]![d] = perDay;
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
        category: e.category,
        invoice_path: e.invoice_path,
      });
    }

    entries.sort((a, b) => (a.date < b.date ? 1 : -1));

    const label = (key: string) =>
      granularity === "day" ? `${key.slice(8)}/${key.slice(5, 7)}` : `${key.slice(5)}/${key.slice(2, 4)}`;

    const sectors = slugs.map((slug) => {
      const rev = buckets.reduce((s, m) => s + (revenue[slug]?.[m] || 0), 0);
      const exp = buckets.reduce((s, m) => s + (expense[slug]?.[m] || 0), 0);
      const sectorEntries = entries.filter((e) => e.sector === slug);
      return {
        slug,
        label: SECTOR_LABELS[slug]!,
        revenue: rev,
        expense: exp,
        balance: rev - exp,
        pendingExpense: sectorEntries
          .filter((e) => e.kind === "despesa" && e.status === "Pendente")
          .reduce((s, e) => s + e.amount, 0),
        series: buckets.map((m) => ({
          month: label(m),
          receitas: revenue[slug]?.[m] || 0,
          despesas: expense[slug]?.[m] || 0,
          saldo: (revenue[slug]?.[m] || 0) - (expense[slug]?.[m] || 0),
        })),
      };
    });

    return {
      granularity,
      range: { from: data.from, to: data.to },
      sectors,
      entries: entries.slice(0, 500),
      totals: {
        revenue: sectors.reduce((s, x) => s + x.revenue, 0),
        expense: sectors.reduce((s, x) => s + x.expense, 0),
        balance: sectors.reduce((s, x) => s + x.balance, 0),
        pendingExpense: sectors.reduce((s, x) => s + x.pendingExpense, 0),
      },
    };
  });
