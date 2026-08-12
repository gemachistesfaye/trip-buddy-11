import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { NotificationsPanel } from "@/components/NotificationsPanel";

export const Route = createFileRoute("/_authenticated/logistics/notifications")({
  head: () => ({
    meta: [
      { title: "Logistics Notifications | Transport Management" },
      { name: "description", content: "New request alerts and operational updates for the logistics team." },
      { property: "og:title", content: "Logistics Notifications" },
      { property: "og:description", content: "New request alerts for the logistics team." },
    ],
  }),
  component: () => (
    <AppShell area="logistics" title="Notifications" description="New requests and operational updates">
      <NotificationsPanel />
    </AppShell>
  ),
});
