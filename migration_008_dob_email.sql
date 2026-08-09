-- Migration: employee date of birth + email address
-- Run this in the Supabase SQL editor if your database already has the
-- schema from before this change.

alter table employees
  add column if not exists date_of_birth date,
  add column if not exists email text;

comment on column employees.date_of_birth is 'Employee''s date of birth.';
comment on column employees.email is 'Employee''s email address.';
