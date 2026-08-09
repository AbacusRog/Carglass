-- Migration: employee address + National Insurance number
-- Run this in the Supabase SQL editor if your database already has the
-- schema from before this change.

alter table employees
  add column if not exists address text,
  add column if not exists ni_number text;

comment on column employees.address is 'Employee''s home address.';
comment on column employees.ni_number is 'Employee''s National Insurance number.';
