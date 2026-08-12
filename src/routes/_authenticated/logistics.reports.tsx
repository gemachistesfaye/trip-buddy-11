import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, subMonths } from "date-fns";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { DataState } from "@/components/DataState";
import { fetchAssignments, fetchRequests, qk } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/logistics/reports")({
  head: () => ({
    meta: [
      { title: "Transport Reports | Logistics" },
      { name: "description", content: "Trip frequency by department, request status mix and fleet utilisation reports." },
      { property: "og:title", content: "Transport Reports | Logistics" },
      { property: "og:description", content: "Trip frequency, status mix and fleet utilisation." },
    ],
  }),
  component: ReportsPage,
});

const COLORS = ["#2563eb", "#0ea5e9", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

function count<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function ReportsPage() {
  const requests = useQuery({ queryKey: qk.requests("all"), queryFn: fetchRequests });
  const assignments = useQuery({ queryKey: qk.assignments, queryFn: fetchAssignments });

  const all = requests.data ?? [];
  const recent = all.filter((r) => {
    try {
      return parseISO(r.created_at) >= subMonths(new Date(), 6);
    } catch {
      return false;
    }
  });

  const byDepartment = count(all, (r) => r.departments?.name ?? "Unknown").slice(0, 8);
  const byStatus = count(all, (r) => STATUS_LABELS[r.status] ?? r.status);
  const byMonth = count(recent, (r) => format(parseISO(r.created_at), "MMM yyyy")).reverse();
  const byVehicle = count(assignments.data ?? [], (a) => a.vehicles?.plate_number ?? "Unknown").slice(0, 8);

  const completed = all.filter((r) => r.status === "completed").length;
  const rejected = all.filter((r) => r.status === "rejected").length;

  return (
    <AppShell area="logistics" title="Reports" description="Request volume, status mix and fleet utilisation">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total requests" value={all.length} loading={requests.isLoading} />
        <StatCard label="Completed trips" value={completed} tone="success" loading={requests.isLoading} />
        <StatCard label="Rejected" value={rejected} tone="destructive" loading={requests.isLoading} />
        <StatCard label="Assignments" value={(assignments.data ?? []).length} tone="primary" loading={assignments.isLoading} />
      </div>

      <DataState isLoading={requests.isLoading} error={requests.error} onRetry={() => void requests.refetch()}>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requests per department</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={90} label>
                    {byStatus.map((entry, i) => (
                      <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requests per month</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trips per vehicle</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byVehicle} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </DataState>
    </AppShell>
  );
}
