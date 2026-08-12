import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { NotificationsPanel } from "@/components/NotificationsPanel";

export const Route = createFileRoute("/_authenticated/department/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications | Transport Management" },
      { name: "description", content: "Approvals, rejections and vehicle assignment updates for your requests." },
      { property: "og:title", content: "Notifications | Transport Management" },
      { property: "og:description", content: "Updates on your transport requests." },
    ],
  }),
  component: () => (
    <AppShell area="department" title="Notifications" description="Updates on your transport requests">
      <NotificationsPanel />
    </AppShell>
  ),
});
