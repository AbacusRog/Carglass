-- Migration: leave date
-- Run this in the Supabase SQL editor if your database already has the
-- schema from before this change.

alter table employees
  add column if not exists leave_date date;

comment on column employees.leave_date is 'Once set, the employee is no longer auto-added to newly created pay periods after this month. Existing timesheets are untouched.';
