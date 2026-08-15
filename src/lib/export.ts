import { format, parseISO } from "date-fns";
import type { TransportRequest } from "@/lib/domain";

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
