import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday, parseISO } from "date-fns";
import { CalendarDays, MapPin, Users2, Gauge } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DataState, EmptyState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { completeTrip, fetchDriverAssignments, fetchDriverByUser, startTrip } from "@/lib/api";
import { friendlyError } from "@/lib/rules";
import type { Assignment } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/driver/trips")({
  head: () => ({
    meta: [
      { title: "My Trips | Driver" },
      { name: "description", content: "Your assigned trips for the day with departure, return and odometer confirmation." },
      { property: "og:title", content: "My Trips | Driver" },
      { property: "og:description", content: "See today's trips and confirm departure and return." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DriverTrips,
});

function CompleteDialog({ assignment }: { assignment: Assignment }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [odoStart, setOdoStart] = useState(assignment.odometer_start?.toString() ?? "");
  const [odoEnd, setOdoEnd] = useState("");
  const [returnedAt, setReturnedAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  const mutation = useMutation({
    mutationFn: () =>
      completeTrip({
        id: assignment.id,
        requestId: assignment.transport_request_id,
        actual_departure_datetime: assignment.actual_departure_datetime,
        actual_return_datetime: new Date(returnedAt).toISOString(),
        odometer_start: odoStart ? Number(odoStart) : null,
        odometer_end: odoEnd ? Number(odoEnd) : null,
      }),
    onSuccess: () => {
      toast.success("Trip confirmed as completed");
      setOpen(false);
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full sm:w-auto">
          Confirm return
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm trip completion</DialogTitle>
          <DialogDescription>
            Record what actually happened. Reports use these values instead of the planned times.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="returned">Actual return time</Label>
            <Input id="returned" type="datetime-local" value={returnedAt} onChange={(e) => setReturnedAt(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="odo-start">Odometer out (km)</Label>
              <Input id="odo-start" inputMode="numeric" value={odoStart} onChange={(e) => setOdoStart(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="odo-end">Odometer in (km)</Label>
              <Input id="odo-end" inputMode="numeric" value={odoEnd} onChange={(e) => setOdoEnd(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Complete trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TripCard({ assignment }: { assignment: Assignment }) {
  const queryClient = useQueryClient();
  const request = assignment.transport_requests;

  const start = useMutation({
    mutationFn: () => startTrip(assignment.id, assignment.transport_request_id, assignment.odometer_start),
    onSuccess: () => {
      toast.success("Departure recorded");
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{request?.request_number ?? "Trip"}</CardTitle>
          <StatusBadge status={assignment.status} />
        </div>
        <p className="text-sm text-muted-foreground">{request?.departments?.name ?? "—"}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-medium">{request?.destination ?? "See request"}</span>
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" />
          {format(parseISO(assignment.departure_datetime), "EEE dd MMM · HH:mm")} →{" "}
          {format(parseISO(assignment.expected_return_datetime), "HH:mm")}
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Users2 className="size-4 shrink-0" />
          {request?.number_of_passengers ?? "—"} passengers · {assignment.vehicles?.plate_number ?? "—"}
        </p>
        {assignment.odometer_start ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Gauge className="size-4 shrink-0" />
            Odometer out: {assignment.odometer_start} km
          </p>
        ) : null}
        {assignment.status !== "completed" && assignment.status !== "cancelled" ? (
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            {assignment.status === "assigned" ? (
              <Button size="sm" variant="outline" onClick={() => start.mutate()} disabled={start.isPending}>
                Confirm departure
              </Button>
            ) : null}
            <CompleteDialog assignment={assignment} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DriverTrips() {
  const { userId } = useAuth();
  const driver = useQuery({
    queryKey: ["driver-self", userId],
    queryFn: () => fetchDriverByUser(userId as string),
    enabled: !!userId,
  });
  const driverId = driver.data?.id ?? null;
  const trips = useQuery({
    queryKey: ["driver-assignments", driverId],
    queryFn: () => fetchDriverAssignments(driverId as string),
    enabled: !!driverId,
  });

  const rows = trips.data ?? [];
  const today = rows.filter((a) => isToday(parseISO(a.departure_datetime)));
  const upcoming = rows.filter(
    (a) => !isToday(parseISO(a.departure_datetime)) && parseISO(a.departure_datetime) > new Date(),
  );

  return (
    <AppShell area="driver" title="My Trips" description={driver.data?.full_name ?? "Driver schedule"}>
      <DataState
        isLoading={driver.isLoading || trips.isLoading}
        error={driver.error ?? trips.error}
        isEmpty={rows.length === 0}
        onRetry={() => void trips.refetch()}
        empty={<EmptyState icon={CalendarDays} title="No trips assigned" description="Logistics will assign trips to you here." />}
      >
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today</h2>
            {today.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {today.map((a) => (
                  <TripCard key={a.id} assignment={a} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No trips scheduled for today.</p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Upcoming</h2>
            {upcoming.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {upcoming.map((a) => (
                  <TripCard key={a.id} assignment={a} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
            )}
          </section>
        </div>
      </DataState>
    </AppShell>
  );
}
