---
name: supabase-crud-feature
description: Add a new Supabase-backed CRUD feature (table + RLS + API wrapper + react-query hook + form + page), following the pattern proven by the Students feature.
---

# Adding a Supabase-backed CRUD feature

Use this whenever a new domain entity needs its own table and a basic
add/list/edit/delete UI (e.g. Subjects, Standards, Schedule entries,
Progress entries). It's the recipe that produced
`src/features/students/`, generalized for reuse.

## 1. Migration

Add a new file under `supabase/migrations/`, numbered after the last one
(e.g. `0002_*.sql`). For each new table:

```sql
create table if not exists <table_name> (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  -- entity-specific columns here
  created_at timestamptz not null default now()
);

alter table <table_name> enable row level security;

create policy "own rows" on <table_name>
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Never skip the `enable row level security` + policy pair — every table in
this app is scoped to `auth.uid()`.

## 2. Feature folder

Create `src/features/<domain>/` with:

- **`<domain>Api.js`** — thin wrapper functions over
  `supabase.from('<table_name>')`, one per operation (`get*`, `add*`,
  `update*`, `delete*`). Each function does exactly one Supabase call, throws
  on `error`, and returns `data`. See `src/features/students/studentsApi.js`.
- **`use<Domain>.js`** — a react-query hook: one `useQuery` for the list, one
  `useMutation` per write operation, each invalidating the list query key on
  success. See `src/features/students/useStudents.js`.
- **`<Domain>Form.jsx`** — controlled inputs, client-side validation for
  required fields before calling `onSubmit`, reused for both add and edit by
  accepting an optional `initialValues` prop. See
  `src/features/students/StudentForm.jsx`.
- **`<Domain>ListItem.jsx`** — renders one row; toggles into the form
  component for inline editing. See
  `src/features/students/StudentListItem.jsx`.
- **`<Domain>sPage.jsx`** — composes the hook, the add form, and the list.
  See `src/features/students/StudentsPage.jsx`.

## 3. Wire it into routing

Add a `<Route>` in `src/App.jsx` and a nav `<Link>` if the feature has its
own top-level page.

## 4. Verify

- `npm run lint` and `npm run build` both pass.
- Exercise add/edit/delete in the browser; confirm rows appear/disappear in
  the Supabase Table Editor, not just in local state (hard-refresh to prove
  it round-trips through Postgres).
- Confirm RLS is enabled and the "own rows" policy exists on the new table.
