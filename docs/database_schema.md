# This file is for creating/ updating the current database schema to meet the user/ client's requirement

## user
needs no change

## answers 
id
question_id
image_url
image_storage_page
is_correct
order_index
answer_type
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
image_storage_path
time_limit
points
difficulty
order_index
created_at
updated_at

## question_set
id UUID PRIMARY KEY,
host_id UUID REFERENCES users(id),
question_set_id UUID REFERENCES question_set(id),
game_code TEXT UNIQUE,
player_cap INT DEFAULT 50,
player_count INT DEFAULT 0,
status VARCHAR(20) DEFAULT 'waiting', -- waiting/active/finished/cancelled
is_active BOOLEAN DEFAULT FALSE,
current_question_index INT DEFAULT 0,
current_question_id UUID,
questions_answered INT DEFAULT 0,
has_ended_normally BOOLEAN DEFAULT TRUE,
ended_by_host BOOLEAN DEFAULT FALSE,
visibility VARCHAR(20) DEFAULT 'code-only', -- public/private/code-only
mode VARCHAR(20) DEFAULT 'solo',
latency_mode VARCHAR(20) DEFAULT 'normal',
game_settings JSONB,
platform_info JSONB,
result_summary JSONB,
created_at TIMESTAMP DEFAULT NOW(),
started_at TIMESTAMP,
ended_at TIMESTAMP



