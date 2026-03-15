insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update
set public = excluded.public;

create policy "public can read listing images"
on storage.objects
for select
to public
using (bucket_id = 'listing-images');

create policy "service role manages listing images"
on storage.objects
for all
to service_role
using (bucket_id = 'listing-images')
with check (bucket_id = 'listing-images');
