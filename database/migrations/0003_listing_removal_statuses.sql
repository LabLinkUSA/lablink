alter type public.listing_status add value if not exists 'removed_by_admin';
alter type public.listing_status add value if not exists 'removed_by_donor';

update public.listings
set status = 'removed_by_admin'
where status::text = 'removed_expired';
