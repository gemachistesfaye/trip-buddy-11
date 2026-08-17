import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { RequestTimeline } from "@/components/RequestTimeline";
import logoUrl from "@/assets/vf-logo.png";
import { fetchApprovals, qk } from "@/lib/api";
import { APPROVAL_ACTION_LABELS, STATUS_LABELS, type RequestDay, type TransportRequest } from "@/lib/domain";

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

function t(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "—";
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm">{value ?? "—"}</p>
    </div>
  );
}

function SignatureLine({ role, name, at }: { role: string; name: string | null; at: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{role}</p>
      <p className="mt-3 border-b border-dashed pb-1 text-sm italic">{name?.trim() || "\u00a0"}</p>
      <p className="mt-1 text-xs text-muted-foreground">{at ? fmtDateTime(at) : "Date: ______________"}</p>
    </div>
  );
}

export function RequestDetailCards({ request, days }: { request: TransportRequest; days: RequestDay[] }) {
  const assignments = request.transport_assignments ?? [];
  const approvals = useQuery({ queryKey: qk.approvals(request.id), queryFn: () => fetchApprovals(request.id) });

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
          <Field label="Departure time" value={t(request.preferred_departure_time)} />
          <Field label="Return time" value={t(request.estimated_return_time)} />
          <Field label="Purpose" value={request.purpose} />
          <Field label="Goods carried" value={request.goods_carried} />
          <Field label="Remarks" value={request.remarks} />
          {request.is_short_notice ? (
            <Field
              label="Short-notice exception"
              value={<span className="text-warning">{request.short_notice_reason ?? "Approved outside the notice window"}</span>}
            />
          ) : null}
          {request.rejection_reason ? (
            <Field label="Rejection reason" value={<span className="text-destructive">{request.rejection_reason}</span>} />
          ) : null}
        </CardContent>
      </Card>

      {days.length ? (
        <Card className="print-block">
          <CardHeader>
            <CardTitle className="text-base">Weekly schedule (Monday – Saturday)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 sm:p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Morning (out / back / pax)</TableHead>
                  <TableHead>Afternoon (out / back / pax)</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Goods</TableHead>
                  <TableHead>Vehicle / Driver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap">
                      {(() => {
                        try {
                          return format(parseISO(d.trip_date), "EEE dd MMM");
                        } catch {
                          return d.trip_date;
                        }
                      })()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {d.morning_requested
                        ? `${t(d.morning_departure_time ?? d.departure_time)} – ${t(d.morning_return_time ?? d.return_time)} · ${d.morning_passengers ?? d.number_of_passengers ?? "—"} pax`
                        : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {d.afternoon_requested
                        ? `${t(d.afternoon_departure_time ?? d.departure_time)} – ${t(d.afternoon_return_time ?? d.return_time)} · ${d.afternoon_passengers ?? d.number_of_passengers ?? "—"} pax`
                        : "—"}
                    </TableCell>
                    <TableCell>{d.destination ?? "—"}</TableCell>
                    <TableCell className="max-w-48 truncate">{d.purpose ?? "—"}</TableCell>
                    <TableCell className="max-w-40 truncate">{d.goods_carried ?? "—"}</TableCell>
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
            <CardTitle className="text-base">Vehicle assignment (for Logistics use)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignments.map((a) => (
              <div key={a.id} className="grid gap-4 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Plate number" value={`${a.vehicles?.plate_number ?? "—"} · ${a.vehicles?.vehicle_type ?? ""}`} />
                <Field label="Driver name" value={a.drivers?.full_name} />
                <Field label="Driver contact" value={a.drivers?.phone} />
                <Field label="Status" value={<StatusBadge status={a.status} />} />
                <Field label="Departure" value={fmtDateTime(a.departure_datetime)} />
                <Field label="Expected return" value={fmtDateTime(a.expected_return_datetime)} />
                <Field label="Actual departure" value={fmtDateTime(a.actual_departure_datetime)} />
                <Field label="Actual return" value={fmtDateTime(a.actual_return_datetime)} />
                <Field label="Odometer" value={`${a.odometer_start ?? "—"} → ${a.odometer_end ?? "—"}`} />
                <Field label="Notes" value={a.notes} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="print-block">
        <CardHeader>
          <CardTitle className="text-base">Approval &amp; signatures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-3">
            <SignatureLine
              role="Requested by (Department)"
              name={request.requester_signature ?? request.profiles?.full_name ?? null}
              at={request.requester_signed_at}
            />
            <SignatureLine role="Approved by (Logistics Officer)" name={request.approver_signature} at={request.approved_at} />
            <SignatureLine
              role="Received by (Driver)"
              name={assignments[0]?.drivers?.full_name ?? null}
              at={assignments[0]?.actual_departure_datetime ?? null}
            />
          </div>

          {approvals.data?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Signature</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.data.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap">{fmtDateTime(a.created_at)}</TableCell>
                      <TableCell>{APPROVAL_ACTION_LABELS[a.action] ?? a.action}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {a.actor_name || "—"}
                        <span className="block text-xs text-muted-foreground">{STATUS_LABELS[a.actor_role] ?? a.actor_role}</span>
                      </TableCell>
                      <TableCell className="italic">{a.signature_name ?? "—"}</TableCell>
                      <TableCell className="max-w-64 break-words">{a.comment ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No signed actions recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
