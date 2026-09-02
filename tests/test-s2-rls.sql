-- SUNSET ISLAND S2: THE LOCK, PROVEN
-- Project: sunset-island (whhzezkpejplaghiuuyk, ap-southeast-2)
-- Run each part in order against the database as postgres
-- (Supabase SQL editor or MCP execute_sql). Sixteen checks.
-- Every row in the result must show pass = true. A false blocks the deploy.
--
-- What it proves:
--   1..11  Family A and Family B can each touch only their own rows,
--          enforced by the database, not the UI. Cross-family reads,
--          writes and deletes touch zero rows or are refused outright.
--   7      Snapshots cannot be written by hand by anyone.
--   9      The ten-letter nickname rule lives in the database itself.
--   12..13 The anonymous key can read nothing at all.
--   14..16 The never-lost proof: corrupt today's save and yesterday's
--          snapshot is still intact and readable by the family.
-- Cleanup at the end leaves zero rows in every table.

-- ============ PART 1: SEED ============
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111111','authenticated','authenticated','rls-test-a@test.invalid', extensions.crypt('x', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222222','authenticated','authenticated','rls-test-b@test.invalid', extensions.crypt('x', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}');

insert into public.families (id, owner, adult_attested) values
('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111', true),
('bbbbbbbb-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222', true);

insert into public.children (id, family_id, nickname, age_band) values
('aaaaaaaa-1111-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','TESTOLLIE','5-8'),
('bbbbbbbb-2222-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002','TESTPIP','5-8');

insert into public.child_state (child_id, drawer, value) values
('aaaaaaaa-1111-0000-0000-000000000001','save','{"w":"islandA"}'),
('aaaaaaaa-1111-0000-0000-000000000001','purse','7'),
('bbbbbbbb-2222-0000-0000-000000000002','save','{"w":"islandB"}'),
('bbbbbbbb-2222-0000-0000-000000000002','purse','3');

-- ============ PART 2: THE PROOF ============
create table public._s2_proofs (n serial primary key, test text, pass boolean, detail text);

