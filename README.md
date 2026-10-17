# Nakhooni

Appointment booking for Nakhooni nail studio. Next.js + Supabase, deployed on Vercel. All times are Indian Standard Time (Asia/Kolkata).

## Setup

Create `.env.local` (never commit it) with:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=sb_secret_...
ADMIN_EMAILS=owner@example.com
```

- `SUPABASE_SECRET_KEY` is the Supabase secret key. It is only used on the server.
- `ADMIN_EMAILS` is a comma-separated list of the Supabase Auth accounts allowed into `/admin`. Logging in with any other account is not enough.

Set the same four variables in Vercel (Project → Settings → Environment Variables) and redeploy.

In Supabase:

1. Run `supabase/security.sql` in the SQL editor, one section at a time.
2. Authentication → Sign In / Providers: turn off "Allow new users to sign up".

Then run locally:

```bash
npm install
npm run dev
```

## Booking rules

Set in `lib/availability.ts` and the `business_hours` table:

- Start times every 30 minutes from opening time.
- The service must finish by `close_time`. The stored closing times already include the 30-minute extension (e.g. 18:30 for a 6:00 PM close).
- No overlap with non-cancelled appointments or `blocked_times`. The database also enforces this (`appointments_no_overlap`).
- At least 3 hours' notice, up to 60 days ahead.
- At most 2 upcoming bookings per phone number.

## Pages

- `/` services and prices
- `/book` booking: service → date and time → details → confirmation
- `/login`, `/admin` view and cancel upcoming appointments
