import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { VehiclesManager } from "@/components/VehiclesManager";

export const Route = createFileRoute("/_authenticated/logistics/vehicles")({
  head: () => ({
    meta: [
      { title: "Fleet Vehicles | Logistics" },
      { name: "description", content: "Manage the vehicle fleet, capacity, status and default drivers." },
      { property: "og:title", content: "Fleet Vehicles | Logistics" },
      { property: "og:description", content: "Manage vehicles, capacity and availability." },
    ],
  }),
  component: () => (
    <AppShell area="logistics" title="Vehicles" description="Fleet inventory and availability">
      <VehiclesManager />
    </AppShell>
  ),
});
