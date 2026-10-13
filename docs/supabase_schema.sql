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

-- Migration commands for existing donors deployments
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.donors ALTER COLUMN district DROP DEFAULT;
ALTER TABLE public.donors ALTER COLUMN city DROP DEFAULT;

-- -----------------------------------------------------------------------------
-- 3. TABLE: blood_requests
-- Stores emergency and standard blood requests created by blood seekers/hospitals
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blood_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_code TEXT UNIQUE,
    requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    units_required INTEGER NOT NULL DEFAULT 1 CHECK (units_required > 0 AND units_required <= 20),
    required_units INTEGER NOT NULL DEFAULT 1 CHECK (required_units > 0 AND required_units <= 20),
    hospital_name TEXT NOT NULL,
    hospital_location TEXT,
    hospital_address TEXT,
    city TEXT,
    district TEXT,
    state TEXT DEFAULT 'Tamil Nadu',
    hospital_contact TEXT,
    contact_number TEXT NOT NULL,
    required_date TEXT DEFAULT 'Immediately',
    urgency TEXT NOT NULL DEFAULT 'Urgent' CHECK (urgency IN ('Emergency', 'Urgent', 'Planned')),
    emergency_level TEXT NOT NULL DEFAULT 'Critical' CHECK (emergency_level IN ('Normal', 'Urgent', 'Critical')),
    reason TEXT,
    additional_message TEXT,
    document_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'MATCHING', 'DONOR_CONTACTED', 'DONOR_ACCEPTED', 'FULFILLED', 'CANCELLED', 'EXPIRED', 'Open', 'Fulfilled', 'Cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Migration columns for existing blood_requests deployments
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS request_code TEXT UNIQUE;
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS units_required INTEGER DEFAULT 1;
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS hospital_location TEXT;
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS hospital_contact TEXT;
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS requester_email TEXT;
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'Urgent';
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS document_url TEXT;

-- -----------------------------------------------------------------------------
-- 3b. TABLE: blood_request_matches
-- Stores donor matches, dispatch requests, and donor responses
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blood_request_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
    donor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    donor_name TEXT,
    donor_phone TEXT,
    donor_email TEXT,
    match_status TEXT NOT NULL DEFAULT 'MATCHED' CHECK (match_status IN ('MATCHED', 'CONTACT_REQUESTED', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    responded_at TIMESTAMPTZ
);

ALTER TABLE public.blood_request_matches ADD COLUMN IF NOT EXISTS donor_email TEXT;

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

CREATE INDEX IF NOT EXISTS idx_requests_code ON public.blood_requests(request_code);
CREATE INDEX IF NOT EXISTS idx_requests_requester ON public.blood_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_blood_group ON public.blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_district ON public.blood_requests(district);
CREATE INDEX IF NOT EXISTS idx_requests_city ON public.blood_requests(city);

CREATE INDEX IF NOT EXISTS idx_matches_request ON public.blood_request_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_matches_donor ON public.blood_request_matches(donor_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.blood_request_matches(match_status);

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

-- Admins have full access on blood requests
DROP POLICY IF EXISTS "Admins full access on blood requests" ON public.blood_requests;
CREATE POLICY "Admins full access on blood requests"
    ON public.blood_requests FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- -----------------------------
-- RLS: blood_request_matches
-- -----------------------------
ALTER TABLE public.blood_request_matches ENABLE ROW LEVEL SECURITY;

-- Requesters can view matches for their own requests
DROP POLICY IF EXISTS "Requesters can view matches for own requests" ON public.blood_request_matches;
CREATE POLICY "Requesters can view matches for own requests"
    ON public.blood_request_matches FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.blood_requests WHERE id = blood_request_matches.request_id AND requester_id = auth.uid()));

-- Donors can view matches assigned to them
DROP POLICY IF EXISTS "Donors can view their own matches" ON public.blood_request_matches;
CREATE POLICY "Donors can view their own matches"
    ON public.blood_request_matches FOR SELECT
    TO authenticated
    USING (donor_id = auth.uid());

-- Requesters can insert matches for their own requests
DROP POLICY IF EXISTS "Requesters can create matches for own requests" ON public.blood_request_matches;
CREATE POLICY "Requesters can create matches for own requests"
    ON public.blood_request_matches FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.blood_requests WHERE id = blood_request_matches.request_id AND requester_id = auth.uid()));

