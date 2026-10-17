import { supabase } from "@/lib/supabase";
import { fromZonedTime } from "date-fns-tz";

const TIMEZONE = "Asia/Kolkata";

type AvailableSlot = {
  start: string;
  end: string;
};

export async function getAvailableSlots(
  date: string,
  durationMinutes: number
): Promise<AvailableSlot[]> {
  // The selected date is always interpreted as an Indian date.
  const selectedDate = new Date(`${date}T00:00:00Z`);
  const dayOfWeek = selectedDate.getUTCDay();

  // Get business hours
  const { data: businessHours, error: hoursError } = await supabase
    .from("business_hours")
    .select("*")
    .eq("day_of_week", dayOfWeek)
    .eq("active", true)
    .single();

  if (hoursError || !businessHours) {
    return [];
  }

  // Create IST working-hour boundaries
  const openingTime = fromZonedTime(
    `${date}T${businessHours.open_time}`,
    TIMEZONE
  );

  const closingTime = fromZonedTime(
    `${date}T${businessHours.close_time}`,
    TIMEZONE
  );

  // Get appointments that could overlap this working day
  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("start_time, end_time")
    .lt("start_time", closingTime.toISOString())
    .gt("end_time", openingTime.toISOString())
    .neq("status", "cancelled");

  if (appointmentsError) {
    throw new Error("Could not fetch appointments");
  }

  // Get blocked times that overlap this working day
  const { data: blockedTimes, error: blockedError } = await supabase
    .from("blocked_times")
    .select("start_time, end_time")
    .lt("start_time", closingTime.toISOString())
    .gt("end_time", openingTime.toISOString());

  if (blockedError) {
    throw new Error("Could not fetch blocked times");
  }

  const slots: AvailableSlot[] = [];

  // Start at opening time
  let slotStart = new Date(openingTime);

  while (slotStart < closingTime) {
    const slotEnd = new Date(
      slotStart.getTime() + durationMinutes * 60 * 1000
    );

    // Don't allow appointments beyond closing time
    if (slotEnd > closingTime) {
      break;
    }

    // Check existing appointments
    const overlapsAppointment = appointments?.some((appointment) => {
      const appointmentStart = new Date(appointment.start_time);
      const appointmentEnd = new Date(appointment.end_time);

      return (
        slotStart < appointmentEnd &&
        slotEnd > appointmentStart
      );
    });

    // Check blocked times
    const overlapsBlockedTime = blockedTimes?.some((blocked) => {
      const blockedStart = new Date(blocked.start_time);
      const blockedEnd = new Date(blocked.end_time);

      return (
        slotStart < blockedEnd &&
        slotEnd > blockedStart
      );
    });

    if (!overlapsAppointment && !overlapsBlockedTime) {
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
      });
    }

    // Next possible start time: 30 minutes later
    slotStart = new Date(
      slotStart.getTime() + 30 * 60 * 1000
    );
  }

  return slots;
}