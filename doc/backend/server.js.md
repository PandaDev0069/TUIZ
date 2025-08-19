# 📄 server.js —

> One-liner: 

---

## 📦 Imports / Dependencies
- [ ] External libs:
  - `dotenv` – purpose
  - `http` – purpose
- [ ] Internal modules:
  - `./utils/logger` – purpose
  - `./config/database` – purpose
  - `./utils/CleanupScheduler` – purpose
  - `./utils/RoomManager` – purpose
  - `./services/QuestionService` – purpose
  - `./services/GameService` – purpose
  - `./services/ResultsService` – purpose
  - `./services/PlayerService` – purpose
  - `./services/HostOpsService` – purpose
  - `./adapters/QuestionFormatAdapter` – purpose
  - `./services/GameSettingsService` – purpose
  - `./utils/scoringSystem` – purpose
  - `./utils/storageConfig` – purpose
  - `./utils/ActiveGameUpdater` – purpose
  - `./app` – purpose
  - `./sockets` – purpose
  - `./config/env` – purpose
  - `./config/cors` – purpose
  - `./validation` – purpose
  - `./utils/responseHelpers` – purpose
  - `./domain/game/actions` – purpose
  - `./domain/game/endGame` – purpose
  - `./domain/game/statistics` – purpose
  - `./sockets/hostHandlers` – purpose
  - `./domain/game/explanation` – purpose
- [ ] Side-effects? (Y/N)

---

## 📤 Exports
- [ ] Functions:
  - `getIO`
  - `getGameHub`
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

### `setupHostHandlers(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `registerMainSocketHandlers(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `exists(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `checkForQuestionCompletion(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `showQuestionExplanation(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `showIntermediateLeaderboard(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `proceedToNextQuestion(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `sendNextQuestion(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `updatePlayerRankings(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `createGameResultsForPlayers(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

### `endGame(params)`
- **Purpose:**  
- **Inputs:** `<paramName: type>`  
- **Outputs:** `<return type>`  
- **Notes:** async? order-dependent? mutates state?

---

## 📊 Variables / Constants
- [ ] Global constants: `logger, http, DatabaseManager, CleanupScheduler, roomManager, QuestionService, GameService, ResultsService, PlayerService, HostOpsService, QuestionFormatAdapter, GameSettingsService, activeGameUpdater, gameActions, gameEndModule, HostSocketHandlers, db, questionService, gameService, resultsService, playerService, hostOpsService, questionAdapter, cleanupScheduler, isConnected, storageValidation, app, activeGames, server, hostHandlers, checkForQuestionCompletion, activeGame, gameFlowConfig, gameSettings, currentQuestion, allPlayersAnswered, shouldShowExpl, showQuestionExplanation, showIntermediateLeaderboard, getCorrectAnswerText, getCurrentPlayerAnswerData, proceedToNextQuestion, sendNextQuestion, updatePlayerRankings, playersArray, result, createGameResultsForPlayers, endGame, payload, actualHostId, gameTitle, questionSetSettings, questionSetResult, questionSet, enhancedGameSettings, gameCode, gameData, dbResult, dbGame, hostSessionResult, analyticsResult, room, game, maxPlayers, player, dbGamePlayer, playerUUID, gameUUID, playerData, actionType, joinActionResult, statusMsg, allPlayers, socketsInRoom, isHost, hasSessionRestored, players, questionResult, dbQuestions, transformResult, questions, questionTypes, typeSummary, settingsResult, finalQuestions, statusResult, existingAnswer, isCorrect, scoreResult, points, breakdown, answerData, playerStandings, questionSetId, preloadResult, currentPhase, disconnectActionResult, connectedPlayers`
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
