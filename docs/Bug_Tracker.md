# 🐞 BUG_TRACKER.md

> Purpose: Centralized documentation for tracking known bugs for the `TUIZ` Quiz App.

---

## 📋 Bug Tracker Overview

| ID   | Title                                              | Priority | Status   | Assigned To   | Reported On | Fixed On |
|------|----------------------------------------------------|----------|----------|---------------|-------------|----------|
| #001 | Completed games in the DB are not getting deleted | Medium   | 🔴 Open  | @pandadev0069 | 2025-08-10  | —        |

---

## 🐛 Detailed Bug Reports

---

### #001: Completed games in the DB are not getting deleted

- Priority: Medium
- Status: 🔴 Open
- Assigned to: @pandadev0069
- Reported on: 2025-08-10

#### Description
Completed game records are expected to be removed from the database but remain present after completion.

#### Expected Behavior
Completed games should be deleted (or archived per policy) after the retention/cleanup process runs.

#### Notes
- Verify cleanup scheduler/job configuration and any database policies that might block deletion.

---

🔄 Update Log
2025-08-10: Created bug #001