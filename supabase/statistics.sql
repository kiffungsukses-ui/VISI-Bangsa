-- Statistik pembaca berita VISI Bangsa
-- Jalankan sekali di Supabase SQL Editor.

alter table public.berita
  add column if not exists views bigint not null default 0;

create or replace function public.increment_news_view(p_news_id text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_views bigint;
begin
  update public.berita
  set views = coalesce(views, 0) + 1
  where id::text = p_news_id
    and status = 'terbit'
  returning views into new_views;

  return new_views;
end;
$$;

grant execute on function public.increment_news_view(text) to anon, authenticated;