do $$
declare cnt int; d text; p1 boolean; d1 text; p2 boolean; d2 text;
begin
  -- signed in as FAMILY A
  perform set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  execute 'set local role authenticated';

  select count(*) into cnt from public.families;
  insert into public._s2_proofs (test, pass, detail) values ('A sees exactly one family, its own', cnt = 1, 'count '||cnt);

  select count(*) into cnt from public.children where nickname = 'TESTPIP';
  insert into public._s2_proofs (test, pass, detail) values ('A cannot see B''s child', cnt = 0, 'count '||cnt);

  select count(*) into cnt from public.child_state where child_id = 'bbbbbbbb-2222-0000-0000-000000000002';
  insert into public._s2_proofs (test, pass, detail) values ('A cannot read B''s drawers', cnt = 0, 'count '||cnt);

  begin
    insert into public.children (family_id, nickname, age_band) values ('bbbbbbbb-0000-0000-0000-000000000002','INTRUDER','5-8');
    insert into public._s2_proofs (test, pass, detail) values ('A refused inserting a child into B''s family', false, 'INSERT WAS ALLOWED');
  exception when others then
    insert into public._s2_proofs (test, pass, detail) values ('A refused inserting a child into B''s family', sqlstate = '42501', 'refused '||sqlstate);
  end;

  update public.child_state set value = '{"w":"stolen"}' where child_id = 'bbbbbbbb-2222-0000-0000-000000000002' and drawer = 'save';
  get diagnostics cnt = row_count;
  insert into public._s2_proofs (test, pass, detail) values ('A''s update of B''s island touches zero rows', cnt = 0, 'rows '||cnt);

  delete from public.families where id = 'bbbbbbbb-0000-0000-0000-000000000002';
  get diagnostics cnt = row_count;
  insert into public._s2_proofs (test, pass, detail) values ('A''s delete of B''s family touches zero rows', cnt = 0, 'rows '||cnt);

  begin
    insert into public.snapshots (child_id, day, world) values ('aaaaaaaa-1111-0000-0000-000000000001', current_date, '{"w":"forged"}');
    insert into public._s2_proofs (test, pass, detail) values ('Nobody writes snapshots by hand, even their own', false, 'INSERT WAS ALLOWED');
  exception when others then
    insert into public._s2_proofs (test, pass, detail) values ('Nobody writes snapshots by hand, even their own', sqlstate = '42501', 'refused '||sqlstate);
  end;

  update public.child_state set value = '{"w":"islandA2"}' where child_id = 'aaaaaaaa-1111-0000-0000-000000000001' and drawer = 'save';
  get diagnostics cnt = row_count;
  insert into public._s2_proofs (test, pass, detail) values ('A can update A''s own island', cnt = 1, 'rows '||cnt);

  begin
    insert into public.children (family_id, nickname, age_band) values ('aaaaaaaa-0000-0000-0000-000000000001','ELEVENLETTERS','5-8');
    insert into public._s2_proofs (test, pass, detail) values ('Eleven-letter nickname refused by the database', false, 'INSERT WAS ALLOWED');
  exception when others then
    insert into public._s2_proofs (test, pass, detail) values ('Eleven-letter nickname refused by the database', sqlstate = '23514', 'refused '||sqlstate);
  end;

  execute 'reset role';

  -- signed in as FAMILY B
  perform set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  execute 'set local role authenticated';

  select count(*) into cnt from public.families;
  select coalesce(string_agg(nickname, ','), 'none') into d from public.children;
  insert into public._s2_proofs (test, pass, detail) values ('B sees one family and only its own child', cnt = 1 and d = 'TESTPIP', 'fams '||cnt||' kids '||d);

  select count(*) into cnt from public.child_state where child_id = 'aaaaaaaa-1111-0000-0000-000000000001';
  insert into public._s2_proofs (test, pass, detail) values ('B cannot read A''s drawers', cnt = 0, 'count '||cnt);

  execute 'reset role';

  -- the anonymous key: attempt in disguise, record after taking it off.
  -- (the first harness recorded while still anon and was refused by its own
  --  lock; that test defect was found, said out loud, and fixed here)
  perform set_config('request.jwt.claims','{"role":"anon"}', true);
  execute 'set local role anon';
  begin
    select count(*) into cnt from public.families;
    p1 := false; d1 := 'SELECT WAS ALLOWED, count '||cnt;
  exception when others then
    p1 := (sqlstate = '42501'); d1 := 'refused '||sqlstate;
  end;
  begin
    select count(*) into cnt from public.child_state;
    p2 := false; d2 := 'SELECT WAS ALLOWED, count '||cnt;
  exception when others then
    p2 := (sqlstate = '42501'); d2 := 'refused '||sqlstate;
  end;
  execute 'reset role';
  insert into public._s2_proofs (test, pass, detail) values ('Anonymous refused at families', p1, d1);
  insert into public._s2_proofs (test, pass, detail) values ('Anonymous refused at the drawers', p2, d2);
end $$;

-- ============ PART 3: THE NEVER-LOST PROOF ============
update public.snapshots set day = current_date - 1
  where child_id = 'aaaaaaaa-1111-0000-0000-000000000001';

do $$
declare cnt int; good text; bad text;
begin
  perform set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  execute 'set local role authenticated';

  update public.child_state set value = '{"w":"CORRUPTED"}'
    where child_id = 'aaaaaaaa-1111-0000-0000-000000000001' and drawer = 'save';

  select count(*) into cnt from public.snapshots where child_id = 'aaaaaaaa-1111-0000-0000-000000000001';
  select world->>'w' into good from public.snapshots
    where child_id = 'aaaaaaaa-1111-0000-0000-000000000001' and day = current_date - 1;
  select world->>'w' into bad from public.snapshots
    where child_id = 'aaaaaaaa-1111-0000-0000-000000000001' and day = current_date;

  execute 'reset role';
  insert into public._s2_proofs (test, pass, detail) values
    ('After corruption, two snapshots exist', cnt = 2, 'count '||cnt),
    ('Yesterday''s island is intact and readable by the family', good = 'islandA2', 'yesterday holds '||coalesce(good,'NULL')),
    ('Today''s snapshot mirrors the corruption, as designed', bad = 'CORRUPTED', 'today holds '||coalesce(bad,'NULL'));
end $$;

select n, test, pass, detail from public._s2_proofs order by n;

-- ============ PART 4: CLEANUP ============
-- deleting the parents cascades through families, children, drawers and
-- snapshots, which is itself the delete-everything path working
delete from auth.users where id in ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
drop table public._s2_proofs;
select (select count(*) from auth.users) as users,
       (select count(*) from public.families) as fams,
       (select count(*) from public.children) as kids,
       (select count(*) from public.child_state) as drawers,
       (select count(*) from public.snapshots) as snaps,
       (select count(*) from public.consents) as consents;
