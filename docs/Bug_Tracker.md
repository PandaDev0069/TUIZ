# 🐞 BUG_TRACKER.md

> **Purpose**: Centralized documentation for tracking known bugs, their status, reproduction steps, and resolutions for the `TUIZ` Quiz App.

---

## 📋 Bug Tracker Overview

| ID   | Title                                | Severity | Status       | Assigned To   | Reported On | Fixed On  |
|------|--------------------------------------|----------|--------------|----------------|-------------|-----------|
| #001 | Player streak bonus not updating     | Medium   | 🔴 Open       | Unassigned     | 2025-08-06  | —         |
| #002 | Quiz preview not loading for drafts  | Low      | 🟠 In Progress| @dev_ash       | 2025-08-06  | —         |
| #003 | WebSocket disconnects after 1 minute | Critical | ✅ Fixed      | @dev_jane      | 2025-08-05  | 2025-08-07|
| #004 | Answer explanation not showing       | High     | 🟢 Verified   | @dev_kento     | 2025-08-03  | 2025-08-06|

---

## 🐛 Detailed Bug Reports

---

### #001: Player streak bonus not updating

- **Reported by**: @admin_tuiz  
- **Severity**: Medium  
- **Status**: 🔴 Open  
- **Assigned to**: Unassigned  
- **Environment**: Production (`Render`, `Supabase`, `Vercel`)

#### 🔁 Steps to Reproduce
1. Start a game with streak bonus enabled.
2. Answer multiple questions correctly in a row.
3. Check points breakdown — streak bonus remains 0.

#### ✅ Expected Behavior
Correct streak bonuses should be added based on game settings.

#### ❌ Actual Behavior
Streak bonus remains zero despite qualifying conditions.

#### 🔍 Notes
- Score calculation logic is likely missing streak multiplier.
- Might not be storing `currentStreak` correctly in game state.

#### 🛠️ To Do
- [ ] Inspect `calculateScore()` function.
- [ ] Add test for bonus + streak scoring.

---

### #002: Quiz preview not loading for drafts

- **Reported by**: @test_team  
- **Severity**: Low  
- **Status**: 🟠 In Progress  
- **Assigned to**: @dev_ash  
- **Date Reported**: 2025-08-06  

#### 🔁 Steps to Reproduce
1. Create a new quiz and leave it as a draft.
2. Try to preview using the "👁️ プレビューする" button.
3. Modal appears blank, console logs show 404 error.

#### ✅ Expected Behavior
Preview should work regardless of `draft` or `published` status.

#### 🔍 Notes
- Likely fails to fetch questions for unpublished sets.
- Check if `question_set.status === 'draft'` is being blocked at API layer.

#### 🛠️ Fix Plan
- [ ] Allow preview access to draft sets for quiz owner.
- [ ] Update `getQuestionsBySetId()` route.

---

### #003: WebSocket disconnects after 1 minute

- **Reported by**: Host during test game  
- **Severity**: Critical  
- **Status**: ✅ Fixed  
- **Assigned to**: @dev_jane  
- **Fixed On**: 2025-08-07

#### 🛠️ Fix Applied
- Increased default ping interval + timeout in Socket.IO server:
  ```js
  pingInterval: 25000,
  pingTimeout: 60000
  ```
Verified persistence of connection across multiple clients.

✅ Labels Used
Label	Description
🔴 Open	Newly reported, unassigned bug
🟠 In Progress	Bug assigned and under active development
🟢 Verified	Fixed and confirmed working in test/QA
✅ Fixed	Bug resolved but not yet verified in QA
❌ Wontfix	Bug acknowledged but won't be fixed

🔄 Update Log
2025-08-07: Added bug #001

2025-08-06: Created draft support fix ticket #002

2025-08-06: Resolved WebSocket disconnect bug #003

2025-08-03: Initial bug list created