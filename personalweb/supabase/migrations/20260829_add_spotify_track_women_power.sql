alter table public.spotify_playlist_tracks_cache
add column if not exists women_power boolean not null default false;

create index if not exists spotify_playlist_tracks_cache_women_power_idx
on public.spotify_playlist_tracks_cache (women_power)
where women_power = true;
