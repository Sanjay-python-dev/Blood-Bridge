# 📁 docs/ — BloodBridge Support & Reference Files

This directory contains project support files, database schemas, and reference data used during development and deployment. These are **not part of the build bundle**.

---

## 📄 Files

| File | Purpose |
|------|---------|
| [`supabase_schema.sql`](./supabase_schema.sql) | Complete PostgreSQL schema for Supabase — run in **SQL Editor → Run** to bootstrap all tables, RLS policies, triggers, and indexes |
| [`bloodbridge_38_districts_demo.json`](./bloodbridge_38_districts_demo.json) | Demo dataset of blood donors across all 38 Tamil Nadu districts (reference copy — live copy is in `src/data/`) |
| [`parse_hospitals.py`](./parse_hospitals.py) | Python script used to parse and seed raw hospital data into `server/data/` |

---

## 🗃️ How to Use the Supabase Schema

1. Log in to [supabase.com](https://supabase.com) and open your project
2. Go to **SQL Editor** in the left sidebar
3. Paste the contents of `supabase_schema.sql`
4. Click **Run**

This will create:
- `profiles`, `donors`, `blood_requests`, `hospitals`, `hospital_blood_requirements` tables
- Row Level Security (RLS) policies
- Automatic `updated_at` triggers
- All required indexes for performance

---

> **Note:** The `bloodbridge_38_districts_demo.json` root-level copy is a reference backup.  
> The **active copy** used by the app is at `src/data/bloodbridge_38_districts_demo.json`.
