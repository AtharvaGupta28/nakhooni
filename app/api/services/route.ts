import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, price, duration_minutes")
    .eq("active", true)
    .order("price", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }

  return NextResponse.json({ services: data });
}