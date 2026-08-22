-- Migration: editable holiday balances
-- Run this in the Supabase SQL editor if your database already has the
-- schema from before this change.

create table if not exists holiday_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  year int not null,
  days_taken numeric(6,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (employee_id, year)
);

alter table holiday_balances enable row level security;

create policy "auth read holiday_balances" on holiday_balances for select using (auth.role() = 'authenticated');
create policy "auth write holiday_balances" on holiday_balances for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Seed each employee's current year balance from whatever's already been
-- logged on the Monthly Timesheet, so switching to the editable figure
-- doesn't lose anything already recorded.
insert into holiday_balances (employee_id, year, days_taken)
select
  t.employee_id,
  p.year,
  sum(t.holiday_days)
from timesheets t
join pay_periods p on p.id = t.pay_period_id
group by t.employee_id, p.year
on conflict (employee_id, year) do nothing;
