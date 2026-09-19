-- VISI Bangsa: sistem iklan
create table if not exists public.iklan (
  id uuid primary key default gen_random_uuid(),
  nama_pengiklan text not null,
  perusahaan text,
  email text not null,
  telepon text,
  judul text not null,
  link_url text,
  posisi text not null default 'bawah_logo',
  mulai date,
  selesai date,
  gambar text,
  status text not null default 'pending',
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint iklan_status_check check (status in ('pending','aktif','ditolak','selesai')),
  constraint iklan_posisi_check check (posisi in ('bawah_logo','di_antara_berita','dalam_artikel'))
);

alter table public.iklan enable row level security;

drop policy if exists "iklan_public_insert" on public.iklan;
create policy "iklan_public_insert" on public.iklan
for insert to anon, authenticated
with check (status = 'pending');

drop policy if exists "iklan_admin_select" on public.iklan;
create policy "iklan_admin_select" on public.iklan
for select to authenticated
using (auth.role() = 'authenticated');

drop policy if exists "iklan_public_active_select" on public.iklan;
create policy "iklan_public_active_select" on public.iklan
for select to anon
using (
  status = 'aktif'
  and (mulai is null or mulai <= current_date)
  and (selesai is null or selesai >= current_date)
);

drop policy if exists "iklan_admin_update" on public.iklan;
create policy "iklan_admin_update" on public.iklan
for update to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "iklan_admin_delete" on public.iklan;
create policy "iklan_admin_delete" on public.iklan
for delete to authenticated
using (auth.role() = 'authenticated');

insert into storage.buckets (id,name,public)
values ('iklan','iklan',true)
on conflict (id) do update set public = true;

drop policy if exists "iklan_storage_public_read" on storage.objects;
create policy "iklan_storage_public_read" on storage.objects
for select using (bucket_id = 'iklan');

drop policy if exists "iklan_storage_public_insert" on storage.objects;
create policy "iklan_storage_public_insert" on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'iklan');

drop policy if exists "iklan_storage_admin_delete" on storage.objects;
create policy "iklan_storage_admin_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'iklan');

alter table public.site_settings
add column if not exists ads_enabled boolean not null default false;

update public.site_settings
set ads_enabled = false
where id = 1;