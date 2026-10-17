import { NextResponse } from "next/server";
import {
  getAvailableSlotsByDate,
  getBookingWindow,
} from "@/lib/availability";
import { getActiveService } from "@/lib/services";
import { isValidMonth, lastDayOfMonth } from "@/lib/time";
import { parseId } from "@/lib/validation";

// GET /api/availability/days?serviceId=1&month=2026-10
// Returns the dates in a month that have at least one free slot, plus the
// first and last bookable dates so the calendar can limit navigation.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const serviceId = parseId(searchParams.get("serviceId"));
  const month = searchParams.get("month");

  if (!serviceId || !month || !isValidMonth(month)) {
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

    const slotsByDate = await getAvailableSlotsByDate(
      `${month}-01`,
      lastDayOfMonth(month),
      service.duration_minutes
    );

    return NextResponse.json({
      days: [...slotsByDate.keys()],
      ...getBookingWindow(),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to get availability" },
      { status: 500 }
    );
  }
}
