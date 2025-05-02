-- Migration for Phase 1: Build Secure Data Layer
-- idempotent migration (checks existence before creating)

-- Enable Row Level Security
ALTER DATABASE postgres SET rls.enabled = true;

-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY, 
    name TEXT NOT NULL CHECK (name IN ('coach', 'client', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name)
);

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    email TEXT NOT NULL UNIQUE,
    role_id BIGINT NOT NULL REFERENCES roles(id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'active')),
    auth_id UUID NOT NULL UNIQUE, -- Reference to auth.users.id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS sessions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    coach_id BIGINT NOT NULL REFERENCES users(id),
    client_id BIGINT NOT NULL REFERENCES users(id),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reflections table if it doesn't exist
CREATE TABLE IF NOT EXISTS reflections (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    session_id BIGINT NOT NULL REFERENCES sessions(id),
    text TEXT NOT NULL,
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create coach_notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS coach_notes (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    session_id BIGINT NOT NULL REFERENCES sessions(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to get user role by auth.uid
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT r.name INTO user_role
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.auth_id = auth.uid();
    
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user owns a session (either as coach or client)
CREATE OR REPLACE FUNCTION user_owns_session(session_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    user_auth_id UUID;
    session_exists BOOLEAN;
BEGIN
    user_auth_id := auth.uid();
    
    SELECT EXISTS (
        SELECT 1 
        FROM sessions s
        JOIN users u_coach ON s.coach_id = u_coach.id
        JOIN users u_client ON s.client_id = u_client.id
        WHERE s.id = session_id 
        AND (u_coach.auth_id = user_auth_id OR u_client.auth_id = user_auth_id)
    ) INTO session_exists;
    
    RETURN session_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============= ROW LEVEL SECURITY POLICIES =============

-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;

-- ROLES table policies
-- Only admins can modify roles
CREATE POLICY roles_admin_all ON roles
    FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

-- All users can read roles
CREATE POLICY roles_read_all ON roles
    FOR SELECT
    TO authenticated
    USING (true);

-- USERS table policies
-- Admins can do everything with users
CREATE POLICY users_admin_all ON users
    FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

-- Users can read their own user data
CREATE POLICY users_read_own ON users
    FOR SELECT
    TO authenticated
    USING (auth_id = auth.uid());

-- SESSIONS table policies
-- Admins can do everything with sessions
CREATE POLICY sessions_admin_all ON sessions
    FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

-- Coaches can read/write sessions they own
CREATE POLICY sessions_coach_all ON sessions
    FOR ALL
    TO authenticated
    USING (
        get_user_role() = 'coach' AND
        coach_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Clients can only read sessions they are part of
CREATE POLICY sessions_client_read ON sessions
    FOR SELECT
    TO authenticated
    USING (
        get_user_role() = 'client' AND
        client_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- REFLECTIONS table policies
-- Admins can do everything with reflections
CREATE POLICY reflections_admin_all ON reflections
    FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

-- Coaches can read/write reflections for their sessions
CREATE POLICY reflections_coach_all ON reflections
    FOR ALL
    TO authenticated
    USING (
        get_user_role() = 'coach' AND
        session_id IN (
            SELECT id FROM sessions 
            WHERE coach_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- Clients can read/write reflections for their own sessions
CREATE POLICY reflections_client_all ON reflections
    FOR ALL
    TO authenticated
    USING (
        get_user_role() = 'client' AND
        session_id IN (
            SELECT id FROM sessions 
            WHERE client_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- COACH_NOTES table policies
-- Admins can do everything with coach notes
CREATE POLICY coach_notes_admin_all ON coach_notes
    FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

-- Coaches can read/write their own notes
CREATE POLICY coach_notes_coach_all ON coach_notes
    FOR ALL
    TO authenticated
    USING (
        get_user_role() = 'coach' AND
        session_id IN (
            SELECT id FROM sessions 
            WHERE coach_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- Clients cannot access coach notes (no policy needed because default is to deny) 