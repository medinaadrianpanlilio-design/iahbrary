# Security notes

This is the threat model and verification checklist for the public Iahbrary
copy. It is intentionally written for a portfolio reviewer: the goal is to show
the boundary, the tradeoffs, and the parts that still need work.

## Assets

- Supabase Auth identities and login emails
- Reading libraries, sessions, reviews, and highlights
- The service-role key used only for local catalog seeding
- The app's publishable/anon key (not a secret, but it must not be paired with a
  service-role key in the client)

## Trust boundaries

| Boundary | Trust |
| --- | --- |
| Expo client | Untrusted. A user can modify the JS bundle, call the REST API directly, or replay requests. |
| Supabase anon key | Public by design. It only gets whatever RLS allows. |
| Supabase service-role key | Fully trusted. It bypasses RLS and must never ship in the app or a public repo. |
| Postgres RLS | The real authorization boundary for personal data. |
| `SECURITY DEFINER` functions | Trusted code with a deliberately narrow interface and a fixed `search_path`. |

## Controls

### 1. Owner-only RLS

Every personal table is scoped to `auth.uid()`:

- `profiles`: `auth.uid()::text = id`
- `user_books`: `auth.uid()::text = user_id`
- `book_highlights`: `auth.uid()::text = user_id`
- `reading_sessions` and `book_reviews`: `EXISTS` against the parent
  `user_books` row, which must belong to `auth.uid()`; child writes must also
  use the same `book_id` as the parent, so a session or review cannot be
  re-parented onto another catalog row.

The shared `books` catalog is the only table with a public read policy. It is
insert-only for authenticated clients; there is no client update or delete
policy.

### 2. No email directory

The prototype stored `profiles.email` and exposed the table for unauthenticated
username -> email resolution. The public copy:

- drops the `profiles.email` column;
- signs in with email + password through Supabase Auth;
- uses the profile username only as a display name;
- exposes username availability through a boolean-only RPC.

The RPC reveals whether a display name is taken. It does not reveal an email,
user ID, or profile row.

### 3. Trigger-created profiles

`profiles` is created by `handle_new_user()` in the same transaction as the
`auth.users` insert. If the username is invalid or already taken, the trigger
raises and the signup is rolled back. This avoids the "auth user exists but has
no profile" state that a client-side follow-up insert can create.

### 4. Narrow `SECURITY DEFINER` functions

- `is_username_available(text)` returns a boolean and is granted to `anon` and
  `authenticated`.
- `delete_own_account()` has no arguments, derives the target from `auth.uid()`,
  and is granted only to `authenticated`.
- Both functions set `search_path` explicitly and use schema-qualified names.
- `delete_own_account()` deletes app rows and the auth user in one transaction.

`SECURITY DEFINER` is powerful, so the surface is intentionally tiny. There is
no generic "delete user by id" function and no client-side cross-table delete
sequence.

### 5. Secret handling

- `.env` is ignored; `.env.example` contains placeholders only.
- The client reads only `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `src/services/supabase.ts` rejects a key that starts with `sb_secret_`, which
  catches the most common "pasted the service key into the mobile app" mistake.
- `scripts/sync-supabase.mjs` uses `SUPABASE_SERVICE_ROLE_KEY` from the local
  environment and refuses a publishable key. It is an admin script, not part of
  the app bundle.

## Manual RLS checklist

Run this against a fresh Supabase project after `supabase db push`.

1. **Two users.** Create user A and user B through the app (or the Auth API).
   Give them different usernames.
2. **Owner sees their library.** As A, add a book, log a session, save a review,
   and save a highlight. Confirm A sees all four.
3. **B sees an empty library.** Sign in as B. Confirm B's library, stats,
   sessions, reviews, and highlights are empty.
4. **Direct REST read.** With B's access token, query each personal table:
   ```bash
   curl "$SUPABASE_URL/rest/v1/user_books?select=*" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Authorization: Bearer $B_ACCESS_TOKEN"
   ```
   Expect only B's rows (normally `[]`). Repeat for `reading_sessions`,
   `book_reviews`, `book_highlights`, and `profiles`.
5. **Cross-user write.** Try to insert a `user_books` row with A's `user_id`
   while authenticated as B. Expect an RLS error, not a success.
6. **Cross-user update/delete.** Try to update or delete one of A's rows as B.
   Expect zero affected rows or an RLS error.
7. **Username RPC.** Call `is_username_available` for A's username while
   unauthenticated. Expect `false`; there should be no way to retrieve A's
   email from the response.
8. **Account deletion.** As B, call `delete_own_account()`. Confirm B's app rows
   and `auth.users` row are gone, and A's data is untouched.
9. **Secret scan.** Build the web bundle and search it for server-side material.
   Replace `<retired-project-ref>` with the ref of any old project you are
   checking for:
   ```bash
   npx expo export -p web
   rg -n "sb_secret_[A-Za-z0-9]|SUPABASE_SERVICE_ROLE_KEY|<retired-project-ref>" dist
   ```
   Expect no matches. The client contains the bare guard string `sb_secret_`; the
   regex requires a key character after the prefix so the guard is not a false
   positive. The `EXPO_PUBLIC_` anon key will appear; that is expected.
10. **Policy scan.** Search the migrations for blanket policies:
    ```bash
    rg -n "USING \\(true\\)|WITH CHECK \\(true\\)" supabase/migrations
    ```
    The only intended match is the public `books` read policy. There should be no
    blanket `WITH CHECK (true)` on a personal table.

## Residual risks

- **Username enumeration.** The availability RPC is necessarily an oracle for
  display-name availability. Add rate limiting at the edge if usernames become
  sensitive.
- **Catalog spam.** Any authenticated user can insert a missing catalog row.
  There is no moderation queue yet; add one before opening signup widely.
- **No automated policy tests.** The checklist is manual. The next step is a
  pgTAP or local Supabase test suite in CI.
- **Auth schema permissions.** `delete_own_account()` assumes the migration
  owner can delete from `auth.users`. Verify this in the target Supabase project;
  if the project restricts it, move deletion behind an Edge Function using the
  service role.
- **The original backend is offline.** This public repository is not a deployed
  service and must not be presented as one.

## Disclosure

This is a portfolio project, not a production service. If you find a security
issue in the public code, open a private security advisory or contact the
maintainer through the GitHub profile rather than filing a public issue with
exploit details.
