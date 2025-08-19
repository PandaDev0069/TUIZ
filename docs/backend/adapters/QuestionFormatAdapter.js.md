# 📄 adapters/QuestionFormatAdapter.js —

> One-liner: 

---

## 📦 Imports / Dependencies
- [ ] External libs:
- [ ] Internal modules:
  - `../config/gameConfig` – purpose
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
<!-- No functions detected -->

---

## 📊 Variables / Constants
- [ ] Global constants: `gameConfig, isDevelopment, isLocalhost, sortedAnswers, correctAnswerIndex, gameQuestionType, options, timeLimit, points, transformedQuestion, correctIndex, defaultTiming, requiredFields, field, transformedQuestions, errors, transformed, summary, type`
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
