import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DriversManager } from "@/components/DriversManager";

export const Route = createFileRoute("/_authenticated/logistics/drivers")({
  head: () => ({
    meta: [
      { title: "Drivers | Logistics" },
      { name: "description", content: "Manage driver records, licences, availability and default vehicles." },
      { property: "og:title", content: "Drivers | Logistics" },
      { property: "og:description", content: "Manage driver records and availability." },
    ],
  }),
  component: () => (
    <AppShell area="logistics" title="Drivers" description="Driver records and availability">
      <DriversManager />
    </AppShell>
  ),
});
