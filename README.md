# R&Y Capital Website

A bespoke, responsive single-page website for R&Y Capital, a privately held investment company based in Sydney.

## Technology

- Vinext / Next-compatible React
- TypeScript
- CSS animations and responsive layout
- Cloudflare Workers-compatible build output

## Local development

On macOS or Linux:

```bash
npm install
npm run dev
```

On Windows PowerShell:

```powershell
$env:WRANGLER_LOG_PATH=".wrangler/wrangler.log"
.\node_modules\.bin\vinext.cmd dev
```

## Production build

On macOS or Linux:

```bash
npm run build
```

On Windows PowerShell:

```powershell
$env:WRANGLER_LOG_PATH=".wrangler/wrangler.log"
.\node_modules\.bin\vinext.cmd build
```

The deployment output is written to `dist/`.

## Deployment

This is a full-stack Cloudflare Workers application rather than a static Pages
export. In Cloudflare, connect this GitHub repository under **Workers & Pages**
and use:

```text
Production branch: main
Build command: npm run build
Deploy command: npm run deploy:cloudflare
```

The deployment script uses Wrangler's `--keep-vars` flag so encrypted runtime
secrets and server variables configured in Cloudflare are preserved when a Git
branch is rebuilt or promoted.

The `postbuild` step also copies the non-secret `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, and
`TURNSTILE_EXPECTED_HOSTNAME` build variables into the generated Worker runtime
configuration. Secret values are never copied into the generated configuration.

The build creates `dist/server/wrangler.json`; the deploy script publishes that
server bundle and its client assets. Add the Supabase variables described below
to both the Cloudflare build environment and the Worker runtime environment
before enabling the private portal.

## Editing guide

- Brand mark: `app/page.tsx`, in the `BrandMark` component.
- Page copy and investment/principle content: `app/page.tsx`.
- Images: `public/images/`.
- Colours, typography, spacing and animation timings: `app/globals.css`.
- Metadata and social preview: `app/layout.tsx` and `public/og.png`.

## Temporary assets

The intertwined R/Y mark and favicon are typographic first-version placeholders and can be replaced with the final supplied logo. The architectural photography is curated placeholder imagery and should be replaced if commissioned brand photography becomes available.

## Private portal architecture

The public website remains available at `/`. Private access is implemented with:

- `/login`: invitation-only email/password sign-in.
- `/portal`: server-rendered protected portal.
- `proxy.ts`: refreshes Supabase Auth cookies before login and portal requests.
- A second `supabase.auth.getUser()` check inside the portal Server Component.
- A server-side logout action that clears the current Supabase session.
- An optional **Keep me signed in for 30 days** checkbox. Without it, auth
  cookies expire when the browser session closes; logout clears both modes.
- Cloudflare Turnstile on every sign-in, validated on the server before
  credentials are submitted to Supabase Auth.
- `force-dynamic` and private no-store responses on authenticated routes.

The portal is not a static client-side route. Its HTML is generated only after the server confirms the current Supabase user. Do not convert `/portal` to a static export.

## Supabase setup

1. Create a Supabase project.
2. Open **Project Settings > API**.
3. Copy the **Project URL**.
4. Copy the current **Publishable key**. Older projects may show a legacy **anon key** instead.
5. In Windows PowerShell, create a local environment file:

```powershell
Copy-Item .env.example .env.local
```

6. Update `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_real_key
```

For a project that only has a legacy anon key, leave the publishable-key line empty and use:

```dotenv
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_legacy_anon_key
```

Never add a Supabase `service_role` key to browser code or a public-prefixed variable. The publishable/anon key is intentionally usable by the browser; database protection comes from Row Level Security. The Research Agent additionally uses `SUPABASE_SERVICE_ROLE_KEY` only as a server-side Cloudflare secret for trusted usage-counter RPCs.

### Invitation-only configuration

In the Supabase dashboard:

1. Open **Authentication > Sign In / Providers > Email** and keep email/password authentication enabled.
2. Disable **Allow new users to sign up**.
3. Keep anonymous sign-ins disabled.
4. Open **Authentication > Users** and create each authorised user administratively.
5. Configure a suitable JWT expiry and, where your plan supports it, session lifetime, inactivity timeout, and single-session settings.
6. Review Auth rate limits and attack-protection settings before production use.

Turnstile is not decorative client-side CAPTCHA: the login Server Action checks
the token, expected action and production hostname using the secret key. Failed
credentials return a generic response so the page does not reveal whether an
email exists. Keep Supabase Auth rate limiting enabled as the second layer of
brute-force protection. For unusually hostile traffic, add a Cloudflare WAF
rate-limit rule for `POST /login`; do not replace Turnstile with a home-grown
client-only counter.

The 30-day option controls only this browser's secure HTTP-only auth cookies.
Administrators can still revoke a user or session immediately in Supabase, and
Supabase project session-lifetime policies remain authoritative.

The website intentionally contains no sign-up UI or sign-up code. Disabling sign-ups in Supabase is still required because the publishable key is public.

### Password recovery

Password recovery is intentionally not exposed in this first version. A secure recovery flow requires configured production SMTP, approved redirect URLs, a PKCE callback, and a protected password-update route. Until those are configured, administrators should manage user recovery in Supabase.

## Cloudflare deployment

Secure server-side route protection cannot run as a static Cloudflare Pages export. Cloudflare currently directs full-stack Next.js applications to the Workers runtime. This project already produces a Cloudflare Worker-compatible Vinext build with Server Components, route handling, and proxy support, so no framework migration is required.

For the production deployment, configure both Supabase public variables as build variables and runtime environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Or use `NEXT_PUBLIC_SUPABASE_ANON_KEY` only for a legacy project.

Do not deploy the portal as static HTML. Use the existing Sites/Cloudflare Worker deployment output.

## R&Y Research Agent Setup

The first portal card opens `/portal/agents/research`. It provides an authenticated shared research workspace, optional owner-only private conversations, real Responses API streaming, Supabase-backed history, safe Markdown rendering, daily/per-minute limits, and secure logout. It does not include live web access, file upload, private-document retrieval, shared document knowledge, financial actions, email actions, or autonomous tool loops.

### 1. OpenAI project and key

1. Create a dedicated API project in the OpenAI Platform and add API billing.
2. Create a restricted project API key for this application. Give it only the API permissions the Responses endpoint requires.
3. Never paste the key into chat, GitHub, screenshots, client-side code, or a public environment variable.
4. Copy `.env.example` to an ignored local file in Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

5. Set these server-only values in `.env.local`:

```dotenv
OPENAI_API_KEY=your_openai_api_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
TURNSTILE_EXPECTED_HOSTNAME=rycapital.com.au
AI_DAILY_MESSAGE_LIMIT=100
AI_MAX_OUTPUT_TOKENS=2000
AI_CONVERSATION_MEMORY_ENABLED=true
AI_CONTEXT_MESSAGE_LIMIT=20
AI_MAX_MESSAGE_LENGTH=20000
AI_PER_MINUTE_LIMIT=10
AI_UPSTREAM_TIMEOUT_MS=90000
```

The UI exposes only two server-defined research modes: `LUNA` uses `gpt-5.6-luna`
with medium reasoning, while `TERRA` uses `gpt-5.6-terra` with high reasoning.
The default is `LUNA`. The browser submits only the fixed mode identifier and
cannot select an arbitrary model, replace system instructions, or enable tools.

Conversation memory is enabled by default. Shared conversations and their
same-conversation context are visible to every authenticated, administrator-created
portal account. Selecting **Private question** creates a separate private
conversation; only its creator can read it or include it in AI context. Shared
conversation creators retain exclusive rename/delete rights. Set
`AI_CONVERSATION_MEMORY_ENABLED=false` only as an emergency switch to stop all
cross-turn context while leaving saved history intact.

### 2. Apply the Supabase migration

For a new project, open **Supabase Dashboard > SQL Editor > New query**, paste and run `supabase/migrations/20260801000000_research_agent.sql`, then paste and run `supabase/migrations/20260802000000_shared_conversation_visibility.sql`. For the existing R&Y project, run only the second migration. It adds shared/private visibility and replaces the read policies without weakening owner-only management or anonymous-user denial.

Then open **Database > Tables** and verify RLS is enabled on all three tables. Under **Authentication > Users**, retain individual accounts for every user; never share one login.

Test shared/private behaviour with two accounts:

1. Sign in as User A, create a normal conversation, send a message, and note its title.
2. Sign out and sign in as User B.
3. Confirm the shared conversation appears, its messages are readable, and User B can continue it.
4. Confirm User B cannot rename or delete the shared conversation created by User A.
5. As User A, enable **Private question**, send a new question, and confirm a private conversation is created.
6. Sign in as User B and confirm that private conversation does not appear and its direct messages URL returns `404`.

RLS is a second line of defence. Server routes verify the authenticated user and conversation visibility; private reads and every rename/delete remain scoped to the verified `supabase.auth.getUser()` ID. The browser never supplies an authoritative `user_id`.

### 3. Configure Cloudflare

Keep the existing Supabase variables. Add `OPENAI_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, and `TURNSTILE_SECRET_KEY` as Worker secrets, never
as plain public text. For the current Wrangler deployment flow, run from Windows
PowerShell only when you are ready to configure production:

