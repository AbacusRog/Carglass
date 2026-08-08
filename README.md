# IFK Wage Ledger

A monthly timesheet and gross wage calculator: track days worked, extra/missing
hours, and custom additions/deductions (Bonus, Glass Damage, etc.) per employee,
per month, with full history.

## How the numbers work

For each employee:
- **Day rate** = annual wage ÷ working days/year
- **Hourly rate** = annual wage ÷ (working days/year × working hours/day)

For each employee's monthly timesheet:

```
gross wage = (days worked × day rate)
           + (extra hours × hourly rate)
           − (missing hours × hourly rate)
           + additions
           − deductions
```

## 1. Database setup (Supabase)

You've already created a Supabase project. In the Supabase dashboard:

1. Go to **SQL Editor → New query**, paste the contents of `schema.sql`, and run it.
   This creates the `employees`, `pay_periods`, `timesheets`, and `adjustments`
   tables with Row Level Security requiring a signed-in user for all reads/writes.
2. Optional: run `seed.sql` to pre-load the four employees from your original
   rate sheet (Fred, Thales, Flynn, Alfi Gibson) and create the current month.
3. Go to **Authentication → Users** and add an account for anyone who needs
   access (email + password). There's no self-service sign-up screen in the
   app on purpose — you control who gets an account.

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
  set each person's annual wage and working days/hours.
- **Monthly Timesheet** page — create a new month with "+ New month", pick
  any month from the tabs, and for each employee enter days worked, extra
  hours, and missing hours. Click **Adjust** on a row to add or remove named
  additions/deductions (Bonus, Glass Damage, etc.) — the gross wage updates
  live. Every month you create stays in the tab list, so past months remain
  visible and editable.
