import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataState, EmptyState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchAssignments, qk, updateAssignmentStatus, updateRequestStatus } from "@/lib/api";
import { friendlyError } from "@/lib/rules";
import type { AssignmentStatus } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/logistics/assignments")({
  head: () => ({
    meta: [
      { title: "Vehicle Assignments | Logistics" },
      { name: "description", content: "Track live vehicle assignments and update trip progress to completion." },
      { property: "og:title", content: "Vehicle Assignments | Logistics" },
      { property: "og:description", content: "Track and update live vehicle assignments." },
    ],
  }),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const queryClient = useQueryClient();
  const assignments = useQuery({ queryKey: qk.assignments, queryFn: fetchAssignments });

  const setStatus = useMutation({
    mutationFn: async (input: { id: string; requestId: string; status: AssignmentStatus }) => {
      await updateAssignmentStatus(input.id, input.status);
      if (input.status === "in_progress") await updateRequestStatus(input.requestId, { status: "in_progress" });
      if (input.status === "completed") {
        await updateRequestStatus(input.requestId, { status: "completed", completed_at: new Date().toISOString() });
      }
    },
    onSuccess: () => {
      toast.success("Assignment updated");
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const rows = assignments.data ?? [];

  return (
    <AppShell area="logistics" title="Assignments" description="Live vehicle and driver allocations">
      <DataState
        isLoading={assignments.isLoading}
        error={assignments.error}
        isEmpty={rows.length === 0}
        onRetry={() => void assignments.refetch()}
        empty={<EmptyState icon={ClipboardCheck} title="No assignments yet" description="Approve a request and assign a vehicle." />}
      >
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.transport_requests?.request_number ?? "—"}</TableCell>
                  <TableCell>{a.vehicles?.plate_number ?? "—"}</TableCell>
                  <TableCell>{a.drivers?.full_name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {format(parseISO(a.departure_datetime), "dd MMM yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    {a.status === "assigned" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setStatus.mutate({ id: a.id, requestId: a.transport_request_id, status: "in_progress" })
                        }
                      >
                        Start trip
                      </Button>
                    ) : null}
                    {a.status === "in_progress" || a.status === "assigned" ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          setStatus.mutate({ id: a.id, requestId: a.transport_request_id, status: "completed" })
                        }
                      >
                        Complete
                      </Button>
                    ) : null}
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
