#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const ENV_FILE = ".env.local";

const groups = [
  {
    name: "app",
    required: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
  },
  {
    name: "scripts-locais",
    required: ["SUPA_URL", "ANON", "SROLE"],
  },
  {
    name: "operacao-local",
    required: ["SUPABASE_ACCESS_TOKEN", "GITHUB_TOKEN", "GH_TOKEN"],
  },
  {
    name: "conteudo-atual",
    optional: ["OPENAI_API_KEY", "OPENAI_MODELO_SUPORTE", "OPENAI_MODELO", "IDEOGRAM_API_KEY"],
  },
  {
    name: "hermes-futuro",
    optional: ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "HERMES_API_URL", "HERMES_API_TOKEN"],
  },
  {
    name: "marketing-futuro",
    optional: ["PERPLEXITY_API_KEY", "HIGGSFIELD_API_KEY"],
  },
  {
    name: "whatsapp-futuro",
    optional: [
      "WHATSAPP_PROVIDER",
      "WHATSAPP_PHONE_NUMBER_ID",
      "WHATSAPP_ACCESS_TOKEN",
      "WHATSAPP_GRAPH_API_VERSION",
      "WHATSAPP_TEST_TO",
    ],
  },
  {
    name: "instagram-futuro",
    optional: [
      "INSTAGRAM_PROVIDER",
      "INSTAGRAM_PAGE_ID",
      "INSTAGRAM_BUSINESS_ACCOUNT_ID",
      "INSTAGRAM_ACCESS_TOKEN",
      "INSTAGRAM_APP_SECRET",
      "INSTAGRAM_VERIFY_TOKEN",
      "INSTAGRAM_GRAPH_API_VERSION",
      "INSTAGRAM_TEST_IGSID",
    ],
  },
];

function parseEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );
}

const env = parseEnv(ENV_FILE);
let failures = 0;

console.log(`Validando ${ENV_FILE} sem exibir valores.`);

for (const group of groups) {
  const missingRequired = (group.required ?? []).filter((key) => !env[key]);
  const presentOptional = (group.optional ?? []).filter((key) => Boolean(env[key]));
  const missingOptional = (group.optional ?? []).filter((key) => !env[key]);

  if (missingRequired.length) {
    failures += missingRequired.length;
    console.log(`[falha] ${group.name}: obrigatorias ausentes: ${missingRequired.join(", ")}`);
  } else if (group.required?.length) {
    console.log(`[ok] ${group.name}: obrigatorias presentes`);
  }

  if (group.optional?.length) {
    console.log(
      `[info] ${group.name}: opcionais presentes ${presentOptional.length}/${group.optional.length}` +
        (missingOptional.length ? `; pendentes: ${missingOptional.join(", ")}` : ""),
    );
  }
}

const publicSecrets = Object.keys(env).filter(
  (key) =>
    key.startsWith("NEXT_PUBLIC_") &&
    /(SERVICE|SECRET|TOKEN|ROLE|KEY)$/i.test(key) &&
    key !== "NEXT_PUBLIC_SUPABASE_ANON_KEY" &&
    key !== "NEXT_PUBLIC_SUPABASE_URL" &&
    key !== "NEXT_PUBLIC_SENTRY_DSN",
);

if (publicSecrets.length) {
  failures += publicSecrets.length;
  console.log(`[falha] variaveis sensiveis com NEXT_PUBLIC_: ${publicSecrets.join(", ")}`);
}

if (env.NEXT_PUBLIC_SUPABASE_URL && !env.NEXT_PUBLIC_SUPABASE_URL.includes("qrhiftyvfsftyvjubmkl")) {
  failures += 1;
  console.log("[falha] NEXT_PUBLIC_SUPABASE_URL nao aponta para o projeto esperado qrhiftyvfsftyvjubmkl");
}

if (failures) {
  console.log(`Validacao encerrada com ${failures} pendencia(s) obrigatoria(s).`);
  process.exit(1);
}

console.log("Validacao de secrets obrigatorios concluida.");
