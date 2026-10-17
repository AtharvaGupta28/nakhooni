import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      serviceId,
      name,
      phone,
      startTime,
      endTime,
    } = body;

    if (
      !serviceId ||
      !name ||
      !phone ||
      !startTime ||
      !endTime
    ) {
      return NextResponse.json(
        { error: "Missing required details." },
        { status: 400 }
      );
    }

    // Re-check availability before booking
    const { data: conflicts, error: conflictError } =
      await supabase
        .from("appointments")
        .select("id")
        .lt("start_time", endTime)
        .gt("end_time", startTime)
        .neq("status", "cancelled")
        .limit(1);

    if (conflictError) {
      throw conflictError;
    }

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        {
          error:
            "This time was just booked. Please choose another slot.",
        },
        { status: 409 }
      );
    }

    // Create customer
    const { data: customer, error: customerError } =
      await supabase
        .from("customers")
        .insert({
          name: name.trim(),
          phone: phone.trim(),
        })
        .select("id")
        .single();

    if (customerError || !customer) {
      throw customerError;
    }

    // Create appointment
    const { data: appointment, error: appointmentError } =
      await supabase
        .from("appointments")
        .insert({
          customer_id: customer.id,
          service_id: serviceId,
          start_time: startTime,
          end_time: endTime,
          status: "confirmed",
        })
        .select("id")
        .single();

    if (appointmentError || !appointment) {
      throw appointmentError;
    }

    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Could not create booking." },
      { status: 500 }
    );
  }
}