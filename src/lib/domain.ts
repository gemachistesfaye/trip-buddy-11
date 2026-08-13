/**
 * Domain types and shared constants for the transport management system.
 * Kept in one place so business vocabulary is never duplicated.
 */

export type AppRole = "department_user" | "logistics_officer" | "admin";
export type VehicleStatus = "available" | "assigned" | "maintenance" | "unavailable";
export type DriverStatus = "available" | "assigned" | "unavailable" | "leave";
export type RequestType = "daily" | "weekly";
export type RequestStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";
export type AssignmentStatus = "assigned" | "in_progress" | "completed" | "cancelled";
export type NotificationType =
  | "request_submitted"
  | "request_approved"
  | "request_rejected"
  | "vehicle_assigned"
  | "request_cancelled"
  | "reminder"
  | "system";

export interface Department {
  id: string;
  name: string;
  code: string;
  contact_name: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
  departments?: Pick<Department, "id" | "name" | "code"> | null;
}

export interface Driver {
  id: string;
  full_name: string;
  phone: string | null;
  license_number: string | null;
  status: DriverStatus;
  assigned_vehicle_id: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  model: string | null;
  passenger_capacity: number;
  current_status: VehicleStatus;
  assigned_driver_id: string | null;
  notes: string | null;
  is_active: boolean;
  drivers?: Pick<Driver, "id" | "full_name" | "phone"> | null;
}

export interface TransportRequest {
  id: string;
  request_number: string;
  request_type: RequestType;
  requesting_department_id: string;
  requester_id: string | null;
  contact_number: string | null;
  request_date: string;
  trip_from_date: string | null;
  trip_to_date: string | null;
  number_of_passengers: number | null;
  destination: string | null;
  preferred_departure_time: string | null;
  estimated_return_time: string | null;
  purpose: string | null;
  goods_carried: string | null;
  status: RequestStatus;
  rejection_reason: string | null;
  remarks: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  departments?: Pick<Department, "id" | "name" | "code"> | null;
  profiles?: Pick<Profile, "id" | "full_name" | "email" | "phone"> | null;
  transport_assignments?: Assignment[];
  transport_request_days?: RequestDay[];
}

export interface RequestDay {
  id: string;
  transport_request_id: string;
  trip_date: string;
  morning_requested: boolean;
  afternoon_requested: boolean;
  departure_time: string | null;
  return_time: string | null;
  destination: string | null;
  number_of_passengers: number | null;
  purpose: string | null;
  goods_carried: string | null;
}

export interface Assignment {
  id: string;
  transport_request_id: string;
  vehicle_id: string;
  driver_id: string;
  assigned_by: string | null;
  assignment_date: string;
  departure_datetime: string;
  expected_return_datetime: string;
  notes: string | null;
  status: AssignmentStatus;
  vehicles?: Pick<Vehicle, "id" | "plate_number" | "vehicle_type" | "model" | "passenger_capacity"> | null;
  drivers?: Pick<Driver, "id" | "full_name" | "phone"> | null;
  transport_requests?: TransportRequest | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  related_request_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
}

export const REQUEST_STATUSES: RequestStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
];

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  available: "Available",
  maintenance: "Maintenance",
  unavailable: "Unavailable",
  leave: "On Leave",
  daily: "Daily",
  weekly: "Weekly",
  department_user: "Department User",
  logistics_officer: "Logistics Officer",
  admin: "Administrator",
};

export const ROLE_HOME: Record<AppRole, string> = {
  department_user: "/department/dashboard",
  logistics_officer: "/logistics/dashboard",
  admin: "/admin/dashboard",
};

/** Ordered lifecycle used by the request timeline component. */
export const REQUEST_TIMELINE: { status: RequestStatus; label: string }[] = [
  { status: "submitted", label: "Submitted" },
  { status: "under_review", label: "Under Review" },
  { status: "approved", label: "Approved" },
  { status: "assigned", label: "Vehicle Assigned" },
  { status: "completed", label: "Completed" },
];

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const USER_EMAIL_DOMAIN = "@visionfund.local";
