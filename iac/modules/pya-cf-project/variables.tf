variable "account_id" {
  description = "Cloudflare account ID."
  type        = string
}

variable "project_name" {
  description = "Short slug used as the prefix for every named resource (D1 db, KV namespaces, R2 bucket, Pages project, Worker)."
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,32}$", var.project_name))
    error_message = "project_name must be 3–33 chars, lowercase, start with a letter, hyphens allowed."
  }
}

variable "zone_id" {
  description = "Cloudflare zone ID for the project's apex domain (e.g. pyaeats.com). Used for DNS records + Email Routing."
  type        = string
}

variable "apex_domain" {
  description = "Apex domain (e.g. pyaeats.com). The module binds the customer site to this exact host and the admin/api workers to subdomains."
  type        = string
}

variable "admin_subdomain" {
  description = "Subdomain for the admin app."
  type        = string
  default     = "admin"
}

variable "api_subdomain" {
  description = "Subdomain for the Worker API."
  type        = string
  default     = "api"
}

variable "owner_email" {
  description = "Email Routing destination for hello@<apex>. Must be already-verified in CF Email Routing."
  type        = string
}

variable "environment" {
  description = "Deployment environment label — burned into Worker env vars."
  type        = string
  default     = "production"
}

variable "enable_r2" {
  description = "Create the R2 media bucket. Set to false until R2 is enabled on the account."
  type        = bool
  default     = false
}
