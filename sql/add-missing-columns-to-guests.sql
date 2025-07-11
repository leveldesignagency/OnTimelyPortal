-- Insert with guest_id, but do not update guest_id on conflict
insert into guest_logins (event_id, email, guest_id, password, login_url, is_active, expires_at)
values ('event_id', 'email', 'guest_id', 'password', 'login_url', true, now() + interval '7 days')
on conflict (event_id, email)
do update set
  password = excluded.password,
  login_url = excluded.login_url,
  is_active = excluded.is_active,
  expires_at = excluded.expires_at,
  updated_at = now(); 