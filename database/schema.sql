create extension if not exists pgcrypto;

create type public.user_role as enum ('donor_lab', 'recipient_institution', 'admin');
create type public.verification_status as enum ('pending_verification', 'verified', 'rejected', 'suspended');
create type public.account_status as enum ('pending_verification', 'verified', 'restricted', 'suspended');
create type public.listing_status as enum (
  'draft',
  'pending_admin_approval',
  'live',
  'under_review',
  'matched_reserved',
  'fulfilled',
  'removed_expired'
);
create type public.request_status as enum (
  'submitted',
  'admin_review',
  'awaiting_donor_confirmation',
  'approved_matched',
  'pickup_transfer_coordination',
  'completed',
  'rejected_cancelled'
);
create type public.thread_status as enum ('active', 'locked', 'closed');
create type public.board_post_status as enum ('open', 'match_in_progress', 'closed');

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
  delivery_mode text not null check (delivery_mode in ('pickup_only', 'pickup_or_shipment')),
  status public.listing_status not null default 'draft',
  request_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz,
  fulfilled_at timestamptz
);

create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null references public.listings(id) on delete cascade,
  photo_url text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.equipment_requests (
  id text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  recipient_institution_id text not null references public.institutions(id) on delete cascade,
  submitted_by_user_id text not null references public.app_users(id) on delete restrict,
  intended_use text not null,
  institution_type text not null,
  program_or_department text not null,
  audience text,
  needed_by date,
  urgency_notes text,
  delivery_constraints text not null,
  storage_readiness text not null,
  funding_or_logistics_notes text,
  status public.request_status not null default 'submitted',
  selected_by_admin_user_id text references public.app_users(id),
  selected_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.request_message_threads (
  id text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  request_id text references public.equipment_requests(id) on delete cascade,
  status public.thread_status not null default 'active',
  opened_by_user_id text not null references public.app_users(id),
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
  description text not null,
  needed_by date,
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