-- Donors can update their match status (e.g. ACCEPTED or DECLINED)
DROP POLICY IF EXISTS "Donors can update own match status" ON public.blood_request_matches;
CREATE POLICY "Donors can update own match status"
    ON public.blood_request_matches FOR UPDATE
    TO authenticated
    USING (donor_id = auth.uid())
    WITH CHECK (donor_id = auth.uid());

-- Requesters can update match status (e.g. CONTACT_REQUESTED)
DROP POLICY IF EXISTS "Requesters can update match status" ON public.blood_request_matches;
CREATE POLICY "Requesters can update match status"
    ON public.blood_request_matches FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.blood_requests WHERE id = blood_request_matches.request_id AND requester_id = auth.uid()));

-- Admins full access on matches
DROP POLICY IF EXISTS "Admins full access on matches" ON public.blood_request_matches;
CREATE POLICY "Admins full access on matches"
    ON public.blood_request_matches FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Timestamp trigger for blood_request_matches
DROP TRIGGER IF EXISTS set_blood_request_matches_timestamp ON public.blood_request_matches;
CREATE TRIGGER set_blood_request_matches_timestamp
    BEFORE UPDATE ON public.blood_request_matches
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

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

-- Add registered email to hospitals table
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS email TEXT;

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
-- SECTION 7: BOMBAY BLOOD GROUP (Oh / hh) PROTECTED WORKFLOW & SECURITY
-- =============================================================================

