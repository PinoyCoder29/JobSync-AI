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
- **Top navigation** (desktop) + **bottom navigation** (mobile). AI Assistant is a hub page.
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
- Learning, events, company pages and the admin Featured UI are not built (architecture only). Messaging IS built: see below.
- Application-status notifications are not wired: applications are tracked by the user themself, so there is no external event to notify about.
- `jobAlertService.notifyForNewJob(job)` is ready but has no caller yet because no job-posting/import flow exists.

# Update: real messaging, mobile notification bell, responsive Network cards

## Apply (database FIRST)
```bash
npm install
npx prisma validate
npx prisma db push      # additive only: no data is dropped, no reset
npx prisma generate
npm test
npm run dev
```
`db push` also fixes the known `Profile.avatarMediaId does not exist` error (your database was behind the schema).
What it adds: tables `Conversation`, `ConversationParticipant`, `Message`; enum value `NotificationType.MESSAGE`;
columns `Notification.conversationId` and `Profile.notifyMessages` (default true). Until it runs, Messages and Notifications
will error because the code selects the new columns.

## Messaging
- Flow: profile (`Message` button) -> `startConversationAction` -> `/messages/<conversationId>` (existing conversation is reused; one per pair via `pairKey`).
- Layers: `repositories/message.repository.ts` -> `services/messaging/messaging.service.ts` -> `app/api/*` + `app/actions/message.actions.ts` -> `components/messages/*`.
- API: `GET/POST /api/conversations`, `GET /api/conversations/:id`, `GET/POST /api/conversations/:id/messages`,
  `PATCH /api/conversations/:id/read`, `DELETE /api/messages/:id`, `GET /api/unread-counts`.
- Security: identity only from the session; non-participants and blocked pairs get 404; privacy follows profile visibility
  (PUBLIC = anyone, CONNECTIONS_ONLY = connections, PRIVATE = nobody; existing history stays readable); rate limited; text is escaped by React.
- Notifications reuse the existing system (`MESSAGE` type, per-conversation dedupe, honours the new Settings switch). Opening a chat clears them.
- Delete is a soft delete (content erased, placeholder stays).

## Honest limits
- New messages arrive by polling (chat every 4s, inbox 10s, badges 20s, only while the tab is visible). There are no WebSockets in this stack. Swap the pollers for SSE/Pusher/Ably if you need instant delivery.
- No online/"typing" status: nothing in the schema tracks presence, so it is not shown rather than faked.
- No message attachments yet (`MediaKind.MESSAGE` and the Cloudinary folder exist for it).
- The inbox shows the 50 most recent conversations.
- Rate limiting is in memory (see lib/rate-limit): per server instance.
