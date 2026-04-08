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
using (status in ('live', 'matched_reserved', 'fulfilled'));

create policy "public can browse listing photos"
on public.listing_photos
for select
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_photos.listing_id
      and l.status in ('live', 'matched_reserved', 'fulfilled')
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
  or status in ('live', 'matched_reserved', 'fulfilled')
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

create policy "recipients can manage their own pending requests"
on public.equipment_requests
for update
using (
  recipient_institution_id = public.current_user_institution_id()
  or public.current_user_role() = 'admin'
)
with check (
  recipient_institution_id = public.current_user_institution_id()
  or public.current_user_role() = 'admin'
);

create policy "verified donors can update own listings"
on public.listings
for update
using (
  donor_institution_id = public.current_user_institution_id()
  or public.current_user_role() = 'admin'
)
with check (
  donor_institution_id = public.current_user_institution_id()
  or public.current_user_role() = 'admin'
);

create policy "verified donors can attach listing photos"
on public.listing_photos
for insert
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_photos.listing_id
      and l.donor_institution_id = public.current_user_institution_id()
  )
  or public.current_user_role() = 'admin'
);

create policy "donors and admins can read own listing documents"
on public.listing_documents
for select
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_documents.listing_id
      and l.donor_institution_id = public.current_user_institution_id()
  )
  or public.current_user_role() = 'admin'
);

create policy "donors and admins can upsert own listing documents"
on public.listing_documents
for all
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_documents.listing_id
      and l.donor_institution_id = public.current_user_institution_id()
  )
  or public.current_user_role() = 'admin'
)
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_documents.listing_id
      and l.donor_institution_id = public.current_user_institution_id()
  )
  or public.current_user_role() = 'admin'
);

create policy "participants and admins can read request threads"
on public.request_message_threads
for select
using (
  exists (
    select 1
    from public.equipment_requests r
    join public.listings l on l.id = r.listing_id
    where r.id = request_message_threads.request_id
      and (
        r.recipient_institution_id = public.current_user_institution_id()
        or l.donor_institution_id = public.current_user_institution_id()
        or public.current_user_role() = 'admin'
      )
  )
);

create policy "participants and admins can read request messages"
on public.request_messages
for select
using (
  exists (
    select 1
    from public.request_message_threads t
    join public.equipment_requests r on r.id = t.request_id
    join public.listings l on l.id = r.listing_id
    where t.id = request_messages.thread_id
      and (
        r.recipient_institution_id = public.current_user_institution_id()
        or l.donor_institution_id = public.current_user_institution_id()
        or public.current_user_role() = 'admin'
      )
  )
);

create policy "participants can send request messages"
on public.request_messages
for insert
with check (
  sender_user_id = (public.current_app_user()).id
  and exists (
    select 1
    from public.request_message_threads t
    join public.equipment_requests r on r.id = t.request_id
    join public.listings l on l.id = r.listing_id
    where t.id = request_messages.thread_id
      and (
        r.recipient_institution_id = public.current_user_institution_id()
        or l.donor_institution_id = public.current_user_institution_id()
        or public.current_user_role() = 'admin'
      )
  )
);

create policy "verified recipients can create board posts"
on public.request_board_posts
for insert
with check (
  public.current_user_is_verified()
  and public.current_user_role() = 'recipient_institution'
  and institution_id = public.current_user_institution_id()
  and created_by_user_id = (public.current_app_user()).id
);

create policy "public can read open board posts"
on public.request_board_posts
for select
using (
  status = 'open'
  or institution_id = public.current_user_institution_id()
  or public.current_user_role() = 'admin'
);

create policy "recipients and admins can update own board posts"
on public.request_board_posts
for update
using (
  institution_id = public.current_user_institution_id()
  or public.current_user_role() = 'admin'
)
with check (
  institution_id = public.current_user_institution_id()
  or public.current_user_role() = 'admin'
);

create policy "recipients can save visible listings"
on public.saved_listings
for insert
with check (
  user_id = (public.current_app_user()).id
  and public.current_user_role() = 'recipient_institution'
);

create policy "users can read their saved listings"
on public.saved_listings
for select
using (
  user_id = (public.current_app_user()).id
  or public.current_user_role() = 'admin'
);

create policy "users can remove their saved listings"
on public.saved_listings
for delete
using (
  user_id = (public.current_app_user()).id
  or public.current_user_role() = 'admin'
);

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

create policy "admins can read admin audit logs"
on public.admin_audit_logs
for select
using (public.current_user_role() = 'admin');

create policy "admins can insert admin audit logs"
on public.admin_audit_logs
for insert
with check (public.current_user_role() = 'admin');

create policy "admins can manage admin email allowlist"
on public.admin_email_allowlist
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