```powershell
npx.cmd wrangler secret put OPENAI_API_KEY --config dist/server/wrangler.json
npx.cmd wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config dist/server/wrangler.json
npx.cmd wrangler secret put TURNSTILE_SECRET_KEY --config dist/server/wrangler.json
```

Enter each key only into Wrangler's secure prompt. Alternatively, in Cloudflare
go to **Workers & Pages > ry-capital-website > Settings > Variables and Secrets >
Add**, choose **Secret**, add the three secrets separately, save them, and deploy
a new version.

Create a Turnstile widget for `rycapital.com.au`, then add its public site key as
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` and add `TURNSTILE_EXPECTED_HOSTNAME` with the
value `rycapital.com.au`. Add these two non-secret values to both the Worker
runtime variables and the Cloudflare build variables. Add optional `AI_*` limits
only when values different from the defaults are required. Do not remove or
overwrite existing Supabase values. Never use `NEXT_PUBLIC_OPENAI_API_KEY` or
`VITE_OPENAI_API_KEY`.

### 4. Local verification

After applying the migration and configuring an ignored `.env.local`:

```powershell
npm.cmd run build
npm.cmd test
```

For an interactive local check, start the normal server only after the build succeeds. Verify login, logout, expired-session redirect, conversation create/rename/delete, progressively streamed text, stop generation, mobile drawer/composer, and the daily limit by temporarily setting `AI_DAILY_MESSAGE_LIMIT=1` locally.

Automated tests use mocks and do not make paid OpenAI calls. Before production, repeat the two-user isolation test and inspect browser source/network data to confirm no OpenAI key, system prompt, raw provider response, or another user's content is present.

### Security warning

- Never expose `OPENAI_API_KEY` to frontend code.
- Never use `NEXT_PUBLIC_OPENAI_API_KEY` or `VITE_OPENAI_API_KEY`.
- Never commit `.env`, `.env.local`, or `.dev.vars`.
- Never use the Supabase service role key in the browser.
- Keep Row Level Security enabled and verify every user on the server.
- Do not store confidential documents in `public/` or public Supabase Storage buckets.
- Do not log complete private conversation content by default.

### Future extensions

Live web research should be added later as an explicit, server-controlled OpenAI tool with source display, domain controls, per-user authorisation, separate limits, and audit logging. It is intentionally unavailable in version one.

Private documents should later use a private Supabase Storage bucket, storage RLS, authenticated server-side retrieval and processing, file validation, malware controls, and—only if justified—an access-controlled vector index. No upload control or public bucket is included now.

## Portal placeholders

The Research Agent card is connected. The remaining cards are intentionally non-clickable under the `PLACEHOLDER_CONFIG` comment in `app/portal/page.tsx`:

- Property Review Agent
- Private Credit Agent
- Market Briefing Agent
- Document Library
- Investment Dashboard

Replace those values only with approved protected internal routes or trusted external destinations. Adding a card link does not protect the destination; each internal tool and data API must enforce its own server-side authentication and Supabase RLS policies.

## Image delivery

All public brand and photography paths are rooted under `public/brand` and
`public/images`. Next runtime image optimisation is disabled because the
Cloudflare/Vinext Worker serves these files directly; important logo instances
also opt out explicitly. Automated tests verify every currently referenced
brand, cursor, social and photography asset exists before deployment.

## Current security limitations

- Authentication remains unavailable until valid Supabase environment values are supplied.
- No private documents, investment data, or agent integrations are included yet.
- Password recovery and MFA are not implemented in the website.
- Supabase local logout clears the current browser session. As with JWT-based authentication generally, an already-issued access token can remain valid until its configured expiry.
- Future Supabase tables must enable Row Level Security before any private data is added.
