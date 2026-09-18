-- =============================================================================
-- BloodBridge - Smart Donor Connect
-- Complete Supabase PostgreSQL Production Schema & Migrations
-- Copy and paste this script directly into:
-- Supabase Dashboard -> SQL Editor -> Run
-- =============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. TABLE: profiles
-- Linked 1:1 with auth.users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'donor' CHECK (role IN ('donor', 'seeker', 'hospital', 'admin')),
    profile_image TEXT,
    blood_group TEXT CHECK (blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    state TEXT DEFAULT 'Tamil Nadu',
    district TEXT,
    city TEXT,
    has_donated_before BOOLEAN,
    last_donation_date DATE,
    donation_count TEXT,
    is_available_for_donation BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Migration commands for existing deployments
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blood_group TEXT CHECK (blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_donated_before BOOLEAN;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_donation_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS donation_count TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_available_for_donation BOOLEAN;
ALTER TABLE public.profiles ALTER COLUMN district DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN city DROP DEFAULT;

-- -----------------------------------------------------------------------------
-- 2. TABLE: donors
-- Stores donor credentials, blood group, eligibility, and availability
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.donors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    date_of_birth DATE,
    age INTEGER CHECK (age >= 18 AND age <= 65),
    gender TEXT DEFAULT 'Male' CHECK (gender IN ('Male', 'Female', 'Other')),
    city TEXT,
    district TEXT,
    state TEXT DEFAULT 'Tamil Nadu',
    address TEXT,
    last_donation_date DATE,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    emergency_available BOOLEAN NOT NULL DEFAULT TRUE,
    total_donations INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.donors ALTER COLUMN district DROP DEFAULT;
ALTER TABLE public.donors ALTER COLUMN city DROP DEFAULT;

-- -----------------------------------------------------------------------------
-- 3. TABLE: blood_requests
-- Stores emergency and standard blood requests created by blood seekers/hospitals
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blood_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    required_units INTEGER NOT NULL DEFAULT 1 CHECK (required_units > 0 AND required_units <= 20),
    hospital_name TEXT NOT NULL,
    hospital_address TEXT,
    city TEXT,
    district TEXT,
    state TEXT DEFAULT 'Tamil Nadu',
    contact_number TEXT NOT NULL,
    required_date TEXT DEFAULT 'Immediately',
    emergency_level TEXT NOT NULL DEFAULT 'Critical' CHECK (emergency_level IN ('Normal', 'Urgent', 'Critical')),
    additional_message TEXT,
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Fulfilled', 'Cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- -----------------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES
-- Accelerates donor search queries, filter sorting, and foreign-key joins
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_blood_group ON public.profiles(blood_group);
CREATE INDEX IF NOT EXISTS idx_profiles_district ON public.profiles(district);
CREATE INDEX IF NOT EXISTS idx_donors_user_id ON public.donors(user_id);
CREATE INDEX IF NOT EXISTS idx_donors_blood_group ON public.donors(blood_group);
CREATE INDEX IF NOT EXISTS idx_donors_district ON public.donors(district);
CREATE INDEX IF NOT EXISTS idx_donors_city ON public.donors(city);
CREATE INDEX IF NOT EXISTS idx_donors_available ON public.donors(available);
CREATE INDEX IF NOT EXISTS idx_donors_emergency ON public.donors(emergency_available);

CREATE INDEX IF NOT EXISTS idx_requests_requester ON public.blood_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_blood_group ON public.blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_district ON public.blood_requests(district);
CREATE INDEX IF NOT EXISTS idx_requests_city ON public.blood_requests(city);

-- -----------------------------------------------------------------------------
-- 5. AUTOMATIC TIMESTAMP TRIGGER
-- Automatically updates `updated_at` column whenever a row is modified
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_timestamp ON public.profiles;
CREATE TRIGGER set_profiles_timestamp
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_donors_timestamp ON public.donors;
CREATE TRIGGER set_donors_timestamp
    BEFORE UPDATE ON public.donors
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_blood_requests_timestamp ON public.blood_requests;
CREATE TRIGGER set_blood_requests_timestamp
    BEFORE UPDATE ON public.blood_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 6. AUTOMATIC USER PROFILE CREATION TRIGGER
-- Triggers on `auth.users` insert to automatically create a corresponding
-- row in `public.profiles` using raw_user_meta_data.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_full_name TEXT;
    user_phone TEXT;
    user_blood_group TEXT;
    user_district TEXT;
    user_city TEXT;
    user_state TEXT;
    user_has_donated BOOLEAN;
    user_last_donation DATE;
    user_donation_count TEXT;
    user_is_available BOOLEAN;
BEGIN
    -- Extract role from metadata or default to 'donor'
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', NEW.raw_user_meta_data->>'user_type', 'donor');
    IF user_role NOT IN ('donor', 'seeker', 'hospital', 'admin') THEN
        IF user_role = 'requester' THEN
            user_role := 'seeker';
        ELSE
            user_role := 'donor';
        END IF;
    END IF;

    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
    user_blood_group := NEW.raw_user_meta_data->>'blood_group';
    user_district := NEW.raw_user_meta_data->>'district';
    user_city := NEW.raw_user_meta_data->>'city';
    user_state := COALESCE(NEW.raw_user_meta_data->>'state', 'Tamil Nadu');
    user_has_donated := (NEW.raw_user_meta_data->>'has_donated_before')::BOOLEAN;
    
    IF NEW.raw_user_meta_data->>'last_donation_date' IS NOT NULL AND NEW.raw_user_meta_data->>'last_donation_date' != '' THEN
        user_last_donation := (NEW.raw_user_meta_data->>'last_donation_date')::DATE;
    ELSE
        user_last_donation := NULL;
    END IF;

    user_donation_count := NEW.raw_user_meta_data->>'donation_count';
    user_is_available := COALESCE((NEW.raw_user_meta_data->>'is_available_for_donation')::BOOLEAN, TRUE);

    INSERT INTO public.profiles (
        id,
        user_id,
        full_name,
        email,
        phone,
        role,
        blood_group,
        state,
        district,
        city,
        has_donated_before,
        last_donation_date,
        donation_count,
        is_available_for_donation
    )
    VALUES (
        NEW.id,
        NEW.id,
        user_full_name,
        NEW.email,
        user_phone,
        user_role,
        user_blood_group,
        user_state,
        user_district,
        user_city,
        user_has_donated,
        user_last_donation,
        user_donation_count,
        user_is_available
    )
    ON CONFLICT (id) DO UPDATE
    SET
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        blood_group = COALESCE(EXCLUDED.blood_group, public.profiles.blood_group),
        district = COALESCE(EXCLUDED.district, public.profiles.district),
        city = COALESCE(EXCLUDED.city, public.profiles.city),
        state = COALESCE(EXCLUDED.state, public.profiles.state),
        has_donated_before = COALESCE(EXCLUDED.has_donated_before, public.profiles.has_donated_before),
        last_donation_date = EXCLUDED.last_donation_date,
        donation_count = COALESCE(EXCLUDED.donation_count, public.profiles.donation_count),
        is_available_for_donation = COALESCE(EXCLUDED.is_available_for_donation, public.profiles.is_available_for_donation),
        updated_at = TIMEZONE('utc', NOW());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict security rules ensuring users can only edit their own data while
-- allowing donor discovery and open request broadcasting.
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

-- -----------------------------
-- RLS: profiles
-- -----------------------------
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Public can view minimal profile info" ON public.profiles;
CREATE POLICY "Public can view minimal profile info"
    ON public.profiles FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- -----------------------------
-- RLS: donors
-- -----------------------------
-- Any visitor or authenticated user can search and view available donors
DROP POLICY IF EXISTS "Public and authenticated can search donors" ON public.donors;
CREATE POLICY "Public and authenticated can search donors"
    ON public.donors FOR SELECT
    USING (true);

-- Authenticated donors can register their donor profile
DROP POLICY IF EXISTS "Donors can insert their own donor record" ON public.donors;
CREATE POLICY "Donors can insert their own donor record"
    ON public.donors FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Authenticated donors can update their own donor record (availability, phone, address, etc.)
DROP POLICY IF EXISTS "Donors can update their own donor record" ON public.donors;
CREATE POLICY "Donors can update their own donor record"
    ON public.donors FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Authenticated donors can delete their own donor record
DROP POLICY IF EXISTS "Donors can delete their own donor record" ON public.donors;
CREATE POLICY "Donors can delete their own donor record"
    ON public.donors FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- -----------------------------
-- RLS: blood_requests
-- -----------------------------
-- Anyone can view open blood requests to answer urgent donor calls
DROP POLICY IF EXISTS "Anyone can view blood requests" ON public.blood_requests;
CREATE POLICY "Anyone can view blood requests"
    ON public.blood_requests FOR SELECT
    USING (true);

-- Authenticated users (seekers or donors) can create a blood request
DROP POLICY IF EXISTS "Authenticated users can create blood requests" ON public.blood_requests;
CREATE POLICY "Authenticated users can create blood requests"
    ON public.blood_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = requester_id);

-- Requesters can update/mark fulfilled/cancel their own blood requests
DROP POLICY IF EXISTS "Requesters can update their own blood requests" ON public.blood_requests;
CREATE POLICY "Requesters can update their own blood requests"
    ON public.blood_requests FOR UPDATE
    TO authenticated
    USING (auth.uid() = requester_id)
    WITH CHECK (auth.uid() = requester_id);

-- Requesters can delete their own blood requests
DROP POLICY IF EXISTS "Requesters can delete their own blood requests" ON public.blood_requests;
CREATE POLICY "Requesters can delete their own blood requests"
    ON public.blood_requests FOR DELETE
    TO authenticated
    USING (auth.uid() = requester_id);

-- =============================================================================
-- SECTION 6: HOSPITALS & HOSPITAL CREDENTIAL AUTHENTICATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.hospitals (
    id TEXT PRIMARY KEY,
    district TEXT NOT NULL,
    hospital_name TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    user_key TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_hospitals_user_key ON public.hospitals (user_key);
CREATE INDEX IF NOT EXISTS idx_hospitals_district ON public.hospitals (district);
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON public.hospitals (location);

-- Add latitude & longitude to donors table for Haversine distance matching
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Hospital sessions table
CREATE TABLE IF NOT EXISTS public.hospital_sessions (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMPTZ NOT NULL
);

-- =============================================================================
-- End of BloodBridge Production Database Schema
-- =============================================================================
