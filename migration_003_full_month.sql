-- Migration: full month pay flag
-- Run this in the Supabase SQL editor if your database already has the
-- schema from before this change (after schema.sql / migration_002_holiday.sql).

alter table timesheets
  add column if not exists full_month boolean not null default false;

comment on column timesheets.full_month is 'When true, the employee is paid their flat monthly salary for this period instead of days/hours being totted up.';
