create type public.notification_type as enum (
  'admin_listing_submitted',
  'admin_request_submitted',
  'institution_status_changed',
  'listing_status_changed',
  'request_status_changed',
  'recipient_catalog_updated'
);

create type public.notification_email_status as enum ('pending', 'sent', 'failed');

create table if not exists public.notifications (
  id text primary key,
  user_id text not null references public.app_users(id) on delete cascade,
  type public.notification_type not null,
  message text not null,
  cta_href text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  viewed_at timestamptz,
  email_status public.notification_email_status not null default 'pending',
  email_attempted_at timestamptz,
  email_error text
);

create index if not exists notifications_user_created_at_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_viewed_at_idx on public.notifications(user_id, viewed_at, created_at desc);

alter table public.notifications enable row level security;

create policy "users can read their notifications"
on public.notifications
for select
using (
  user_id = (public.current_app_user()).id
  or public.current_user_role() = 'admin'
);

create policy "users can update their notifications"
on public.notifications
for update
using (
  user_id = (public.current_app_user()).id
  or public.current_user_role() = 'admin'
)
with check (
  user_id = (public.current_app_user()).id
  or public.current_user_role() = 'admin'
);

