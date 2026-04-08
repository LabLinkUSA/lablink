# Database Notes

`schema.sql` defines the initial Supabase/PostgreSQL schema for LabLink v1 with explicit lifecycle enums for institutions, listings, requests, threads, and request-board posts.

`policies.sql` provides row-level security scaffolding that assumes Supabase authentication and a mapped `public.app_users.supabase_auth_user_id`.

`storage.sql` creates the default Supabase Storage bucket used for donor listing images. The frontend/backend expect the bucket name `listing-images` unless `SUPABASE_LISTING_IMAGES_BUCKET` is set to a different existing public bucket.

Notable choices:

- Public visitors can read only approved/public listing states.
- `admin_email_allowlist` supports manual admin eligibility management from the Supabase Table Editor.
- Verified donor institutions can create listings tied to their own institution.
- Verified recipient institutions can submit requests and request-board posts.
- Messaging remains request-scoped and visible to admins.
- Admin audit logs are first-class and admin-only.

## Migration Workflow

Supabase migrations are the only executable source of truth for database changes in this repo.

Edit and add SQL here:

- `supabase/migrations/*.sql`

Treat these files as reference only:

- `database/schema.sql`
- `database/policies.sql`
- `database/storage.sql`
- `database/migrations/*.sql`

Do not expect `database/*.sql` changes to be applied by Supabase CLI. `supabase db push` only runs SQL that exists in `supabase/migrations/`.

### Commands

Create a new migration:

```bash
make db-new name=add_notification_index
```

See local and remote migration status:

```bash
make db-status
```

Preview what would be applied:

```bash
make db-dry-run
```

Apply pending migrations to the linked Supabase project:

```bash
make db-push
```

### Recommended Flow

1. Create a migration with `make db-new name=<migration_name>`.
2. Write the SQL in the generated file under `supabase/migrations/`.
3. Run `make db-status`.
4. Run `make db-dry-run`.
5. Run `make db-push`.

### Prerequisites

Before using the commands above, make sure:

- Supabase CLI is installed.
- The repo has already been linked to the correct Supabase project.
- You are authenticated with Supabase CLI via `supabase login` or `SUPABASE_ACCESS_TOKEN`.

### Legacy Notes

- `database/migrations/` is retained only as historical reference and is no longer part of the active migration workflow.
- If the reference SQL in `database/` needs to stay current, update it separately after the migration is authored and applied.
