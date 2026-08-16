import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { CheckCheck, Download } from "lucide-react";
import { exportRequestsCsv } from "@/lib/export";
import { DataState, EmptyState } from "@/components/DataState";
import { RequestsTable } from "@/components/RequestsTable";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bulkApprove, fetchDepartments, fetchRequests, qk } from "@/lib/api";
import { friendlyError } from "@/lib/rules";
import { REQUEST_STATUSES, STATUS_LABELS } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/logistics/requests/")({
  head: () => ({
    meta: [
      { title: "Transport Requests | Logistics" },
      { name: "description", content: "Review, approve and assign every transport request across departments." },
      { property: "og:title", content: "Transport Requests | Logistics" },
      { property: "og:description", content: "Review and assign requests across departments." },
    ],
  }),
  component: LogisticsRequests,
});

function LogisticsRequests() {
  const [status, setStatus] = useState("all");
  const [dept, setDept] = useState("all");
  const [term, setTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const requests = useQuery({ queryKey: qk.requests("all"), queryFn: fetchRequests });
  const departments = useQuery({ queryKey: qk.departments, queryFn: fetchDepartments });

  const approveMany = useMutation({
    mutationFn: () => bulkApprove(selectedIds),
    onSuccess: () => {
      toast.success(`${selectedIds.length} request${selectedIds.length === 1 ? "" : "s"} approved`);
      setSelectedIds([]);
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const canBulkApprove = (status: string) => status === "submitted" || status === "under_review";

  const filtered = (requests.data ?? []).filter((r) => {
    const matchStatus = status === "all" || r.status === status;
    const matchDept = dept === "all" || r.requesting_department_id === dept;
    const haystack = `${r.request_number} ${r.destination ?? ""} ${r.departments?.name ?? ""}`.toLowerCase();
    return matchStatus && matchDept && haystack.includes(term.trim().toLowerCase());
  });

  return (
    <AppShell
      area="logistics"
      title="Transport Requests"
      description="Review, approve and assign requests"
      actions={
        <>
          <Input
            placeholder="Search number, destination, department"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-full sm:w-72"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {REQUEST_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => exportRequestsCsv(filtered, "transport-requests")}>
            <Download className="mr-2 size-4" /> Export CSV
          </Button>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {(departments.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
    >
      <DataState
        isLoading={requests.isLoading}
        error={requests.error}
        isEmpty={filtered.length === 0}
        onRetry={() => void requests.refetch()}
        empty={<EmptyState title="No matching requests" description="Try a different status or department filter." />}
      >
        <>
          {selectedIds.length ? (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
              <p className="text-sm font-medium">
                {selectedIds.length} request{selectedIds.length === 1 ? "" : "s"} selected
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
                <Button size="sm" onClick={() => approveMany.mutate()} disabled={approveMany.isPending}>
                  <CheckCheck className="mr-2 size-4" /> Approve selected
                </Button>
              </div>
            </div>
          ) : null}
          <RequestsTable
            requests={filtered}
            area="logistics"
            showDepartment
            selectable
            selectedIds={selectedIds}
            isSelectable={(r) => canBulkApprove(r.status)}
            onToggle={(id) =>
              setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
            }
            onToggleAll={(checked) =>
              setSelectedIds(checked ? filtered.filter((r) => canBulkApprove(r.status)).map((r) => r.id) : [])
            }
          />
        </>
      </DataState>
    </AppShell>
  );
}
