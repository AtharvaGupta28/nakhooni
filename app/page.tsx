import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data: services, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("price", { ascending: true });

  if (error) {
    return <div>Something went wrong.</div>;
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold">Nakhooni</h1>

        <p className="mt-2 text-gray-600">
          Nail Studio
        </p>

        <h2 className="mt-12 text-2xl font-semibold">
          Services
        </h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {services?.map((service) => (
            <div
              key={service.id}
              className="rounded-xl border p-5"
            >
              <h3 className="text-lg font-semibold">
                {service.name}
              </h3>

              {service.description && (
                <p className="mt-1 text-sm text-gray-500">
                  {service.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="font-medium">
                  ₹{service.price}
                </span>

                <span className="text-sm text-gray-500">
                  {service.duration_minutes} min
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}