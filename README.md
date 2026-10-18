# Self Accountability

A phone app (iOS and Android, built with Expo / React Native) that keeps you accountable for the things you say you'll do.

## What it does

- **Commit to a goal on a day and time.** Add what you'll do, when, how long it takes, and *why it matters*.
- **Get a plan automatically.** Each goal is broken into small steps: a 2-minute setup, a 5-minute "just start" step, then focus blocks with breaks for longer goals. Check off steps as you go.
- **Get reminded and nudged.** Local notifications fire:
  - the night before (8 PM), with your first step
  - that morning (8 AM), with your "why"
  - 15 minutes before, and when it's time to start
  - check-ins 1 hour and 3 hours later until you mark it done
- **Stay encouraged.** Day streaks, a follow-through percentage, a "promise kept" message when you finish, and a "Missed" section that helps you move unfinished goals to today instead of quietly dropping them.

Everything stays on your phone. There's no account and no server.

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
