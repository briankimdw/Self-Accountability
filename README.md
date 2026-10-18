# Self Accountability

A phone app (iOS and Android, built with Expo / React Native) that keeps you accountable for the things you say you'll do.

## What it does

- **Goals with a plan.** Commit to something on a day and time, say *why it matters*, and get a step-by-step plan (2-minute setup, a 5-minute "just start" step, then focus blocks with breaks).
- **Reminders until it's done.** The night before, that morning, 15 minutes before, at start, then check-ins 1 and 3 hours later until you mark it done.
- **Job application tracker.** Paste a posting URL and the company is filled in for you (Greenhouse, Lever, Ashby, Workday and more). Set a daily target, and see today's count, the last 7 days, and how many days in a row you've hit it. Reminders nudge you at 10 AM and 6 PM until you hit the target.
  - **Duplicate detection:** the same posting is blocked even when the link has different tracking parameters (`utm_*`, `gh_src`, LinkedIn `currentJobId`, Indeed `jk`, ...). Applying to the same company and role again from a different link shows a warning.
  - Track status (Applied, Interview, Offer, Rejected), search, and filter.
- **Gym log.** Log workouts as exercises with sets of weight × reps. Tapping an exercise you've done before pre-fills last time's sets. Beating your previous best shows a 🏆 while you type. See personal records with estimated 1-rep max, workout history with total volume, and a nudge when it's been 3+ days.
- **Synced everywhere.** Data lives in a Supabase (Postgres) database, so your phone and the web version show the same thing. Row level security means each account can only read and write its own rows.

## Data

Tables (see `supabase/migrations/`): `goals`, `job_applications`, `workouts`, `workout_sets`, `settings`. The app connects with the public URL and publishable key in `.env`. These are safe to ship because row level security protects the data. Never put a secret or service-role key in the app.

New accounts confirm their email address by default. To skip that step, turn off **Confirm email** under Authentication → Sign In / Providers → Email in the Supabase dashboard.

## Run it on your phone

1. Install **Expo Go** from the App Store or Google Play.
2. On your computer (Node 20+):
   ```bash
   npm install
   npx expo start
   ```
3. Scan the QR code with your phone's camera (iOS) or the Expo Go app (Android).

> Note: Expo Go on Android doesn't fully support `expo-notifications`. For reliable reminders on Android, make a development build: `npx eas-cli@latest build --profile development --platform android`. On iOS, local notifications work in Expo Go.

## Development

```bash
npm run typecheck   # TypeScript
npx expo-doctor     # dependency/config health
```
