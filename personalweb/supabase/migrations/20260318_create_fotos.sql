create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.grupos (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint grupos_nombre_not_blank check (char_length(btrim(nombre)) > 0)
);

create table if not exists public.fotos (
  id bigint generated always as identity primary key,
  bucket text not null default 'fotos',
  imagen text not null,
  titulo text not null,
  personas text[] not null default '{}',
  anio integer,
  grupo_id bigint references public.grupos(id) on delete set null,
  origen text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint fotos_bucket_imagen_key unique (bucket, imagen),
  constraint fotos_imagen_not_blank check (char_length(btrim(imagen)) > 0),
  constraint fotos_titulo_not_blank check (char_length(btrim(titulo)) > 0),
  constraint fotos_anio_valid check (anio is null or anio between 1800 and 2100)
);

create index if not exists fotos_titulo_idx on public.fotos (titulo);
create index if not exists fotos_grupo_id_idx on public.fotos (grupo_id);
create index if not exists fotos_personas_gin_idx on public.fotos using gin (personas);

drop trigger if exists set_grupos_updated_at on public.grupos;

create trigger set_grupos_updated_at
before update on public.grupos
for each row
execute function public.handle_updated_at();

drop trigger if exists set_fotos_updated_at on public.fotos;

create trigger set_fotos_updated_at
before update on public.fotos
for each row
execute function public.handle_updated_at();

alter table public.grupos enable row level security;
alter table public.fotos enable row level security;

drop policy if exists "Public can read grupos" on public.grupos;
drop policy if exists "Public can read fotos" on public.fotos;

create policy "Public can read grupos"
on public.grupos
for select
using (true);

create policy "Public can read fotos"
on public.fotos
for select
using (true);

grant select on public.grupos to anon, authenticated;
grant all on public.grupos to service_role;
grant select on public.fotos to anon, authenticated;
grant all on public.fotos to service_role;
