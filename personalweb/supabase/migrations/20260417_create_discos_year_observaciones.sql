create table if not exists public.discos_year_observaciones (
  year_publicacion integer primary key,
  observaciones text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint discos_year_observaciones_year_valid check (
    year_publicacion between 1900 and 2100
  ),
  constraint discos_year_observaciones_not_blank check (
    char_length(btrim(observaciones)) > 0
  )
);

drop trigger if exists set_discos_year_observaciones_updated_at
on public.discos_year_observaciones;

create trigger set_discos_year_observaciones_updated_at
before update on public.discos_year_observaciones
for each row
execute function public.handle_updated_at();

alter table public.discos_year_observaciones enable row level security;

drop policy if exists "Public can read discos year observaciones"
on public.discos_year_observaciones;

create policy "Public can read discos year observaciones"
on public.discos_year_observaciones
for select
using (true);

grant select on public.discos_year_observaciones to anon, authenticated;
grant all on public.discos_year_observaciones to service_role;
