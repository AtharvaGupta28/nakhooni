import "server-only";
import { fromZonedTime } from "date-fns-tz";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TIMEZONE, addDays, dayOfWeek, todayInIndia } from "@/lib/time";

// Start times are offered every 30 minutes from opening time.
const SLOT_INTERVAL_MINUTES = 30;

// Slots must start at least this long after the time of booking.
const MIN_NOTICE_MINUTES = 3 * 60;

// The last bookable date is this many days after today.
const MAX_DAYS_AHEAD = 60;

const MINUTE_MS = 60 * 1000;

export type AvailableSlot = {
  start: string;
  end: string;
};

type BusinessHours = {
  day_of_week: number;
  open_time: string;
  close_time: string;
};

type Busy = {
  start: number;
  end: number;
};

// The range of Indian dates customers may book.
export function getBookingWindow(now = new Date()) {
  const firstDate = todayInIndia(now);

  return {
    firstDate,
    lastDate: addDays(firstDate, MAX_DAYS_AHEAD),
  };
}

// Returns the available slots for each date from startDate to endDate
// (inclusive), limited to the booking window. Dates without any free slot
// are left out.
//
// A slot is available when it lies inside that day's business hours (the
// service must finish by close_time), starts at least MIN_NOTICE_MINUTES from
// now, and does not overlap a non-cancelled appointment or a blocked time.
export async function getAvailableSlotsByDate(
  startDate: string,
  endDate: string,
  durationMinutes: number,
  now = new Date()
): Promise<Map<string, AvailableSlot[]>> {
  const slotsByDate = new Map<string, AvailableSlot[]>();
  const window = getBookingWindow(now);
  const from = startDate > window.firstDate ? startDate : window.firstDate;
  const to = endDate < window.lastDate ? endDate : window.lastDate;

  if (from > to) {
    return slotsByDate;
  }

  const rangeStart = fromZonedTime(`${from}T00:00:00`, TIMEZONE);
  const rangeEnd = fromZonedTime(`${addDays(to, 1)}T00:00:00`, TIMEZONE);

  const [hoursResult, appointmentsResult, blockedResult] =
    await Promise.all([
      supabaseAdmin
        .from("business_hours")
        .select("day_of_week, open_time, close_time")
        .eq("active", true),
      supabaseAdmin
        .from("appointments")
        .select("start_time, end_time")
        .lt("start_time", rangeEnd.toISOString())
        .gt("end_time", rangeStart.toISOString())
        .neq("status", "cancelled"),
      supabaseAdmin
        .from("blocked_times")
        .select("start_time, end_time")
        .lt("start_time", rangeEnd.toISOString())
        .gt("end_time", rangeStart.toISOString()),
    ]);

  if (hoursResult.error) {
    throw new Error("Could not fetch business hours");
  }

  if (appointmentsResult.error) {
    throw new Error("Could not fetch appointments");
  }

  if (blockedResult.error) {
    throw new Error("Could not fetch blocked times");
  }

  const businessHours: BusinessHours[] = hoursResult.data;
  const busy: Busy[] = [
    ...appointmentsResult.data,
    ...blockedResult.data,
  ].map((range) => ({
    start: Date.parse(range.start_time),
    end: Date.parse(range.end_time),
  }));

  const earliestStart = now.getTime() + MIN_NOTICE_MINUTES * MINUTE_MS;
  const duration = durationMinutes * MINUTE_MS;

  for (let date = from; date <= to; date = addDays(date, 1)) {
    // A day may have several opening periods; a slot is keyed by its start
    // so overlapping rows cannot produce duplicates.
    const slots = new Map<number, AvailableSlot>();

    for (const hours of businessHours) {
      if (hours.day_of_week !== dayOfWeek(date)) continue;

      const openingTime = fromZonedTime(
        `${date}T${hours.open_time}`,
        TIMEZONE
      ).getTime();

      const closingTime = fromZonedTime(
        `${date}T${hours.close_time}`,
        TIMEZONE
      ).getTime();

      for (
        let start = openingTime;
        start + duration <= closingTime;
        start += SLOT_INTERVAL_MINUTES * MINUTE_MS
      ) {
        const end = start + duration;

        if (start < earliestStart) continue;

        const overlaps = busy.some(
          (range) => start < range.end && end > range.start
        );

        if (!overlaps) {
          slots.set(start, {
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
          });
        }
      }
    }

    if (slots.size > 0) {
      slotsByDate.set(
        date,
        [...slots.entries()]
          .sort(([a], [b]) => a - b)
          .map(([, slot]) => slot)
      );
    }
  }

  return slotsByDate;
}

export async function getAvailableSlots(
  date: string,
  durationMinutes: number,
  now = new Date()
): Promise<AvailableSlot[]> {
  const slotsByDate = await getAvailableSlotsByDate(
    date,
    date,
    durationMinutes,
    now
  );

  return slotsByDate.get(date) ?? [];
}
