-- Migration: reusable adjustment types (Bonus, Glass Damage, etc.)
-- Run this in the Supabase SQL editor if your database already has the
-- schema from before this change.

create table if not exists adjustment_types (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  kind text not null check (kind in ('addition', 'deduction')),
  created_at timestamptz not null default now(),
  unique (label, kind)
);

alter table adjustment_types enable row level security;

create policy "auth read adjustment_types" on adjustment_types for select using (auth.role() = 'authenticated');
create policy "auth write adjustment_types" on adjustment_types for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Optional: seed it with the types already used across your existing timesheets,
-- so the dropdown starts populated instead of empty.
insert into adjustment_types (label, kind)
select distinct label, kind from adjustments
on conflict (label, kind) do nothing;
