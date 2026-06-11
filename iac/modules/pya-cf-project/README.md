# `pya-cf-project` Terraform module

One Pya project = one D1 + four KV namespaces + optional R2 + Pages + Worker + DNS + Email Routing. Consume this module from `pyaeats-app/iac/` and `pyaserv/iac/`.

## Status

**Scaffold only**, not applied. Phase 8 of the platform extraction roadmap.

Outstanding before first `terraform apply`:

- [ ] Worker resource (`cloudflare_workers_script`) + custom-domain route — the current `main.tf` provisions Pages but not Workers; add when ready to move pyaeats-api off `wrangler deploy` and onto TF.
- [ ] Email Routing rule — the CF provider's `cloudflare_email_routing_rule` is unstable; configure in dashboard for now, migrate later.
- [ ] State backend — point at the R2 bucket `pya-iac-state` once R2 is enabled on the account. Until then state stays local (don't `apply` from CI).

## Import existing pyaeats-app resources

The current production CF resources for PyaEats were created by hand via `wrangler`. To bring them under Terraform without recreation:

```bash
cd pyaeats-app/iac

# Discover IDs
wrangler d1 list
wrangler kv:namespace list
wrangler pages project list

# Import (replace <id> with values from above)
terraform import module.pyaeats.cloudflare_d1_database.primary <d1-id>
terraform import module.pyaeats.cloudflare_workers_kv_namespace.sessions <kv-sessions-id>
# … repeat for oauth_state, menu_cache, media_kv
terraform import module.pyaeats.cloudflare_pages_project.site pyaeats-site
```

Then `terraform plan` — it must show **zero changes**. If anything is flagged for replacement, stop and adjust the module config to match reality before applying.

## Variable reference

See `variables.tf`. `project_name` is the slug; everything else is derived (`<slug>-sessions`, `<slug>-media`, `admin.<apex>`, …).
