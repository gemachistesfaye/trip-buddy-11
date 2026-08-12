import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { fetchAssignments, fetchDepartments, fetchDrivers, fetchProfiles, fetchRequests, fetchVehicles, qk } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Administration Dashboard | Transport" },
      { name: "description", content: "Organisation-wide overview of users, departments, fleet and transport activity." },
      { property: "og:title", content: "Administration Dashboard | Transport" },
      { property: "og:description", content: "Overview of users, departments, fleet and activity." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const profiles = useQuery({ queryKey: qk.profiles, queryFn: fetchProfiles });
  const departments = useQuery({ queryKey: qk.departments, queryFn: fetchDepartments });
  const vehicles = useQuery({ queryKey: qk.vehicles, queryFn: fetchVehicles });
  const drivers = useQuery({ queryKey: qk.drivers, queryFn: fetchDrivers });
  const requests = useQuery({ queryKey: qk.requests("all"), queryFn: fetchRequests });
  const assignments = useQuery({ queryKey: qk.assignments, queryFn: fetchAssignments });

  return (
    <AppShell
      area="admin"
      title="Administration"
      description="System overview"
      actions={
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/settings">System settings</Link>
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Users" value={(profiles.data ?? []).length} loading={profiles.isLoading} tone="primary" />
        <StatCard label="Departments" value={(departments.data ?? []).length} loading={departments.isLoading} />
        <StatCard label="Vehicles" value={(vehicles.data ?? []).length} loading={vehicles.isLoading} />
        <StatCard label="Drivers" value={(drivers.data ?? []).length} loading={drivers.isLoading} />
        <StatCard label="Requests" value={(requests.data ?? []).length} loading={requests.isLoading} />
        <StatCard label="Assignments" value={(assignments.data ?? []).length} loading={assignments.isLoading} tone="success" />
      </div>
    </AppShell>
  );
}
