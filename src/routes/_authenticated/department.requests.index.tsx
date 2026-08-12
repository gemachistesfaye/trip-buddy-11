import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DataState, EmptyState } from "@/components/DataState";
import { RequestsTable } from "@/components/RequestsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyRequests, qk } from "@/lib/api";
import { REQUEST_STATUSES, STATUS_LABELS } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/department/requests/")({
  head: () => ({
    meta: [
      { title: "My Transport Requests | Transport Management" },
      { name: "description", content: "Search and filter every transport request submitted by your department." },
      { property: "og:title", content: "My Transport Requests" },
      { property: "og:description", content: "Search and filter your department's transport requests." },
    ],
  }),
  component: MyRequests,
});

function MyRequests() {
  const { profile } = useAuth();
  const [status, setStatus] = useState("all");
  const [term, setTerm] = useState("");

  const query = useQuery({
    queryKey: qk.requests(`dept-${profile?.id ?? "none"}`),
    queryFn: () => fetchMyRequests(profile?.id ?? null, profile?.department_id ?? null),
    enabled: !!profile,
  });

  const filtered = (query.data ?? []).filter((r) => {
    const matchStatus = status === "all" || r.status === status;
    const haystack = `${r.request_number} ${r.destination ?? ""} ${r.purpose ?? ""}`.toLowerCase();
    return matchStatus && haystack.includes(term.trim().toLowerCase());
  });

  return (
    <AppShell
      area="department"
      title="My Requests"
      description="All transport requests raised by your department"
      actions={
        <>
          <Input
            placeholder="Search number, destination, purpose"
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
          <Button asChild size="sm" className="ml-auto">
            <Link to="/department/new-request">
              <FilePlus2 className="mr-2 size-4" /> New request
            </Link>
          </Button>
        </>
      }
    >
      <DataState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={filtered.length === 0}
        onRetry={() => void query.refetch()}
        empty={<EmptyState title="No matching requests" description="Adjust the filters or submit a new request." />}
      >
        <RequestsTable requests={filtered} area="department" />
      </DataState>
    </AppShell>
  );
}
