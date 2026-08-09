-- Timesheet / Gross Wage Calculator schema
-- Run this in the Supabase SQL editor for your project

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  annual_wage numeric(12,2) not null,
  working_days_per_year numeric(6,2) not null default 253,
  working_hours_per_day numeric(6,2) not null default 8.5,
  start_date date,
  leave_date date,
  holiday_entitlement_days numeric(6,2) not null default 28,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pay_periods (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null check (month between 1 and 12),
  created_at timestamptz not null default now(),
  unique (year, month)
);

create table if not exists timesheets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  pay_period_id uuid not null references pay_periods(id) on delete cascade,
  days_worked numeric(6,2) not null default 0,
  extra_hours numeric(6,2) not null default 0,
  missing_hours numeric(6,2) not null default 0,
  holiday_days numeric(6,2) not null default 0,
  full_month boolean not null default false,
  annual_wage numeric(12,2),
  working_days_per_year numeric(6,2),
  working_hours_per_day numeric(6,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, pay_period_id)
);

create table if not exists adjustments (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references timesheets(id) on delete cascade,
  kind text not null check (kind in ('addition', 'deduction')),
  label text not null,          -- e.g. 'Bonus', 'Glass Damage'
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table employees enable row level security;
alter table pay_periods enable row level security;
alter table timesheets enable row level security;
alter table adjustments enable row level security;

-- Only signed-in users can read/write (adjust later if you want public view)
create policy "auth read employees" on employees for select using (auth.role() = 'authenticated');
create policy "auth write employees" on employees for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "auth read pay_periods" on pay_periods for select using (auth.role() = 'authenticated');
create policy "auth write pay_periods" on pay_periods for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "auth read timesheets" on timesheets for select using (auth.role() = 'authenticated');
create policy "auth write timesheets" on timesheets for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "auth read adjustments" on adjustments for select using (auth.role() = 'authenticated');
create policy "auth write adjustments" on adjustments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
