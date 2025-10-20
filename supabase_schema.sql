-- DocSwap Supabase Database Schema
-- This file contains the complete database schema for migrating from SQLite to Supabase

-- Enable Row Level Security (RLS) for all tables
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS AND AUTHENTICATION
-- =============================================
-- Note: Supabase auth.users table is automatically created
-- We'll create a profiles table to extend user data

CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- FILE MANAGEMENT
-- =============================================

CREATE TABLE public.files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT,
    upload_path TEXT,
    converted_path TEXT,
    conversion_status TEXT DEFAULT 'pending' CHECK (conversion_status IN ('pending', 'processing', 'completed', 'failed')),
    conversion_type TEXT,
    conversion_options JSONB DEFAULT '{}',
    download_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on files
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Files policies
CREATE POLICY "Users can view own files" ON public.files
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own files" ON public.files
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own files" ON public.files
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files" ON public.files
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for files table
CREATE INDEX idx_files_user_id ON public.files(user_id);
CREATE INDEX idx_files_session_id ON public.files(session_id);
CREATE INDEX idx_files_created_at ON public.files(created_at);
CREATE INDEX idx_files_expires_at ON public.files(expires_at);

-- =============================================
-- SESSION MANAGEMENT
-- =============================================

CREATE TABLE public.sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}',
    file_count INTEGER DEFAULT 0,
    upload_count INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Users can view own sessions" ON public.sessions
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert sessions" ON public.sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own sessions" ON public.sessions
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Indexes for sessions table
CREATE INDEX idx_sessions_session_id ON public.sessions(session_id);
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at);

-- =============================================
-- ADMIN METRICS (from existing SQLite schema)
-- =============================================

CREATE TABLE public.app_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metric_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.user_activity (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    action TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    conversion_type TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.system_health (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cpu_percent REAL,
    memory_percent REAL,
    disk_usage REAL,
    active_sessions INTEGER,
    total_files INTEGER,
    metadata JSONB DEFAULT '{}'
);

-- Enable RLS on admin tables (admin only access)
ALTER TABLE public.app_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

-- Admin policies (only allow access to admin users)
CREATE POLICY "Admin only access to app_metrics" ON public.app_metrics
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin only access to user_activity" ON public.user_activity
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin only access to system_health" ON public.system_health
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- =============================================
-- CONTACT FORMS
-- =============================================

CREATE TABLE public.contact_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'closed')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on contact submissions
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Contact submissions policies
CREATE POLICY "Users can insert contact submissions" ON public.contact_submissions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can view all contact submissions" ON public.contact_submissions
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can update contact submissions" ON public.contact_submissions
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON public.files
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_submissions_updated_at
    BEFORE UPDATE ON public.contact_submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to clean up expired files
CREATE OR REPLACE FUNCTION public.cleanup_expired_files()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.files 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO public.app_metrics (metric_type, metric_name, metric_value, metadata)
    VALUES ('cleanup', 'expired_files_deleted', deleted_count, '{"automated": true}');
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO public.app_metrics (metric_type, metric_name, metric_value, metadata)
    VALUES ('cleanup', 'expired_sessions_deleted', deleted_count, '{"automated": true}');
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Additional indexes for better performance
CREATE INDEX idx_user_activity_timestamp ON public.user_activity(timestamp);
CREATE INDEX idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX idx_user_activity_action ON public.user_activity(action);

CREATE INDEX idx_app_metrics_timestamp ON public.app_metrics(timestamp);
CREATE INDEX idx_app_metrics_type_name ON public.app_metrics(metric_type, metric_name);

CREATE INDEX idx_system_health_timestamp ON public.system_health(timestamp);

CREATE INDEX idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX idx_contact_submissions_created_at ON public.contact_submissions(created_at);

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert initial system health record
INSERT INTO public.system_health (cpu_percent, memory_percent, disk_usage, active_sessions, total_files, metadata)
VALUES (0, 0, 0, 0, 0, '{"initial": true, "migration": "from_sqlite"}');

-- Insert initial app metric
INSERT INTO public.app_metrics (metric_type, metric_name, metric_value, metadata)
VALUES ('system', 'migration_completed', 1, '{"timestamp": "' || NOW() || '", "from": "sqlite", "to": "supabase"}');