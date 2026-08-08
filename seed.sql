-- Optional: seed employees from the original Hourly / Daily Rates sheet.
-- Run in the Supabase SQL editor after schema.sql, if you want a starting point.

insert into employees (name, annual_wage, working_days_per_year, working_hours_per_day) values
  ('Fred', 33000, 253, 8.5),
  ('Thales', 31000, 253, 8.5),
  ('Flynn', 24000, 253, 8.5),
  ('Alfi Gibson', 30000, 253, 8.5)
on conflict do nothing;

-- Optional: create the current month so there's something to open right away.
insert into pay_periods (year, month) values
  (extract(year from current_date)::int, extract(month from current_date)::int)
on conflict do nothing;
