# Database Notes

`schema.sql` defines the initial Supabase/PostgreSQL schema for LabLink v1 with explicit lifecycle enums for institutions, listings, requests, threads, and request-board posts.

`policies.sql` provides row-level security scaffolding that assumes Supabase authentication and a mapped `public.app_users.supabase_auth_user_id`.

Notable choices:

- Public visitors can read only approved/public listing states.
- Verified donor institutions can create listings tied to their own institution.
- Verified recipient institutions can submit requests and request-board posts.
- Messaging remains request-scoped and visible to admins.
- Admin audit logs are first-class and admin-only.

