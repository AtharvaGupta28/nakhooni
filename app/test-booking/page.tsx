"use client";

import { useEffect, useState } from "react";

type Service = {
  id: number;
  name: string;
  price: number;
  duration_minutes: number;
};

type Slot = {
  start: string;
  end: string;
};

export default function TestBooking() {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => setServices(data.services || []));
  }, []);

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      return;
    }

    const service = services.find(
      (s) => s.id === Number(serviceId)
    );

    if (!service) return;

    setLoading(true);

    fetch(
      `/api/availability?date=${date}&duration=${service.duration_minutes}`
    )
      .then((res) => res.json())
      .then((data) => setSlots(data.slots || []))
      .finally(() => setLoading(false));
  }, [serviceId, date, services]);

  return (
    <main className="min-h-screen bg-white p-8 text-black">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold">
          Booking Test
        </h1>

        <div className="mt-8">
          <label className="block font-medium">
            Service
          </label>

          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="mt-2 w-full rounded-lg border p-3"
          >
            <option value="">Select service</option>

            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} — {service.duration_minutes} min — ₹
                {service.price}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6">
          <label className="block font-medium">
            Date
          </label>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 w-full rounded-lg border p-3"
          />
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold">
            Available slots
          </h2>

          {loading && (
            <p className="mt-4 text-gray-500">
              Loading...
            </p>
          )}

          {!loading && date && serviceId && slots.length === 0 && (
            <p className="mt-4 text-gray-500">
              No available slots.
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {slots.map((slot) => (
              <button
                key={slot.start}
                className="rounded-lg border p-3 hover:bg-gray-100"
              >
                {new Date(slot.start).toLocaleTimeString(
                  "en-IN",
                  {
                    hour: "numeric",
                    minute: "2-digit",
                  }
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}