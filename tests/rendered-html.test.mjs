import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

function request(pathname, headers = {}) {
  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html", ...headers },
      redirect: "manual",
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

function matches(source, expression) {
  return source.match(expression) ?? [];
}

test("homepage is server rendered with canonical SEO metadata", async () => {
  const response = await request("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.equal(matches(html, /<title>/gi).length, 1);
  assert.equal(matches(html, /<meta\s+name="description"/gi).length, 1);
  assert.equal(matches(html, /<h1\b/gi).length, 1);
  assert.match(html, /<html[^>]+lang="en-AU"/i);
  assert.match(html, /<title>R&amp;Y Capital \| Sydney Family Investment Company<\/title>/i);
  assert.match(
    html,
    /R&amp;Y Capital is a privately held family investment company based in Sydney, focused on long-term value across property, public markets, private credit and private enterprise\./i,
  );
  assert.match(html, /rel="canonical" href="https:\/\/rycapital\.com\.au\/"/i);
  assert.match(html, /property="og:url" content="https:\/\/rycapital\.com\.au\/"/i);
  assert.match(html, /property="og:site_name" content="R&amp;Y Capital"/i);
  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
  assert.match(html, /https:\/\/rycapital\.com\.au\/brand\/og-social\.jpg/i);
  assert.match(html, /type="application\/ld\+json"/i);
  assert.match(html, /mailto:info@rycapital\.com\.au/i);
  assert.match(html, /Sydney, Australia/i);
  assert.match(html, /Built for the/i);
  assert.match(html, /Private Capital\./i);
  assert.match(html, /src="\/brand\/wordmark-slate\.png"/i);
  assert.match(html, /src="\/images\/hero-architecture\.jpg"/i);
  assert.doesNotMatch(html, /\/_next\/image|\/_vinext\/image/i);
});

test("robots.txt allows public crawling and excludes private routes", async () => {
  const response = await request("/robots.txt", { accept: "text/plain" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/plain\b/i);

  const text = await response.text();
  assert.match(text, /^User-Agent: \*/mi);
  assert.match(text, /^Allow: \/$/mi);
  assert.match(text, /^Disallow: \/login$/mi);
  assert.match(text, /^Disallow: \/portal\/\*$/mi);
  assert.match(text, /^Sitemap: https:\/\/rycapital\.com\.au\/sitemap\.xml$/mi);
});

test("sitemap.xml contains only the canonical public homepage", async () => {
  const response = await request("/sitemap.xml", { accept: "application/xml" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /xml/i);

  const xml = await response.text();
  assert.match(xml, /<loc>https:\/\/rycapital\.com\.au\/<\/loc>/i);
  assert.equal(matches(xml, /<url>/gi).length, 1);
  assert.doesNotMatch(xml, /\/login|\/portal|\/auth|\/callback/i);
});

test("private routes are noindex and the portal remains authentication protected", async () => {
  const loginResponse = await request("/login");
  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");

  const loginHtml = await loginResponse.text();
  assert.match(loginHtml, /name="robots" content="noindex, nofollow, noarchive"/i);
  assert.match(loginHtml, /src="\/brand\/wordmark-slate\.png"/i);
  assert.match(loginHtml, /Keep me signed in for 30 days/i);
  assert.doesNotMatch(loginHtml, /\/_next\/image|\/_vinext\/image/i);
  assert.doesNotMatch(loginHtml, /rel="canonical"/i);
  assert.doesNotMatch(loginHtml, /property="og:/i);

  const portalResponse = await request("/portal");
  assert.ok([302, 303, 307, 308].includes(portalResponse.status));
  assert.equal(portalResponse.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  assert.match(portalResponse.headers.get("location") ?? "", /\/login$/i);
});

test("unknown public routes return a real 404", async () => {
  const response = await request("/definitely-missing-seo-audit");
  assert.equal(response.status, 404);
});

test("Research Agent APIs reject unauthenticated requests without exposing content", async () => {
  const response = await request("/api/agents/research/conversations", { accept: "application/json" });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  const payload = await response.json();
  assert.equal(payload.error.code, "UNAUTHENTICATED");
});
