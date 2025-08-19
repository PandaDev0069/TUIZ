# 📄 routes/api/quiz.js —

> One-liner: 

---

## 📦 Imports / Dependencies
- [ ] External libs:
  - `express` – purpose
  - `multer` – purpose
  - `path` – purpose
  - `fs` – purpose
- [ ] Internal modules:
  - `../../config/database` – purpose
  - `../../middleware/auth` – purpose
  - `../../utils/SecurityUtils` – purpose
  - `../../middleware/rateLimiter` – purpose
  - `../../utils/logger` – purpose
  - `../../utils/ActiveGameUpdater` – purpose
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
### `fileFilter(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `copyImageToNewLocation(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

---

## 📊 Variables / Constants
- [ ] Global constants: `express, multer, path, fs, DatabaseManager, AuthMiddleware, SecurityUtils, RateLimitMiddleware, logger, dbManager, supabase, router, storage, uploadDir, secureFilename, fileFilter, upload, uploadsDir, secureFileName, safePath, normalizedSafePath, normalizedUploadsDir, fileBuffer, safeStoragePath, quizId, userSupabase, thumbnailUrl, filePath, urlParts, fileName, validDifficulties, quizData, userId, db, query, publicQuizId, adminSupabase, copyImageToNewLocation, bucketIndex, bucketName, originalFilePath, fileExtension, timestamp, randomId, newFileName, newFilePath, clonedThumbnailUrl, insertData, i, originalQuestion, clonedQuestionImageUrl, clonedExplanationImageUrl, questionData, answersData, answerIndex, answer, clonedAnswerImageUrl, answers, updateData, validStatuses, answersWithImages, questionIdArray, imagesToDelete, imageUrl, validationErrors, hasValidAnswers, hasCorrectAnswer, newSettings, hasIncompleteQuestions, ActiveGameUpdater, gameData, expectedHostId, isWaiting`
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
