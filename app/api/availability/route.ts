import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";
import { getActiveService } from "@/lib/services";
import { isValidDate } from "@/lib/time";
import { parseId } from "@/lib/validation";

// GET /api/availability?serviceId=1&date=2026-10-24
// Returns the free start times for a service on one date.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const serviceId = parseId(searchParams.get("serviceId"));
  const date = searchParams.get("date");

  if (!serviceId || !date || !isValidDate(date)) {
    return NextResponse.json(
      { error: "Invalid parameters" },
      { status: 400 }
    );
  }

  try {
    const service = await getActiveService(serviceId);

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    const slots = await getAvailableSlots(date, service.duration_minutes);

    return NextResponse.json({ slots });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to get availability" },
      { status: 500 }
    );
  }
}
