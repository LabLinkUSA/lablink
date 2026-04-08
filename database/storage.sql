insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update
set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('listing-documents', 'listing-documents', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "public can read listing images" on storage.objects;
create policy "public can read listing images"
on storage.objects
for select
to public
using (bucket_id = 'listing-images');

drop policy if exists "service role manages listing images" on storage.objects;
create policy "service role manages listing images"
on storage.objects
for all
to service_role
using (bucket_id = 'listing-images')
with check (bucket_id = 'listing-images');

drop policy if exists "service role manages listing documents" on storage.objects;
create policy "service role manages listing documents"
on storage.objects
for all
to service_role
using (bucket_id = 'listing-documents')
with check (bucket_id = 'listing-documents');
