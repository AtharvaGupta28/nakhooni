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

export default function BookingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");

  // Load services
  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => {
        setServices(data.services || []);
      });
  }, []);

  // Load availability
  useEffect(() => {
    setSelectedSlot(null);
    setMessage("");

    if (!serviceId || !date) {
      setSlots([]);
      return;
    }

    const service = services.find(
      (service) => service.id === Number(serviceId)
    );

    if (!service) return;

    setLoadingSlots(true);

    fetch(
      `/api/availability?date=${date}&duration=${service.duration_minutes}`
    )
      .then((res) => res.json())
      .then((data) => {
        setSlots(data.slots || []);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [serviceId, date, services]);

  async function handleBooking() {
    setMessage("");

    if (!serviceId || !date || !selectedSlot || !name || !phone) {
      setMessage("Please fill in all details.");
      return;
    }

    setBooking(true);

    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId: Number(serviceId),
          name,
          phone,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Booking failed.");
        return;
      }

      setMessage("Booking confirmed!");

      setSelectedSlot(null);
      setName("");
      setPhone("");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setBooking(false);
    }
  }

  const selectedService = services.find(
    (service) => service.id === Number(serviceId)
  );

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold">Nakhooni</h1>
        <p className="mt-1 text-gray-600">Book an appointment</p>

        {/* Service */}
        <div className="mt-10">
          <label className="block font-medium">
            Choose a service
          </label>

          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="mt-2 w-full rounded-lg border p-3"
          >
            <option value="">Select service</option>

            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} — ₹{service.price} —{" "}
                {service.duration_minutes} min
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="mt-6">
          <label className="block font-medium">
            Choose a date
          </label>

          <input
            type="date"
            value={date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 w-full rounded-lg border p-3"
          />
        </div>

        {/* Slots */}
        {serviceId && date && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold">
              Available times
            </h2>

            {loadingSlots && (
              <p className="mt-4 text-gray-500">
                Checking availability...
              </p>
            )}

            {!loadingSlots && slots.length === 0 && (
              <p className="mt-4 text-gray-500">
                No available times for this date.
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {slots.map((slot) => {
                const selected =
                  selectedSlot?.start === slot.start;

                return (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-lg border p-3 ${
                      selected
                        ? "border-black bg-black text-white"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {new Date(slot.start).toLocaleTimeString(
                      "en-IN",
                      {
                        hour: "numeric",
                        minute: "2-digit",
                      }
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Customer details */}
        {selectedSlot && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold">
              Your details
            </h2>

            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-4 w-full rounded-lg border p-3"
            />

            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-3 w-full rounded-lg border p-3"
            />

            <div className="mt-5 rounded-lg bg-gray-100 p-4">
              <p className="font-medium">
                {selectedService?.name}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                {new Date(
                  selectedSlot.start
                ).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                ₹{selectedService?.price}
              </p>
            </div>

            <button
              type="button"
              onClick={handleBooking}
              disabled={booking}
              className="mt-5 w-full rounded-lg bg-black p-3 font-medium text-white disabled:opacity-50"
            >
              {booking ? "Confirming..." : "Confirm Booking"}
            </button>

            {message && (
              <p className="mt-4 text-center font-medium">
                {message}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}