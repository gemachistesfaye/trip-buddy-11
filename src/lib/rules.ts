import { differenceInHours, differenceInCalendarDays, parseISO } from "date-fns";

/**
 * Centralised business rules. Notice-period logic lives here only — never
 * duplicated inside forms or components.
 */

export interface NoticeSettings {
  dailyNoticeHours: number;
  weeklyNoticeDays: number;
  maxPassengerCapacity: number;
  organizationName: string;
  notificationsEnabled: boolean;
}

export const DEFAULT_SETTINGS: NoticeSettings = {
  dailyNoticeHours: 24,
  weeklyNoticeDays: 3,
  maxPassengerCapacity: 14,
  organizationName: "VisionFund (Demo)",
  notificationsEnabled: true,
};

export function parseSettings(rows: { key: string; value: string }[] | undefined): NoticeSettings {
  const map = new Map((rows ?? []).map((r) => [r.key, r.value]));
  const num = (key: string, fallback: number) => {
    const parsed = Number(map.get(key));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };
  return {
    dailyNoticeHours: num("daily_notice_hours", DEFAULT_SETTINGS.dailyNoticeHours),
    weeklyNoticeDays: num("weekly_notice_days", DEFAULT_SETTINGS.weeklyNoticeDays),
    maxPassengerCapacity: num("max_passenger_capacity", DEFAULT_SETTINGS.maxPassengerCapacity),
    organizationName: map.get("organization_name") ?? DEFAULT_SETTINGS.organizationName,
    notificationsEnabled: (map.get("notifications_enabled") ?? "true") === "true",
  };
}

export interface NoticeCheck {
  ok: boolean;
  message: string | null;
}

/** Combine a yyyy-MM-dd date and HH:mm time into a Date. */
export function combineDateTime(date: string, time?: string | null): Date | null {
  if (!date) return null;
  const safeTime = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : "00:00";
  const value = new Date(`${date}T${safeTime}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function checkDailyNotice(
  tripDate: string,
  departureTime: string | null | undefined,
  settings: NoticeSettings,
  now: Date = new Date(),
): NoticeCheck {
  const trip = combineDateTime(tripDate, departureTime);
  if (!trip) return { ok: false, message: "Select a valid trip date." };
  const hours = differenceInHours(trip, now);
  if (hours < settings.dailyNoticeHours) {
    return {
      ok: false,
      message: `Daily transport requests must normally be submitted at least ${settings.dailyNoticeHours} hours before the trip. This trip starts in ${hours < 0 ? "the past" : `${hours} hour${hours === 1 ? "" : "s"}`}.`,
    };
  }
  return { ok: true, message: null };
}

export function checkWeeklyNotice(
  tripFromDate: string,
  settings: NoticeSettings,
  now: Date = new Date(),
): NoticeCheck {
  if (!tripFromDate) return { ok: false, message: "Select a valid start date." };
  const days = differenceInCalendarDays(parseISO(tripFromDate), now);
  if (days < settings.weeklyNoticeDays) {
    return {
      ok: false,
      message: `Weekly transport requests must normally be submitted at least ${settings.weeklyNoticeDays} days in advance. This request starts in ${days < 0 ? "the past" : `${days} day${days === 1 ? "" : "s"}`}.`,
    };
  }
  return { ok: true, message: null };
}

/** Requests a department user is still allowed to cancel. */
export function canCancel(status: string): boolean {
  return ["draft", "submitted", "under_review", "approved"].includes(status);
}

/** Translate raw backend errors into user-friendly copy. */
export function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (!raw) return "Something went wrong. Please try again.";
  if (raw.includes("Vehicle is unavailable")) return "Vehicle is unavailable during the requested time.";
  if (raw.includes("Driver is unavailable")) return "Driver is unavailable during the requested time.";
  if (raw.toLowerCase().includes("row-level security") || raw.includes("permission denied")) {
    return "You do not have permission to perform this action.";
  }
  if (raw.toLowerCase().includes("invalid login credentials")) return "Incorrect email or password.";
  if (raw.toLowerCase().includes("duplicate key")) return "That record already exists.";
  if (raw.toLowerCase().includes("failed to fetch") || raw.toLowerCase().includes("network")) {
    return "Network problem. Check your connection and try again.";
  }
  if (/^[A-Z0-9_]+:|relation |column |syntax error/i.test(raw)) {
    return "We couldn't complete that action. Please try again.";
  }
  return raw;
}
