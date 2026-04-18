alter table public.discos
add column if not exists fecha_publicacion date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'discos_fecha_publicacion_matches_year'
  ) then
    alter table public.discos
    add constraint discos_fecha_publicacion_matches_year check (
      fecha_publicacion is null
      or extract(year from fecha_publicacion)::integer = year_publicacion
    );
  end if;
end
$$;
