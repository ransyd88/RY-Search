import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "win32") {
  process.exit(0);
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheModule = path.join(
  projectRoot,
  "node_modules",
  "vinext",
  "dist",
  "server",
  "static-file-cache.js",
);

if (!fs.existsSync(cacheModule)) {
  process.exit(0);
}

const original = 'relativePath: path.relative(base, batch[j]),';
const replacement = 'relativePath: path.relative(base, batch[j]).split(path.sep).join("/"),';
const source = fs.readFileSync(cacheModule, "utf8");

if (source.includes(replacement)) {
  process.exit(0);
}

if (!source.includes(original)) {
  throw new Error("Vinext static cache implementation changed; Windows path patch was not applied.");
}

fs.writeFileSync(cacheModule, source.replace(original, replacement));
