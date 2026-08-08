-- Migration: leave date
-- Run this in the Supabase SQL editor (after schema.sql / earlier migrations have already been applied)

alter table employees
  add column if not exists leave_date date;

comment on column employees.leave_date is 'Date the employee left. Set alongside marking the employee inactive.';
