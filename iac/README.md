# iac/ — Terraform modules

Phase 8 target. `modules/pya-cf-project` will accept a project name + DNS zone, and create:

- D1 database
- KV namespaces (`SESSIONS`, `OAUTH_STATE`, `MENU_CACHE`, `MEDIA_KV`)
- R2 bucket (with KV fallback hook)
- Pages project + custom domain
- Worker + custom domain (`api.<zone>`)
- Email Routing rule (`hello@<zone>` → owner inbox)
- Standard CF environment variables

State backend: R2 bucket `pya-iac-state` in the same CF account.

## Consumers

Each Pya project keeps its own thin `iac/main.tf` that pins this module by version. The first apply for `pyaeats-app` will be **`terraform import`** of existing resources (D1, KV, R2, Pages project, Workers) — no destroy/recreate. For `pyaserv`, it's a fresh apply.
