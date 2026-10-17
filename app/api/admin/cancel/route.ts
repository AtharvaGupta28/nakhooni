import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseId } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await getAdminUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let appointmentId: number | null = null;

  try {
    const body = await request.json();
    appointmentId = parseId(body?.appointmentId);
  } catch {
    // Handled below as an invalid ID.
  }

  if (!appointmentId) {
    return NextResponse.json(
      { error: "A valid appointment ID is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .neq("status", "cancelled")
    .select("id");

  if (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Could not cancel appointment" },
      { status: 500 }
    );
  }

  if (data.length === 0) {
    return NextResponse.json(
      { error: "Appointment not found or already cancelled" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
