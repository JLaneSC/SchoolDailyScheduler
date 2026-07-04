# SchoolDailyScheduler

A homeschool scheduling app: manages students, a 180-day school-year
schedule, state-level grade standards, per-subject notes/progress entries,
AI-driven progress acknowledgment, and mastery-based adaptive scheduling. It
produces a Google-Calendar-importable file and a shareable Markdown document.

The user is **learning React while building this**. Favor conventional,
well-documented patterns over clever ones; explain non-obvious choices in
commit messages or brief comments rather than silently picking the "smart"
option.

This project is governed by `claude-code-governance-framework.md` (Karpathy's
three-layer method: Spec, Verifier, Environment, plus Loop Engineering). Work
in small, checkpointed steps — do not silently expand scope beyond what was
agreed for the current milestone.

## Tech stack

| Concern | Choice |
|---|---|
| Frontend | React 19 (JavaScript, not TypeScript), Vite 8 |
| Routing | react-router-dom |
| Data fetching | @tanstack/react-query |
| Backend | Supabase (Postgres, Auth, Edge Functions) |
| AI | Anthropic Claude API — called **only** from a server-side Supabase Edge Function, never from client code |
| State management | Plain React hooks/Context — no Redux/Zustand unless a real need emerges |
| Linting | ESLint flat config (`eslint.config.js`) — `npm run lint` must pass clean |

## Repo structure

```
src/
  App.jsx              -- layout + <Routes>
  main.jsx             -- QueryClientProvider + BrowserRouter root
  lib/                 -- shared low-level clients (e.g. supabaseClient.js)
  features/            -- one folder per domain area, colocating UI + data access
    students/
      *Page.jsx, *Form.jsx, *ListItem.jsx  -- UI
      *Api.js                              -- thin Supabase query functions
      use*.js                              -- react-query hooks
  components/          -- shared, dumb/presentational UI
  hooks/                -- cross-feature hooks
  styles/
  assets/
supabase/
  migrations/           -- SQL migration files, applied manually by the user for now
```

New domains (schedule, standards, progress, etc.) get their own
`features/<domain>/` folder following the same shape as `features/students/`.

## Permission tiers

**Always do (no confirmation needed):**
- Read/search files; run `npm run lint`, `npm run dev`, `npm run build`.
- Create/edit files inside `src/` and `supabase/migrations/` in line with an
  already-agreed plan.
- Local `git commit` once a checkpoint is approved.

**Ask first:**
- Adding or removing npm dependencies.
- Anything touching git remotes: `git remote add`, `git push`, opening PRs.
- Running a migration against the **live** Supabase project (vs. just
  writing the SQL file).
- Deleting or renaming existing files/folders.
- Editing `eslint.config.js` or `vite.config.js`.

**Never do:**
- Commit `.env`, `.env.local`, or any file containing a real Supabase or
  Anthropic key.
- Put `ANTHROPIC_API_KEY` (or any server-only secret) in a `VITE_`-prefixed
  variable or anywhere shipped to the browser.
- Disable Row-Level Security on a table without explicit sign-off.
- Force-push or rewrite published git history.
- Run destructive SQL (`DROP`, `TRUNCATE`) against the live project without
  explicit confirmation.

A follow-up worth doing once the above rules are in place: a `PreToolUse`
hook that blocks `git add`/`git commit` from ever staging `.env`/`.env.local`
at the tool level, since prompt-level rules can be overridden. Not yet built.

## Skills

- `.claude/skills/supabase-crud-feature/` — the proven recipe for adding a
  new Supabase-backed CRUD feature (table + RLS policy shape, `*Api.js`
  shape, react-query hook shape, form shape), extracted from the Students
  feature. Reuse this for Subjects, Standards, Schedule entries, Progress
  entries, etc. rather than re-deriving the pattern each time.

## Environment variables

See `.env.example` for the full list. `VITE_`-prefixed variables are bundled
into client code and are only safe for values protected by Supabase Row-Level
Security (e.g. the Supabase anon key, by design). Server-only secrets (like
`ANTHROPIC_API_KEY`) must be set as Supabase Edge Function secrets, never as
a `VITE_` variable.
