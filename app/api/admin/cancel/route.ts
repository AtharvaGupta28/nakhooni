import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { appointmentId } = await request.json();

  if (!appointmentId) {
    return NextResponse.json(
      { error: "Appointment ID is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId);

  if (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Could not cancel appointment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}