-- 1. Table: hospital_verifications
CREATE TABLE IF NOT EXISTS public.hospital_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE CASCADE,
    hospital_name TEXT NOT NULL,
    location TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED', 'PENDING', 'VERIFIED', 'SUSPENDED')),
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_hosp_verif_hospital_id ON public.hospital_verifications (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hosp_verif_status ON public.hospital_verifications (verification_status);

-- 2. Table: bombay_blood_requests
CREATE TABLE IF NOT EXISTS public.bombay_blood_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_code TEXT UNIQUE NOT NULL,
    requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requester_name TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE SET NULL,
    hospital_name TEXT NOT NULL,
    hospital_location TEXT NOT NULL,
    blood_group TEXT NOT NULL DEFAULT 'Bombay Blood Group (Oh)',
    urgency TEXT NOT NULL DEFAULT 'Urgent' CHECK (urgency IN ('Emergency', 'Urgent', 'Planned')),
    units_required INTEGER NOT NULL DEFAULT 1 CHECK (units_required > 0),
    required_date DATE NOT NULL,
    district TEXT NOT NULL,
    city TEXT NOT NULL,
    doctor_contact TEXT,
    reason TEXT NOT NULL,
    document_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (
        status IN ('PENDING_VERIFICATION', 'UNDER_REVIEW', 'VERIFIED', 'APPROVED', 'REJECTED', 'EXPIRED', 'FULFILLED', 'CANCELLED')
    ),
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_bombay_req_code ON public.bombay_blood_requests (request_code);
CREATE INDEX IF NOT EXISTS idx_bombay_req_status ON public.bombay_blood_requests (status);
CREATE INDEX IF NOT EXISTS idx_bombay_req_district ON public.bombay_blood_requests (district);
CREATE INDEX IF NOT EXISTS idx_bombay_req_urgency ON public.bombay_blood_requests (urgency);

-- 3. Table: bombay_access_tokens (Expiring one-time / short-lived credential)
CREATE TABLE IF NOT EXISTS public.bombay_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.bombay_blood_requests(id) ON DELETE CASCADE,
    hospital_id TEXT NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    usage_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bombay_token_req_id ON public.bombay_access_tokens (request_id);
CREATE INDEX IF NOT EXISTS idx_bombay_token_hosp_id ON public.bombay_access_tokens (hospital_id);
CREATE INDEX IF NOT EXISTS idx_bombay_token_status ON public.bombay_access_tokens (status);

-- 4. Table: bombay_donor_preferences (Explicit emergency consent)
CREATE TABLE IF NOT EXISTS public.bombay_donor_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blood_group TEXT NOT NULL DEFAULT 'Bombay Blood Group (Oh)',
    is_available_for_bombay_requests BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bombay_pref_user_id ON public.bombay_donor_preferences (user_id);

-- 5. Table: bombay_audit_logs (Immutable audit trails)
CREATE TABLE IF NOT EXISTS public.bombay_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES public.bombay_blood_requests(id) ON DELETE SET NULL,
    actor_id TEXT NOT NULL,
    hospital_id TEXT,
    action TEXT NOT NULL,
    result TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_bombay_audit_req ON public.bombay_audit_logs (request_id);
CREATE INDEX IF NOT EXISTS idx_bombay_audit_actor ON public.bombay_audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_bombay_audit_action ON public.bombay_audit_logs (action);

-- Enable RLS on all Bombay tables
ALTER TABLE public.hospital_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bombay_blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bombay_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bombay_donor_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bombay_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bombay_blood_requests:
-- Requester can view their own request
CREATE POLICY "Requesters can view own bombay requests"
    ON public.bombay_blood_requests FOR SELECT
    TO authenticated
    USING (requester_id = auth.uid());

-- Authenticated users can insert requests
CREATE POLICY "Users can create bombay requests"
    ON public.bombay_blood_requests FOR INSERT
    TO authenticated
    WITH CHECK (requester_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins full access on bombay requests"
    ON public.bombay_blood_requests FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for bombay_audit_logs: Admins only
CREATE POLICY "Admins view audit logs"
    ON public.bombay_audit_logs FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================================================
-- SECTION 8: HOSPITAL BLOOD REQUIREMENTS & DONOR RESPONSES
-- Additive feature: Verified hospitals publish blood requirements; voluntary donors respond
-- =============================================================================

-- 1. Table: hospital_blood_requirements
CREATE TABLE IF NOT EXISTS public.hospital_blood_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_code TEXT UNIQUE NOT NULL,
    hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE CASCADE,
    hospital_name TEXT NOT NULL,
    hospital_location TEXT NOT NULL,
    district TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'Tamil Nadu',
    blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    units_required INTEGER NOT NULL DEFAULT 1 CHECK (units_required > 0),
    units_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (units_confirmed >= 0),
    urgency TEXT NOT NULL DEFAULT 'Urgent' CHECK (urgency IN ('Emergency', 'Urgent', 'Planned')),
    required_date DATE NOT NULL,
    required_time TEXT DEFAULT '12:00',
    reason TEXT NOT NULL,
    doctor_contact TEXT NOT NULL,
    additional_instructions TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (
        status IN ('ACTIVE', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'EXPIRED')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hbr_code ON public.hospital_blood_requirements (requirement_code);
CREATE INDEX IF NOT EXISTS idx_hbr_hospital ON public.hospital_blood_requirements (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hbr_blood_group ON public.hospital_blood_requirements (blood_group);
CREATE INDEX IF NOT EXISTS idx_hbr_district ON public.hospital_blood_requirements (district);
CREATE INDEX IF NOT EXISTS idx_hbr_urgency ON public.hospital_blood_requirements (urgency);
CREATE INDEX IF NOT EXISTS idx_hbr_status ON public.hospital_blood_requirements (status);

ALTER TABLE public.hospital_blood_requirements ADD COLUMN IF NOT EXISTS hospital_email TEXT;

-- Automatic timestamp trigger for hospital_blood_requirements
DROP TRIGGER IF EXISTS set_hospital_blood_requirements_timestamp ON public.hospital_blood_requirements;
CREATE TRIGGER set_hospital_blood_requirements_timestamp
    BEFORE UPDATE ON public.hospital_blood_requirements
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 2. Table: donor_blood_responses
CREATE TABLE IF NOT EXISTS public.donor_blood_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_code TEXT UNIQUE NOT NULL,
    requirement_id UUID NOT NULL REFERENCES public.hospital_blood_requirements(id) ON DELETE CASCADE,
    requirement_code TEXT NOT NULL,
    hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE CASCADE,
    hospital_name TEXT NOT NULL,
    donor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    donor_name TEXT NOT NULL,
    donor_blood_group TEXT NOT NULL,
    donor_district TEXT,
    donor_city TEXT,
    donor_phone TEXT,
    donor_email TEXT,
    donor_message TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING_HOSPITAL_RESPONSE' CHECK (
        status IN (
            'PENDING_HOSPITAL_RESPONSE',
            'ACCEPTED_BY_HOSPITAL',
            'DECLINED_BY_HOSPITAL',
            'DONATION_SCHEDULED',
            'DONATION_COMPLETED',
            'CANCELLED',
            'EXPIRED'
        )
    ),
    responded_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    hospital_response_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.donor_blood_responses ADD COLUMN IF NOT EXISTS donor_email TEXT;
ALTER TABLE public.donor_blood_responses ADD COLUMN IF NOT EXISTS hospital_email TEXT;
ALTER TABLE public.donor_blood_responses ADD COLUMN IF NOT EXISTS notification_status TEXT DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_dbr_code ON public.donor_blood_responses (response_code);
CREATE INDEX IF NOT EXISTS idx_dbr_requirement ON public.donor_blood_responses (requirement_id);
CREATE INDEX IF NOT EXISTS idx_dbr_hospital ON public.donor_blood_responses (hospital_id);
CREATE INDEX IF NOT EXISTS idx_dbr_donor ON public.donor_blood_responses (donor_id);
CREATE INDEX IF NOT EXISTS idx_dbr_status ON public.donor_blood_responses (status);

-- Automatic timestamp trigger for donor_blood_responses
DROP TRIGGER IF EXISTS set_donor_blood_responses_timestamp ON public.donor_blood_responses;
CREATE TRIGGER set_donor_blood_responses_timestamp
    BEFORE UPDATE ON public.donor_blood_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS)
ALTER TABLE public.hospital_blood_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_blood_responses ENABLE ROW LEVEL SECURITY;

-- RLS: hospital_blood_requirements
-- Public can view active requirements
DROP POLICY IF EXISTS "Public can view active hospital requirements" ON public.hospital_blood_requirements;
CREATE POLICY "Public can view active hospital requirements"
    ON public.hospital_blood_requirements FOR SELECT
    USING (status IN ('ACTIVE', 'PARTIALLY_FULFILLED'));

-- Authorized hospital can view all its own requirements
DROP POLICY IF EXISTS "Hospitals view own requirements" ON public.hospital_blood_requirements;
CREATE POLICY "Hospitals view own requirements"
    ON public.hospital_blood_requirements FOR SELECT
    TO authenticated
    USING (true);

-- Admins full access
DROP POLICY IF EXISTS "Admins manage hospital blood requirements" ON public.hospital_blood_requirements;
CREATE POLICY "Admins manage hospital blood requirements"
    ON public.hospital_blood_requirements FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS: donor_blood_responses
-- Donors can view their own responses
DROP POLICY IF EXISTS "Donors view own responses" ON public.donor_blood_responses;
CREATE POLICY "Donors view own responses"
    ON public.donor_blood_responses FOR SELECT
    TO authenticated
    USING (donor_id = auth.uid());

-- Donors can insert their own responses
DROP POLICY IF EXISTS "Donors create own responses" ON public.donor_blood_responses;
CREATE POLICY "Donors create own responses"
    ON public.donor_blood_responses FOR INSERT
    TO authenticated
    WITH CHECK (donor_id = auth.uid());

-- Donors can cancel their own pending responses
DROP POLICY IF EXISTS "Donors update own responses" ON public.donor_blood_responses;
CREATE POLICY "Donors update own responses"
    ON public.donor_blood_responses FOR UPDATE
    TO authenticated
    USING (donor_id = auth.uid())
    WITH CHECK (donor_id = auth.uid());

-- Admins full access on donor responses
DROP POLICY IF EXISTS "Admins manage donor responses" ON public.donor_blood_responses;
CREATE POLICY "Admins manage donor responses"
    ON public.donor_blood_responses FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================================================
-- 10. EMAIL NOTIFICATION LOGS (AUDIT & DELIVERY MONITORING)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT,
    support_copy_enabled BOOLEAN DEFAULT FALSE,
    support_copy TEXT,
    request_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
    provider_message_id TEXT,
    resend_message_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    sent_at TIMESTAMPTZ
);

ALTER TABLE public.email_notification_logs ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.email_notification_logs ADD COLUMN IF NOT EXISTS support_copy_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.email_notification_logs ADD COLUMN IF NOT EXISTS support_copy TEXT;
ALTER TABLE public.email_notification_logs ADD COLUMN IF NOT EXISTS resend_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_notification_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON public.email_notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_notification_logs(status);

-- =============================================================================
-- 11. APPROVAL TOKENS (ONE-CLICK EMAIL APPROVAL / DECLINE)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.approval_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT UNIQUE NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    action TEXT NOT NULL DEFAULT 'APPROVE' CHECK (action IN ('APPROVE', 'DECLINE', 'REJECT')),
    donation_response_id UUID REFERENCES public.donor_blood_responses(id) ON DELETE CASCADE,
    blood_requirement_id UUID REFERENCES public.hospital_blood_requirements(id) ON DELETE CASCADE,
    hospital_id TEXT,
    hospital_email TEXT,
    donor_id UUID,
    donor_email TEXT,
    donor_name TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_approval_tokens_token ON public.approval_tokens(token);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_hash ON public.approval_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_status ON public.approval_tokens(status);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_response ON public.approval_tokens(donation_response_id);

-- =============================================================================
-- End of BloodBridge Production Database Schema
-- =============================================================================


