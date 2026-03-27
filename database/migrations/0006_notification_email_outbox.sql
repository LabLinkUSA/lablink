alter type public.notification_email_status add value if not exists 'sending';

alter table public.notifications
add column if not exists email_attempt_count integer not null default 0,
add column if not exists email_next_attempt_at timestamptz not null default timezone('utc', now()),
add column if not exists email_provider_message_id text;

create index if not exists notifications_email_outbox_idx
on public.notifications(email_status, email_next_attempt_at, created_at);
