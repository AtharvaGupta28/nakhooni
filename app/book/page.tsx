"use client";

import { useEffect, useState } from "react";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatMonth,
  formatTime,
  todayInIndia,
} from "@/lib/time";
import { normalizeIndianPhone, normalizeName } from "@/lib/validation";

type Service = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
};

type Slot = {
  start: string;
  end: string;
};

type Step = "service" | "time" | "details" | "done";

type DaysResult = {
  key: string;
  days: string[];
  firstDate: string;
  lastDate: string;
};

type SlotsResult = {
  key: string;
  slots: Slot[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

export default function BookingPage() {
  const [step, setStep] = useState<Step>("service");

  const [services, setServices] = useState<Service[]>([]);
  const [servicesError, setServicesError] = useState(false);
  const [service, setService] = useState<Service | null>(null);

  const [month, setMonth] = useState(() => todayInIndia().slice(0, 7));
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<Slot | null>(null);

  // Bumped after a failed booking so the calendar and slots reload.
  const [refreshKey, setRefreshKey] = useState(0);

  // Each result remembers the request it answers, so a result is only shown
  // for the current selection and anything else counts as still loading.
  const daysKey = service ? `${service.id}|${month}|${refreshKey}` : "";
  const slotsKey = service && date ? `${service.id}|${date}|${refreshKey}` : "";
  const [daysResult, setDaysResult] = useState<DaysResult | null>(null);
  const [slotsResult, setSlotsResult] = useState<SlotsResult | null>(null);

  const loadingDays = daysResult?.key !== daysKey;
  const availableDays = loadingDays ? [] : daysResult.days;
  const loadingSlots = !!slotsKey && slotsResult?.key !== slotsKey;
  const slots = slotsKey && !loadingSlots ? slotsResult!.slots : [];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/services")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setServices(data.services))
      .catch(() => setServicesError(true));
  }, []);

  // Load which days in the month have free slots.
  useEffect(() => {
    if (!service) return;

    let ignore = false;

    fetch(`/api/availability/days?serviceId=${service.id}&month=${month}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (ignore) return;

        setDaysResult({ key: daysKey, ...data });

        // Keep the chosen day if it is still free, otherwise pick the first.
        setDate((current) =>
          data.days.includes(current) ? current : data.days[0] ?? ""
        );
      })
      .catch(() => {
        if (ignore) return;

        setDaysResult({ key: daysKey, days: [], firstDate: "", lastDate: "" });
        setDate("");
      });

    return () => {
      ignore = true;
    };
  }, [service, month, daysKey]);

  // Load the free times for the chosen day.
  useEffect(() => {
    if (!service || !date) return;

    let ignore = false;

    fetch(`/api/availability?serviceId=${service.id}&date=${date}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (!ignore) setSlotsResult({ key: slotsKey, slots: data.slots });
      })
      .catch(() => {
        if (!ignore) setSlotsResult({ key: slotsKey, slots: [] });
      });

    return () => {
      ignore = true;
    };
  }, [service, date, slotsKey]);

  function chooseService(chosen: Service) {
    setService(chosen);
    setSlot(null);
    setMessage("");
    setStep("time");
  }

  function chooseSlot(chosen: Slot) {
    setSlot(chosen);
    setMessage("");
    setStep("details");
  }

  function startOver() {
    setService(null);
    setDate("");
    setSlot(null);
    setName("");
    setPhone("");
    setMessage("");
    setMonth(todayInIndia().slice(0, 7));
    setStep("service");
  }

  async function handleBooking(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!service || !slot) return;

    if (!normalizeName(name)) {
      setMessage("Please enter your name.");
      return;
    }

    if (!normalizeIndianPhone(phone)) {
      setMessage("Please enter a valid 10-digit mobile number.");
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
          serviceId: service.id,
          name,
          phone,
          startTime: slot.start,
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        // The slot was taken; send them back to pick another time.
        setSlot(null);
        setRefreshKey((key) => key + 1);
        setStep("time");
        setMessage(data.error);
        return;
      }

      if (!response.ok) {
        setMessage(data.error || "Booking failed. Please try again.");
        return;
      }

      setStep("done");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setBooking(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold">Nakhooni</h1>
        <p className="mt-1 text-gray-600">Book an appointment</p>

        {step === "service" && (
          <ServiceStep
            services={services}
            error={servicesError}
            onChoose={chooseService}
          />
        )}

        {step === "time" && service && (
          <div className="mt-10">
            <SelectedService
              service={service}
              onChange={() => setStep("service")}
            />

            {message && (
              <p className="mt-6 rounded-lg bg-red-50 p-3 text-red-700">
                {message}
              </p>
            )}

            <div className="mt-8 grid gap-8 sm:grid-cols-[1fr_12rem]">
              <Calendar
                month={month}
                availableDays={availableDays}
                selectedDate={date}
                canGoBack={month > todayInIndia().slice(0, 7)}
                canGoForward={
                  !!daysResult?.lastDate &&
                  month < daysResult.lastDate.slice(0, 7)
                }
                loading={loadingDays}
                onMonthChange={(delta) => setMonth(shiftMonth(month, delta))}
                onSelect={setDate}
              />

              <div>
                <h2 className="font-semibold">
                  {date ? formatDate(date) : "Available times"}
                </h2>

                {(loadingDays || loadingSlots) && (
                  <p className="mt-4 text-gray-500">Checking availability...</p>
                )}

                {!loadingDays && !date && (
                  <p className="mt-4 text-gray-500">
                    No available days this month. Try the next month.
                  </p>
                )}

                {!loadingDays && !loadingSlots && date && slots.length === 0 && (
                  <p className="mt-4 text-gray-500">
                    No available times for this date.
                  </p>
                )}

                {!loadingDays && !loadingSlots && (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-1">
                    {slots.map((slot) => (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => chooseSlot(slot)}
                        className="rounded-lg border p-3 hover:border-black hover:bg-gray-50"
                      >
                        {formatTime(slot.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === "details" && service && slot && (
          <form onSubmit={handleBooking} className="mt-10">
            <BookingSummary service={service} slot={slot} />

            <button
              type="button"
              onClick={() => setStep("time")}
              className="mt-3 text-sm text-gray-600 underline"
            >
              Change time
            </button>

            <h2 className="mt-8 text-xl font-semibold">Your details</h2>

            <input
              type="text"
              placeholder="Name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-4 w-full rounded-lg border p-3"
              required
            />

            <input
              type="tel"
              placeholder="10-digit mobile number"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-3 w-full rounded-lg border p-3"
              required
            />

            <button
              type="submit"
              disabled={booking}
              className="mt-5 w-full rounded-lg bg-black p-3 font-medium text-white disabled:opacity-50"
            >
              {booking ? "Confirming..." : "Confirm Booking"}
            </button>

            {message && (
              <p className="mt-4 text-center font-medium text-red-700">
                {message}
              </p>
            )}
          </form>
        )}

        {step === "done" && service && slot && (
          <div className="mt-10">
            <h2 className="text-2xl font-semibold">Booking confirmed!</h2>
            <p className="mt-2 text-gray-600">
              Thank you, {name.trim()}. We look forward to seeing you.
            </p>

            <div className="mt-6">
              <BookingSummary service={service} slot={slot} />
            </div>

            <button
              type="button"
              onClick={startOver}
              className="mt-6 rounded-lg border px-5 py-3 font-medium hover:bg-gray-50"
            >
              Book another appointment
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function ServiceStep({
  services,
  error,
  onChoose,
}: {
  services: Service[];
  error: boolean;
  onChoose: (service: Service) => void;
}) {
  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold">Choose a service</h2>

      {error && (
        <p className="mt-4 text-red-700">
          Could not load services. Please refresh the page.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => onChoose(service)}
            className="flex w-full items-center justify-between gap-4 rounded-xl border p-5 text-left hover:border-black"
          >
            <div>
              <p className="font-semibold">{service.name}</p>

              {service.description && (
                <p className="mt-1 text-sm text-gray-500">
                  {service.description}
                </p>
              )}

              <p className="mt-1 text-sm text-gray-500">
                {formatDuration(service.duration_minutes)}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-medium">₹{service.price}</p>
              <p className="mt-1 text-sm underline">Book</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectedService({
  service,
  onChange,
}: {
  service: Service;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-100 p-4">
      <div>
        <p className="font-semibold">{service.name}</p>
        <p className="text-sm text-gray-600">
          {formatDuration(service.duration_minutes)} · ₹{service.price}
        </p>
      </div>

      <button
        type="button"
        onClick={onChange}
        className="text-sm text-gray-600 underline"
      >
        Change
      </button>
    </div>
  );
}

function BookingSummary({ service, slot }: { service: Service; slot: Slot }) {
  return (
    <div className="rounded-xl bg-gray-100 p-4">
      <p className="font-semibold">{service.name}</p>
      <p className="mt-1 text-gray-700">
        {formatDateTime(slot.start)} – {formatTime(slot.end)}
      </p>
      <p className="mt-1 text-sm text-gray-600">
        {formatDuration(service.duration_minutes)} · ₹{service.price}
      </p>
    </div>
  );
}

function Calendar({
  month,
  availableDays,
  selectedDate,
  canGoBack,
  canGoForward,
  loading,
  onMonthChange,
  onSelect,
}: {
  month: string;
  availableDays: string[];
  selectedDate: string;
  canGoBack: boolean;
  canGoForward: boolean;
  loading: boolean;
  onMonthChange: (delta: number) => void;
  onSelect: (date: string) => void;
}) {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`
    ),
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="rounded-lg px-3 py-1 text-xl hover:bg-gray-100 disabled:invisible"
        >
          ‹
        </button>

        <h2 className="font-semibold">{formatMonth(month)}</h2>

        <button
          type="button"
          onClick={() => onMonthChange(1)}
          disabled={!canGoForward}
          aria-label="Next month"
          className="rounded-lg px-3 py-1 text-xl hover:bg-gray-100 disabled:invisible"
        >
          ›
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday}>{weekday}</div>
        ))}
      </div>

      <div
        className={`mt-2 grid grid-cols-7 gap-1 ${loading ? "opacity-50" : ""}`}
      >
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;

          const available = availableDays.includes(date);
          const selected = date === selectedDate;

          return (
            <button
              key={date}
              type="button"
              disabled={!available || loading}
              onClick={() => onSelect(date)}
              className={`aspect-square rounded-full text-sm ${
                selected
                  ? "bg-black font-semibold text-white"
                  : available
                    ? "font-semibold hover:bg-gray-100"
                    : "text-gray-300"
              }`}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
