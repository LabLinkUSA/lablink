alter table public.institutions enable row level security;
alter table public.app_users enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.listing_documents enable row level security;
alter table public.equipment_requests enable row level security;
alter table public.request_message_threads enable row level security;
alter table public.request_messages enable row level security;
alter table public.request_board_posts enable row level security;
alter table public.saved_listings enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.admin_email_allowlist enable row level security;

create or replace function public.current_app_user()
returns public.app_users
language sql
stable
as $$
  select *
  from public.app_users
  where supabase_auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
as $$
  select role from public.current_app_user();
$$;

create or replace function public.current_user_institution_id()
returns text
language sql
stable
as $$
  select institution_id from public.current_app_user();
$$;

create or replace function public.current_user_is_verified()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.app_users u
    join public.institutions i on i.id = u.institution_id
    where u.supabase_auth_user_id = auth.uid()
      and u.account_status = 'verified'
      and i.verification_status = 'verified'
  );
$$;

create policy "public can browse approved listings"
on public.listings
for select
using (status in ('live', 'under_review', 'matched_reserved', 'fulfilled'));

create policy "public can browse listing photos"
on public.listing_photos
for select
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_photos.listing_id
      and l.status in ('live', 'under_review', 'matched_reserved', 'fulfilled')
  )
);

create policy "users can read their institution and self profile"
on public.app_users
for select
using (
  supabase_auth_user_id = auth.uid()
  or public.current_user_role() = 'admin'
);

create policy "institutions visible to admins and own members"
on public.institutions
for select
using (
  public.current_user_role() = 'admin'
  or id = public.current_user_institution_id()
);

create policy "verified donor labs can create listings"
on public.listings
for insert
with check (
  public.current_user_is_verified()
  and public.current_user_role() = 'donor_lab'
  and donor_institution_id = public.current_user_institution_id()
);

create policy "donors and admins can read own listings"
on public.listings
for select
using (
  donor_institution_id = public.current_user_institution_id()
  or public.current_user_role() = 'admin'
  or status in ('live', 'under_review', 'matched_reserved', 'fulfilled')
);

create policy "verified recipients can submit requests"
on public.equipment_requests
for insert
with check (
  public.current_user_is_verified()
  and public.current_user_role() = 'recipient_institution'
  and recipient_institution_id = public.current_user_institution_id()
);

create policy "participants and admins can read requests"
on public.equipment_requests
for select
using (
  recipient_institution_id = public.current_user_institution_id()
  or exists (
    select 1 from public.listings l
    where l.id = equipment_requests.listing_id
      and l.donor_institution_id = public.current_user_institution_id()
  )
  or public.current_user_role() = 'admin'
);

create policy "verified recipients can create request board posts"
on public.request_board_posts
for insert
with check (
  public.current_user_is_verified()
  and public.current_user_role() = 'recipient_institution'
  and institution_id = public.current_user_institution_id()
);

create policy "request board visible to donors and admins"
on public.request_board_posts
for select
using (
  public.current_user_role() in ('donor_lab', 'admin')
  or institution_id = public.current_user_institution_id()
);

create policy "thread participants and admins can read threads"
on public.request_message_threads
for select
using (
  public.current_user_role() = 'admin'
  or exists (
    select 1
    from public.equipment_requests r
    where r.id = request_message_threads.request_id
      and (
        r.recipient_institution_id = public.current_user_institution_id()
        or exists (
          select 1
          from public.listings l
          where l.id = request_message_threads.listing_id
            and l.donor_institution_id = public.current_user_institution_id()
        )
      )
  )
);

create policy "thread participants and admins can read messages"
on public.request_messages
for select
using (
  public.current_user_role() = 'admin'
  or exists (
    select 1
    from public.request_message_threads t
    join public.equipment_requests r on r.id = t.request_id
    where t.id = request_messages.thread_id
      and (
        r.recipient_institution_id = public.current_user_institution_id()
        or exists (
          select 1 from public.listings l
          where l.id = t.listing_id
            and l.donor_institution_id = public.current_user_institution_id()
        )
      )
  )
);

create policy "users can read their notifications"
on public.notifications
for select
using (
  user_id = public.current_app_user().id
  or public.current_user_role() = 'admin'
);

create policy "users can update their notifications"
on public.notifications
for update
using (
  user_id = public.current_app_user().id
  or public.current_user_role() = 'admin'
)
with check (
  user_id = public.current_app_user().id
  or public.current_user_role() = 'admin'
);

create policy "admins manage audit logs"
on public.admin_audit_logs
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
