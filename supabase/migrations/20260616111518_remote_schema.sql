


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  insert into public.usuarios (id, email, nome, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'nome',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.perfis (usuario_id)
  values (new.id)
  on conflict (usuario_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (select 1 from public.admins a where a.usuario_id = auth.uid());
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_atualizado_em"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_atualizado_em"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tem_papel_no_negocio"("neg_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1 from public.papeis_negocio p
    where p.negocio_id = neg_id and p.usuario_id = auth.uid() and p.ativo
  );
$$;


ALTER FUNCTION "public"."tem_papel_no_negocio"("neg_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "usuario_id" "uuid" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


COMMENT ON TABLE "public"."admins" IS 'Admins globais. is_admin() consulta esta tabela.';



CREATE TABLE IF NOT EXISTS "public"."imoveis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proprietario_id" "uuid" NOT NULL,
    "cep" "text",
    "logradouro" "text",
    "numero" "text",
    "complemento" "text",
    "bairro" "text",
    "cidade" "text",
    "uf" "text",
    "lat" numeric,
    "lng" numeric,
    "tipo" "text",
    "area_m2" numeric,
    "quartos" integer,
    "vagas" integer,
    "ano_construcao" integer,
    "caracteristicas" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "valor_anuncio" numeric,
    "fotos" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "text" DEFAULT 'rascunho'::"text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "imoveis_status_check" CHECK (("status" = ANY (ARRAY['rascunho'::"text", 'ativo'::"text", 'em_negociacao'::"text", 'vendido'::"text", 'arquivado'::"text"]))),
    CONSTRAINT "imoveis_tipo_check" CHECK (("tipo" = ANY (ARRAY['casa'::"text", 'apartamento'::"text", 'comercial'::"text", 'terreno'::"text"]))),
    CONSTRAINT "imoveis_uf_check" CHECK ((("uf" IS NULL) OR ("char_length"("uf") = 2)))
);


ALTER TABLE "public"."imoveis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logs_estruturados" (
    "id" bigint NOT NULL,
    "evento" "text" NOT NULL,
    "severidade" "text" DEFAULT 'info'::"text" NOT NULL,
    "usuario_id" "uuid",
    "entidade_id" "uuid",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "request_id" "text",
    "ts" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "logs_estruturados_severidade_check" CHECK (("severidade" = ANY (ARRAY['info'::"text", 'warn'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."logs_estruturados" OWNER TO "postgres";


ALTER TABLE "public"."logs_estruturados" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."logs_estruturados_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."negocios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "imovel_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'aberto'::"text" NOT NULL,
    "valor_acordado" numeric,
    "criado_por" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "negocios_status_check" CHECK (("status" = ANY (ARRAY['aberto'::"text", 'em_negociacao'::"text", 'fechado'::"text", 'cancelado'::"text"])))
);


ALTER TABLE "public"."negocios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."papeis_negocio" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "negocio_id" "uuid" NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "papel" "text" NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "papeis_negocio_papel_check" CHECK (("papel" = ANY (ARRAY['proprietario'::"text", 'comprador'::"text", 'corretor'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."papeis_negocio" OWNER TO "postgres";


COMMENT ON TABLE "public"."papeis_negocio" IS 'Multi-papel canônico: 1 usuário pode acumular papéis distintos por negócio.';



CREATE TABLE IF NOT EXISTS "public"."perfis" (
    "usuario_id" "uuid" NOT NULL,
    "bio" "text",
    "preferencias" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "onboarding_completo" boolean DEFAULT false NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."perfis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" NOT NULL,
    "nome" "text",
    "email" "text" NOT NULL,
    "telefone" "text",
    "cpf" "text",
    "avatar_url" "text",
    "status" "text" DEFAULT 'ativo'::"text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "usuarios_status_check" CHECK (("status" = ANY (ARRAY['ativo'::"text", 'inativo'::"text", 'convidado'::"text"])))
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


COMMENT ON TABLE "public"."usuarios" IS 'Identidade do usuário, 1:1 com auth.users.';



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("usuario_id");



ALTER TABLE ONLY "public"."imoveis"
    ADD CONSTRAINT "imoveis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logs_estruturados"
    ADD CONSTRAINT "logs_estruturados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."negocios"
    ADD CONSTRAINT "negocios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."papeis_negocio"
    ADD CONSTRAINT "papeis_negocio_negocio_id_usuario_id_papel_key" UNIQUE ("negocio_id", "usuario_id", "papel");



ALTER TABLE ONLY "public"."papeis_negocio"
    ADD CONSTRAINT "papeis_negocio_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."perfis"
    ADD CONSTRAINT "perfis_pkey" PRIMARY KEY ("usuario_id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_imoveis_cidade" ON "public"."imoveis" USING "btree" ("cidade");



CREATE INDEX "idx_imoveis_proprietario" ON "public"."imoveis" USING "btree" ("proprietario_id");



CREATE INDEX "idx_imoveis_status" ON "public"."imoveis" USING "btree" ("status");



CREATE INDEX "idx_imoveis_uf" ON "public"."imoveis" USING "btree" ("uf");



CREATE INDEX "idx_logs_evento" ON "public"."logs_estruturados" USING "btree" ("evento");



CREATE INDEX "idx_logs_ts" ON "public"."logs_estruturados" USING "btree" ("ts" DESC);



CREATE INDEX "idx_logs_usuario" ON "public"."logs_estruturados" USING "btree" ("usuario_id");



CREATE INDEX "idx_negocios_imovel" ON "public"."negocios" USING "btree" ("imovel_id");



CREATE INDEX "idx_negocios_status" ON "public"."negocios" USING "btree" ("status");



CREATE INDEX "idx_papeis_negocio" ON "public"."papeis_negocio" USING "btree" ("negocio_id");



CREATE INDEX "idx_papeis_usuario" ON "public"."papeis_negocio" USING "btree" ("usuario_id");



CREATE OR REPLACE TRIGGER "trg_imoveis_upd" BEFORE UPDATE ON "public"."imoveis" FOR EACH ROW EXECUTE FUNCTION "public"."set_atualizado_em"();



CREATE OR REPLACE TRIGGER "trg_negocios_upd" BEFORE UPDATE ON "public"."negocios" FOR EACH ROW EXECUTE FUNCTION "public"."set_atualizado_em"();



CREATE OR REPLACE TRIGGER "trg_perfis_upd" BEFORE UPDATE ON "public"."perfis" FOR EACH ROW EXECUTE FUNCTION "public"."set_atualizado_em"();



CREATE OR REPLACE TRIGGER "trg_usuarios_upd" BEFORE UPDATE ON "public"."usuarios" FOR EACH ROW EXECUTE FUNCTION "public"."set_atualizado_em"();



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."imoveis"
    ADD CONSTRAINT "imoveis_proprietario_id_fkey" FOREIGN KEY ("proprietario_id") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."logs_estruturados"
    ADD CONSTRAINT "logs_estruturados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."negocios"
    ADD CONSTRAINT "negocios_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."negocios"
    ADD CONSTRAINT "negocios_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "public"."imoveis"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."papeis_negocio"
    ADD CONSTRAINT "papeis_negocio_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."papeis_negocio"
    ADD CONSTRAINT "papeis_negocio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."perfis"
    ADD CONSTRAINT "perfis_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admins_select" ON "public"."admins" FOR SELECT USING (("public"."is_admin"() OR ("usuario_id" = "auth"."uid"())));



ALTER TABLE "public"."imoveis" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "imoveis_delete" ON "public"."imoveis" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "imoveis_insert" ON "public"."imoveis" FOR INSERT WITH CHECK (("public"."is_admin"() OR ("proprietario_id" = "auth"."uid"())));



CREATE POLICY "imoveis_select" ON "public"."imoveis" FOR SELECT USING (("public"."is_admin"() OR ("proprietario_id" = "auth"."uid"())));



CREATE POLICY "imoveis_update" ON "public"."imoveis" FOR UPDATE USING (("public"."is_admin"() OR ("proprietario_id" = "auth"."uid"()))) WITH CHECK (("public"."is_admin"() OR ("proprietario_id" = "auth"."uid"())));



ALTER TABLE "public"."logs_estruturados" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "logs_select" ON "public"."logs_estruturados" FOR SELECT USING ("public"."is_admin"());



ALTER TABLE "public"."negocios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "negocios_insert" ON "public"."negocios" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "negocios_select" ON "public"."negocios" FOR SELECT USING (("public"."is_admin"() OR "public"."tem_papel_no_negocio"("id")));



CREATE POLICY "negocios_update" ON "public"."negocios" FOR UPDATE USING (("public"."is_admin"() OR "public"."tem_papel_no_negocio"("id"))) WITH CHECK (("public"."is_admin"() OR "public"."tem_papel_no_negocio"("id")));



CREATE POLICY "papeis_delete" ON "public"."papeis_negocio" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "papeis_insert" ON "public"."papeis_negocio" FOR INSERT WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."papeis_negocio" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "papeis_select" ON "public"."papeis_negocio" FOR SELECT USING (("public"."is_admin"() OR ("usuario_id" = "auth"."uid"()) OR "public"."tem_papel_no_negocio"("negocio_id")));



CREATE POLICY "papeis_update" ON "public"."papeis_negocio" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."perfis" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "perfis_select" ON "public"."perfis" FOR SELECT USING (("public"."is_admin"() OR ("usuario_id" = "auth"."uid"())));



CREATE POLICY "perfis_update" ON "public"."perfis" FOR UPDATE USING (("public"."is_admin"() OR ("usuario_id" = "auth"."uid"()))) WITH CHECK (("public"."is_admin"() OR ("usuario_id" = "auth"."uid"())));



ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usuarios_insert" ON "public"."usuarios" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "usuarios_select" ON "public"."usuarios" FOR SELECT USING (("public"."is_admin"() OR ("id" = "auth"."uid"())));



CREATE POLICY "usuarios_update" ON "public"."usuarios" FOR UPDATE USING (("public"."is_admin"() OR ("id" = "auth"."uid"()))) WITH CHECK (("public"."is_admin"() OR ("id" = "auth"."uid"())));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_atualizado_em"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_atualizado_em"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_atualizado_em"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tem_papel_no_negocio"("neg_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."tem_papel_no_negocio"("neg_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."tem_papel_no_negocio"("neg_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."admins" TO "anon";
GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON TABLE "public"."imoveis" TO "anon";
GRANT ALL ON TABLE "public"."imoveis" TO "authenticated";
GRANT ALL ON TABLE "public"."imoveis" TO "service_role";



GRANT ALL ON TABLE "public"."logs_estruturados" TO "anon";
GRANT ALL ON TABLE "public"."logs_estruturados" TO "authenticated";
GRANT ALL ON TABLE "public"."logs_estruturados" TO "service_role";



GRANT ALL ON SEQUENCE "public"."logs_estruturados_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."logs_estruturados_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."logs_estruturados_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."negocios" TO "anon";
GRANT ALL ON TABLE "public"."negocios" TO "authenticated";
GRANT ALL ON TABLE "public"."negocios" TO "service_role";



GRANT ALL ON TABLE "public"."papeis_negocio" TO "anon";
GRANT ALL ON TABLE "public"."papeis_negocio" TO "authenticated";
GRANT ALL ON TABLE "public"."papeis_negocio" TO "service_role";



GRANT ALL ON TABLE "public"."perfis" TO "anon";
GRANT ALL ON TABLE "public"."perfis" TO "authenticated";
GRANT ALL ON TABLE "public"."perfis" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "avatares_delete"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'usuario-avatares'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "avatares_insert"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'usuario-avatares'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "avatares_update"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'usuario-avatares'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "imovel_fotos_delete"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'imovel-fotos'::text) AND (public.is_admin() OR ((storage.foldername(name))[1] = (auth.uid())::text))));



  create policy "imovel_fotos_insert"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'imovel-fotos'::text) AND (public.is_admin() OR ((storage.foldername(name))[1] = (auth.uid())::text))));



  create policy "imovel_fotos_update"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'imovel-fotos'::text) AND (public.is_admin() OR ((storage.foldername(name))[1] = (auth.uid())::text))));



