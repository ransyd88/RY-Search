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

Never add a Supabase `service_role` or secret key to this website. The publishable/anon key is intentionally usable by the browser; database protection must come from Supabase Row Level Security.

### Invitation-only configuration

In the Supabase dashboard:

1. Open **Authentication > Sign In / Providers > Email** and keep email/password authentication enabled.
2. Disable **Allow new users to sign up**.
3. Keep anonymous sign-ins disabled.
4. Open **Authentication > Users** and create each authorised user administratively.
5. Configure a suitable JWT expiry and, where your plan supports it, session lifetime, inactivity timeout, and single-session settings.
6. Review Auth rate limits and attack-protection settings before production use.

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

## Portal placeholders

The initial portal cards are intentionally non-clickable. Their `href` values are `null` in `app/portal/page.tsx` under the `PLACEHOLDER_CONFIG` comment:

- R&Y Research Agent
- Property Review Agent
- Private Credit Agent
- Market Briefing Agent
- Document Library
- Investment Dashboard

Replace those values only with approved protected internal routes or trusted external destinations. Adding a card link does not protect the destination; each internal tool and data API must enforce its own server-side authentication and Supabase RLS policies.

## Current security limitations

- Authentication remains unavailable until valid Supabase environment values are supplied.
- No private documents, investment data, or agent integrations are included yet.
- Password recovery and MFA are not implemented in the website.
- Supabase local logout clears the current browser session. As with JWT-based authentication generally, an already-issued access token can remain valid until its configured expiry.
- Future Supabase tables must enable Row Level Security before any private data is added.
