import { spawnSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { build } from "esbuild";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vinextCli = path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js");
const renderedHtmlTest = path.join(projectRoot, "tests", "rendered-html.test.mjs");
const bundledResearchAgentTest = path.join(projectRoot, "tmp", "tests", "research-agent.test.mjs");
const cloudflareWorkersTestLoader = path.join(projectRoot, "scripts", "cloudflare-workers-test-loader.mjs");

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runNode([vinextCli, "build"]);
await mkdir(path.dirname(bundledResearchAgentTest), { recursive: true });
const researchAgentTestSource = await readFile(path.join(projectRoot, "tests", "research-agent.test.tsx"), "utf8");
await build({
  stdin: {
    contents: researchAgentTestSource,
    loader: "tsx",
    resolveDir: path.join(projectRoot, "tests"),
    sourcefile: "research-agent.test.tsx",
  },
  outfile: bundledResearchAgentTest,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  plugins: [{
    name: "cloudflare-workers-test-stub",
    setup(buildContext) {
      buildContext.onResolve({ filter: /^cloudflare:workers$/ }, () => ({
        path: "cloudflare:workers",
        namespace: "cloudflare-workers-test-stub",
      }));
      buildContext.onLoad({ filter: /.*/, namespace: "cloudflare-workers-test-stub" }, () => ({
        contents: "export const env = {};",
        loader: "js",
      }));
    },
  }],
  sourcemap: false,
});
runNode(["--experimental-loader", pathToFileURL(cloudflareWorkersTestLoader).href, "--test", renderedHtmlTest, bundledResearchAgentTest]);
