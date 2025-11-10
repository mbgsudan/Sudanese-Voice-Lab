-- Supabase Database Schema for Sawtna Voice Lab
-- Run these SQL commands in your Supabase SQL Editor

-- Create speakers table
CREATE TABLE IF NOT EXISTS public.speakers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    age TEXT NOT NULL,
    dialect TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create recordings table
CREATE TABLE IF NOT EXISTS public.recordings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    speaker_id UUID NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    file_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- Create policies for speakers table
CREATE POLICY "Allow anonymous read access to speakers" ON public.speakers
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to speakers" ON public.speakers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update to speakers" ON public.speakers
    FOR UPDATE USING (true);

-- Create policies for recordings table
CREATE POLICY "Allow anonymous read access to recordings" ON public.recordings
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to recordings" ON public.recordings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update to recordings" ON public.recordings
    FOR UPDATE USING (true);

-- Create storage bucket for recordings (run this in Supabase Dashboard -> Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', true);

-- Create storage policy for recordings bucket
-- CREATE POLICY "Allow anonymous access to recordings bucket" ON storage.objects
--     FOR ALL USING (bucket_id = 'recordings');

-- Insert sample speakers
INSERT INTO public.speakers (name, gender, age, dialect) VALUES
    ('أحمد محمد', 'male', '25-35', 'khartoum'),
    ('فاطمة عبدالله', 'female', '18-25', 'gezira'),
    ('عثمان إبراهيم', 'male', '35-45', 'darfur'),
    ('عائشة حسن', 'female', '26-35', 'kassala'),
    ('محمد علي', 'male', '45-55', 'kordofan')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recordings_speaker_id ON public.recordings(speaker_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON public.recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON public.recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_speakers_dialect ON public.speakers(dialect);
CREATE INDEX IF NOT EXISTS idx_speakers_gender ON public.speakers(gender);