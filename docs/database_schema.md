# This file is for creating/ updating the current database schema to meet the user/ client's requirement

## user
update to 
(remove) avatar_storage_path
(add) role ENUM(user,admin, mod)

## answers 
id
question_id
image_url
is_correct
order_index
answer_text
created_at
updated_at
answer_explanation

## question
id
question_set_id
question_text
question_type
image_url
time_limit
points
difficulty
order_index
created_at
updated_at

## question_set
id UUID PRIMARY KEY,
user_id UUID REFERENCES users(id),
title TEXT,
description TEXT,
thumbnail_url TEXT,
is_public BOOLEAN DEFAULT FALSE,
status VARCHAR(20) DEFAULT 'draft', -- draft/published/archived
difficulty_level VARCHAR(20),
category TEXT,
tags TEXT[], -- or JSONB',
estimated_duration INT,
total_questions INT,
times_played INT DEFAULT 0,
average_score FLOAT DEFAULT 0,
completion_rate FLOAT DEFAULT 0,
last_played_at TIMESTAMP,
play_settings JSONB,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()



## Game 
id UUID PRIMARY KEY,
host_id UUID REFERENCES users(id),
question_set_id UUID REFERENCES question_set(id),
game_code TEXT UNIQUE,
player_cap INT DEFAULT 50,
status VARCHAR(20) DEFAULT 'waiting', -- waiting/active/finished/cancelled
is_active BOOLEAN DEFAULT FALSE,
current_question_index INT DEFAULT 0,
current_question_id UUID,
questions_answered INT DEFAULT 0,
has_ended_normally BOOLEAN DEFAULT TRUE,
ended_by_host BOOLEAN DEFAULT FALSE,
mode VARCHAR(20) DEFAULT 'solo',
game_settings JSONB,
platform_info JSONB,
result_summary JSONB,
created_at TIMESTAMP DEFAULT NOW(),
started_at TIMESTAMP,
ended_at TIMESTAMP

## game_players
id
game_id
player_id
is_host
is_guest
is_user
player_name
current_score
current_streak
joined_at
joined_order


## player_answers
id
game_id
player_id
question_id
selected_answer_id
free_text_answer
is_correct
points_earned
response_time
streak_bonus
answered_at



### Perfomance optimazation tips

🔥 1. Database Indexing for High-Concurrency Reads/Writes
Key Indexes:
game_id on game_players, player_answers

(game_id, player_id) on player_answers

current_question_id on games (for fast lookups)

(question_set_id, order_index) on questions

Consider btree_gin or GIN index on tags if full-text filtering is used

⚙️ 2. Avoid Live Count Queries in Real Time
❌ Bad (slow for 300 people):

sql
Copy code
SELECT COUNT(*) FROM game_players WHERE game_id = '...';
✅ Good:

Maintain player_count in games table, updated via trigger or backend.

🚀 3. Use Supabase Realtime + Broadcast Channels (not polling)
Use:

ts
Copy code
supabase.channel('game-1234')
  .on('broadcast', { event: 'question_change' }, callback)
Instead of:

ts
Copy code
setInterval(() => fetch('/current-question'), 2000)
🧠 4. Defer Analytics Writing (batch or background queue)
Don't write game_results immediately after every player answers — queue and flush at game end.

Use Supabase Edge Functions or Postgres background jobs (with pg_cron or external worker) if needed.

🧰 5. Materialized Views or Caching
For high-traffic dashboards (e.g. leaderboards, global stats):

Use Materialized Views or in-memory cache (Redis, if backend supports it).

✅ 6. Track Latency + Query Cost
Use Supabase/PostgreSQL's EXPLAIN ANALYZE on heavy queries, and use pg_stat_statements to monitor slow or repeated ones.

