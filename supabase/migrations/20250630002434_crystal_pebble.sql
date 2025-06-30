/*
  # Create events table for calendar application

  1. New Tables
    - `events`
      - `id` (uuid, primary key) - Unique identifier for each event
      - `created_at` (timestamptz) - When the event record was created
      - `title` (text, required) - Event title/name
      - `start_time` (timestamptz, required) - When the event starts
      - `end_time` (timestamptz, required) - When the event ends
      - `background_color` (text, optional) - Event background color for display
      - `text_color` (text, optional) - Event text color for display
      - `tags` (text, optional) - Event tags/categories
      - `recurring` (text, optional) - Recurring event pattern
      - `user_id` (uuid, optional) - Links event to authenticated user

  2. Security
    - Enable RLS on `events` table
    - Add policy for authenticated users to manage their own events
    - Add policy for anonymous users to read events (if needed for public calendars)

  3. Indexes
    - Add index on start_time for efficient date-based queries
    - Add index on user_id for efficient user-based queries
*/

-- Create the events table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  background_color text DEFAULT '#3b82f6',
  text_color text DEFAULT '#ffffff',
  tags text DEFAULT '',
  recurring text DEFAULT '',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage their own events
CREATE POLICY "Users can manage their own events"
  ON public.events
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for anonymous users to read all events (for public calendars)
-- Remove this policy if you want events to be private to authenticated users only
CREATE POLICY "Anyone can read events"
  ON public.events
  FOR SELECT
  TO anon
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS events_start_time_idx ON public.events(start_time);
CREATE INDEX IF NOT EXISTS events_user_id_idx ON public.events(user_id);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON public.events(created_at);