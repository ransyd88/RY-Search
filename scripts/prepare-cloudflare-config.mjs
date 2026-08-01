import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const configPath = path.resolve("dist", "server", "wrangler.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const publicRuntimeVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_EXPECTED_HOSTNAME",
];

config.vars ??= {};
for (const name of publicRuntimeVariables) {
  const value = process.env[name]?.trim();
  if (value) config.vars[name] = value;
}

await writeFile(configPath, `${JSON.stringify(config)}\n`, "utf8");
