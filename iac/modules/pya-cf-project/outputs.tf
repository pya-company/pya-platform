output "d1_database_id" {
  description = "D1 database ID — paste into wrangler.jsonc as `database_id`."
  value       = cloudflare_d1_database.primary.id
}

output "kv_namespace_ids" {
  description = "All four KV namespace IDs keyed by short name."
  value = {
    sessions    = cloudflare_workers_kv_namespace.sessions.id
    oauth_state = cloudflare_workers_kv_namespace.oauth_state.id
    cache       = cloudflare_workers_kv_namespace.menu_cache.id
    media_kv    = cloudflare_workers_kv_namespace.media_kv.id
  }
}

output "r2_bucket_name" {
  description = "R2 bucket name if enable_r2; null otherwise."
  value       = try(cloudflare_r2_bucket.media[0].name, null)
}

output "pages_project_subdomain" {
  description = "Auto-generated *.pages.dev subdomain."
  value       = cloudflare_pages_project.site.subdomain
}
