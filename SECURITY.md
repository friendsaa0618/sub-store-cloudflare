# Security Policy

## Supported Versions

The latest release is supported. Older releases may receive fixes only when the fix is low-risk and easy to backport.

## Reporting a Vulnerability

Do not open a public issue for secrets, auth bypasses, data exposure, or deployment credential problems.

Use GitHub private vulnerability reporting if it is available on the repository. If it is not available, contact the maintainer through the GitHub profile for `realchendahuang` and include:

- affected version or commit
- impact
- reproduction steps
- whether any subscription URL, token, D1 database, or deployment hostname may be exposed

Please redact live subscription URLs, node URIs, admin tokens, download tokens, and private Cloudflare identifiers.

## Deployment Secrets

The app uses:

- `SUB_STORE_ADMIN_TOKEN` for the admin UI and `/api/*`.
- `SUB_STORE_PUBLIC_DOWNLOAD_TOKEN` for `/download/*`.

Use long random values, for example:

```bash
openssl rand -base64 32
```

Rotate both tokens if they appear in logs, screenshots, issues, commits, or chat transcripts.

## Hardening checklist

What the deployment already does:

- **Credentials never travel in admin URLs.** `/api/*` accepts `Authorization: Bearer …` or `X-Sub-Store-Token` only. The `/?token=…` shortcut stores the token in `localStorage` and strips it from the address bar before the first API call.
- **Admin responses are uncacheable.** Every `/api/*` response, including `401`, carries `Cache-Control: no-store`; download responses are `no-store` as well.
- **Query strings are redacted from logs.** `observability.redact_query_string` is on, so `?token=…` never reaches Workers Logs or traces.
- **Search engines are told to stay out.** Every response carries `X-Robots-Tag: noindex, nofollow`, together with the CSP, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` and a locked-down `Permissions-Policy`.
- **Tokens are compared in constant time** and scoped grants are stored as SHA-256 hashes.
- **The installer refuses weak secrets**: both tokens need at least 24 characters and must differ.

Recommended for a private deployment:

1. **Prefer scoped download links.** `POST /api/shares` issues a per-resource token that only unlocks one source or collection, can expire, and can be locked to one output format. The global download token unlocks every collection, so hand it out only when a client cannot use a scoped link.
2. **Put the admin surface behind Cloudflare Access.** Protect the admin hostname and add a Bypass application for `/download` so clients keep working. Set `SUB_STORE_ACCESS_TEAM_DOMAIN` and `SUB_STORE_ACCESS_AUD` to let the Worker trust a verified Access JWT instead of asking for the admin token twice.
3. **Rotate on suspicion.** `wrangler secret put SUB_STORE_ADMIN_TOKEN` and `… SUB_STORE_PUBLIC_DOWNLOAD_TOKEN` replace a leaked value immediately; existing scoped grants keep working until they are revoked or expire.
4. **Keep `workers_dev` off** when a custom domain is in use, so there is exactly one entry point to protect.
