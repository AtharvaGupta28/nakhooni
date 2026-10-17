-- Nakhooni: database hardening.
-- Run in the Supabase SQL editor, one section at a time, AFTER the app code
-- that uses SUPABASE_SECRET_KEY has been deployed (or is running locally).
-- Every statement is safe to run more than once.


-- 1. Check for overlapping appointments.
--    This must return NO rows before step 3 will succeed. If it returns rows,
--    cancel one of each pair (update appointments set status = 'cancelled'
--    where id = ...) and run it again.

select
  a.id as appointment_a,
  a.start_time as a_start,
  a.end_time as a_end,
  b.id as appointment_b,
  b.start_time as b_start,
  b.end_time as b_end
from appointments a
join appointments b
  on a.id < b.id
 and a.status <> 'cancelled'
 and b.status <> 'cancelled'
 and tstzrange(a.start_time, a.end_time, '[)')
     && tstzrange(b.start_time, b.end_time, '[)');


-- 2. Basic data rules.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_valid_range'
  ) then
    alter table public.appointments
      add constraint appointments_valid_range check (end_time > start_time);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_valid_status'
  ) then
    alter table public.appointments
      add constraint appointments_valid_status
      check (status in ('confirmed', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'blocked_times_valid_range'
  ) then
    alter table public.blocked_times
      add constraint blocked_times_valid_range check (end_time > start_time);
  end if;
end $$;


-- 3. Make double-booking impossible, even when two people book at once.
--    '[)' means an appointment ending at 1:00 PM does not clash with one
--    starting at 1:00 PM.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_no_overlap'
  ) then
    alter table public.appointments
      add constraint appointments_no_overlap
      exclude using gist (
        tstzrange(start_time, end_time, '[)') with &&
      )
      where (status <> 'cancelled');
  end if;
end $$;

-- Speeds up the "upcoming bookings per phone number" check.
create index if not exists customers_phone_idx on public.customers (phone);


-- 4. Block direct access with the public (publishable) key.
--    With RLS on and no policies, only the server (secret key) can read or
--    write these tables. Customer names and phone numbers stop being public.

alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.business_hours enable row level security;
alter table public.blocked_times enable row level security;
alter table public.business_settings enable row level security;

-- Check: every row should show rowsecurity = true.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'services',
    'customers',
    'appointments',
    'business_hours',
    'blocked_times',
    'business_settings'
  )
order by tablename;


-- 5. Old test data. First look at what is there:

select a.id, a.start_time, a.end_time, a.status, c.name, c.phone
from appointments a
join customers c on c.id = a.customer_id
order by a.start_time;

-- Then cancel any test bookings by id, e.g. the 23 Sep 2026 test booking:
-- update appointments set status = 'cancelled' where id = <id>;
