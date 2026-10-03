# JobSync AI: Home Feed, Featured and Advanced Find Jobs

## Apply the changes
```bash
npm install
npx prisma validate
npx prisma db push      # additive only: new tables/enums/indexes, no data is dropped
npx prisma generate
npm test
npm run dev
```
`prisma migrate reset` is NOT needed. Profile.avatarMediaId already exists in the schema in this zip,
so the AppShell error you saw means your *database* is behind the schema: `db push` fixes it.

## What changed
- **`/`** is the Home feed for signed-in users (landing page for visitors). `/dashboard` still exists under More.
- **Top navigation** (desktop) + **bottom navigation** (mobile). Messages and AI Assistant are honest placeholders/hubs.
- **Feed**: Post, PostMedia, PostReaction, Comment (1 reply level), CommentReaction, SavedPost, ContentReport.
  Cursor pagination on (createdAt, id); visibility + blocks enforced in SQL and re-checked on every single-post path.
- **Find Jobs** (`/jobs`): server-side keyword/location/skills/arrangement/type/level/min-salary/sort, URL state,
  desktop split view (`?job=<id>`), mobile full page (`/jobs/<id>`), "Create alert for this search".
- **Recommendations**: `lib/recommendations/jobs.ts` (pure, deterministic) + `services/jobs/job-recommendation.service.ts`.
- **Featured**: `services/social/featured.service.ts` + `<Featured category=... />` (admin FeaturedItem rows first, real-data fallback).
- **Notifications**: reactions, comments, replies, shares, connections, follows, job alerts; per-type preferences in Settings.
- **Search** (`/search`): people, jobs, companies, posts, skills.

## Not done / honest limits
- Not run against a database or browser here, and `next build` could not finish in the sandbox (no access to Google Fonts).
  `tsc --noEmit` passes and `npm test` passes (70 tests); please run the app and click through the flows.
- Messaging, learning, events, company pages and the admin Featured UI are not built (architecture only).
- Application-status notifications are not wired: applications are tracked by the user themself, so there is no external event to notify about.
- `jobAlertService.notifyForNewJob(job)` is ready but has no caller yet because no job-posting/import flow exists.
