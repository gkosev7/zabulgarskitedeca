# Decap GitHub OAuth Worker (Cloudflare)

This worker provides the `auth_endpoint` required by Decap CMS when using `backend: github`.

## 1) Create GitHub OAuth app

- Homepage URL: `https://zabulgarskitedeca.gkosev7.workers.dev`
- Authorization callback URL: `https://decap-auth.gkosev7.workers.dev/callback`

## 2) Deploy worker

```bash
cd decap-oauth-worker
cp wrangler.toml.example wrangler.toml
wrangler secret put GITHUB_OAUTH_CLIENT_ID
wrangler secret put GITHUB_OAUTH_CLIENT_SECRET
wrangler deploy
```

If your worker URL is different from `https://decap-auth.gkosev7.workers.dev`,
update `public/admin/config.yml` `backend.base_url` to that URL.

## 3) Decap config already wired

`public/admin/config.yml` is configured to use:

- `backend.base_url: https://decap-auth.gkosev7.workers.dev`
- `backend.auth_endpoint: auth`

After deployment, open:

- `https://zabulgarskitedeca.gkosev7.workers.dev/admin/`

