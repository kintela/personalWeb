alter table public.discos
add column if not exists observaciones text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'discos_observaciones_not_blank'
  ) then
    alter table public.discos
    add constraint discos_observaciones_not_blank check (
      observaciones is null or char_length(btrim(observaciones)) > 0
    );
  end if;
end
$$;
