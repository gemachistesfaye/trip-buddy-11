import { supabase } from "@/integrations/supabase/client";
import type {
  AppRole,
  AssignmentStatus,
  Assignment,
  AppNotification,
  Department,
  Driver,
  Profile,
  RequestDay,
  TransportRequest,
  Vehicle,
} from "@/lib/domain";
import { parseSettings, type NoticeSettings } from "@/lib/rules";

/** Thin data-access layer. All reads/writes go through here so components stay dumb. */

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export const qk = {
  departments: ["departments"] as const,
  vehicles: ["vehicles"] as const,
  drivers: ["drivers"] as const,
  settings: ["settings"] as const,
  requests: (scope: string) => ["requests", scope] as const,
  request: (id: string) => ["request", id] as const,
  assignments: ["assignments"] as const,
  notifications: (userId: string) => ["notifications", userId] as const,
  profiles: ["profiles"] as const,
  roles: ["roles"] as const,
};

const REQUEST_SELECT =
  "*, departments(id,name,code), profiles:requester_id(id,full_name,email,phone), transport_assignments(*, vehicles(id,plate_number,vehicle_type,model,passenger_capacity), drivers(id,full_name,phone))";

export async function fetchDepartments(): Promise<Department[]> {
  return unwrap(await supabase.from("departments").select("*").order("name"));
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  return unwrap(
    await supabase
      .from("vehicles")
      .select("*, drivers:assigned_driver_id(id,full_name,phone)")
      .order("plate_number"),
  );
}

export async function fetchDrivers(): Promise<Driver[]> {
  return unwrap(await supabase.from("drivers").select("*").order("full_name"));
}

export async function fetchSettings(): Promise<NoticeSettings> {
  const rows = unwrap<{ key: string; value: string }[]>(
    await supabase.from("system_settings").select("key,value,description"),
  );
  return parseSettings(rows);
}

export async function fetchSettingRows() {
  return unwrap<{ key: string; value: string; description: string | null }[]>(
    await supabase.from("system_settings").select("key,value,description").order("key"),
  );
}

export async function fetchRequests(): Promise<TransportRequest[]> {
  return unwrap(
    await supabase.from("transport_requests").select(REQUEST_SELECT).order("created_at", { ascending: false }),
  );
}

export async function fetchMyRequests(profileId: string | null, departmentId: string | null) {
  let query = supabase.from("transport_requests").select(REQUEST_SELECT).order("created_at", { ascending: false });
  if (profileId) query = query.eq("requester_id", profileId);
  else if (departmentId) query = query.eq("requesting_department_id", departmentId);
  return unwrap<TransportRequest[]>(await query);
}

