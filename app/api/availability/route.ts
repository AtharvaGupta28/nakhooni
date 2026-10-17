import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const date = searchParams.get("date");
  const duration = Number(searchParams.get("duration"));

  if (!date || !Number.isInteger(duration) || duration <= 0) {
    return NextResponse.json(
      { error: "Invalid parameters" },
      { status: 400 }
    );
  }

  try {
    const slots = await getAvailableSlots(date, duration);

    return NextResponse.json({ slots });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to get availability" },
      { status: 500 }
    );
  }
}