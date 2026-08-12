import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addDays, endOfMonth, endOfWeek, format, isWithinInterval, parseISO, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDays } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DataState, EmptyState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchAssignments, qk } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/logistics/schedule")({
  head: () => ({
    meta: [
      { title: "Transport Schedule | Logistics" },
      { name: "description", content: "Daily, weekly and monthly view of scheduled trips, vehicles and drivers." },
      { property: "og:title", content: "Transport Schedule | Logistics" },
      { property: "og:description", content: "Daily, weekly and monthly trip schedule." },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const [range, setRange] = useState("day");
  const assignments = useQuery({ queryKey: qk.assignments, queryFn: fetchAssignments });

  const now = new Date();
  const interval =
    range === "day"
      ? { start: startOfDay(now), end: addDays(startOfDay(now), 1) }
      : range === "week"
        ? { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
        : { start: startOfMonth(now), end: endOfMonth(now) };

  const rows = (assignments.data ?? []).filter((a) => {
    try {
      return isWithinInterval(parseISO(a.departure_datetime), interval);
    } catch {
      return false;
    }
  });

  return (
    <AppShell
      area="logistics"
      title="Transport Schedule"
      description={`${format(interval.start, "dd MMM")} – ${format(interval.end, "dd MMM yyyy")}`}
      actions={
        <Tabs value={range} onValueChange={setRange}>
          <TabsList>
            <TabsTrigger value="day">Today</TabsTrigger>
            <TabsTrigger value="week">This week</TabsTrigger>
            <TabsTrigger value="month">This month</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <DataState
        isLoading={assignments.isLoading}
        error={assignments.error}
        isEmpty={rows.length === 0}
        onRetry={() => void assignments.refetch()}
        empty={<EmptyState icon={CalendarDays} title="No trips scheduled" description="Nothing planned for this period." />}
      >
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Departure</TableHead>
                <TableHead>Return</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap">{format(parseISO(a.departure_datetime), "dd MMM HH:mm")}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {format(parseISO(a.expected_return_datetime), "dd MMM HH:mm")}
                  </TableCell>
                  <TableCell className="font-medium">{a.transport_requests?.request_number ?? "—"}</TableCell>
                  <TableCell>{a.transport_requests?.departments?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-40 truncate">{a.transport_requests?.destination ?? "—"}</TableCell>
                  <TableCell>{a.vehicles?.plate_number ?? "—"}</TableCell>
                  <TableCell>{a.drivers?.full_name ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataState>
    </AppShell>
  );
}
