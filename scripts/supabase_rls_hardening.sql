-- Supabase RLS hardening (idempotente e seguro para backend server-side)
-- Objetivo:
-- 1) Remover policies genéricas criadas em public.* (script automático anterior)
-- 2) Deixar public.* sem acesso direto por anon/authenticated
-- 3) Configurar storage.objects para leitura pública apenas do bucket images

BEGIN;

-- 1) Limpeza de policies genéricas em public.*
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

-- 2) Hardening em public.*
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

-- Remove privilégios diretos em tabelas public para clientes Supabase
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- 3) Hardening do Storage
-- Em alguns projetos Supabase, o papel do SQL Editor não é owner de storage.objects.
-- Neste caso, a seção abaixo cai no EXCEPTION sem derrubar as mudanças em public.*.
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

-- Auditoria pós-aplicação
-- 1) Verificar RLS em tabelas public/storage
-- select schemaname, tablename, rowsecurity, forcerowsecurity
-- from pg_tables
-- where schemaname in ('public', 'storage')
-- order by schemaname, tablename;

-- 2) Verificar policies ativas
-- select schemaname, tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname in ('public', 'storage')
-- order by schemaname, tablename, policyname;

-- 3) Verificar grants em public
-- select grantee, table_schema, table_name, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and grantee in ('anon', 'authenticated')
-- order by grantee, table_name, privilege_type;
