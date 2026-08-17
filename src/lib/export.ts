import { format, parseISO } from "date-fns";
import type { Assignment, Driver, TransportRequest, Vehicle } from "@/lib/domain";

function escapeCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function day(value: string | null | undefined) {
  if (!value) return "";
  try {
    return format(parseISO(value), "yyyy-MM-dd");
  } catch {
    return value;
  }
}

export function requestsToRows(requests: TransportRequest[]) {
  const header = [
    "Request No",
    "Type",
    "Department",
    "Requested by",
    "Contact",
    "Request date",
    "Trip from",
    "Trip to",
    "Destination",
    "Passengers",
    "Departure",
    "Return",
    "Purpose",
    "Goods carried",
    "Status",
    "Vehicle",
    "Driver",
  ];
  const body = requests.map((r) => {
    const a = r.transport_assignments?.[0];
    return [
      r.request_number,
      r.request_type,
      r.departments?.name ?? "",
      r.profiles?.full_name ?? "",
      r.contact_number ?? "",
      day(r.request_date),
      day(r.trip_from_date),
      day(r.trip_to_date),
      r.destination ?? "",
      r.number_of_passengers ?? "",
      r.preferred_departure_time?.slice(0, 5) ?? "",
      r.estimated_return_time?.slice(0, 5) ?? "",
      r.purpose ?? "",
      r.goods_carried ?? "",
      r.status,
      a?.vehicles?.plate_number ?? "",
      a?.drivers?.full_name ?? "",
    ];
  });
  return [header, ...body];
}

export function exportRequestsCsv(requests: TransportRequest[], name = "transport-requests") {
  downloadCsv(`${name}-${format(new Date(), "yyyy-MM-dd")}`, requestsToRows(requests));
}

/** Driver directory in the same shape as the handwritten contact sheet. */
export function exportDriversCsv(drivers: Driver[], vehicles: Vehicle[] = []) {
  const plate = (id: string | null) => vehicles.find((v) => v.id === id)?.plate_number ?? "";
  const rows: (string | number | null)[][] = [
    ["Driver", "Phone", "Licence", "Default vehicle", "Status", "Active", "Notes"],
    ...drivers.map((d) => [
      d.full_name,
      d.phone ?? "",
      d.license_number ?? "",
      plate(d.assigned_vehicle_id),
      d.status,
      d.is_active ? "Yes" : "No",
      d.notes ?? "",
    ]),
  ];
  downloadCsv(`driver-directory-${format(new Date(), "yyyy-MM-dd")}`, rows);
}

/** Full allocation report: which vehicle and driver served which trip. */
export function exportAssignmentsCsv(assignments: Assignment[], name = "vehicle-allocations") {
  const rows: (string | number | null)[][] = [
    [
      "Request No",
      "Department",
      "Destination",
      "Plate number",
      "Vehicle type",
      "Driver",
      "Driver contact",
      "Planned departure",
      "Planned return",
      "Actual departure",
      "Actual return",
      "Odometer start",
      "Odometer end",
      "Distance (km)",
      "Status",
    ],
    ...assignments.map((a) => [
      a.transport_requests?.request_number ?? "",
      a.transport_requests?.departments?.name ?? "",
      a.transport_requests?.destination ?? "",
      a.vehicles?.plate_number ?? "",
      a.vehicles?.vehicle_type ?? "",
      a.drivers?.full_name ?? "",
      a.drivers?.phone ?? "",
      a.departure_datetime,
      a.expected_return_datetime,
      a.actual_departure_datetime ?? "",
      a.actual_return_datetime ?? "",
      a.odometer_start ?? "",
      a.odometer_end ?? "",
      a.odometer_start != null && a.odometer_end != null ? a.odometer_end - a.odometer_start : "",
      a.status,
    ]),
  ];
  downloadCsv(`${name}-${format(new Date(), "yyyy-MM-dd")}`, rows);
}
