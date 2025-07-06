-- Add column for cover photo vertical offset
drop table if exists event_homepage_data;

alter table event_homepage_data add column event_image_offset_y integer default 0; 