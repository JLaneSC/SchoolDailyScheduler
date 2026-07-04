# Supabase setup (manual, one-time)

Claude can write schema/code but cannot create cloud resources. Do this once:

1. Create a project at https://supabase.com (free tier is fine).
2. In **Authentication → Providers**, enable **Anonymous Sign-Ins**. This app
   signs users in anonymously on load so Row-Level Security has a real
   `auth.uid()` to check against — no login screen exists yet.
3. In **SQL Editor**, paste the contents of
   `supabase/migrations/0001_init.sql` and run it.
4. In **Project Settings → API**, copy the **Project URL** and the
   **anon public key**.
5. Copy `.env.example` to `.env.local` and fill in:
   ```
   VITE_SUPABASE_URL=<project url>
   VITE_SUPABASE_ANON_KEY=<anon public key>
   ```
6. Restart `npm run dev` so Vite picks up the new env file.

`.env.local` is gitignored — never commit it.
