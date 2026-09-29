# JobSync AI

Next.js (App Router) + TypeScript + Bootstrap 5 + Prisma + PostgreSQL (Neon) + Auth.js.

## Run it

1. Install Node.js 20 or newer.
2. Create a free PostgreSQL database at neon.tech and copy both connection strings
   (pooled -> `DATABASE_URL`, direct -> `DIRECT_URL`).
3. In this folder:

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
# edit .env: DATABASE_URL, DIRECT_URL; then generate the secret:
npx auth secret             # or: openssl rand -base64 32  -> paste into AUTH_SECRET
npx prisma format
npx prisma migrate dev --name init     # or: npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Demo logins (created by the seed; password for both: `JobSync!2025`)

| Email | Purpose |
|---|---|
| camille.reyes@jobsync.dev | Full demo data (resume, applications, saved jobs, interviews, analyses) |
| marco.santos@jobsync.dev | Second user to test that data is isolated between accounts |

## Checks

```bash
npm run typecheck
npm run build
```

## Architecture

```
page / server action  ->  service  ->  repository  ->  Prisma  ->  PostgreSQL
```

- `app/` routes and server actions (`app/actions/`)
- `services/` business logic; `repositories/` all Prisma queries
- `lib/validations/` Zod schemas, used server-side
- `auth.ts` + `auth.config.ts` + `middleware.ts`: Auth.js (Credentials, JWT sessions, Prisma Adapter)
- User identity ALWAYS comes from the session (`lib/session.ts`), never from the client.

## Where to connect real providers later

- Jobs: implement `JobProvider` in `services/job-provider.service.ts` and return it from `getJobProvider()`.
- AI: implement `AIProvider` in `services/ai/types.ts` and return it from `getAIProvider()` in `services/ai/index.ts`.
- Job matching: replace `computeMatch` in `services/job-match.service.ts`.

Until then, analyses, ATS results, interview feedback and match scores are deterministic DEMO logic and are labeled as such in the UI.

## Notes

- Settings toggles are saved in the database but email delivery / employer visibility are not built yet.
- Credentials login uses JWT sessions (an Auth.js requirement for the Credentials provider). The Prisma Adapter still owns the User/Account tables, so adding OAuth later needs no schema change.
- `npx prisma db push --force-reset` and `migrate reset` DELETE all data. Don't run them on data you care about.
