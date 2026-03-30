alter table public.youtube_video_matches
  add column if not exists rating smallint not null default 0;

alter table public.youtube_video_matches
  drop constraint if exists youtube_video_matches_rating_range;

alter table public.youtube_video_matches
  add constraint youtube_video_matches_rating_range
  check (rating between 0 and 5);
