# Legacy Migration Notes

The active Supabase migration history lives in:

- `supabase/migrations/`

The SQL files in this directory are legacy reference/history from the earlier database workflow. They are not applied by the current Supabase CLI commands and should not be used for new schema changes.

For new database changes:

1. Run `make db-new name=<migration_name>` from the repo root.
2. Write the SQL in the generated file under `supabase/migrations/`.
3. Run `make db-dry-run`.
4. Run `make db-push`.
