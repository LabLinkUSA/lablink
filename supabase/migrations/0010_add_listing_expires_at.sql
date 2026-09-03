alter table public.listings
  add column if not exists expires_at timestamptz;
