import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { getAvailableSlots } from "@/lib/availability";
import { getActiveService } from "@/lib/services";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TIMEZONE } from "@/lib/time";
import {
  normalizeIndianPhone,
  normalizeName,
  parseId,
} from "@/lib/validation";

// Limits how many upcoming appointments one phone number can hold, so the
// calendar cannot be filled with fake bookings.
const MAX_UPCOMING_BOOKINGS_PER_PHONE = 2;

// Postgres exclusion_violation: raised by the appointments_no_overlap
// constraint when another booking took the slot first.
const EXCLUSION_VIOLATION = "23P01";

const SLOT_TAKEN_MESSAGE =
  "Sorry, this time is no longer available. Please choose another slot.";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request.", 400);
  }

  const serviceId = parseId(body?.serviceId);
  const name = normalizeName(body?.name);
  const phone = normalizeIndianPhone(body?.phone);
  const startTime =
    typeof body?.startTime === "string" ? new Date(body.startTime) : null;

  if (!serviceId || !startTime || Number.isNaN(startTime.getTime())) {
    return errorResponse("Please choose a service and time.", 400);
  }

  if (!name) {
    return errorResponse("Please enter your name.", 400);
  }

  if (!phone) {
    return errorResponse(
      "Please enter a valid 10-digit mobile number.",
      400
    );
  }

  try {
    const service = await getActiveService(serviceId);

    if (!service) {
      return errorResponse("This service is not available.", 400);
    }

    // The requested start must be one of the slots we would offer right now.
    // This also enforces business hours, notice period and booking window,
    // and the end time comes from the service duration, not the client.
    const date = formatInTimeZone(startTime, TIMEZONE, "yyyy-MM-dd");
    const slots = await getAvailableSlots(date, service.duration_minutes);
    const slot = slots.find(
      (slot) => slot.start === startTime.toISOString()
    );

    if (!slot) {
      return errorResponse(SLOT_TAKEN_MESSAGE, 409);
    }

    const { count, error: countError } = await supabaseAdmin
      .from("appointments")
      .select("id, customers!inner(phone)", { count: "exact", head: true })
      .eq("customers.phone", phone)
      .neq("status", "cancelled")
      .gt("end_time", new Date().toISOString());

    if (countError) {
      throw countError;
    }

    if ((count ?? 0) >= MAX_UPCOMING_BOOKINGS_PER_PHONE) {
      return errorResponse(
        "You already have upcoming bookings with this number. Please contact us to book more.",
        429
      );
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .insert({ name, phone })
      .select("id")
      .single();

    if (customerError) {
      throw customerError;
    }

    const { data: appointment, error: appointmentError } =
      await supabaseAdmin
        .from("appointments")
        .insert({
          customer_id: customer.id,
          service_id: service.id,
          start_time: slot.start,
          end_time: slot.end,
          status: "confirmed",
        })
        .select("id")
        .single();

    if (appointmentError) {
      // Don't leave a customer row without an appointment.
      await supabaseAdmin.from("customers").delete().eq("id", customer.id);

      if (appointmentError.code === EXCLUSION_VIOLATION) {
        return errorResponse(SLOT_TAKEN_MESSAGE, 409);
      }

      throw appointmentError;
    }

    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
      start: slot.start,
      end: slot.end,
    });
  } catch (error) {
    console.error(error);

    return errorResponse(
      "Could not create booking. Please try again.",
      500
    );
  }
}
