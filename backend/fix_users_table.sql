-- =====================================================
-- SAFE USERS TABLE REGENERATION SCRIPT
-- =====================================================
-- This script will safely clean up and recreate the users table
-- with proper triggers and RLS policies

-- Step 1: Clean up existing triggers and functions (safe cleanup)
DO $$ 
BEGIN
    -- Drop trigger if it exists
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
    -- Drop trigger if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
    END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Step 2: Drop existing table safely (this will remove all data!)
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 3: Recreate the users table
CREATE TABLE public.users (
  id UUID NOT NULL,
  name VARCHAR(100) NULL,
  email VARCHAR(255) NULL,
  question_sets TEXT[] NULL DEFAULT '{}',
  avatar_url TEXT NULL,
  avatar_storage_path TEXT NULL,
  total_games_played INTEGER NULL DEFAULT 0,
  total_games_hosted INTEGER NULL DEFAULT 0,
  total_score INTEGER NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users USING btree (id);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON public.users USING btree (last_active);

-- Step 5: Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Step 6: Create trigger for updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 7: Create improved handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create if user doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    INSERT INTO public.users (id, name, email, created_at, updated_at, last_active)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), -- Use email as fallback if name is null
      NEW.email,
      NOW(),
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 8: Create the trigger (but make it optional)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 9: Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 10: Drop existing RLS policies safely
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
    EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
    EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
    EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
    EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
    EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Step 11: Create simplified RLS policies
-- Allow service role full access (for our backend)
CREATE POLICY "Service role can manage all users" ON public.users
  FOR ALL USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Allow users to read all public profiles (for leaderboards)
CREATE POLICY "Public profiles are viewable by everyone" ON public.users
  FOR SELECT USING (true);

-- Allow users to manage their own profile
CREATE POLICY "Users can manage their own profile" ON public.users
  FOR ALL USING (auth.uid() = id);

-- Step 12: Grant necessary permissions
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- Step 13: Enable realtime (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- Step 14: Add helpful comments
COMMENT ON TABLE public.users IS 'User profiles synced with Supabase Auth';
COMMENT ON COLUMN public.users.id IS 'References auth.users(id) for Supabase integration';
COMMENT ON COLUMN public.users.name IS 'Display name of the user (fallback to email if null)';
COMMENT ON COLUMN public.users.email IS 'Email from Supabase Auth';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the setup:

-- Check if table exists and has correct structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- Check if triggers exist
-- SELECT trigger_name, event_manipulation, action_timing 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'users';

-- Check if RLS is enabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'users';

-- Check RLS policies
-- SELECT policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'users';
