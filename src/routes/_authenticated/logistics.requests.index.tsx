import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportRequestsCsv } from "@/lib/export";
import { DataState, EmptyState } from "@/components/DataState";
import { RequestsTable } from "@/components/RequestsTable";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchDepartments, fetchRequests, qk } from "@/lib/api";
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

  const requests = useQuery({ queryKey: qk.requests("all"), queryFn: fetchRequests });
  const departments = useQuery({ queryKey: qk.departments, queryFn: fetchDepartments });

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
        <RequestsTable requests={filtered} area="logistics" showDepartment />
      </DataState>
    </AppShell>
  );
}
