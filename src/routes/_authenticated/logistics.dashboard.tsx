import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { isToday, parseISO } from "date-fns";
import { ClipboardList, Clock, Truck, Users, CalendarDays } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { DataState, EmptyState } from "@/components/DataState";
import { RequestsTable } from "@/components/RequestsTable";
import { Button } from "@/components/ui/button";
import { fetchAssignments, fetchDrivers, fetchRequests, fetchVehicles, qk } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/logistics/dashboard")({
  head: () => ({
    meta: [
      { title: "Logistics Dashboard | Transport Management" },
      { name: "description", content: "Pending approvals, fleet availability and today's trips at a glance." },
      { property: "og:title", content: "Logistics Dashboard | Transport Management" },
      { property: "og:description", content: "Pending approvals, fleet availability and today's trips." },
    ],
  }),
  component: LogisticsDashboard,
});

function LogisticsDashboard() {
  const requests = useQuery({ queryKey: qk.requests("all"), queryFn: fetchRequests });
  const vehicles = useQuery({ queryKey: qk.vehicles, queryFn: fetchVehicles });
  const drivers = useQuery({ queryKey: qk.drivers, queryFn: fetchDrivers });
  const assignments = useQuery({ queryKey: qk.assignments, queryFn: fetchAssignments });

  const all = requests.data ?? [];
  const pending = all.filter((r) => ["submitted", "under_review"].includes(r.status));
  const approvedUnassigned = all.filter((r) => r.status === "approved");
  const availableVehicles = (vehicles.data ?? []).filter((v) => v.current_status === "available").length;
  const availableDrivers = (drivers.data ?? []).filter((d) => d.status === "available").length;
  const todayTrips = (assignments.data ?? []).filter((a) => {
    try {
      return isToday(parseISO(a.departure_datetime));
    } catch {
      return false;
    }
  });

  return (
    <AppShell
      area="logistics"
      title="Logistics Dashboard"
      description="Approvals, fleet availability and today's trips"
      actions={
        <>
          <Button asChild size="sm">
            <Link to="/logistics/requests">Review requests</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/logistics/schedule">
              <CalendarDays className="mr-2 size-4" /> Schedule
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Pending review" value={pending.length} icon={Clock} tone="warning" loading={requests.isLoading} />
        <StatCard
          label="Awaiting assignment"
          value={approvedUnassigned.length}
          icon={ClipboardList}
          tone="primary"
          loading={requests.isLoading}
        />
        <StatCard label="Trips today" value={todayTrips.length} icon={CalendarDays} loading={assignments.isLoading} />
        <StatCard label="Vehicles available" value={availableVehicles} icon={Truck} tone="success" loading={vehicles.isLoading} />
        <StatCard label="Drivers available" value={availableDrivers} icon={Users} tone="success" loading={drivers.isLoading} />
      </div>

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Requests needing action</h2>
        <DataState
          isLoading={requests.isLoading}
          error={requests.error}
          isEmpty={pending.length + approvedUnassigned.length === 0}
          onRetry={() => void requests.refetch()}
          empty={<EmptyState title="Nothing waiting" description="All submitted requests have been handled." />}
        >
          <RequestsTable requests={[...pending, ...approvedUnassigned].slice(0, 10)} area="logistics" showDepartment />
        </DataState>
      </section>
    </AppShell>
  );
}
