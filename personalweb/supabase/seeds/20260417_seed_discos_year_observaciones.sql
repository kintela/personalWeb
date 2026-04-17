begin;

-- Añade una fila por año con la observación que quieras mostrar en /discos.
-- Ejemplo:
--   (1967::integer, 'Un año bisagra para el pop británico.'::text),
--   (1968::integer, 'Explosión creativa y discos cada vez más ambiciosos.'::text)
with source (
  year_publicacion,
  observaciones
) as (
  select
    null::integer,
    null::text
  where false
)
insert into public.discos_year_observaciones (
  year_publicacion,
  observaciones
)
select
  source.year_publicacion,
  source.observaciones
from source
on conflict (year_publicacion) do update
set
  observaciones = excluded.observaciones;

commit;
