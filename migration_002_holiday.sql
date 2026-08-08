-- Migration: start date + holiday tracking
-- Run this in the Supabase SQL editor (after schema.sql has already been applied)

alter table employees
  add column if not exists start_date date,
  add column if not exists holiday_entitlement_days numeric(6,2) not null default 28;

alter table timesheets
  add column if not exists holiday_days numeric(6,2) not null default 0;

comment on column employees.holiday_entitlement_days is 'Annual paid holiday entitlement, in days.';
comment on column timesheets.holiday_days is 'Holiday days taken during this pay period. Paid at the day rate, same as days_worked.';
