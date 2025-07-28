# Issues Log: Quiz App

## Solved Issues

### Example issues
- [Date] Issue: JWT verification failed  
  Cause: Supabase token mismatch between backend and client  
  Fix: Regenerated service role key and updated backend env vars

- [Date] Issue: Game state not syncing between players  
  Cause: Backend was using DB queries for every update  
  Fix: Introduced in-memory session store with periodic DB sync



## Active Issues
- [Describe new issue here]

## Update Instructions
- After fixing an issue, move it to “Solved Issues” with date and cause.
- Always include: What caused it + How you solved it.