# 📄 routes/api/questions.js —

> One-liner: 

---

## 📦 Imports / Dependencies
- [ ] External libs:
  - `express` – purpose
  - `multer` – purpose
  - `express-rate-limit` – purpose
- [ ] Internal modules:
  - `../../utils/logger` – purpose
  - `../../config/database` – purpose
  - `../../middleware/auth` – purpose
  - `../../middleware/rateLimiter` – purpose
  - `../../utils/SecurityUtils` – purpose
  - `../../validation` – purpose
  - `../../utils/OrderManager` – purpose
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
### `to(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `isValidUUID(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `isBlobUrl(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

---

## 📊 Variables / Constants
- [ ] Global constants: `express, logger, router, multer, rateLimit, DatabaseManager, AuthMiddleware, RateLimitMiddleware, SecurityUtils, db, OrderManager, orderManager, deleteImageLimiter, storage, upload, or, userSupabase, mappings, userId, uploadResults, i, file, mapping, fileExtension, timestamp, fileName, filePath, questionsToInsert, updatedQuestions, createdQuestions, errors, isValidUUID, uuidRegex, existingDbQuestionIds, tempOrderIndex, question, backendId, isNewQuestion, questionData, j, answer, isBlobUrl, originalImageUrl, filteredImageUrl, answerData, questionId, orphanedAnswers, newAnswers, toUpdate, toCreate, toDelete, newAnswer, existingAnswer, needsUpdate, k, update, creation, deleteId, allQuestions, existingIds, allValid, questionOrders, result, updateData, urlParts, bucketIndex`
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
