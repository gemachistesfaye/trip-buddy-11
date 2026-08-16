import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CopyPlus, Printer } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { DataState, EmptyState } from "@/components/DataState";
import { RequestDetailCards } from "@/components/RequestDetailCards";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { fetchRequest, fetchRequestDays, qk, repeatRequest, updateRequestStatus } from "@/lib/api";
import { canCancel, friendlyError } from "@/lib/rules";

export const Route = createFileRoute("/_authenticated/department/requests/$id")({
  head: () => ({
    meta: [
      { title: "Request Details | Transport Management" },
      { name: "description", content: "Full details, approval progress and vehicle assignment for a transport request." },
      { property: "og:title", content: "Request Details | Transport Management" },
      { property: "og:description", content: "Progress and assignment details for your transport request." },
    ],
  }),
  component: RequestDetail,
});

function RequestDetail() {
  const { id } = useParams({ from: "/_authenticated/department/requests/$id" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const request = useQuery({ queryKey: qk.request(id), queryFn: () => fetchRequest(id) });
  const days = useQuery({ queryKey: ["request-days", id], queryFn: () => fetchRequestDays(id) });

  const cancel = useMutation({
    mutationFn: () => updateRequestStatus(id, { status: "cancelled" }),
    onSuccess: () => {
      toast.success("Request cancelled");
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const repeat = useMutation({
    mutationFn: async (offsetDays: number) => {
      if (!request.data) throw new Error("Request not loaded");
      return repeatRequest(request.data, offsetDays);
    },
    onSuccess: (created) => {
      toast.success("New request submitted from this one");
      void queryClient.invalidateQueries();
      void navigate({ to: "/department/requests/$id", params: { id: created.id } });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const data = request.data;

  return (
    <AppShell
      area="department"
      title="Request Details"
      description={data?.request_number}
      actions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link to="/department/requests">
              <ArrowLeft className="mr-2 size-4" /> Back to requests
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" /> Print / PDF
          </Button>
          {data ? (
            <Button size="sm" variant="outline" onClick={() => repeat.mutate(7)} disabled={repeat.isPending}>
              <CopyPlus className="mr-2 size-4" /> Repeat next week
            </Button>
          ) : null}
          {data && canCancel(data.status) ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={cancel.isPending}>
                  <Ban className="mr-2 size-4" /> Cancel request
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Logistics will be notified. You will need to submit a new request if plans change again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep request</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancel.mutate()}>Cancel request</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </>
      }
    >
      <DataState
        isLoading={request.isLoading}
        error={request.error}
        isEmpty={!data}
        onRetry={() => void request.refetch()}
        empty={<EmptyState title="Request not found" description="It may have been removed or you can't access it." />}
      >
        {data ? <RequestDetailCards request={data} days={days.data ?? []} /> : null}
      </DataState>
    </AppShell>
  );
}
