# 📄 app.js —

> One-liner: 

---

## 📦 Imports / Dependencies
- [ ] External libs:
  - `dotenv` – purpose
  - `express` – purpose
  - `cors` – purpose
  - `jsonwebtoken` – purpose
- [ ] Internal modules:
  - `./utils/logger` – purpose
  - `./config/database` – purpose
  - `./utils/SupabaseAuthHelper` – purpose
  - `./utils/CleanupScheduler` – purpose
  - `./middleware/rateLimiter` – purpose
  - `./utils/storageConfig` – purpose
  - `./config/env` – purpose
  - `./config/cors` – purpose
  - `./routes/auth` – purpose
  - `./helpers/authHelper` – purpose
  - `./routes/api/questionSets` – purpose
  - `./routes/api/questions` – purpose
  - `./routes/api/answers` – purpose
  - `./routes/api/debug` – purpose
  - `./routes/api/games` – purpose
  - `./routes/api/quiz` – purpose
  - `./routes/upload` – purpose
  - `./routes/api/playerManagement` – purpose
  - `./routes/api/players` – purpose
  - `./routes/api/gameResults` – purpose
  - `./routes/api/gameSettings` – purpose
  - `./routes/api/host/gameControl` – purpose
  - `./routes/api/host/playerManagement` – purpose
  - `./routes/api/host/gameCreation` – purpose
- [ ] Side-effects? (Y/N)

---

## 📤 Exports
- [ ] Functions:
  - `createApp`
- [ ] Classes:
- [ ] Constants:
- [ ] Main factory (if any): `<createSomething()>`

---

## 🧠 Responsibilities
- [ ] Owns: <what logic this file controls>
- [ ] Delegates: <what is pushed down to helpers/services>

---

## 🔧 Functions / Classes
### `createApp(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `doesn(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `not(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

---

## 📊 Variables / Constants
- [ ] Global constants: `express, cors, jwt, logger, DatabaseManager, SupabaseAuthHelper, CleanupScheduler, RateLimitMiddleware, app, isDbConnected, authRoutes, authHeader, token, tokenInfo, decoded, verificationResult, supabaseConfig, authenticatedUser, testResults, status, stats, error, statsResult, result, questionSetsRoutes, questionsRoutes, answersRoutes, debugRoutes, gamesRoutes, quizRoutes, uploadRoutes, playerManagementRoutes, playersRoutes, gameResultsRoutes, gameSettingsRoutes, hostGameControlRoutes, hostPlayerManagementRoutes, hostGameCreationRoutes`
- [ ] Env configs used here: `<process.env.SOMETHING>`
- [ ] Defaults: `<DEFAULT_TIMEOUT = 5000>`

---

## 🔄 Data Flow
- **Inputs:** <where data comes from>  
- **Processing:** <transformations or logic>  
- **Outputs:** <what is returned / emitted / stored>

---

## ⚙️ Configuration
| Key | Required | Default | Used by | Notes |
|-----|----------|---------|---------|-------|
| `EXAMPLE_ENV` | ✓ | none | this file | controls X |

---

## 🧰 Middleware / Pipeline (if applicable)
| Order | Middleware | Purpose |
|-------|------------|---------|
| 1 | `<cors>` | handle origins |
| 2 | `<rateLimiter>` | prevent abuse |

---

## 🌐 Route Map (if API file)
| Prefix | Methods | Module | Auth | Rate Limit |
|--------|---------|--------|------|------------|
| `/example` | GET | `routes/example.js` | Public | Standard |

---

## 🔐 Security & Error Handling
- [ ] Auth model: `<Bearer JWT>` / `<session>`  
- [ ] Rate limits: `<100/min>`  
- [ ] Error responses:  
  ```jsonc
  { "error": "BadRequest", "message": "Invalid input" }
  ```

🧪 Testing Notes
	•	How to import in tests: `<supertest(app)>`
	•	Mocks / stubs required: `<SupabaseAuthHelper.fake()>`
	•	Edge cases: list them here

⸻

📝 Change Log
	•	YYYY-MM-DD — 

⸻

✅ Maintenance Checklist
	•	Imports match code
	•	Env vars documented
	•	Routes accurate
	•	Error shapes consistent
	•	Security notes up to date
