import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { RequestTimeline } from "@/components/RequestTimeline";
import logoUrl from "@/assets/vf-logo.png";
import type { RequestDay, TransportRequest } from "@/lib/domain";

function fmtDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function fmtDateTime(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy, HH:mm");
  } catch {
    return value;
  }
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm">{value ?? "—"}</p>
    </div>
  );
}

export function RequestDetailCards({ request, days }: { request: TransportRequest; days: RequestDay[] }) {
  const assignments = request.transport_assignments ?? [];

  return (
    <div className="space-y-4">
      <div className="print-only mb-4 border-b pb-3">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="VisionFund logo" width={512} height={512} loading="lazy" className="size-12 object-contain" />
          <div>
            <p className="text-lg font-semibold">VisionFund</p>
            <p className="text-sm">
              {request.request_type === "weekly" ? "Weekly" : "Daily"} Transport Request Form · {request.request_number}
            </p>
            <p className="text-xs">Logistics &amp; Supply Chain Department</p>
          </div>
        </div>
      </div>

      <Card className="no-print">
        <CardContent className="p-4">
          <RequestTimeline status={request.status} />
        </CardContent>
      </Card>

      <Card className="print-block">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">{request.request_number}</CardTitle>
          <div className="flex gap-2">
            <StatusBadge status={request.request_type} />
            <StatusBadge status={request.status} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Department" value={request.departments?.name} />
          <Field label="Requested by" value={request.profiles?.full_name} />
          <Field label="Contact" value={request.contact_number} />
          <Field label="Request date" value={fmtDate(request.request_date)} />
          <Field label="Trip dates" value={`${fmtDate(request.trip_from_date)} → ${fmtDate(request.trip_to_date)}`} />
          <Field label="Passengers" value={request.number_of_passengers} />
          <Field label="Destination" value={request.destination} />
          <Field label="Departure time" value={request.preferred_departure_time?.slice(0, 5)} />
          <Field label="Return time" value={request.estimated_return_time?.slice(0, 5)} />
          <Field label="Purpose" value={request.purpose} />
          <Field label="Goods carried" value={request.goods_carried} />
          <Field label="Remarks" value={request.remarks} />
          {request.rejection_reason ? (
            <Field label="Rejection reason" value={<span className="text-destructive">{request.rejection_reason}</span>} />
          ) : null}
        </CardContent>
      </Card>

      {days.length ? (
        <Card className="print-block">
          <CardHeader>
            <CardTitle className="text-base">Weekly schedule</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 sm:p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Times</TableHead>
                  <TableHead className="text-right">Pax</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Vehicle / Driver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap">{fmtDate(d.trip_date)}</TableCell>
                    <TableCell>
                      {[d.morning_requested ? "Morning" : null, d.afternoon_requested ? "Afternoon" : null]
                        .filter(Boolean)
                        .join(" + ") || "—"}
                    </TableCell>
                    <TableCell>{d.destination ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {(d.departure_time ?? "--:--").slice(0, 5)} – {(d.return_time ?? "--:--").slice(0, 5)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{d.number_of_passengers ?? "—"}</TableCell>
                    <TableCell className="max-w-48 truncate">{d.purpose ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {(() => {
                        const a = assignments.find((x) => x.departure_datetime?.slice(0, 10) === d.trip_date);
                        if (!a) return <span className="text-muted-foreground">Not allocated</span>;
                        return `${a.vehicles?.plate_number ?? "—"} · ${a.drivers?.full_name ?? "—"}`;
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {assignments.length ? (
        <Card className="print-block">
          <CardHeader>
            <CardTitle className="text-base">Vehicle assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignments.map((a) => (
              <div key={a.id} className="grid gap-4 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Vehicle" value={`${a.vehicles?.plate_number ?? "—"} · ${a.vehicles?.vehicle_type ?? ""}`} />
                <Field label="Driver" value={a.drivers?.full_name} />
                <Field label="Driver phone" value={a.drivers?.phone} />
                <Field label="Status" value={<StatusBadge status={a.status} />} />
                <Field label="Departure" value={fmtDateTime(a.departure_datetime)} />
                <Field label="Expected return" value={fmtDateTime(a.expected_return_datetime)} />
                <Field label="Notes" value={a.notes} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
