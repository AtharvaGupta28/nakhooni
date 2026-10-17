import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type Service = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
};

const SERVICE_COLUMNS = "id, name, description, price, duration_minutes";

export async function getActiveServices(): Promise<Service[]> {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select(SERVICE_COLUMNS)
    .eq("active", true)
    .order("price", { ascending: true });

  if (error) {
    throw new Error("Could not fetch services");
  }

  return data;
}

export async function getActiveService(
  serviceId: number
): Promise<Service | null> {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select(SERVICE_COLUMNS)
    .eq("id", serviceId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error("Could not fetch service");
  }

  return data;
}
