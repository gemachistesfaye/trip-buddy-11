import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Clock, CheckCircle2, Truck, FilePlus2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { DataState, EmptyState } from "@/components/DataState";
import { RequestsTable } from "@/components/RequestsTable";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyRequests, qk } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/department/dashboard")({
  head: () => ({
    meta: [
      { title: "Department Dashboard | Transport Management" },
      { name: "description", content: "Track your department's transport requests, approvals and assigned vehicles." },
      { property: "og:title", content: "Department Dashboard | Transport Management" },
      { property: "og:description", content: "Track your department's transport requests and assignments." },
    ],
  }),
  component: DepartmentDashboard,
});

function DepartmentDashboard() {
  const { profile } = useAuth();
  const query = useQuery({
    queryKey: qk.requests(`dept-${profile?.id ?? "none"}`),
    queryFn: () => fetchMyRequests(profile?.id ?? null, profile?.department_id ?? null),
    enabled: !!profile,
  });

  const requests = query.data ?? [];
  const pending = requests.filter((r) => ["submitted", "under_review"].includes(r.status)).length;
  const approved = requests.filter((r) => r.status === "approved").length;
  const assigned = requests.filter((r) => ["assigned", "in_progress"].includes(r.status)).length;

  return (
    <AppShell
      area="department"
      title="Department Dashboard"
      description={profile?.department_name ?? "Your transport activity"}
      actions={
        <Button asChild size="sm">
          <Link to="/department/new-request">
            <FilePlus2 className="mr-2 size-4" /> New request
          </Link>
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total requests" value={requests.length} icon={ClipboardList} loading={query.isLoading} />
        <StatCard label="Pending review" value={pending} icon={Clock} tone="warning" loading={query.isLoading} />
        <StatCard label="Approved" value={approved} icon={CheckCircle2} tone="success" loading={query.isLoading} />
        <StatCard label="Vehicle assigned" value={assigned} icon={Truck} tone="primary" loading={query.isLoading} />
      </div>

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent requests</h2>
        <DataState
          isLoading={query.isLoading}
          error={query.error}
          isEmpty={requests.length === 0}
          onRetry={() => void query.refetch()}
          empty={
            <EmptyState
              title="No requests yet"
              description="Submit your first daily or weekly transport request."
              action={
                <Button asChild size="sm">
                  <Link to="/department/new-request">New request</Link>
                </Button>
              }
            />
          }
        >
          <RequestsTable requests={requests.slice(0, 8)} area="department" />
        </DataState>
      </section>
    </AppShell>
  );
}
