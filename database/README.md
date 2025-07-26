# 🗄️ TUIZ Database - Supabase PostgreSQL

Database layer for the TUIZ real-time quiz application using Supabase (PostgreSQL + Auth).

## 🌟 Overview

This sub-repository contains all database-related configurations, schemas, migrations, and documentation for the TUIZ quiz app. Supabase provides:

- **PostgreSQL Database**: Persistent data storage
- **Real-time subscriptions**: Live data updates
- **Authentication**: User management (optional)
- **REST API**: Auto-generated endpoints
- **Row Level Security**: Data protection

## 📊 Database Schema

### Core Tables

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `quizzes`
```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `questions`
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) DEFAULT 'multiple_choice',
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 100,
  time_limit INTEGER DEFAULT 30,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `game_sessions`
```sql
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id),
  host_id UUID REFERENCES users(id),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  current_question_index INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `game_participants`
```sql
CREATE TABLE game_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  player_name VARCHAR(50) NOT NULL,
  total_score INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE
);
```

#### `player_answers`
```sql
CREATE TABLE player_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES game_participants(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER DEFAULT 0,
  response_time INTEGER, -- in milliseconds
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `leaderboards`
```sql
CREATE TABLE leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES game_participants(id) ON DELETE CASCADE,
  final_score INTEGER NOT NULL,
  final_rank INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Setup Instructions

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Choose organization and set project details
4. Wait for project initialization

### 2. Set Up Database Schema

1. Go to SQL Editor in your Supabase dashboard
2. Run the SQL scripts from `migrations/` folder in order:
   ```sql
   -- Run these files in order:
   001_create_users_table.sql
   002_create_quizzes_table.sql
   003_create_questions_table.sql
   004_create_game_sessions_table.sql
   005_create_game_participants_table.sql
   006_create_player_answers_table.sql
   007_create_leaderboards_table.sql
   008_create_indexes.sql
   009_create_rls_policies.sql
   010_create_functions.sql
   ```

### 3. Configure Environment Variables

Add these to your backend `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Database Direct Connection (optional)
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

### 4. Enable Real-time (Optional)

For live updates during games:

1. Go to Database → Replication in Supabase dashboard
2. Enable replication for relevant tables:
   - `game_sessions`
   - `game_participants`
   - `player_answers`
   - `leaderboards`

## 🔒 Security & RLS

Row Level Security (RLS) policies are configured to:

- Users can only see their own data
- Game participants can only access their session data
- Public quiz data is readable by all
- Game hosts have full control over their sessions

## 📈 Performance Optimizations

### Indexes
- Room code lookup (B-tree)
- Session participants (composite)
- Question ordering (composite)
- Answer timestamps (B-tree)

### Query Optimization
- Use prepared statements
- Limit result sets appropriately
- Cache frequently accessed data

## 🧪 Sample Data

See `sample-data/` folder for:
- Sample quizzes
- Test questions
- Mock game sessions

## 🔄 Migrations

All database changes are tracked in `migrations/` with:
- Incremental SQL files
- Rollback scripts
- Version control

## 📊 Analytics & Monitoring

Supabase provides built-in:
- Query performance monitoring
- Database usage metrics
- Real-time connection tracking
- Error logging

## 🤝 Contributing

1. All schema changes must include migrations
2. Test with sample data before deploying
3. Document new tables/columns
4. Consider RLS impact on new features

## 📞 Support

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- Project Issues: Use main repository issue tracker
