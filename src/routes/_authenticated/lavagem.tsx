import { createFileRoute } from "@tanstack/react-router";
import { QuickCashPage } from "@/components/quick-cash";

export const Route = createFileRoute("/_authenticated/lavagem")({
  head: () => ({
    meta: [
      { title: "Lavagem — Kilombwe" },
      { name: "description", content: "Entradas, saídas e saldo automático do setor Lavagem." },
      { property: "og:title", content: "Lavagem — Kilombwe" },
      { property: "og:description", content: "Entradas, saídas e saldo automático do setor Lavagem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <QuickCashPage slug="lavagem" title="Lavagem" dot="bg-wash" accent="bg-wash" />,
});
