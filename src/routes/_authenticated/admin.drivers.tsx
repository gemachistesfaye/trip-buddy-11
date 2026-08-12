import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DriversManager } from "@/components/DriversManager";

export const Route = createFileRoute("/_authenticated/admin/drivers")({
  head: () => ({
    meta: [
      { title: "Drivers | Administration" },
      { name: "description", content: "Administer driver records, licences and availability." },
      { property: "og:title", content: "Drivers | Administration" },
      { property: "og:description", content: "Administer driver records." },
    ],
  }),
  component: () => (
    <AppShell area="admin" title="Drivers" description="Driver records">
      <DriversManager />
    </AppShell>
  ),
});
