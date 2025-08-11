-- Add cloned_from field to question_sets table
-- This allows tracking which public quiz was cloned

ALTER TABLE public.question_sets 
ADD COLUMN cloned_from uuid;

-- Add foreign key constraint to reference the original quiz
ALTER TABLE public.question_sets 
ADD CONSTRAINT question_sets_cloned_from_fkey 
FOREIGN KEY (cloned_from) REFERENCES public.question_sets(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.question_sets.cloned_from IS 'References the original quiz if this is a clone of a public quiz';

-- Optional: Create index for performance when finding clones
CREATE INDEX idx_question_sets_cloned_from ON public.question_sets(cloned_from) WHERE cloned_from IS NOT NULL;
