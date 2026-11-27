# Daymarks

Mark the days you did your activities. Give each activity an emoji, tap the days you did it, and see streaks and insights. You can mark as many activities on one day as you like.

Everything runs in the browser. There's no account and no server, and your data stays on your device (`localStorage`). Every feature is free.

## Features

- **Activities with emoji:** a name, an emoji (pick from the grid or type any emoji), a color, and an optional weekly goal (1–7 times a week).
- **Two ways to mark:**
  - Select an activity chip, then tap days to toggle it.
  - Select **All** and tap a day to tick several activities on a checklist. You can also long-press or right-click any day to open the checklist (Shift+Enter from the keyboard).
- **Month view:** every activity's emoji in each day, or one activity in focus with the others as dots.
- **Year view:** 12 mini-months as a heatmap, either of all activities or of one.
- **Insights:** days marked, completion %, current and best streak, weekly-goal hit rate and week streak, day-of-week and monthly charts, and a year heatmap. Filter by this month, this year, a past year, or all time.
- **Share a month** as a PNG, using the share sheet on phones or a download on desktop.
- **Installable and offline:** add it to your home screen and it works without a connection.
- Light and dark themes, and weeks can start on Monday or Sunday.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (dates, stats, data migration)
npm run build      # type-check and production build in dist/
npm run preview    # serve the production build
npm run icons      # regenerate PWA icons and favicon
```

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository, on the `main` branch.
2. In the repository, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Each push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml). It tests, builds, and publishes the site to `https://<user>.github.io/<repo>/`.

If the repository is named `<user>.github.io`, set `BASE_PATH` to `/` in the workflow.

## Your data

Data is saved in this browser's `localStorage` under the key `daymarks:v1`. It doesn't sync between devices or browsers. Clearing site data, or browsing in a private window, removes it.

## Project layout

```
src/lib/dates.ts       local-date keys ("YYYY-MM-DD"), month grids, week math
src/lib/stats.ts       streaks, completion, weekly goals, distributions (pure, unit-tested)
src/lib/shareImage.ts  draws a month on a canvas for sharing
src/state/schema.ts    data types, validation and migration
src/state/store.ts     localStorage persistence and all data changes
src/ui/*               views (month, year, insights, activities) and dialogs
```
