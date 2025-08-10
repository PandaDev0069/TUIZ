-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  image_url text,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL CHECK (order_index >= 0),
  answer_text text NOT NULL,
  answer_explanation text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT answers_pkey PRIMARY KEY (id),
  CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.game_players (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  player_id uuid NOT NULL,
  player_name character varying NOT NULL,
  current_score integer DEFAULT 0 CHECK (current_score >= 0),
  current_rank integer DEFAULT 0 CHECK (current_rank >= 0),
  current_streak integer DEFAULT 0 CHECK (current_streak >= 0),
  is_active boolean DEFAULT true,
  joined_at timestamp with time zone DEFAULT now(),
  is_host boolean DEFAULT false,
  is_guest boolean DEFAULT true,
  is_user boolean DEFAULT false,
  joined_order integer,
  CONSTRAINT game_players_pkey PRIMARY KEY (id),
  CONSTRAINT game_players_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id)
);
CREATE TABLE public.game_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  player_id uuid NOT NULL,
  final_score integer DEFAULT 0 CHECK (final_score >= 0),
  final_rank integer DEFAULT 0 CHECK (final_rank >= 0),
  total_correct integer DEFAULT 0 CHECK (total_correct >= 0),
  total_questions integer DEFAULT 0 CHECK (total_questions >= 0),
  average_response_time integer DEFAULT 0 CHECK (average_response_time >= 0),
  longest_streak integer DEFAULT 0 CHECK (longest_streak >= 0),
  completion_percentage numeric DEFAULT 0.0 CHECK (completion_percentage >= 0::numeric AND completion_percentage <= 100::numeric),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT game_results_pkey PRIMARY KEY (id),
  CONSTRAINT game_results_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id)
);
CREATE TABLE public.games (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  question_set_id uuid NOT NULL,
  game_code character varying NOT NULL UNIQUE,
  current_players integer DEFAULT 0 CHECK (current_players >= 0),
  status character varying DEFAULT 'waiting'::character varying CHECK (status::text = ANY (ARRAY['waiting'::character varying, 'active'::character varying, 'paused'::character varying, 'finished'::character varying, 'cancelled'::character varying]::text[])),
  current_question_index integer DEFAULT 0 CHECK (current_question_index >= 0),
  current_question_start_time timestamp with time zone,
  game_settings jsonb DEFAULT '{}'::jsonb CHECK (
CASE
    WHEN (game_settings ->> 'maxPlayers'::text) IS NOT NULL THEN ((game_settings ->> 'maxPlayers'::text)::integer) > 0
    ELSE true
END),
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  current_question_id uuid,
  questions_answered integer DEFAULT 0 CHECK (questions_answered >= 0),
  has_ended_normally boolean DEFAULT true,
  ended_by_host boolean DEFAULT false,
  mode character varying DEFAULT 'solo'::character varying,
  platform_info jsonb DEFAULT '{}'::jsonb,
  result_summary jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT games_pkey PRIMARY KEY (id),
  CONSTRAINT games_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.users(id),
  CONSTRAINT games_question_set_id_fkey FOREIGN KEY (question_set_id) REFERENCES public.question_sets(id),
  CONSTRAINT fk_games_current_question FOREIGN KEY (current_question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.player_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  player_id uuid NOT NULL,
  question_id uuid NOT NULL,
  answer_id uuid,
  submitted_answer text,
  is_correct boolean DEFAULT false,
  points_earned integer DEFAULT 0 CHECK (points_earned >= 0),
  response_time integer CHECK (response_time IS NULL OR response_time > 0),
  streak_bonus integer DEFAULT 0 CHECK (streak_bonus >= 0),
  answered_at timestamp with time zone DEFAULT now(),
  selected_answer_id uuid,
  free_text_answer text,
  CONSTRAINT player_answers_pkey PRIMARY KEY (id),
  CONSTRAINT player_answers_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id),
  CONSTRAINT fk_player_answers_selected_answer FOREIGN KEY (selected_answer_id) REFERENCES public.answers(id)
);
CREATE TABLE public.question_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title character varying NOT NULL,
  description text,
  thumbnail_url text,
  is_public boolean DEFAULT false,
  difficulty_level character varying DEFAULT 'medium'::character varying CHECK (difficulty_level::text = ANY (ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying, 'expert'::character varying]::text[])),
  category character varying,
  estimated_duration integer CHECK (estimated_duration > 0),
  total_questions integer DEFAULT 0 CHECK (total_questions >= 0),
  times_played integer DEFAULT 0 CHECK (times_played >= 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status USER-DEFINED DEFAULT 'draft'::question_set_status_enum,
  tags ARRAY DEFAULT ARRAY[]::text[],
  completion_rate double precision DEFAULT 0.0,
  last_played_at timestamp with time zone,
  play_settings jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT question_sets_pkey PRIMARY KEY (id),
  CONSTRAINT question_sets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_set_id uuid NOT NULL,
  question_text text NOT NULL,
  question_type USER-DEFINED DEFAULT 'multiple_choice'::question_type_enum,
  image_url text,
  time_limit integer DEFAULT 30 CHECK (time_limit > 0),
  points integer DEFAULT 100 CHECK (points > 0),
  difficulty character varying DEFAULT 'medium'::character varying CHECK (difficulty::text = ANY (ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying, 'expert'::character varying]::text[])),
  order_index integer NOT NULL CHECK (order_index >= 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  explanation_title text,
  explanation_text text,
  explanation_image_url text,
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_question_set_id_fkey FOREIGN KEY (question_set_id) REFERENCES public.question_sets(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  avatar_url text,
  total_games_played integer DEFAULT 0 CHECK (total_games_played >= 0),
  total_games_hosted integer DEFAULT 0 CHECK (total_games_hosted >= 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_active timestamp with time zone DEFAULT now(),
  role USER-DEFINED NOT NULL DEFAULT 'user'::user_role,
  game_player_uuid uuid UNIQUE,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);