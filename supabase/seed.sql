-- =============================================================================
-- NIVAAR — Demo seed data. OPTIONAL, for exercising the admin dashboard UI
-- during development. Never run this against a production database.
--
-- Requires at least one real auth user to exist already (sign in to the app
-- once first so an anonymous user + profile row is created), then replace
-- YOUR_USER_ID below with that user's id from `select id from auth.users;`.
-- =============================================================================

do $$
declare
  demo_user uuid;
begin
  select id into demo_user from auth.users limit 1;
  if demo_user is null then
    raise notice 'No auth users found — sign in to the app once first, then re-run this seed.';
    return;
  end if;

  insert into public.reports
    (user_id, issue_type, ai_confidence, severity, ai_explanation, description,
     latitude, longitude, address, landmark, department, authority, status, is_demo)
  values
    (demo_user, 'Pothole', 91, 'High',
     'Large visible road hazard near a busy route.',
     'A large pothole has formed on the road near Mahadevapura, Bengaluru. Its size and position may pose a safety risk to two-wheelers and pedestrians.',
     12.9945, 77.6910, 'Mahadevapura, Bengaluru, Karnataka', 'Near ITPL Main Road',
     'Roads', 'BBMP — Roads & Infrastructure', 'Assigned', true),

    (demo_user, 'Overflowing garbage', 88, 'Medium',
     'Waste has spread beyond the bin onto the walkway.',
     'A garbage collection point near Whitefield Road is overflowing, with waste spilling onto the adjoining footpath.',
     12.9905, 77.6975, 'Whitefield Road, Bengaluru, Karnataka', 'Opposite bus stop',
     'Sanitation', 'BBMP — Solid Waste Management', 'Resolved', true),

    (demo_user, 'Broken streetlight', 82, 'Low',
     'The pole appears dark along an otherwise unlit stretch.',
     'A streetlight near Marathahalli is non-functional, leaving the stretch dark after sunset.',
     12.9990, 77.6850, 'Marathahalli, Bengaluru, Karnataka', 'Near flyover',
     'Electrical', 'BESCOM — Street Lighting Division', 'In Progress', true);
end $$;
