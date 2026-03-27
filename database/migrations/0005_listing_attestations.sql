create table if not exists public.listing_documents (
  listing_id text not null references public.listings(id) on delete cascade,
  form_type text not null check (form_type in ('decontamination', 'liability_release')),
  template_version text not null,
  form_data jsonb not null default '{}'::jsonb,
  storage_object_path text not null,
  file_name text not null,
  completed_by_user_id text not null references public.app_users(id) on delete restrict,
  completed_by_name text not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (listing_id, form_type)
);
