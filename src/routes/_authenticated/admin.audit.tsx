import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Download, ScrollText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataState, EmptyState } from "@/components/DataState";
import { fetchAuditLogs, fetchProfiles, qk } from "@/lib/api";
import { downloadCsv } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log | Administration" },
      { name: "description", content: "Full trail of who changed requests, assignments, fleet records and system settings." },
      { property: "og:title", content: "Audit Log | Administration" },
      { property: "og:description", content: "Who changed what, and when, across the transport system." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditPage,
});

const ENTITIES = ["transport_requests", "transport_assignments", "vehicles", "drivers", "system_settings"];

function summarise(oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null) {
  if (!newValues) return "Record deleted";
  if (!oldValues) return "Record created";
  const changed = Object.keys(newValues).filter(
    (key) => !["updated_at", "created_at"].includes(key) && JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key]),
  );
  if (!changed.length) return "No field changes";
  return changed
    .slice(0, 4)
    .map((key) => `${key}: ${String(oldValues[key] ?? "—")} → ${String(newValues[key] ?? "—")}`)
    .join("; ");
}

function AuditPage() {
  const [entity, setEntity] = useState("all");
  const [term, setTerm] = useState("");

  const logs = useQuery({ queryKey: ["audit-logs"], queryFn: () => fetchAuditLogs(400) });
  const profiles = useQuery({ queryKey: qk.profiles, queryFn: fetchProfiles });

  const nameFor = useMemo(() => {
    const map = new Map((profiles.data ?? []).map((p) => [p.auth_user_id, p.full_name || p.email]));
    return (userId: string | null) => (userId ? (map.get(userId) ?? "Unknown user") : "System / trigger");
  }, [profiles.data]);

  const rows = (logs.data ?? []).filter((l) => {
    const matchEntity = entity === "all" || l.entity_type === entity;
    const haystack = `${l.entity_type} ${l.action} ${nameFor(l.user_id)}`.toLowerCase();
    return matchEntity && haystack.includes(term.trim().toLowerCase());
  });

  return (
    <AppShell
      area="admin"
      title="Audit Log"
      description="Every change recorded by the system"
      actions={
        <>
          <Input
            placeholder="Search user, table or action"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All records</SelectItem>
              {ENTITIES.map((e) => (
                <SelectItem key={e} value={e}>
                  {e.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadCsv("audit-log", [
                ["When", "User", "Action", "Record", "Change"],
                ...rows.map((l) => [
                  format(parseISO(l.created_at), "yyyy-MM-dd HH:mm"),
                  nameFor(l.user_id),
                  l.action,
                  l.entity_type,
                  summarise(l.old_values, l.new_values),
                ]),
              ])
            }
          >
            <Download className="mr-2 size-4" /> Export CSV
          </Button>
        </>
      }
    >
      <DataState
        isLoading={logs.isLoading}
        error={logs.error}
        isEmpty={rows.length === 0}
        onRetry={() => void logs.refetch()}
        empty={<EmptyState icon={ScrollText} title="No audit entries" description="Changes will appear here as staff use the system." />}
      >
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {format(parseISO(l.created_at), "dd MMM yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{nameFor(l.user_id)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {l.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap capitalize">{l.entity_type.replace(/_/g, " ")}</TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {summarise(l.old_values, l.new_values)}
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
