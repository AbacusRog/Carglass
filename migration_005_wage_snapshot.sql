-- Migration: per-month wage rate snapshot
-- Run this in the Supabase SQL editor if your database already has the
-- schema from before this change.
--
-- These columns capture an employee's annual wage / working days / working
-- hours at the moment a given month's timesheet row is first created. That
-- way, editing an employee's pay later only affects months created from
-- then on — months already generated keep being calculated at the rate
-- they were created with.

alter table timesheets
  add column if not exists annual_wage numeric(12,2),
  add column if not exists working_days_per_year numeric(6,2),
  add column if not exists working_hours_per_day numeric(6,2);

comment on column timesheets.annual_wage is 'Employee''s annual wage as it stood when this timesheet row was created. NULL falls back to the employee''s current record.';
comment on column timesheets.working_days_per_year is 'Employee''s working days/year as it stood when this timesheet row was created. NULL falls back to the employee''s current record.';
comment on column timesheets.working_hours_per_day is 'Employee''s working hours/day as it stood when this timesheet row was created. NULL falls back to the employee''s current record.';

-- Lock in every existing timesheet row to the employee's rate as it stands
-- right now, at the moment you run this migration. This is important: run
-- this BEFORE you next change anyone's annual wage — otherwise all of
-- their past months (which have no snapshot yet) would silently pick up
-- the new rate too, which is exactly what this feature is meant to avoid.
-- (There's no way to recover exactly what someone was paid before today if
-- it was never stored — this backfill freezes "current" as the best
-- available record for everything already on the books.)
update timesheets t
set
  annual_wage = e.annual_wage,
  working_days_per_year = e.working_days_per_year,
  working_hours_per_day = e.working_hours_per_day
from employees e
where t.employee_id = e.id
  and t.annual_wage is null;
