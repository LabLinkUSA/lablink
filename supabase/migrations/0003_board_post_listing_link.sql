alter table public.listings
  add column if not exists board_post_id text references public.request_board_posts(id) on delete set null;

create index if not exists listings_board_post_id_idx on public.listings(board_post_id);
