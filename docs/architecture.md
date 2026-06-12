# Architecture

Snapshot of the platform + consumers as of 2026-06-12. Three Mermaid diagrams: top-level repo relationships → package map inside `pya-platform` → deployment topology.

## 1. Three repos — who pulls whom

```mermaid
flowchart LR
  subgraph PL["📦 undeadliner/pya-platform · ENGINE"]
    direction TB
    PLpkg["12 npm packages<br/>@pya-platform/*"]
    PLiac["iac/modules/<br/>pya-cf-project<br/>(Terraform)"]
  end

  subgraph PE["🍔 undeadliner/pyaeats-app · CONSUMER 1"]
    direction TB
    PEapi[apps/api<br/>Hono Worker<br/>food domain]
    PEsite[apps/site<br/>Astro · customer]
    PEadmin[apps/admin<br/>Astro · vendor]
    PEshared[packages/shared<br/>re-exports + food schemas]
  end

  subgraph PS["🛠️ undeadliner/pyaserv · CONSUMER 2"]
    direction TB
    PSapi[apps/api<br/>Hono Worker<br/>services domain]
    PSsite[apps/site<br/>Astro static]
  end

  PLpkg -->|bun overrides<br/>file:../pya-platform| PEshared
  PLpkg -->|bun overrides| PEapi
  PLpkg -->|bun overrides| PEsite
  PLpkg -->|bun overrides| PEadmin
  PLpkg -->|bun overrides| PSapi
  PLiac -.->|terraform module<br/>future apply| PEapi
  PLiac -.->|terraform module<br/>future apply| PSapi
```

## 2. Package map inside `pya-platform`

🟢 = real code · 🟡 = scaffold (lift completes in next Phase-6 follow-up) · 🔵 = Terraform.

```mermaid
flowchart TB
  classDef real fill:#16a34a,stroke:#14532d,color:#fff
  classDef scaffold fill:#eab308,stroke:#854d0e,color:#000
  classDef iac fill:#2563eb,stroke:#1e3a8a,color:#fff

  subgraph CORE["foundation"]
    SH["@pya-shared<br/>schemas + errors + uuidV7"]:::real
    I18N["@pya-i18n<br/>Locale type"]:::real
    AU["@pya-audit<br/>audit() stdout"]:::real
  end

  subgraph BACKEND["backend engine"]
    AUTH["@pya-auth<br/>passwordless · passkey · OAuth<br/>sessions · CSRF · 3 SQL migrations"]:::real
    EMAIL["@pya-email<br/>sendEmail() Resend wrapper"]:::real
    CF["@pya-cf<br/>D1 runner · KV · R2+KV fallback"]:::scaffold
    CMS["@pya-cms<br/>articles + AI-translation"]:::scaffold
    REV["@pya-reviews<br/>5-star + running avg"]:::scaffold
    COM["@pya-comments<br/>threaded"]:::scaffold
  end

  subgraph FRONTEND["frontend kit"]
    TOK["@pya-tokens<br/>768 lines CSS<br/>palettes + themes"]:::real
    UI["@pya-ui<br/>5 Lit components<br/>cart-store · announcer"]:::real
  end

  subgraph INFRA["infra-as-code"]
    TF["iac/modules/<br/>pya-cf-project<br/>D1 + KV×4 + R2 + Pages + DNS"]:::iac
  end

  AUTH --> SH
  CMS --> SH
  REV --> SH
  COM --> SH
  EMAIL --> AU
  AUTH --> EMAIL
  AUTH --> AU
  UI --> TOK
```

## 3. Deployment topology

```mermaid
flowchart TB
  classDef cf fill:#f97316,stroke:#7c2d12,color:#fff
  classDef gh fill:#181717,stroke:#000,color:#fff
  classDef domain fill:#06b6d4,stroke:#164e63,color:#fff

  subgraph DOM["🌐 Custom Domains"]
    direction LR
    D1d["pyaeats.com"]:::domain
    D2d["admin.pyaeats.com"]:::domain
    D3d["api.pyaeats.com"]:::domain
    D4d["pyaserv.com<br/>(awaiting delegation)"]:::domain
  end

  subgraph CFprod["☁️ Cloudflare account c5b8f263"]
    direction TB
    subgraph PEcf["pyaeats-app resources"]
      PEpages_site[Pages: pyaeats-site]:::cf
      PEpages_admin[Pages: pyaeats-admin]:::cf
      PEworker[Worker: pyaeats-api-prod]:::cf
      PEdb[(D1: pyaeats<br/>11 migrations)]:::cf
      PEkv[KV ×4: sessions /<br/>oauth_state / cache / media_kv]:::cf
    end
    subgraph PScf["pyaserv resources"]
      PSworker[Worker: pyaserv-api-prod]:::cf
      PSdb[(D1: pyaserv<br/>3 auth migrations)]:::cf
      PSkv[KV ×2: sessions /<br/>oauth_state]:::cf
    end
  end

  subgraph GHpages["📄 GitHub Pages"]
    PSsite[undeadliner.github.io/<br/>pyaserv/]:::gh
  end

  D1d --> PEpages_site
  D2d --> PEpages_admin
  D3d --> PEworker
  D4d -.delegate.-> PSsite

  PEworker --> PEdb
  PEworker --> PEkv
  PSworker --> PSdb
  PSworker --> PSkv
```
