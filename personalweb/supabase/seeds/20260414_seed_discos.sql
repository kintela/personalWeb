begin;

with source (
  id,
  nombre,
  year_publicacion,
  caratula,
  discografica,
  productor,
  grupo_id
) as (
  values
  (1::integer, 'Tom Petty & The Heartbreakers'::text, 1976::integer, '1.jpg'::text, 'Shelter Records'::text, 'Denny Cordell'::text, 3::bigint),
  (2::integer, 'You''re Gonna Get It!'::text, 1978::integer, '2.jpg'::text, 'Shelter Records'::text, 'Denny Cordell, Noah Shark, Tom Petty'::text, 3::bigint),
  (3::integer, 'Damn the Torpedoes'::text, 1979::integer, '3.jpg'::text, 'Backstreet Records'::text, 'Jimmy Iovine, Tom Petty'::text, 3::bigint),
  (4::integer, 'Hard Promises'::text, 1981::integer, '4.jpg'::text, 'Backstreet Records'::text, 'Jimmy Iovine, Tom Petty'::text, 3::bigint),
  (5::integer, 'Long After Dark'::text, 1982::integer, '5.jpg'::text, 'Backstreet Records'::text, 'Jimmy Iovine, Tom Petty'::text, 3::bigint),
  (6::integer, 'Southern Accents'::text, 1985::integer, '6.jpg'::text, 'MCA Records'::text, 'Tom Petty, Dave Stewart, Jimmy Iovine, Robbie Robertson, Mike Campbell'::text, 3::bigint),
  (7::integer, 'Let Me Up (I''ve Had Enough)'::text, 1987::integer, '7.jpg'::text, 'MCA Records'::text, 'Tom Petty, Mike Campbell'::text, 3::bigint),
  (8::integer, 'Into the Great Wide Open'::text, 1991::integer, '8.jpg'::text, 'MCA Records'::text, 'Jeff Lynne, Tom Petty, Mike Campbell'::text, 3::bigint),
  (9::integer, 'Songs and Music from ''She''s the One'''::text, 1996::integer, '9.jpg'::text, 'Warner Bros. Records'::text, 'Rick Rubin, Tom Petty, Mike Campbell'::text, 3::bigint),
  (10::integer, 'Echo'::text, 1999::integer, '10.jpg'::text, 'Warner Bros. Records'::text, 'Rick Rubin, Tom Petty, Mike Campbell'::text, 3::bigint),
  (11::integer, 'The Last DJ'::text, 2002::integer, '11.jpg'::text, 'Warner Bros. Records'::text, 'Tom Petty, Mike Campbell, George Drakoulias'::text, 3::bigint),
  (12::integer, 'Mojo'::text, 2010::integer, '12.jpg'::text, 'Reprise Records'::text, 'Tom Petty, Mike Campbell, Ryan Ulyate'::text, 3::bigint),
  (13::integer, 'Hypnotic Eye'::text, 2014::integer, '13.jpg'::text, 'Reprise Records'::text, 'Tom Petty, Mike Campbell, Ryan Ulyate'::text, 3::bigint),
  (14::integer, 'Wildflowers'::text, 1994::integer, '14.jpg'::text, 'Warner Bros. Records'::text, 'Rick Rubin, Tom Petty, Mike Campbell'::text, 4::bigint),
  (15::integer, 'Highway Companion'::text, 2006::integer, '15.jpg'::text, 'American Recordings'::text, 'Jeff Lynne, Tom Petty, Mike Campbell'::text, 4::bigint),
  (16::integer, 'Traveling Wilburys Vol. 1'::text, 1998::integer, '16.jpg'::text, 'Warner Bros. Records'::text, 'Jeff Lynne, George Harrison'::text, 5::bigint),
  (17::integer, 'Traveling Wilburys Vol. 3'::text, 1998::integer, '17.jpg'::text, 'Warner Bros. Records'::text, 'Jeff Lynne, George Harrison'::text, 5::bigint),
  (18::integer, 'Please Please Me'::text, 1963::integer, '1.jpeg'::text, 'Parlophone'::text, 'George Martin'::text, 1::bigint),
  (19::integer, 'With The Beatles'::text, 1963::integer, '1.jpeg'::text, 'Parlophone'::text, 'George Martin'::text, 1::bigint),
  (20::integer, 'A Hard Day''s Night'::text, 1964::integer, '2.jpeg'::text, 'Parlophone'::text, 'George Martin'::text, 1::bigint),
  (21::integer, 'Beatles for Sale'::text, 1964::integer, '3.jpeg'::text, 'Parlophone'::text, 'George Martin'::text, 1::bigint),
  (22::integer, 'Help!'::text, 1965::integer, '4.jpeg'::text, 'Parlophone'::text, 'George Martin'::text, 1::bigint),
  (23::integer, 'Rubber Soul'::text, 1965::integer, '5.jpeg'::text, 'Parlophone'::text, 'George Martin'::text, 1::bigint),
  (24::integer, 'Revolver'::text, 1966::integer, '6.jpeg'::text, 'Parlophone'::text, 'George Martin'::text, 1::bigint),
  (25::integer, 'Sgt. Pepper''s Lonely Hearts Club Band'::text, 1967::integer, '7.jpeg'::text, 'Parlophone'::text, 'George Martin'::text, 1::bigint),
  (26::integer, 'Magical Mystery Tour'::text, 1967::integer, '8.jpeg'::text, 'Parlophone'::text, 'George Martin'::text, 1::bigint),
  (27::integer, 'The Beatles (White Album)'::text, 1968::integer, '9.png'::text, 'Parlophone'::text, 'George Martin'::text, 1::bigint),
  (28::integer, 'Yellow Submarine'::text, 1969::integer, '10.jpeg'::text, 'Parlophone'::text, 'George Martin'::text, 1::bigint),
  (29::integer, 'Abbey Road'::text, 1969::integer, '11.jpeg'::text, 'Parlophone'::text, 'George Martin'::text, 1::bigint),
  (30::integer, 'Let It Be'::text, 1970::integer, '12.jpeg'::text, 'Parlophone'::text, 'George Martin'::text, 1::bigint),
  (31::integer, 'The Rolling Stones'::text, 1964::integer, '31.jpeg'::text, 'Decca Records'::text, 'Andrew Loog Oldham'::text, 2::bigint),
  (32::integer, 'The Rolling Stones No. 2'::text, 1965::integer, '32.jpeg'::text, 'Decca Records'::text, 'Andrew Loog Oldham'::text, 2::bigint),
  (33::integer, 'Out of Our Heads'::text, 1965::integer, '33.jpeg'::text, 'Decca Records'::text, 'Andrew Loog Oldham'::text, 2::bigint),
  (34::integer, 'Aftermath'::text, 1966::integer, '34.jpeg'::text, 'Decca Records'::text, 'Andrew Loog Oldham'::text, 2::bigint),
  (35::integer, 'Between the Buttons'::text, 1967::integer, '35.jpeg'::text, 'Decca Records'::text, 'Andrew Loog Oldham'::text, 2::bigint),
  (36::integer, 'Their Satanic Majesties Request'::text, 1967::integer, '36.jpeg'::text, 'Decca Records'::text, 'The Rolling Stones'::text, 2::bigint),
  (37::integer, 'Beggar''s Banquet'::text, 1968::integer, '37.jpeg'::text, 'Decca Records'::text, 'Jimmy Miller'::text, 2::bigint),
  (38::integer, 'Let It Bleed'::text, 1969::integer, '38.jpeg'::text, 'Decca Records'::text, 'Jimmy Miller'::text, 2::bigint),
  (39::integer, 'Sticky Fingers'::text, 1971::integer, '39.jpeg'::text, 'Rolling Stones Records'::text, 'Jimmy Miller'::text, 2::bigint),
  (40::integer, 'Exile on Main St'::text, 1972::integer, '40.jpeg'::text, 'Rolling Stones Records'::text, 'Jimmy Miller'::text, 2::bigint),
  (41::integer, 'Goats Head Soup'::text, 1973::integer, '41.jpeg'::text, 'Rolling Stones Records'::text, 'Jimmy Miller'::text, 2::bigint),
  (42::integer, 'It''s Only Rock ''n Roll'::text, 1974::integer, '42.jpeg'::text, 'Rolling Stones Records'::text, 'The Glimmer Twins'::text, 2::bigint),
  (43::integer, 'Black and Blue'::text, 1976::integer, '43.jpeg'::text, 'Rolling Stones Records'::text, 'The Glimmer Twins'::text, 2::bigint),
  (44::integer, 'Some Girls'::text, 1978::integer, '43.jpeg'::text, 'Rolling Stones Records'::text, 'The Glimmer Twins'::text, 2::bigint),
  (45::integer, 'Emotional Rescue'::text, 1980::integer, '44.jpeg'::text, 'Rolling Stones Records'::text, 'The Glimmer Twins'::text, 2::bigint),
  (46::integer, 'Tatoo You'::text, 1981::integer, '45.jpeg'::text, 'Rolling Stones Records'::text, 'The Glimmer Twins'::text, 2::bigint),
  (47::integer, 'Undercover'::text, 1983::integer, '46.jpeg'::text, 'Rolling Stones Records'::text, 'The Glimmer Twins, Chris Kimsey'::text, 2::bigint),
  (48::integer, 'Dirty Work'::text, 1986::integer, '47.jpeg'::text, 'Rolling Stones Records'::text, 'The Glimmer Twins, Steve Lilywhite'::text, 2::bigint),
  (49::integer, 'Steel Wheels'::text, 1989::integer, '48.jpeg'::text, 'Rolling Stones Records'::text, 'The Glimmer Twins, Chris Kimsey'::text, 2::bigint),
  (50::integer, 'Voodoo Lounge'::text, 1994::integer, '49.jpeg'::text, 'Virgin Records'::text, 'The Glimmer Twins, Don Was'::text, 2::bigint),
  (51::integer, 'Bridge to Babylon'::text, 1997::integer, '50.jpeg'::text, 'Virgin Records'::text, 'The Glimmer Twins. Don Was, Rob Fraboni, Danny Saber, Pierre de Beauport. The Dust Brothers'::text, 2::bigint),
  (52::integer, 'A Bigger Bang'::text, 2005::integer, '51.jpeg'::text, 'Virgin Records'::text, 'The Glimmer Twins, Don Was, Matt Clifford'::text, 2::bigint),
  (53::integer, 'Blue & Lonesome'::text, 2016::integer, '52.jpeg'::text, 'Polydor Records'::text, 'The Glimmer Twins, Don Was'::text, 2::bigint),
  (54::integer, 'Hackney Diamonds'::text, 2023::integer, '53.jpeg'::text, 'Geffen Records'::text, 'Andrew Watt'::text, 2::bigint),
  (55::integer, 'My Generation'::text, 1965::integer, 'MyGeneration.jpg'::text, 'Brunswick Records'::text, 'Shel Talmy'::text, 9::bigint),
  (56::integer, 'A Quick One'::text, 1966::integer, 'x.jpg'::text, 'Decca Records'::text, 'Kit Lambert'::text, 9::bigint),
  (57::integer, 'The Who Sell Out'::text, 1967::integer, 'x.jpg'::text, 'Decca Records'::text, 'Kit Lambert'::text, 9::bigint),
  (58::integer, 'Tommy'::text, 1969::integer, 'Tommy.jpg'::text, 'Track Records'::text, 'Kit Lambert'::text, 9::bigint),
  (59::integer, 'Who''s Next'::text, 1971::integer, 'WhosNext.jpg'::text, 'Track Records'::text, 'The Who, Glyn Johns'::text, 9::bigint),
  (60::integer, 'Quadrophenia'::text, 1973::integer, 'Quadrophenia.jpg'::text, 'Track Records'::text, 'The Who'::text, 9::bigint),
  (61::integer, 'The Who by Numbers'::text, 1975::integer, 'TheWhoByNumbers.jpg'::text, 'Polydor Records'::text, 'Glyn Johns'::text, 9::bigint),
  (62::integer, 'Who Are You'::text, 1978::integer, 'WhoAreYou.jpg'::text, 'Polydor Records'::text, 'Jon Astley, Glyn Johns'::text, 9::bigint),
  (63::integer, 'Face Dances'::text, 1981::integer, 'FaceDances.jpg'::text, 'Polydor Records'::text, 'Bill Szymczyk'::text, 9::bigint),
  (64::integer, 'It''s Hard'::text, 1982::integer, 'ItsHard.jpg'::text, 'Polydor Records'::text, 'Glyn Johns'::text, 9::bigint),
  (65::integer, 'Endless Wire'::text, 2006::integer, 'EndlessWire.jpg'::text, 'Polydor Records'::text, 'Pete Townshend, Bob Pridden, Billy Nicholls'::text, 9::bigint),
  (66::integer, 'Who'::text, 2019::integer, 'Who.jpg'::text, 'Polydor Records'::text, 'Pete Townshend, Dave Sardy, Bob Pridden, Dave Eringa'::text, 9::bigint),
  (67::integer, 'Led Zeppelin I'::text, 1969::integer, 'LedZeppelinI.jpg'::text, 'Atlantic Records'::text, 'Jimmy Page'::text, 10::bigint),
  (68::integer, 'Led Zeppelin II'::text, 1969::integer, 'LedZeppelinII.jpg'::text, 'Atlantic Records'::text, 'Jimmy Page'::text, 10::bigint),
  (69::integer, 'Led Zeppelin III'::text, 1970::integer, 'LedZeppelinIII.jpg'::text, 'Atlantic Records'::text, 'Jimmy Page'::text, 10::bigint),
  (70::integer, 'Led Zeppelin IV'::text, 1971::integer, 'LedZeppelinIV.jpg'::text, 'Atlantic Records'::text, 'Jimmy Page'::text, 10::bigint),
  (71::integer, 'Houses of the Holy'::text, 1973::integer, 'HousesOfTheHoly.jpg'::text, 'Atlantic Records'::text, 'Jimmy Page'::text, 10::bigint),
  (72::integer, 'Physical Graffiti'::text, 1975::integer, 'PhysicalGraffiti.jpg'::text, 'Swan Song Records'::text, 'Jimmy Page'::text, 10::bigint),
  (73::integer, 'Presence'::text, 1976::integer, 'Presence.jpg'::text, 'Swan Song Records'::text, 'Jimmy Page'::text, 10::bigint),
  (74::integer, 'In Through the out door'::text, 1979::integer, 'TheSongRemainsTheSame.jpg'::text, 'Swan Song Records'::text, 'Jimmy Page'::text, 10::bigint)
)
insert into public.discos (
  id,
  nombre,
  year_publicacion,
  caratula,
  discografica,
  productor,
  grupo_id
)
overriding system value
select
  id,
  nombre,
  year_publicacion,
  caratula,
  discografica,
  productor,
  grupo_id
from source
on conflict (id) do update
set
  nombre = excluded.nombre,
  year_publicacion = excluded.year_publicacion,
  caratula = excluded.caratula,
  discografica = excluded.discografica,
  productor = excluded.productor,
  grupo_id = excluded.grupo_id;

select setval(
  pg_get_serial_sequence('public.discos', 'id'),
  coalesce((select max(id) from public.discos), 1),
  true
);

commit;
