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

create table if not exists public.admin_email_allowlist (
  email text primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_email_allowlist enable row level security;

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