export async function fetchRequest(id: string): Promise<TransportRequest | null> {
  const res = await supabase.from("transport_requests").select(REQUEST_SELECT).eq("id", id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as unknown as TransportRequest | null;
}

export async function fetchRequestDays(requestId: string): Promise<RequestDay[]> {
  return unwrap(
    await supabase.from("transport_request_days").select("*").eq("transport_request_id", requestId).order("trip_date"),
  );
}

export async function fetchAssignments(): Promise<Assignment[]> {
  return unwrap<Assignment[]>(
    await supabase
      .from("transport_assignments")
      .select(
        "*, vehicles(id,plate_number,vehicle_type,model,passenger_capacity), drivers(id,full_name,phone), transport_requests(id,request_number,destination,request_type,status,number_of_passengers,departments(id,name,code))",
      )
      .order("departure_datetime", { ascending: true }) as unknown as { data: Assignment[] | null; error: { message: string } | null },
  );
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  return unwrap(
    await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
  );
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw new Error(error.message);
}

export async function fetchProfiles(): Promise<Profile[]> {
  return unwrap(
    await supabase.from("profiles").select("*, departments(id,name,code)").order("full_name"),
  );
}

export async function fetchRoles() {
  return unwrap<{ user_id: string; role: string }[]>(await supabase.from("user_roles").select("user_id, role"));
}

/* ---------------------------------- writes --------------------------------- */

export interface DailyRequestInput {
  requesting_department_id: string;
  requester_id: string;
  contact_number: string;
  request_date: string;
  trip_date: string;
  number_of_passengers: number;
  destination: string;
  preferred_departure_time: string;
  estimated_return_time: string;
  purpose: string;
  goods_carried?: string;
  remarks?: string;
}

export async function createDailyRequest(input: DailyRequestInput) {
  const { data, error } = await supabase
    .from("transport_requests")
    .insert({
      request_type: "daily",
      requesting_department_id: input.requesting_department_id,
      requester_id: input.requester_id,
      contact_number: input.contact_number,
      request_date: input.request_date,
      trip_from_date: input.trip_date,
      trip_to_date: input.trip_date,
      number_of_passengers: input.number_of_passengers,
      destination: input.destination,
      preferred_departure_time: input.preferred_departure_time,
      estimated_return_time: input.estimated_return_time,
      purpose: input.purpose,
      goods_carried: input.goods_carried ?? null,
      remarks: input.remarks ?? null,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export interface WeeklyDayInput {
  trip_date: string;
  morning_requested: boolean;
  afternoon_requested: boolean;
  departure_time: string;
  return_time: string;
  destination: string;
  number_of_passengers: number;
  purpose: string;
  goods_carried?: string;
}

export async function createWeeklyRequest(
  header: Omit<DailyRequestInput, "trip_date" | "number_of_passengers" | "destination" | "preferred_departure_time" | "estimated_return_time" | "purpose"> & {
    trip_from_date: string;
    trip_to_date: string;
  },
  days: WeeklyDayInput[],
) {
  const first = days[0];
  const { data, error } = await supabase
    .from("transport_requests")
    .insert({
      request_type: "weekly",
      requesting_department_id: header.requesting_department_id,
      requester_id: header.requester_id,
      contact_number: header.contact_number,
      request_date: header.request_date,
      trip_from_date: header.trip_from_date,
      trip_to_date: header.trip_to_date,
      destination: first?.destination ?? null,
      number_of_passengers: first?.number_of_passengers ?? null,
      preferred_departure_time: first?.departure_time ?? null,
      estimated_return_time: first?.return_time ?? null,
      purpose: first?.purpose ?? null,
      remarks: header.remarks ?? null,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const rows = days.map((d) => ({
    transport_request_id: data.id,
    trip_date: d.trip_date,
    morning_requested: d.morning_requested,
    afternoon_requested: d.afternoon_requested,
    departure_time: d.departure_time || null,
    return_time: d.return_time || null,
    destination: d.destination,
    number_of_passengers: d.number_of_passengers,
    purpose: d.purpose,
    goods_carried: d.goods_carried ?? null,
  }));
  if (rows.length) {
    const dayRes = await supabase.from("transport_request_days").insert(rows);
    if (dayRes.error) throw new Error(dayRes.error.message);
  }
  return data;
}

export async function updateRequestStatus(
  id: string,
  patch: Partial<Pick<TransportRequest, "status" | "rejection_reason" | "remarks" | "reviewed_at" | "completed_at">>,
) {
  const { error } = await supabase.from("transport_requests").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createAssignment(input: {
  transport_request_id: string;
  vehicle_id: string;
  driver_id: string;
  assigned_by: string | null;
  departure_datetime: string;
  expected_return_datetime: string;
  notes?: string;
}) {
  const { error } = await supabase.from("transport_assignments").insert(input);
  if (error) throw new Error(error.message);
  await Promise.all([
    updateRequestStatus(input.transport_request_id, { status: "assigned" }),
    supabase.from("vehicles").update({ current_status: "assigned" }).eq("id", input.vehicle_id),
    supabase.from("drivers").update({ status: "assigned" }).eq("id", input.driver_id),
  ]);
}

export async function updateAssignmentStatus(id: string, status: AssignmentStatus) {
  const { error } = await supabase.from("transport_assignments").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertVehicle(vehicle: Partial<Vehicle> & { plate_number: string }) {
  const payload = {
    plate_number: vehicle.plate_number,
    vehicle_type: vehicle.vehicle_type ?? "Sedan",
    model: vehicle.model ?? null,
    passenger_capacity: vehicle.passenger_capacity ?? 4,
    current_status: vehicle.current_status ?? "available",
    assigned_driver_id: vehicle.assigned_driver_id || null,
    notes: vehicle.notes ?? null,
    is_active: vehicle.is_active ?? true,
    current_odometer: vehicle.current_odometer ?? 0,
    service_interval_km: vehicle.service_interval_km ?? 5000,
    last_service_odometer: vehicle.last_service_odometer ?? 0,
    last_service_date: vehicle.last_service_date || null,
    next_service_due_date: vehicle.next_service_due_date || null,
  };
  const res = vehicle.id
    ? await supabase.from("vehicles").update(payload).eq("id", vehicle.id)
    : await supabase.from("vehicles").insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function upsertDriver(driver: Partial<Driver> & { full_name: string }) {
  const payload = {
    full_name: driver.full_name,
    phone: driver.phone ?? null,
    license_number: driver.license_number ?? null,
    status: driver.status ?? "available",
    assigned_vehicle_id: driver.assigned_vehicle_id || null,
    notes: driver.notes ?? null,
    is_active: driver.is_active ?? true,
  };
  const res = driver.id
    ? await supabase.from("drivers").update(payload).eq("id", driver.id)
    : await supabase.from("drivers").insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function upsertDepartment(dept: Partial<Department> & { name: string; code: string }) {
  const payload = {
    name: dept.name,
    code: dept.code,
    contact_name: dept.contact_name ?? null,
    contact_phone: dept.contact_phone ?? null,
    is_active: dept.is_active ?? true,
  };
  const res = dept.id
    ? await supabase.from("departments").update(payload).eq("id", dept.id)
    : await supabase.from("departments").insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function updateProfile(
  id: string,
  patch: Partial<Pick<Profile, "full_name" | "phone" | "department_id" | "is_active" | "email">>,
) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setUserRole(userId: string, role: AppRole) {
  const del = await supabase.from("user_roles").delete().eq("user_id", userId);
  if (del.error) throw new Error(del.error.message);
  const ins = await supabase.from("user_roles").insert({ user_id: userId, role });
  if (ins.error) throw new Error(ins.error.message);
}

export async function saveSetting(key: string, value: string) {
  const { error } = await supabase.from("system_settings").update({ value }).eq("key", key);
  if (error) throw new Error(error.message);
}

/* ------------------------- trip completion & mileage ----------------------- */

export interface TripCompletionInput {
  id: string;
  requestId: string;
  actual_departure_datetime?: string | null;
  actual_return_datetime?: string | null;
  odometer_start?: number | null;
  odometer_end?: number | null;
}

/** Driver or logistics records what actually happened, then closes the trip. */
export async function completeTrip(input: TripCompletionInput) {
  const { error } = await supabase
    .from("transport_assignments")
    .update({
      status: "completed",
      actual_departure_datetime: input.actual_departure_datetime ?? null,
      actual_return_datetime: input.actual_return_datetime ?? new Date().toISOString(),
      odometer_start: input.odometer_start ?? null,
      odometer_end: input.odometer_end ?? null,
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  await updateRequestStatus(input.requestId, { status: "completed", completed_at: new Date().toISOString() });
}

export async function startTrip(id: string, requestId: string, odometerStart: number | null) {
  const { error } = await supabase
    .from("transport_assignments")
    .update({
      status: "in_progress",
      actual_departure_datetime: new Date().toISOString(),
      odometer_start: odometerStart,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await updateRequestStatus(requestId, { status: "in_progress" });
}

/* ------------------------------ driver portal ------------------------------ */

export async function fetchDriverByUser(userId: string): Promise<Driver | null> {
  const res = await supabase.from("drivers").select("*").eq("auth_user_id", userId).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as Driver | null;
}

export async function fetchDriverAssignments(driverId: string): Promise<Assignment[]> {
  return unwrap<Assignment[]>(
    (await supabase
      .from("transport_assignments")
      .select(
        "*, vehicles(id,plate_number,vehicle_type,model,passenger_capacity), transport_requests(id,request_number,destination,purpose,number_of_passengers,contact_number,status,request_type,departments(id,name,code))",
      )
      .eq("driver_id", driverId)
      .order("departure_datetime", { ascending: true })) as unknown as {
      data: Assignment[] | null;
      error: { message: string } | null;
    },
  );
}

/* -------------------------------- audit log -------------------------------- */

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

export async function fetchAuditLogs(limit = 300): Promise<AuditLog[]> {
  return unwrap<AuditLog[]>(
    (await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)) as unknown as { data: AuditLog[] | null; error: { message: string } | null },
  );
}

/* ------------------------------- bulk actions ------------------------------ */

export async function bulkApprove(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase
    .from("transport_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw new Error(error.message);
}

/* ---------------------------- repeat a request ----------------------------- */

/** Clone an existing request (and its weekly day rows) onto new dates. */
export async function repeatRequest(source: TransportRequest, offsetDays: number) {
  const shift = (value: string | null) => {
    if (!value) return null;
    const d = new Date(`${value}T00:00:00`);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  const { data, error } = await supabase
    .from("transport_requests")
    .insert({
      request_type: source.request_type,
      requesting_department_id: source.requesting_department_id,
      requester_id: source.requester_id,
      contact_number: source.contact_number,
      request_date: new Date().toISOString().slice(0, 10),
      trip_from_date: shift(source.trip_from_date),
      trip_to_date: shift(source.trip_to_date),
      number_of_passengers: source.number_of_passengers,
      destination: source.destination,
      preferred_departure_time: source.preferred_departure_time,
      estimated_return_time: source.estimated_return_time,
      purpose: source.purpose,
      goods_carried: source.goods_carried,
      remarks: source.remarks,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const days = await fetchRequestDays(source.id);
  if (days.length) {
    const rows = days.map((d) => ({
      transport_request_id: data.id,
      trip_date: shift(d.trip_date) as string,
      morning_requested: d.morning_requested,
      afternoon_requested: d.afternoon_requested,
      departure_time: d.departure_time,
      return_time: d.return_time,
      destination: d.destination,
      number_of_passengers: d.number_of_passengers,
      purpose: d.purpose,
      goods_carried: d.goods_carried,
    }));
    const res = await supabase.from("transport_request_days").insert(rows);
    if (res.error) throw new Error(res.error.message);
  }
  return data;
}
