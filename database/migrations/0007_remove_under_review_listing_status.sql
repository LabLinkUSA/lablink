update public.listings
set status = 'pending_admin_approval'
where status = 'under_review';

alter type public.listing_status rename to listing_status_old;

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

alter table public.listings
alter column status
type public.listing_status
using status::text::public.listing_status;

drop type public.listing_status_old;
