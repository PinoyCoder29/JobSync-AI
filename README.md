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

## Resume Analyzer and ATS Checker (Google Gemini)

- `/resume-analyzer` answers "how can I improve my resume?" (no job needed). `/ats-checker` answers "how well does my resume match THIS job?".
- Resume input: your JobSync resume, an uploaded PDF / DOCX / TXT (up to 4 MB), or pasted text. Job input (ATS): a JobSync job, a pasted description, or an uploaded file.
- Files are read in memory, text is extracted on the server (`unpdf` for PDF, `mammoth` for DOCX) and the file is then thrown away. Only the extracted text is sent to Gemini, and only the analysis result is saved.
- Add `GEMINI_API_KEY` to `.env` (key from https://aistudio.google.com/apikey). It is only read on the server. `GEMINI_MODEL` defaults to `gemini-2.5-flash`; change it if Google renames or retires that model.
- Results are saved in the existing `ResumeAnalysis` and `ATSAnalysis` tables (`provider = "gemini"`, `isDemo = false`) with the full report in the `details` JSON column. History is listed on each page.
- Same text analysed again = the saved result is shown (no new AI call). Use "Analyze again" / "Check again" for a fresh run. There is also a limit of 8 runs per 10 minutes per user.
- Keyword lists are verified in code against your real resume text, and overall scores are calculated from the category scores, so the numbers are explainable.
- After pulling these changes run `npm install`, `npx prisma db push` (adds the new analysis columns) and restart `npm run dev`.
- Not an ATS simulator: it can only flag "potential ATS concerns" from the text it can extract.

## Light / dark mode

The header switcher offers Light, Dark and System. The choice is saved in the browser (`localStorage`) and applied before the page paints, so there is no flash. All colours are CSS variables in `app/globals.css` (`:root` and `:root[data-theme="dark"]`). The resume preview stays white on purpose because it mirrors the printed PDF.

## Sign in with Google, GitHub and Facebook

Buttons on `/login` and `/register` appear only for providers whose keys are in `.env`. Restart `npm run dev` after editing `.env`.
Use this redirect URI (callback URL) for each provider: `http://localhost:3000/api/auth/callback/<google|github|facebook>`.

- **Google:** console.cloud.google.com -> APIs & Services -> Credentials -> Create OAuth client ID (Web application) -> add the redirect URI.
  You may need to set up the OAuth consent screen first. Put the values in `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
- **GitHub:** github.com/settings/developers -> New OAuth App -> Authorization callback URL = the redirect URI. Use `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`.
- **Facebook:** developers.facebook.com -> Create App -> add "Facebook Login" -> Valid OAuth Redirect URIs = the redirect URI.
  App ID and App Secret go in `AUTH_FACEBOOK_ID` / `AUTH_FACEBOOK_SECRET`. While the app is in Development mode only you and added testers can log in; switch it to Live for everyone.

Behaviour to know: social users are stored in the same `User`/`Account` tables and get a Profile automatically. If someone signs up with email + password and later clicks Google with the SAME email, Auth.js blocks it (`OAuthAccountNotLinked`) on purpose, to prevent account takeover through a provider that doesn't verify emails. Facebook accounts that don't share an email cannot sign up, because our User table needs one.

## Resume builder

`/resume` is a step-by-step wizard: Personal Info -> Experience (yes/no) -> Work History -> Internship -> Education -> Skills -> Projects -> Certifications & Training -> Preview & Download PDF.
Each **Continue** validates the step on the server (Zod) and saves it to PostgreSQL through Prisma (`resume.service` -> `resume.repository`, one transaction per step).
The wizard remembers your last step (`Resume.lastStep`). The PDF is a real text-based, single-column, ATS-friendly document made in the browser with `@react-pdf/renderer`.
"Create New Resume" deletes the resume and all its sections (cascade).

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

Resume Analyzer and ATS Checker use Google Gemini. Interview feedback and job match scores are still deterministic DEMO logic and are labeled as such in the UI.

## Notes

- Settings toggles are saved in the database but email delivery / employer visibility are not built yet.
- Credentials login uses JWT sessions (an Auth.js requirement for the Credentials provider). The Prisma Adapter still owns the User/Account tables, so adding OAuth later needs no schema change.
- `npx prisma db push --force-reset` and `migrate reset` DELETE all data. Don't run them on data you care about.
