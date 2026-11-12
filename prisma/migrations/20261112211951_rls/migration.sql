-- ═══════════════════════════════════════════════════════════════════════
-- AISLAMIENTO ENTRE BARBERÍAS A NIVEL DE BASE DE DATOS (Row Level Security)
--
-- La aplicación se conecta con el rol `barberpass_app`, que NO es dueño de las
-- tablas y por lo tanto está sujeto a estas políticas. Cada petición abre una
-- transacción y declara para qué barbería trabaja:
--     SELECT set_config('app.barbershop_id', '<id>', true);
-- Aunque el código olvide un filtro, PostgreSQL no devuelve ni deja modificar
-- filas de otra barbería.
--
-- El acceso de plataforma (super administrador, inicio de sesión, resolución
-- del slug) se declara explícitamente con  set_config('app.plataforma','on',true)
-- y solo se usa desde src/lib/db (función conPlataforma).
-- ═══════════════════════════════════════════════════════════════════════

-- Rol de la aplicación. Si no existe se crea sin inicio de sesión; luego hay
-- que asignarle contraseña:  ALTER ROLE barberpass_app LOGIN PASSWORD '...';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'barberpass_app') THEN
    BEGIN
      CREATE ROLE barberpass_app NOLOGIN;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE EXCEPTION 'Falta el rol barberpass_app. Créalo antes de migrar: CREATE ROLE barberpass_app LOGIN PASSWORD ''...'';';
    END;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO barberpass_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO barberpass_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO barberpass_app;
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON "_prisma_migrations" FROM barberpass_app;
  END IF;
END $$;

-- La auditoría es de solo inserción para la aplicación.
REVOKE UPDATE, DELETE ON "AuditLog" FROM barberpass_app;

-- Funciones auxiliares que leen el contexto de la transacción.
CREATE FUNCTION app_barbershop_id() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.barbershop_id', true), '') $$;

CREATE FUNCTION app_plataforma() RETURNS boolean
  LANGUAGE sql STABLE
  AS $$ SELECT COALESCE(current_setting('app.plataforma', true), '') = 'on' $$;

-- Barbería: solo su propia fila.
ALTER TABLE "Barbershop" ENABLE ROW LEVEL SECURITY;
CREATE POLICY barberia_propia ON "Barbershop"
  USING ("id" = app_barbershop_id() OR app_plataforma())
  WITH CHECK ("id" = app_barbershop_id() OR app_plataforma());

-- Tablas con acceso completo dentro de la propia barbería.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['OwnerUser', 'Barber', 'Customer', 'Stamp', 'Redemption'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY barberia_propia ON %I
         USING ("barbershopId" = app_barbershop_id() OR app_plataforma())
         WITH CHECK ("barbershopId" = app_barbershop_id() OR app_plataforma())', t);
  END LOOP;
END $$;

-- Pagos: la barbería solo puede LEER los suyos; solo la plataforma escribe.
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY pagos_lectura ON "Payment" FOR SELECT
  USING ("barbershopId" = app_barbershop_id() OR app_plataforma());
CREATE POLICY pagos_alta ON "Payment" FOR INSERT WITH CHECK (app_plataforma());
CREATE POLICY pagos_edicion ON "Payment" FOR UPDATE USING (app_plataforma()) WITH CHECK (app_plataforma());
CREATE POLICY pagos_baja ON "Payment" FOR DELETE USING (app_plataforma());

-- Auditoría: cada barbería lee e inserta solo lo suyo; la plataforma, todo.
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY auditoria_lectura ON "AuditLog" FOR SELECT
  USING ("barbershopId" = app_barbershop_id() OR app_plataforma());
CREATE POLICY auditoria_alta ON "AuditLog" FOR INSERT
  WITH CHECK ("barbershopId" = app_barbershop_id() OR app_plataforma());

-- Reglas de integridad adicionales.
ALTER TABLE "Customer" ADD CONSTRAINT customer_celular_peruano CHECK ("phone" ~ '^9[0-9]{8}$');
ALTER TABLE "Customer" ADD CONSTRAINT customer_sellos_no_negativos CHECK ("stampsCount" >= 0);
ALTER TABLE "Customer" ADD CONSTRAINT customer_cumple_valido CHECK (
  ("birthDay" IS NULL AND "birthMonth" IS NULL)
  OR ("birthDay" BETWEEN 1 AND 31 AND "birthMonth" BETWEEN 1 AND 12));
ALTER TABLE "Barbershop" ADD CONSTRAINT barbershop_sellos_requeridos CHECK ("stampsRequired" BETWEEN 2 AND 20);
ALTER TABLE "Barbershop" ADD CONSTRAINT barbershop_slug_valido CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
