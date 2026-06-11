# pya-cf-project — Cloudflare resources for one Pya project.
#
# Provisions: D1 + 4 KV namespaces + (optional) R2 + Pages project + Worker
# + custom domains + DNS records + Email Routing rule.
#
# Adapt to your consuming root module:
#
#   module "pyaeats" {
#     source        = "github.com/undeadliner/pya-platform//iac/modules/pya-cf-project?ref=v0.1.0"
#     account_id    = var.cf_account_id
#     project_name  = "pyaeats"
#     zone_id       = var.cf_zone_id_pyaeats_com
#     apex_domain   = "pyaeats.com"
#     owner_email   = "igor.ganov@gmail.com"
#     enable_r2     = true
#   }
#
# Importing existing resources (one-time) — see iac/IMPORT.md.

# ───── D1 ─────
resource "cloudflare_d1_database" "primary" {
  account_id = var.account_id
  name       = var.project_name
}

# ───── KV namespaces ─────
resource "cloudflare_workers_kv_namespace" "sessions" {
  account_id = var.account_id
  title      = "${var.project_name}-sessions"
}

resource "cloudflare_workers_kv_namespace" "oauth_state" {
  account_id = var.account_id
  title      = "${var.project_name}-oauth-state"
}

resource "cloudflare_workers_kv_namespace" "menu_cache" {
  account_id = var.account_id
  title      = "${var.project_name}-cache"
}

resource "cloudflare_workers_kv_namespace" "media_kv" {
  account_id = var.account_id
  title      = "${var.project_name}-media-kv"
}

# ───── R2 (optional until R2 is enabled on the account) ─────
resource "cloudflare_r2_bucket" "media" {
  count      = var.enable_r2 ? 1 : 0
  account_id = var.account_id
  name       = "${var.project_name}-media"
  location   = "WNAM"
}

# ───── Pages project (customer site) ─────
resource "cloudflare_pages_project" "site" {
  account_id        = var.account_id
  name              = "${var.project_name}-site"
  production_branch = "main"
}

# ───── Email Routing — hello@apex → owner ─────
# Rule + destination are configured in the CF dashboard for now; this resource
# is a stub. When the cloudflare provider exposes `cloudflare_email_routing_*`
# in a stable form, replace with declarative records.

# ───── DNS records — apex + admin + api ─────
resource "cloudflare_record" "apex" {
  zone_id = var.zone_id
  name    = "@"
  type    = "CNAME"
  content = "${cloudflare_pages_project.site.subdomain}"
  proxied = true
}

resource "cloudflare_record" "admin" {
  zone_id = var.zone_id
  name    = var.admin_subdomain
  type    = "CNAME"
  content = "${var.project_name}-admin.pages.dev"
  proxied = true
}

resource "cloudflare_record" "api" {
  zone_id = var.zone_id
  name    = var.api_subdomain
  type    = "CNAME"
  # Workers route is bound separately (workers_route below); the CNAME here is
  # a placeholder so the proxied edge can route to the Worker.
  content = "${var.project_name}-api.workers.dev"
  proxied = true
}
