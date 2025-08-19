# 📄 utils/responseHelpers.js —

> One-liner: 

---

## 📦 Imports / Dependencies
- [ ] External libs:
- [ ] Internal modules:
  - `../utils/logger` – purpose
- [ ] Side-effects? (Y/N)

---

## 📤 Exports
- [ ] Functions:
  - `sendSuccess`
  - `sendError`
  - `sendValidationError`
  - `sendNotFound`
  - `sendUnauthorized`
  - `sendForbidden`
  - `sendRateLimit`
  - `createSocketResponse`
  - `formatGameState`
  - `formatQuestion`
  - `formatPlayer`
  - `formatLeaderboard`
- [ ] Classes:
- [ ] Constants:
- [ ] Main factory (if any): `<createSomething()>`

---

## 🧠 Responsibilities
- [ ] Owns: <what logic this file controls>
- [ ] Delegates: <what is pushed down to helpers/services>

---

## 🔧 Functions / Classes
### `sendSuccess(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `sendError(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `sendValidationError(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `sendNotFound(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `sendUnauthorized(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `sendForbidden(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `sendRateLimit(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `createSocketResponse(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `formatGameState(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `formatQuestion(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `formatPlayer(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `formatLeaderboard(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

---

## 📊 Variables / Constants
- [ ] Global constants: `logger, response, details, formatted, sortedPlayers`
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
