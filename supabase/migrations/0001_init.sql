create extension if not exists pgcrypto;

create type public.user_role as enum ('donor_lab', 'recipient_institution', 'admin');
create type public.verification_status as enum ('pending_verification', 'verified', 'rejected', 'suspended');
create type public.account_status as enum ('pending_verification', 'verified', 'restricted', 'suspended');
create type public.listing_status as enum (
  'draft',
  'pending_admin_approval',
  'rejected',
  'live',
  'matched_reserved',
  'fulfilled',
  'removed_by_admin',
  'removed_by_donor'
);
create type public.request_status as enum (
  'submitted',
  'admin_review',
  'approved_matched',
  'completed',
  'rejected_cancelled'
);
create type public.thread_status as enum ('active', 'locked', 'closed');
create type public.board_post_status as enum ('open', 'match_in_progress', 'closed');
create type public.notification_type as enum (
  'admin_listing_submitted',
  'admin_request_submitted',
  'institution_status_changed',
  'listing_status_changed',
  'request_status_changed',
  'recipient_catalog_updated'
);
create type public.notification_email_status as enum ('pending', 'sending', 'sent', 'failed');

create table if not exists public.institutions (
  id text primary key,
  name text not null,
  role_type public.user_role not null,
  verification_status public.verification_status not null default 'pending_verification',
  location text not null,
  description text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.institutions (id, name, role_type, verification_status, location, description)
values (
  'inst_lablink_ops',
  'LabLink Operations',
  'admin',
  'verified',
  'Internal',
  'Internal LabLink operators responsible for verification, moderation, and fulfillment oversight.'
)
on conflict (id) do nothing;

create table if not exists public.app_users (
  id text primary key,
  supabase_auth_user_id uuid unique,
  institution_id text not null references public.institutions(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.user_role not null,
  account_status public.account_status not null default 'pending_verification',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_email_allowlist (
  email text primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_admin_email_allowlist_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists touch_admin_email_allowlist_updated_at on public.admin_email_allowlist;
create trigger touch_admin_email_allowlist_updated_at
before update on public.admin_email_allowlist
for each row
execute function public.touch_admin_email_allowlist_updated_at();

create table if not exists public.listings (
  id text primary key,
  donor_institution_id text not null references public.institutions(id) on delete cascade,
  created_by_user_id text not null references public.app_users(id) on delete restrict,
  title text not null,
  category text not null,
  item_condition text not null,
  quantity integer not null check (quantity > 0),
  location text not null,
  availability_window text not null,
  description text not null,
  dimensions_weight text not null,
  handling_requirements text not null,
  working_status text not null,
  documentation_included text not null,
  special_handling_flags text not null,
  delivery_mode text not null,
  status public.listing_status not null default 'draft',
  admin_reviewed_at timestamptz,
  admin_reviewed_by_user_id text references public.app_users(id) on delete set null,
  admin_review_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.listing_photos (
  id text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.listing_documents (
  id text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  form_type text not null,
  status text not null default 'not_started',
  blank_pdf_storage_path text,
  blank_pdf_public_url text,
  uploaded_pdf_storage_path text,
  uploaded_pdf_public_url text,
  uploaded_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.equipment_requests (
  id text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  recipient_institution_id text not null references public.institutions(id) on delete cascade,
  submitted_by_user_id text not null references public.app_users(id) on delete restrict,
  intended_use text not null,
  program_or_department text not null,
  audience text not null,
  needed_by date not null,
  urgency_notes text not null,
  delivery_constraints text not null,
  storage_readiness text not null,
  funding_or_logistics_notes text not null,
  status public.request_status not null default 'submitted',
  admin_reviewed_at timestamptz,
  admin_reviewed_by_user_id text references public.app_users(id) on delete set null,
  admin_review_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.request_message_threads (
  id text primary key,
  request_id text not null unique references public.equipment_requests(id) on delete cascade,
  status public.thread_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.request_messages (
  id text primary key,
  thread_id text not null references public.request_message_threads(id) on delete cascade,
  sender_user_id text not null references public.app_users(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.request_board_posts (
  id text primary key,
  institution_id text not null references public.institutions(id) on delete cascade,
  created_by_user_id text not null references public.app_users(id) on delete restrict,
  title text not null,
  category text not null,
  quantity_needed integer not null check (quantity_needed > 0),
  location text not null,
  needed_by date not null,
  intended_use text not null,
  description text not null,
  status public.board_post_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.saved_listings (
  user_id text not null references public.app_users(id) on delete cascade,
  listing_id text not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, listing_id)
);

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
  email_attempt_count integer not null default 0,
  email_attempted_at timestamptz,
  email_next_attempt_at timestamptz not null default timezone('utc', now()),
  email_provider_message_id text,
  email_error text
);

create table if not exists public.admin_audit_logs (
  id text primary key,
  actor_user_id text not null references public.app_users(id) on delete restrict,
  action_type text not null,
  subject_table text not null,
  subject_id text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists listings_status_idx on public.listings(status);
create index if not exists listings_category_idx on public.listings(category);
create index if not exists requests_listing_idx on public.equipment_requests(listing_id);
create index if not exists requests_status_idx on public.equipment_requests(status);
create index if not exists threads_request_idx on public.request_message_threads(request_id);
create index if not exists board_posts_status_idx on public.request_board_posts(status);
create index if not exists notifications_user_created_at_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_viewed_at_idx on public.notifications(user_id, viewed_at, created_at desc);
create index if not exists notifications_email_outbox_idx on public.notifications(email_status, email_next_attempt_at, created_at);
