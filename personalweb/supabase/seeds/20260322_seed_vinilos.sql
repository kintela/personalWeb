begin;

with source (
  ord,
  titulo,
  grupo_nombre,
  year_publicacion,
  caratula
) as (
  values
  (1, $seed$Derek & The Dominos-Layla and other assorted love songs$seed$::text, $seed$Derek & The Dominos$seed$::text, 1970::integer, $seed$1.jpg$seed$::text),
  (2, $seed$Sgt Pepper's Lonely Hearts Club Band$seed$::text, $seed$The Beatles$seed$::text, 1967::integer, $seed$2.jpeg$seed$::text),
  (3, $seed$The Beatles-White Album$seed$::text, $seed$The Beatles$seed$::text, 1968::integer, $seed$4.jpeg$seed$::text),
  (4, $seed$Rubber Soul$seed$::text, $seed$The Beatles$seed$::text, 1965::integer, $seed$5.jpeg$seed$::text),
  (5, $seed$Abbey Road$seed$::text, $seed$The Beatles$seed$::text, 1969::integer, $seed$6.jpeg$seed$::text),
  (6, $seed$Help!$seed$::text, $seed$The Beatles$seed$::text, 1965::integer, $seed$7.jpeg$seed$::text),
  (7, $seed$Revolver$seed$::text, $seed$The Beatles$seed$::text, 1966::integer, $seed$8.jpeg$seed$::text),
  (8, $seed$Magical Mystery Tour$seed$::text, $seed$The Beatles$seed$::text, 1967::integer, $seed$38.jpeg$seed$::text),
  (9, $seed$El amigo de las tormentas$seed$::text, $seed$Surfin' Bichos$seed$::text, 1992::integer, $seed$3.jpeg$seed$::text),
  (10, $seed$Confessin the blues$seed$::text, $seed$The Rolling Stones$seed$::text, 2018::integer, $seed$9.jpeg$seed$::text),
  (11, $seed$Per la bona gent$seed$::text, $seed$Manel$seed$::text, 2019::integer, $seed$10.jpeg$seed$::text),
  (12, $seed$World Record$seed$::text, $seed$Neil Young & Crazy Horse$seed$::text, 2022::integer, $seed$11.jpeg$seed$::text),
  (13, $seed$Friends$seed$::text, $seed$The Silent Comedy$seed$::text, 2013::integer, $seed$12.jpeg$seed$::text),
  (14, $seed$Gari$seed$::text, $seed$Gari$seed$::text, 2013::integer, $seed$13.jpeg$seed$::text),
  (15, $seed$Independence$seed$::text, $seed$Sex Museum$seed$::text, 2016::integer, $seed$14.jpeg$seed$::text),
  (16, $seed$The usual suspects$seed$::text, $seed$Seven Hammond Soul$seed$::text, 2016::integer, $seed$15.jpeg$seed$::text),
  (17, $seed$Lisa and the lips$seed$::text, $seed$Lisa and the lips$seed$::text, 2013::integer, $seed$16.jpeg$seed$::text),
  (18, $seed$Bad Magic$seed$::text, $seed$Motörhead$seed$::text, 2015::integer, $seed$17.jpeg$seed$::text),
  (19, $seed$Bobby Fuller died for your sins$seed$::text, $seed$Chuck Prophet$seed$::text, 2017::integer, $seed$18.jpeg$seed$::text),
  (20, $seed$Somewhere somehow$seed$::text, $seed$Julian Maeso$seed$::text, 2016::integer, $seed$19.jpeg$seed$::text),
  (21, $seed$Air$seed$::text, $seed$Morgan$seed$::text, 2018::integer, $seed$20.jpeg$seed$::text),
  (22, $seed$Dance to the holy man$seed$::text, $seed$The Silencers$seed$::text, 1991::integer, $seed$21.jpeg$seed$::text),
  (23, $seed$Puta's Fever$seed$::text, $seed$Mano Negra$seed$::text, 1989::integer, $seed$22.jpg$seed$::text),
  (24, $seed$Stars$seed$::text, $seed$Simply Red$seed$::text, 1991::integer, $seed$23.jpeg$seed$::text),
  (25, $seed$Pretty Woman BSO$seed$::text, null::text, 1990::integer, $seed$24.jpeg$seed$::text),
  (26, $seed$All or nothing$seed$::text, $seed$Milli Vanilli$seed$::text, 1988::integer, $seed$25.jpeg$seed$::text),
  (27, $seed$Praying fortime$seed$::text, $seed$George Michael$seed$::text, 1990::integer, $seed$26.png$seed$::text),
  (28, $seed$Listen without prejudice$seed$::text, $seed$George Michael$seed$::text, 1990::integer, $seed$32.jpeg$seed$::text),
  (29, $seed$The seeds of love$seed$::text, $seed$Tears for fears$seed$::text, 1989::integer, $seed$27.jpeg$seed$::text),
  (30, $seed$...eremuko dunen atzetik dabil$seed$::text, $seed$Itoiz$seed$::text, 1988::integer, $seed$28.jpeg$seed$::text),
  (31, $seed$Ride on time$seed$::text, $seed$Black Box$seed$::text, 1989::integer, $seed$29.jpeg$seed$::text),
  (32, $seed$Dreamland$seed$::text, $seed$Black Box$seed$::text, 1990::integer, $seed$30.jpeg$seed$::text),
  (33, $seed$I do not want what I haven't got$seed$::text, $seed$Sinéad O'Connor$seed$::text, 1990::integer, $seed$31.jpeg$seed$::text),
  (34, $seed$Regatta de blanc$seed$::text, $seed$The Police$seed$::text, 1985::integer, $seed$33.jpeg$seed$::text),
  (35, $seed$Sticky fingers$seed$::text, $seed$The Rolling Stones$seed$::text, 1971::integer, $seed$34.jpeg$seed$::text),
  (36, $seed$Like a prayer$seed$::text, $seed$Madonna$seed$::text, 1989::integer, $seed$35.jpeg$seed$::text),
  (37, $seed$Escuela de calor$seed$::text, $seed$Radio Futura$seed$::text, 1988::integer, $seed$36.jpeg$seed$::text),
  (38, $seed$Aunque estemos muertos$seed$::text, $seed$Coque Malla$seed$::text, 2023::integer, $seed$37.jpeg$seed$::text),
  (39, $seed$The Major Minor Collective$seed$::text, $seed$The Picturebooks$seed$::text, 2021::integer, $seed$39.jpeg$seed$::text),
  (40, $seed$Goodtime$seed$::text, $seed$Daiistar$seed$::text, 2021::integer, $seed$40.jpeg$seed$::text),
  (41, $seed$Renace$seed$::text, $seed$Sobrinus$seed$::text, 2025::integer, $seed$41.jpg$seed$::text)
),
resolved as (
  select
    source.ord,
    source.titulo,
    source.year_publicacion,
    source.caratula,
    source.grupo_nombre,
    grupos.id as grupo_id
  from source
  left join public.grupos
    on source.grupo_nombre is not null
   and lower(grupos.nombre) = lower(source.grupo_nombre)
)
insert into public.vinilos (
  titulo,
  year_publicacion,
  caratula,
  grupo_id
)
select
  titulo,
  year_publicacion,
  caratula,
  grupo_id
from resolved
where not exists (
  select 1
  from public.vinilos
  where lower(public.vinilos.titulo) = lower(resolved.titulo)
    and coalesce(public.vinilos.year_publicacion, -1) = coalesce(resolved.year_publicacion, -1)
    and coalesce(lower(public.vinilos.caratula), '') = coalesce(lower(resolved.caratula), '')
    and coalesce(public.vinilos.grupo_id, -1) = coalesce(resolved.grupo_id, -1)
)
order by ord;

commit;
