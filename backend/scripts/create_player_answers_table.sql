-- Create the player_answers table to prevent the error
-- This is a minimal table to satisfy database dependencies
-- Will be properly implemented later when we add answer tracking

CREATE TABLE IF NOT EXISTS public.player_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL, -- Keep this column name as expected by existing code
    game_id UUID NOT NULL,
    question_id UUID,
    answer_choice INTEGER,
    answer_text TEXT,
    is_correct BOOLEAN,
    response_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_answers_player_id ON public.player_answers(player_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_game_id ON public.player_answers(game_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_question_id ON public.player_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_created_at ON public.player_answers(created_at);

-- Enable RLS
ALTER TABLE public.player_answers ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (very permissive for now)
CREATE POLICY "Allow all operations for authenticated users" ON public.player_answers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for anon users" ON public.player_answers
    FOR ALL USING (auth.role() = 'anon');

-- Grant permissions
GRANT ALL ON public.player_answers TO authenticated;
GRANT ALL ON public.player_answers TO anon;
GRANT ALL ON public.player_answers TO service_role;
