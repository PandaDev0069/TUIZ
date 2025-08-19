# 📄 config/database.js —

> One-liner: 

---

## 📦 Imports / Dependencies
- [ ] External libs:
  - `dotenv` – purpose
  - `@supabase/supabase-js` – purpose
  - `crypto` – purpose
- [ ] Internal modules:
  - `../utils/logger` – purpose
  - `./cleanupConfig` – purpose
- [ ] Side-effects? (Y/N)

---

## 📤 Exports
- [ ] Functions:
- [ ] Classes:
- [ ] Constants:
- [ ] Main factory (if any): `<createSomething()>`

---

## 🧠 Responsibilities
- [ ] Owns: <what logic this file controls>
- [ ] Delegates: <what is pushed down to helpers/services>

---

## 🔧 Functions / Classes
### `const(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `not(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `to(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

---

## 📊 Variables / Constants
- [ ] Global constants: `crypto, logger, supabaseUrl, supabaseKey, supabaseServiceKey, adminClient, existingUser, signupData, i, questionData, answersData, newTimesPlayed, now, lastUpdate, timeSinceLastUpdate, updateData, questionSetSettings, gameOverrides, mergedSettings, newPlayerUUID, guestPlayerUUID, totalGames, totalScore, avgScore, recentGames, playerId, playerName, isGuest, isNewPlayer, playerResult, guestResult, gamePlayerData, query, questionStats, stats, activeCount, guestCount, userCount, validFields, filteredData, updates, player, totalCorrect, totalQuestions, averageScore, averageRank, bestRank, averageAccuracy, cleanupConfig, timings, gameCode, isUnique, attempts, maxAttempts, playerActionData, expiresAt, analytics, mean, squaredDifferences, variance, performance, recent, scores, sumX, n, slope`
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
