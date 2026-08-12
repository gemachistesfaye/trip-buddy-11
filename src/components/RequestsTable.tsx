import { Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import type { TransportRequest } from "@/lib/domain";

function fmt(date: string | null) {
  if (!date) return "—";
  try {
    return format(parseISO(date), "dd MMM yyyy");
  } catch {
    return date;
  }
}

export function RequestsTable({
  requests,
  area,
  showDepartment = false,
}: {
  requests: TransportRequest[];
  area: "department" | "logistics";
  showDepartment?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request</TableHead>
            {showDepartment ? <TableHead>Department</TableHead> : null}
            <TableHead>Type</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead>Trip dates</TableHead>
            <TableHead className="text-right">Pax</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.request_number}</TableCell>
              {showDepartment ? <TableCell>{r.departments?.name ?? "—"}</TableCell> : null}
              <TableCell>
                <StatusBadge status={r.request_type} />
              </TableCell>
              <TableCell className="max-w-40 truncate">{r.destination ?? "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {fmt(r.trip_from_date)}
                {r.trip_to_date && r.trip_to_date !== r.trip_from_date ? ` → ${fmt(r.trip_to_date)}` : ""}
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.number_of_passengers ?? "—"}</TableCell>
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="outline">
                  {area === "department" ? (
                    <Link to="/department/requests/$id" params={{ id: r.id }}>
                      Open
                    </Link>
                  ) : (
                    <Link to="/logistics/requests/$id" params={{ id: r.id }}>
                      Open
                    </Link>
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
