import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";
import CancelButton from "@/app/admin/CancelButton";

export default async function AdminPage() {
  const authSupabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // existing appointment code below...
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      start_time,
      end_time,
      status,
      customers (
        name,
        phone
      ),
      services (
        name,
        price,
        duration_minutes
      )
    `)
    .neq("status", "cancelled")
    .order("start_time", { ascending: true });

  if (error) {
    console.error(error);

    return (
      <main className="p-8 text-black">
        <h1 className="text-2xl font-bold">
          Failed to load appointments
        </h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">
          Nakhooni Admin
        </h1>

        <p className="mt-1 text-gray-600">
          Appointments
        </p>

        <div className="mt-8 space-y-4">
          {appointments?.length === 0 && (
            <div className="rounded-lg bg-white p-6">
              No upcoming appointments.
            </div>
          )}

          {appointments?.map((appointment) => {
            const customer = Array.isArray(appointment.customers)
              ? appointment.customers[0]
              : appointment.customers;

            const service = Array.isArray(appointment.services)
              ? appointment.services[0]
              : appointment.services;

            return (
              <div
                key={appointment.id}
                className="rounded-xl border bg-white p-5"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {customer?.name}
                    </h2>

                    <p className="text-gray-600">
                      {customer?.phone}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="font-semibold">
                      {new Date(
                        appointment.start_time
                      ).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>

                    <p className="text-gray-600">
                      {service?.name}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t pt-4">
                  <span className="text-sm text-gray-600">
                    ₹{service?.price} ·{" "}
                    {service?.duration_minutes} min
                  </span>
                </div>
                <div className="mt-4 flex justify-end">
                    <CancelButton appointmentId={appointment.id} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}