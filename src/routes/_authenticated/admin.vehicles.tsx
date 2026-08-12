import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { VehiclesManager } from "@/components/VehiclesManager";

export const Route = createFileRoute("/_authenticated/admin/vehicles")({
  head: () => ({
    meta: [
      { title: "Vehicles | Administration" },
      { name: "description", content: "Administer the organisation's vehicle fleet records." },
      { property: "og:title", content: "Vehicles | Administration" },
      { property: "og:description", content: "Administer vehicle fleet records." },
    ],
  }),
  component: () => (
    <AppShell area="admin" title="Vehicles" description="Fleet records">
      <VehiclesManager />
    </AppShell>
  ),
});
