# 📄 app.js — Express application factory

> One-liner: sets up the Express server with middleware, configuration, and API routes.

---

## 📦 Imports / Dependencies
- [ ] External libs:
  - `express` – HTTP server framework
  - `cors` – Cross-Origin Resource Sharing middleware
  - `jsonwebtoken` – token decoding for debug endpoints
- [ ] Internal modules:
  - `./utils/logger` – centralized logging
  - `./config/database` – database manager
  - `./utils/SupabaseAuthHelper` – Supabase auth helpers
  - `./utils/CleanupScheduler` – schedules cleanup jobs
  - `./middleware/rateLimiter` – rate limiting middleware
  - `./utils/storageConfig` – storage configuration validator
  - `./config/env` – environment helpers
  - `./config/cors` – Express CORS configuration
  - `./routes/*` – API route modules
- [ ] Side-effects? (Y/N) Y (`dotenv` configuration)

---

## 📤 Exports
- [ ] Functions:
  - `createApp`
- [ ] Classes:
- [ ] Constants:
- [ ] Main factory (if any): `createApp()`

---

## 🧠 Responsibilities
- [ ] Owns: Express app initialization, middleware registration, and route mounting.
- [ ] Delegates: authentication, business logic, and data access to route modules and services.

---

## 🔧 Functions / Classes
### `createApp({ db, cleanupScheduler })`
- **Purpose:** Build and return a configured Express instance.
- **Inputs:** `db: DatabaseManager`, `cleanupScheduler: CleanupScheduler`
- **Outputs:** `express.Application`
- **Notes:** middleware order significant; returns configured app.

---

## 📊 Variables / Constants
- [ ] Env configs used here: `NODE_ENV`, Supabase keys via `getEnvironment()`/`getSupabaseConfig()`
- [ ] Defaults: body size limit `50mb`, `parameterLimit` `10000`

---

## 🔄 Data Flow
- **Inputs:** HTTP requests, database manager, cleanup scheduler.
- **Processing:** applies CORS, rate limiting, body parsers; registers routes and debug handlers.
- **Outputs:** API responses and health/debug information.

---

## ⚙️ Configuration
| Key | Required | Default | Used by | Notes |
|-----|----------|---------|---------|-------|
| `NODE_ENV` | ✗ | `development` | `getEnvironment` | toggles dev logging |
| `SUPABASE_URL` | ✗ | none | `getSupabaseConfig` | used for debug auth info |
| `SUPABASE_SERVICE_KEY` | ✗ | none | `getSupabaseConfig` | verifies tokens |

---

## 🧰 Middleware / Pipeline
| Order | Middleware | Purpose |
|-------|------------|---------|
| 1 | `cors` | handle origins |
| 2 | `RateLimitMiddleware.createGlobalLimit()` | prevent abuse |
| 3 | `express.json` / `express.urlencoded` | parse request bodies |
| 4 | error handler | handle invalid JSON / large payloads |

---

## 🌐 Route Map
| Prefix | Methods | Module | Auth | Rate Limit |
|--------|---------|--------|------|------------|
| `/health` | GET | inline | Public | None |
| `/api/auth` | various | `routes/auth` | varies | Global |
| `/api/debug/verify-token` | POST | inline | Public | Global |
| `/api/debug/auth-info` | GET | inline | Public | Global |
| other `/api/*` | various | route modules | varies | Global |

---

## 🔐 Security & Error Handling
- [ ] Auth model: Supabase JWT via `Authorization: Bearer <token>`
- [ ] Rate limits: global limiter on `/api/`
- [ ] Error responses:
  ```jsonc
  { "error": "Payload too large", "message": "Request payload is too large. Please reduce file sizes or split the request.", "limit": "50MB" }
  ```

🧪 Testing Notes
• How to import in tests: `const app = createApp({ db, cleanupScheduler })`
• Mocks / stubs required: mock `db` and `cleanupScheduler`
• Edge cases: invalid JSON, oversized payloads, missing auth headers

⸻

📝 Change Log
• 2025-08-19 — initial documentation using standard template.

⸻

✅ Maintenance Checklist
• Imports match code
• Env vars documented
• Routes accurate
• Error shapes consistent
• Security notes up to date
