import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Printer, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataState, EmptyState } from "@/components/DataState";
import { RequestDetailCards } from "@/components/RequestDetailCards";
import { useAuth } from "@/hooks/useAuth";
import {
  addApproval,
  approveRequest,
  createAssignment,
  rejectRequest,
  fetchDrivers,
  fetchRequest,
  fetchRequestDays,
  fetchVehicles,
  qk,
  updateRequestStatus,
} from "@/lib/api";
import { friendlyError } from "@/lib/rules";

export const Route = createFileRoute("/_authenticated/logistics/requests/$id")({
  head: () => ({
    meta: [
      { title: "Review Request | Logistics" },
      { name: "description", content: "Approve, reject or assign a vehicle and driver to a transport request." },
      { property: "og:title", content: "Review Request | Logistics" },
      { property: "og:description", content: "Approve, reject or assign a vehicle and driver." },
    ],
  }),
  component: ReviewRequest,
});

function ReviewRequest() {
  const { id } = useParams({ from: "/_authenticated/logistics/requests/$id" });
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const request = useQuery({ queryKey: qk.request(id), queryFn: () => fetchRequest(id) });
  const days = useQuery({ queryKey: ["request-days", id], queryFn: () => fetchRequestDays(id) });
  const vehicles = useQuery({ queryKey: qk.vehicles, queryFn: fetchVehicles });
  const drivers = useQuery({ queryKey: qk.drivers, queryFn: fetchDrivers });

  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [signature, setSignature] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [reason, setReason] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [depart, setDepart] = useState("");
  const [ret, setRet] = useState("");
  const [notes, setNotes] = useState("");

  const data = request.data;

  const setStatus = useMutation({
    mutationFn: async (patch: Parameters<typeof updateRequestStatus>[1]) => {
      await updateRequestStatus(id, patch);
      if (patch.status) await addApproval({ requestId: id, action: patch.status });
    },
    onSuccess: () => {
      toast.success("Request updated");
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const approve = useMutation({
    mutationFn: () => approveRequest(id, signature, approveNote),
    onSuccess: () => {
      toast.success("Request approved and signed");
      setApproveOpen(false);
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const reject = useMutation({
    mutationFn: () => rejectRequest(id, signature, reason),
    onSuccess: () => {
      toast.success("Request rejected");
      setRejectOpen(false);
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const assign = useMutation({
    mutationFn: () =>
      createAssignment({
        transport_request_id: id,
        vehicle_id: vehicleId,
        driver_id: driverId,
        assigned_by: profile?.id ?? null,
        departure_datetime: new Date(depart).toISOString(),
        expected_return_datetime: new Date(ret).toISOString(),
        notes,
      }),
    onSuccess: () => {
      toast.success("Vehicle and driver assigned");
      setAssignOpen(false);
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  function openAssign() {
    const date = data?.trip_from_date ?? new Date().toISOString().slice(0, 10);
    setDepart(`${date}T${(data?.preferred_departure_time ?? "08:00").slice(0, 5)}`);
    setRet(`${data?.trip_to_date ?? date}T${(data?.estimated_return_time ?? "17:00").slice(0, 5)}`);
    setAssignOpen(true);
  }

  const status = data?.status;
  const canReview = status === "submitted" || status === "under_review";
  const canAssign = status === "approved" || status === "assigned";

  return (
    <AppShell
      area="logistics"
      title="Review Request"
      description={data?.request_number ?? undefined}
      actions={
        <>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" /> Print / PDF
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/logistics/requests">
              <ArrowLeft className="mr-2 size-4" /> Back
            </Link>
          </Button>
          {status === "submitted" ? (
            <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ status: "under_review" })}>
              Mark under review
            </Button>
          ) : null}
          {canReview ? (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setSignature(profile?.full_name ?? "");
                  setApproveOpen(true);
                }}
              >
                <Check className="mr-2 size-4" /> Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setSignature(profile?.full_name ?? "");
                  setRejectOpen(true);
                }}
              >
                <X className="mr-2 size-4" /> Reject
              </Button>
            </>
          ) : null}
          {canAssign ? (
            <Button size="sm" onClick={openAssign}>
              <Truck className="mr-2 size-4" /> Assign vehicle
            </Button>
          ) : null}
          {status === "assigned" || status === "in_progress" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatus.mutate({ status: "completed", completed_at: new Date().toISOString() })}
            >
              Mark completed
            </Button>
          ) : null}
        </>
      }
    >
      <DataState
        isLoading={request.isLoading}
        error={request.error}
        isEmpty={!data}
        onRetry={() => void request.refetch()}
        empty={<EmptyState title="Request not found" />}
      >
        {data ? <RequestDetailCards request={data} days={days.data ?? []} /> : null}
      </DataState>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve and sign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="asig">Signature (type your full name)</Label>
              <Input id="asig" value={signature} onChange={(e) => setSignature(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Recorded with your name, role and a timestamp, and printed on the request form.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="anote">Approval note (optional)</Label>
              <Textarea id="anote" value={approveNote} onChange={(e) => setApproveNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!signature.trim() || approve.isPending} onClick={() => approve.mutate()}>
              Approve request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for rejection</Label>
              <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rsig">Signature (type your full name)</Label>
              <Input id="rsig" value={signature} onChange={(e) => setSignature(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || !signature.trim() || reject.isPending}
              onClick={() => reject.mutate()}
            >
              Reject request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign vehicle and driver</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!vehicleId || !driverId) {
                toast.error("Select both a vehicle and a driver.");
                return;
              }
              if (new Date(ret) <= new Date(depart)) {
                toast.error("Expected return must be after departure.");
                return;
              }
              assign.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {(vehicles.data ?? [])
                    .filter((v) => v.is_active && v.current_status !== "maintenance" && v.current_status !== "unavailable")
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate_number} · {v.vehicle_type} · {v.passenger_capacity} seats
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {data?.number_of_passengers ? (
                <p className="text-xs text-muted-foreground">Request needs {data.number_of_passengers} seat(s).</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Driver</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent>
                  {(drivers.data ?? [])
                    .filter((d) => d.is_active && d.status !== "leave" && d.status !== "unavailable")
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dep">Departure</Label>
                <Input id="dep" type="datetime-local" value={depart} onChange={(e) => setDepart(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ret">Expected return</Label>
                <Input id="ret" type="datetime-local" value={ret} onChange={(e) => setRet(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="anotes">Notes</Label>
              <Textarea id="anotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assign.isPending}>
                {assign.isPending ? "Assigning…" : "Confirm assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
