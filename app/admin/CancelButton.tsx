"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelButton({
  appointmentId,
}: {
  appointmentId: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancelAppointment() {
    if (!confirm("Cancel this appointment?")) {
      return;
    }

    setLoading(true);

    const response = await fetch("/api/admin/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appointmentId,
      }),
    });

    if (response.ok) {
      router.refresh();
    } else {
      alert("Could not cancel appointment.");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={cancelAppointment}
      disabled={loading}
      className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "Cancelling..." : "Cancel"}
    </button>
  );
}