# Supabase RLS Hardening

```sql
BEGIN;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname ~ '_(select|insert|update|delete)_(own_user_id|own_auth_user_id|own_owner_id|tenant|org)$'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I;',
      p.policyname,
      p.schemaname,
      p.tablename
    );
  END LOOP;
END $$;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', t.table_schema, t.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY;', t.table_schema, t.table_name);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

DO $$
DECLARE
  p record;
BEGIN
  BEGIN
    EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'ALTER TABLE storage.objects FORCE ROW LEVEL SECURITY;';

    FOR p IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
        AND (
          position('anon' in array_to_string(roles, ',')) > 0
          OR position('authenticated' in array_to_string(roles, ',')) > 0
          OR position('public' in array_to_string(roles, ',')) > 0
        )
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', p.policyname);
    END LOOP;

    EXECUTE 'DROP POLICY IF EXISTS "Public read images" ON storage.objects;';

    EXECUTE '
      CREATE POLICY "Public read images"
      ON storage.objects
      FOR SELECT
      TO anon, authenticated
      USING (bucket_id = ''images'');
    ';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sem permissão de owner em storage.objects. Aplique a parte de Storage pela UI: Storage > Policies.';
  END;
END $$;

COMMIT;
```