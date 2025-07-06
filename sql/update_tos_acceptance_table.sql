-- Add columns for user name and company email to tos_acceptance
alter table tos_acceptance
  add column user_name text,
  add column user_email text;

-- Optionally, update existing rows with user info if available
-- update tos_acceptance set user_name = ..., user_email = ... where ...; 