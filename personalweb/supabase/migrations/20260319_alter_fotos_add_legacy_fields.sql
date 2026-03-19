alter table public.fotos
  add column if not exists descripcion text,
  add column if not exists fecha date,
  add column if not exists lugar text,
  add column if not exists categoria text,
  add column if not exists concierto_id integer;

create index if not exists fotos_concierto_id_idx on public.fotos (concierto_id);
create index if not exists fotos_fecha_idx on public.fotos (fecha);
