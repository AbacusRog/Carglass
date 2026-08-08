# Carglass Wage Ledger

A monthly timesheet and gross wage calculator: track days worked, extra/missing
hours, and custom additions/deductions (Bonus, Glass Damage, etc.) per employee,
per month, with full history.

## How the numbers work

For each employee:
- **Day rate** = annual wage ÷ working days/year
- **Hourly rate** = annual wage ÷ (working days/year × working hours/day)

For each employee's monthly timesheet:

```
gross wage = ((days worked + holiday days) × day rate)
           + (extra hours × hourly rate)
           − (missing hours × hourly rate)
           + additions
           − deductions
```

Holiday days are paid leave, so they're paid at the day rate just like days
actually worked — they're just tracked in their own column so you can report
on them separately.

If **Full month** is ticked for an employee on a given month, the base pay
switches from days-worked × day rate to their flat monthly salary (annual
wage ÷ 12) — days worked is disabled since it's no longer used. Extra hours
and missing hours stay editable and still adjust pay on top, so you can still
account for the odd extra or missing hour in an otherwise full month.

## 1. Database setup (Supabase)

If this is a fresh Supabase project, in the SQL editor:

1. Run `schema.sql` — creates `employees`, `pay_periods`, `timesheets`, and
   `adjustments`, with Row Level Security requiring a signed-in user for all
   reads/writes. This already includes `start_date`, `holiday_entitlement_days`,
   and `holiday_days`.
2. Optional: run `seed.sql` to pre-load Fred, Thales, Flynn, and Alfi Gibson,
   plus the current month.
3. Go to **Authentication → Users** and add an account for anyone who needs
   access. There's no self-service sign-up screen on purpose — you control
   who gets an account.

If you already ran an earlier version of `schema.sql`, run whichever
migrations you're missing, in order:
1. `migration_002_holiday.sql` — adds `start_date`, `holiday_entitlement_days`
   on employees and `holiday_days` on timesheets.
2. `migration_003_full_month.sql` — adds `full_month` on timesheets (the
   "pay full month" checkbox).

Both are safe to run on an existing database — they don't touch existing data.

## 2. Run it locally

```bash
npm install
npm run dev
```

The `.env` file already has your project's URL and anon key filled in — the
anon key is safe to expose in frontend code, since Row Level Security is what
actually controls access. `.env` is git-ignored so it won't get committed.

## 3. Deploy (GitHub + Cloudflare Pages)

1. Create a new GitHub repo and push this project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-new-repo-url>
   git push -u origin main
   ```
2. In Cloudflare Pages, create a new project connected to that repo, using:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. In the Cloudflare Pages project settings, add two environment variables
   (Settings → Environment variables) so the production build can reach
   Supabase — `.env` itself is never committed, so this step is required:
   - `VITE_SUPABASE_URL` → `https://wnyfpcycjocoaajrsdgh.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` → (the anon key from your `.env`)
4. Deploy. Every push to `main` will redeploy automatically.

## Using the app

- **Employees** page — add, edit, remove (soft-remove or fully delete), and
  set each person's annual wage, working days/hours, start date, and annual
  holiday entitlement.
- **Monthly Timesheet** page — create a new month with "+ New month", pick
  any month from the tabs, and for each employee enter days worked, holiday
  days, extra hours, and missing hours — or tick **Full month** to simply pay
  their standard monthly salary for that period instead. Click **Adjust** on
  a row to add or remove named additions/deductions (Bonus, Glass Damage,
  etc.) — the gross wage updates live. Every month you create stays in the
  tab list, so past months remain visible and editable.
- **Holiday Report** page — pick a year and see, per employee, their annual
  entitlement, days taken (summed from every month's timesheet that year),
  and days remaining. For anyone who started partway through the year,
  adjust their entitlement figure on the Employees page to a pro-rated
  amount if needed.
