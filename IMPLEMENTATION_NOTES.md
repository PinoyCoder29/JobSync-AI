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

# Update 2: OTP sign-up, comments/reactions, Messenger actions, presence, AI workspace, AI interviewer

## Apply (database FIRST)
```bash
npm install                 # adds nodemailer
npx prisma validate
npx prisma db push          # additive only; no reset, nothing dropped
npx prisma generate
npm test
```
Adds: `PendingSignup`, `MessageReaction`, `MessageHidden`; columns `Comment.editedAt`, `Message.editedAt/replyToId`,
`User.lastSeenAt`, `Profile.showOnlineStatus`, `InterviewSession.mode/focus/jobId/jobDescription/maxQuestions/report`,
`InterviewQuestion.isFollowUp`, `InterviewAnswer.details`. Existing rows get safe defaults.

## Environment (server-side only, never NEXT_PUBLIC_)
```env
EMAIL_USER="you@gmail.com"
EMAIL_APP_PASSWORD="16-char Google App Password"   # Google Account > Security > 2-Step Verification > App passwords
GEMINI_API_KEY="..."                               # already used by the analyzers; also powers the assistant + interviewer
```
Without `GEMINI_API_KEY` the assistant and interviewer fall back to a clearly-labelled demo mode (heuristic, built-in question bank).

## Email OTP sign-up
`/register` -> PendingSignup row + emailed 6-digit code -> `/verify-email` -> User created with `emailVerified` -> signed in.
No User exists until the code is confirmed, so an unverified email can never log in, and **existing accounts are untouched**.
Code: `crypto.randomInt`, stored only as an HMAC (keyed with AUTH_SECRET, bound to the email), 5-minute expiry, 5 attempts
(atomic counter), 60s resend cooldown, max 5 sends, one-time use (row deleted on success), plus per-IP/per-email rate limits.
Social logins (Google/GitHub/Facebook) skip OTP: the provider already verified the address.

## Default avatar
`Avatar` renders deterministic initials on a name-derived colour (no stored image, no fake face); a Cloudinary photo replaces it.

## Messenger
React / reply / copy / edit / delete-for-me / delete-for-everyone from a per-message menu (only valid actions shown).
Delete-for-me = `MessageHidden` row (other person unaffected). Delete-for-everyone = sender only, content erased, placeholder stays.
Notifications stay generic ("X sent you a message"); content never enters the notification table.

## Presence
Heartbeat every 45s (visible tab) updates `User.lastSeenAt` (write throttled to 1/30s in SQL). Online = seen < 2 min.
Privacy: **reciprocal** - turn off "Show my online status" in Settings and you neither show nor see status. Profile page uses coarse wording
("Last active recently", nothing after 24h); Messenger shows "Last active 8m ago". Transport is polling; the DTO/privacy layer is
transport-agnostic so SSE/WebSocket can replace the heartbeat later.

## AI interviewer
`/interview/live`: pick type (HR, Behavioral, Technical, Situational, Frontend, Backend, Full Stack, Custom Job), optional job/description.
Server asks Gemini for the next question/follow-up per answer (schema-validated, answers framed as untrusted data), stores Q/A in the existing
interview tables, final scores = plain averages of per-answer scores. Voice = browser Web Speech API (TTS + hold-to-talk STT); only the **text
transcript** reaches the server. Chrome/Edge/Safari support recognition; Firefox users type.

## Honest limits
- Tested here: 136 unit tests, typecheck, and the new screens in headless Chromium at 320-1440px (interactive, zero JS errors).
  NOT tested here: real Gmail delivery, real Gemini output quality, the database (Prisma engines are blocked in this sandbox), real microphones.
- Rate limiter is in-memory per server instance (OTP attempts/cooldown/send-count are durable in the database).
- Message edit/delete-for-everyone have no time limit. No message-reaction notifications. No report-message feature.
