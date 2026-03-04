-- ============================================================
-- ZIM-ACMS Database Export with Demo Data
-- Generated: 2026-02-19
-- Superadmin: Username: admin | Password: 123456
-- Email: admin@gmail.com | Role: super_admin
-- ============================================================

-- Required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS exceptions CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS access_events CASCADE;
DROP TABLE IF EXISTS access_logs CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS visit_access CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS visitors CASCADE;
DROP TABLE IF EXISTS door_access_levels CASCADE;
DROP TABLE IF EXISTS person_access CASCADE;
DROP TABLE IF EXISTS access_rules CASCADE;
DROP TABLE IF EXISTS access_levels CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS shift_assignments CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS access_cards CASCADE;
DROP TABLE IF EXISTS credentials CASCADE;
DROP TABLE IF EXISTS people CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS doors CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS floors CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS designations CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- CREATE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR UNIQUE,
  password VARCHAR,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'employee',
  permissions JSONB DEFAULT '{}',
  employee_id VARCHAR,
  department TEXT,
  designation TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  address TEXT,
  email TEXT,
  website TEXT,
  logo TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  manager_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS designations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  level INTEGER,
  department_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pin_code TEXT,
  gst_number TEXT,
  pan_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sites (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buildings (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  site_id INTEGER NOT NULL,
  address TEXT,
  floor_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS floors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  floor_number INTEGER NOT NULL,
  building_id INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  site_id INTEGER NOT NULL,
  building_id INTEGER,
  floor_id INTEGER,
  parent_zone_id INTEGER,
  security_level INTEGER DEFAULT 1,
  is_high_risk BOOLEAN DEFAULT false,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  zone_id INTEGER,
  site_id INTEGER,
  door_type TEXT DEFAULT 'standard',
  is_high_risk BOOLEAN DEFAULT false,
  requires_2fa BOOLEAN DEFAULT false,
  in_reader_id INTEGER,
  out_reader_id INTEGER,
  controller_id INTEGER,
  status TEXT DEFAULT 'normal',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  device_type TEXT DEFAULT 'reader',
  site_id INTEGER,
  zone_id INTEGER,
  ip_address TEXT,
  mac_address TEXT,
  serial_number TEXT,
  status TEXT DEFAULT 'offline',
  last_heartbeat TIMESTAMP,
  firmware_version TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS people (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  employee_id TEXT UNIQUE,
  employee_code TEXT,
  department_id INTEGER,
  designation_id INTEGER,
  company_id INTEGER,
  category_id INTEGER,
  site_id INTEGER,
  photo_url TEXT,
  person_type TEXT DEFAULT 'employee',
  risk_tier INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  gender TEXT,
  date_of_birth TEXT,
  date_of_joining TEXT,
  date_of_resignation TEXT,
  father_name TEXT,
  address TEXT,
  permanent_address TEXT,
  emergency_contact TEXT,
  blood_group TEXT,
  aadhaar_number TEXT,
  pan_number TEXT,
  passport_number TEXT,
  qualification TEXT,
  experience TEXT,
  bank_account_no TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  pf_number TEXT,
  esi_number TEXT,
  overtime_eligible BOOLEAN DEFAULT false,
  overtime_rate REAL,
  shift_type TEXT DEFAULT 'fixed',
  external_id TEXT,
  source_system TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credentials (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  card_number TEXT,
  facility_code TEXT,
  pin_code TEXT,
  status TEXT DEFAULT 'active',
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_cards (
  id SERIAL PRIMARY KEY,
  card_number TEXT NOT NULL UNIQUE,
  card_type TEXT DEFAULT 'employee',
  person_id INTEGER,
  status TEXT DEFAULT 'active',
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  break_duration INTEGER DEFAULT 0,
  grace_period INTEGER DEFAULT 15,
  is_night_shift BOOLEAN DEFAULT false,
  half_day_hours REAL DEFAULT 4,
  full_day_hours REAL DEFAULT 8,
  late_threshold_mins INTEGER DEFAULT 15,
  early_out_threshold_mins INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shift_assignments (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL,
  shift_id INTEGER NOT NULL,
  effective_from TEXT,
  effective_to TEXT,
  days_of_week JSONB DEFAULT '[1,2,3,4,5]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  holiday_type TEXT DEFAULT 'company',
  site_id INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_levels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  priority INTEGER DEFAULT 1,
  rules JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_rules (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  person_id INTEGER,
  site_id INTEGER,
  zone_id INTEGER,
  access_type TEXT DEFAULT 'permanent',
  valid_from TEXT,
  valid_to TEXT,
  time_from TEXT,
  time_to TEXT,
  days_of_week JSONB DEFAULT '[1,2,3,4,5,6,7]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS person_access (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL,
  access_level_id INTEGER NOT NULL,
  valid_from TEXT,
  valid_to TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS door_access_levels (
  id SERIAL PRIMARY KEY,
  door_id INTEGER NOT NULL,
  access_level_id INTEGER NOT NULL,
  time_schedule JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visitors (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  id_proof_type TEXT,
  id_proof_number TEXT,
  photo_url TEXT,
  address TEXT,
  is_blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visits (
  id SERIAL PRIMARY KEY,
  visitor_id INTEGER NOT NULL,
  site_id INTEGER,
  host_person_id INTEGER,
  purpose TEXT,
  badge_number TEXT,
  qr_code TEXT,
  status TEXT DEFAULT 'scheduled',
  scheduled_at TIMESTAMP,
  check_in_at TIMESTAMP,
  check_out_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visit_access (
  id SERIAL PRIMARY KEY,
  visit_id INTEGER NOT NULL,
  door_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL,
  site_id INTEGER,
  date TEXT NOT NULL,
  clock_in TIMESTAMP,
  clock_out TIMESTAMP,
  clock_in_device_id INTEGER,
  clock_out_device_id INTEGER,
  working_hours REAL,
  overtime_hours REAL,
  first_in TIMESTAMP,
  last_out TIMESTAMP,
  total_hours REAL,
  status TEXT DEFAULT 'present',
  shift_id INTEGER,
  late_by_mins INTEGER DEFAULT 0,
  early_by_mins INTEGER DEFAULT 0,
  notes TEXT,
  source_system TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_logs (
  id SERIAL PRIMARY KEY,
  person_id INTEGER,
  visitor_id INTEGER,
  device_id INTEGER,
  door_id INTEGER,
  site_id INTEGER,
  zone_id INTEGER,
  event_type TEXT DEFAULT 'entry',
  access_method TEXT DEFAULT 'card',
  is_authorized BOOLEAN DEFAULT true,
  denial_reason TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  source_system TEXT,
  external_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_events (
  id SERIAL PRIMARY KEY,
  access_log_id INTEGER,
  door_id INTEGER,
  credential_id INTEGER,
  direction TEXT,
  result TEXT DEFAULT 'allow',
  reason_code TEXT,
  snapshot_url TEXT,
  temperature REAL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT,
  person_id INTEGER,
  visitor_id INTEGER,
  device_id INTEGER,
  site_id INTEGER,
  door_id INTEGER,
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by VARCHAR,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exceptions (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL,
  exception_type TEXT NOT NULL,
  date TEXT NOT NULL,
  old_clock_in TIMESTAMP,
  old_clock_out TIMESTAMP,
  new_clock_in TIMESTAMP,
  new_clock_out TIMESTAMP,
  reason TEXT,
  approval_status TEXT DEFAULT 'pending',
  requested_by VARCHAR,
  approved_by VARCHAR,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  description TEXT,
  updated_by VARCHAR,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- DEMO DATA
-- ============================================================

-- Superadmin User (admin / admin@gmail.com / Password: 123456)
INSERT INTO users (id, username, password, email, first_name, last_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', '$2b$10$Q2Y.b9PBebVxbFzMZ85pn.19eo7UbPK9oG6AqEvOz7.Hchv0VPJwy', 'admin@gmail.com', 'Super', 'Admin');

INSERT INTO user_profiles (user_id, role, department, designation, phone, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'super_admin', 'IT', 'System Administrator', '+91-9876543210', true);

-- Companies
INSERT INTO companies (id, name, short_name, address, email, website) VALUES
  (1, 'ZIM Industries Pvt Ltd', 'ZIM', '123 Industrial Area, Phase-1, Pune', 'info@zimindustries.com', 'www.zimindustries.com'),
  (2, 'ZIM Tech Solutions', 'ZIMTECH', '456 IT Park, Hinjewadi, Pune', 'contact@zimtech.com', 'www.zimtech.com'),
  (3, 'Vertex Contractors', 'VERTEX', '789 Commercial Zone, Hadapsar', 'hr@vertexcontractors.com', NULL);
SELECT setval('companies_id_seq', 3);

-- Departments
INSERT INTO departments (id, name, code, description) VALUES
  (1, 'Information Technology', 'IT', 'IT infrastructure and software development'),
  (2, 'Human Resources', 'HR', 'Employee management and payroll'),
  (3, 'Finance & Accounts', 'FIN', 'Financial operations and accounting'),
  (4, 'Production', 'PROD', 'Manufacturing and production'),
  (5, 'Quality Assurance', 'QA', 'Product quality and testing'),
  (6, 'Security', 'SEC', 'Physical security and access control'),
  (7, 'Administration', 'ADMIN', 'General administration'),
  (8, 'Maintenance', 'MAINT', 'Building and equipment maintenance'),
  (9, 'Logistics', 'LOG', 'Supply chain and logistics'),
  (10, 'Research & Development', 'R&D', 'Product research and innovation');
SELECT setval('departments_id_seq', 10);

-- Designations
INSERT INTO designations (id, name, code, description, level, department_id) VALUES
  (1, 'Managing Director', 'MD', 'Company head', 10, NULL),
  (2, 'General Manager', 'GM', 'General management', 9, NULL),
  (3, 'Senior Manager', 'SM', 'Senior level management', 8, NULL),
  (4, 'Manager', 'MGR', 'Department management', 7, NULL),
  (5, 'Team Lead', 'TL', 'Team leadership', 6, NULL),
  (6, 'Senior Engineer', 'SE', 'Senior technical role', 5, 1),
  (7, 'Engineer', 'ENG', 'Technical role', 4, 1),
  (8, 'Junior Engineer', 'JE', 'Entry level technical', 3, 1),
  (9, 'Executive', 'EXEC', 'Executive role', 4, NULL),
  (10, 'Operator', 'OPR', 'Machine operator', 3, 4),
  (11, 'Supervisor', 'SUP', 'Floor supervisor', 5, 4),
  (12, 'Security Guard', 'SG', 'Security personnel', 2, 6),
  (13, 'Security Officer', 'SO', 'Security management', 4, 6),
  (14, 'Receptionist', 'REC', 'Front desk', 3, 7),
  (15, 'Helper', 'HLP', 'General helper', 1, 8);
SELECT setval('designations_id_seq', 15);

-- Categories
INSERT INTO categories (id, name, description) VALUES
  (1, 'Permanent', 'Full-time permanent employees'),
  (2, 'Contract', 'Contract workers with fixed tenure'),
  (3, 'Temporary', 'Temporary / casual workers'),
  (4, 'Intern', 'Interns and trainees'),
  (5, 'Consultant', 'External consultants');
SELECT setval('categories_id_seq', 5);

-- Vendors
INSERT INTO vendors (id, name, code, contact_person, phone, email, city, state) VALUES
  (1, 'SecureTech Solutions', 'VND-001', 'Rajesh Sharma', '+91-9876500001', 'rajesh@securetech.com', 'Mumbai', 'Maharashtra'),
  (2, 'BuildRight Services', 'VND-002', 'Priya Patel', '+91-9876500002', 'priya@buildright.com', 'Pune', 'Maharashtra'),
  (3, 'CleanPro Facility Mgmt', 'VND-003', 'Amit Kumar', '+91-9876500003', 'amit@cleanpro.in', 'Pune', 'Maharashtra');
SELECT setval('vendors_id_seq', 3);

-- Sites
INSERT INTO sites (id, name, code, address, city, state, country) VALUES
  (1, 'ZIM Headquarters', 'HQ', '123 Industrial Area, Phase-1', 'Pune', 'Maharashtra', 'India'),
  (2, 'ZIM Manufacturing Plant', 'MFG', '456 MIDC, Chakan', 'Pune', 'Maharashtra', 'India'),
  (3, 'ZIM Tech Park', 'TECH', '789 IT Park, Hinjewadi', 'Pune', 'Maharashtra', 'India');
SELECT setval('sites_id_seq', 3);

-- Buildings
INSERT INTO buildings (id, name, code, site_id, floor_count) VALUES
  (1, 'Main Building', 'HQ-MB', 1, 5),
  (2, 'Annex Building', 'HQ-AX', 1, 3),
  (3, 'Production Block A', 'MFG-PA', 2, 2),
  (4, 'Production Block B', 'MFG-PB', 2, 2),
  (5, 'Warehouse', 'MFG-WH', 2, 1),
  (6, 'Tech Tower', 'TECH-TT', 3, 8);
SELECT setval('buildings_id_seq', 6);

-- Floors
INSERT INTO floors (id, name, floor_number, building_id, description) VALUES
  (1, 'Ground Floor', 0, 1, 'Reception and lobby'),
  (2, 'First Floor', 1, 1, 'HR and Admin'),
  (3, 'Second Floor', 2, 1, 'Finance and Accounts'),
  (4, 'Third Floor', 3, 1, 'IT Department'),
  (5, 'Fourth Floor', 4, 1, 'Management'),
  (6, 'Ground Floor', 0, 3, 'Production floor'),
  (7, 'First Floor', 1, 3, 'Quality lab'),
  (8, 'Ground Floor', 0, 6, 'Cafeteria and common area'),
  (9, 'First Floor', 1, 6, 'Software development'),
  (10, 'Second Floor', 2, 6, 'R&D Lab');
SELECT setval('floors_id_seq', 10);

-- Zones
INSERT INTO zones (id, name, code, site_id, building_id, floor_id, security_level, is_high_risk, description) VALUES
  (1, 'Main Lobby', 'Z-LOBBY', 1, 1, 1, 1, false, 'Main entrance and reception area'),
  (2, 'Parking Area', 'Z-PARK', 1, NULL, NULL, 1, false, 'Employee and visitor parking'),
  (3, 'Server Room', 'Z-SRV', 1, 1, 4, 5, true, 'Data center and server infrastructure'),
  (4, 'Executive Suite', 'Z-EXEC', 1, 1, 5, 4, false, 'Management offices'),
  (5, 'Production Floor A', 'Z-PFA', 2, 3, 6, 3, true, 'Manufacturing line A'),
  (6, 'Production Floor B', 'Z-PFB', 2, 4, NULL, 3, true, 'Manufacturing line B'),
  (7, 'Warehouse Zone', 'Z-WH', 2, 5, NULL, 2, false, 'Material storage'),
  (8, 'R&D Lab', 'Z-RND', 3, 6, 10, 5, true, 'Research and development laboratory'),
  (9, 'Tech Office', 'Z-TOFF', 3, 6, 9, 2, false, 'Software development area'),
  (10, 'Quality Lab', 'Z-QLAB', 2, 3, 7, 4, true, 'Testing and quality control');
SELECT setval('zones_id_seq', 10);

-- Doors
INSERT INTO doors (id, name, code, zone_id, site_id, door_type, is_high_risk, requires_2fa, status) VALUES
  (1, 'Main Entrance', 'D-MAIN', 1, 1, 'turnstile', false, false, 'normal'),
  (2, 'Parking Gate', 'D-PARK', 2, 1, 'barrier', false, false, 'normal'),
  (3, 'Server Room Door', 'D-SRV', 3, 1, 'standard', true, true, 'normal'),
  (4, 'Executive Wing', 'D-EXEC', 4, 1, 'standard', false, false, 'normal'),
  (5, 'Production A Entry', 'D-PFA', 5, 2, 'turnstile', false, false, 'normal'),
  (6, 'Production B Entry', 'D-PFB', 6, 2, 'turnstile', false, false, 'normal'),
  (7, 'Warehouse Gate', 'D-WH', 7, 2, 'gate', false, false, 'normal'),
  (8, 'R&D Lab Door', 'D-RND', 8, 3, 'standard', true, true, 'normal'),
  (9, 'Tech Office Entry', 'D-TOFF', 9, 3, 'standard', false, false, 'normal'),
  (10, 'Quality Lab Door', 'D-QLAB', 10, 2, 'standard', true, false, 'normal'),
  (11, 'Emergency Exit A', 'D-EMA', 1, 1, 'emergency', false, false, 'normal'),
  (12, 'MFG Main Gate', 'D-MFGM', NULL, 2, 'gate', false, false, 'normal');
SELECT setval('doors_id_seq', 12);

-- Devices
INSERT INTO devices (id, name, code, device_type, site_id, zone_id, ip_address, serial_number, status, firmware_version) VALUES
  (1, 'Main Turnstile Reader', 'DEV-001', 'reader', 1, 1, '192.168.1.101', 'ESSL-2024-001', 'online', '3.2.1'),
  (2, 'Parking Barrier Controller', 'DEV-002', 'controller', 1, 2, '192.168.1.102', 'ZK-C3-001', 'online', '2.1.0'),
  (3, 'Server Room Biometric', 'DEV-003', 'biometric', 1, 3, '192.168.1.103', 'BIOS-FP-001', 'online', '5.0.2'),
  (4, 'Executive Door Reader', 'DEV-004', 'reader', 1, 4, '192.168.1.104', 'ESSL-2024-002', 'online', '3.2.1'),
  (5, 'Prod A Turnstile', 'DEV-005', 'turnstile', 2, 5, '192.168.2.101', 'ESSL-2024-003', 'online', '3.2.1'),
  (6, 'Prod B Turnstile', 'DEV-006', 'turnstile', 2, 6, '192.168.2.102', 'ESSL-2024-004', 'online', '3.2.1'),
  (7, 'Warehouse Gate Controller', 'DEV-007', 'controller', 2, 7, '192.168.2.103', 'ZK-C3-002', 'offline', '2.1.0'),
  (8, 'R&D Biometric Scanner', 'DEV-008', 'biometric', 3, 8, '192.168.3.101', 'BIOS-FP-002', 'online', '5.0.2'),
  (9, 'Tech Office Reader', 'DEV-009', 'reader', 3, 9, '192.168.3.102', 'ESSL-2024-005', 'online', '3.2.1'),
  (10, 'Quality Lab Reader', 'DEV-010', 'reader', 2, 10, '192.168.2.104', 'ESSL-2024-006', 'online', '3.2.1');
SELECT setval('devices_id_seq', 10);

-- People (20 Employees/Contractors/Interns)
INSERT INTO people (id, first_name, last_name, email, phone, employee_id, employee_code, department_id, designation_id, company_id, category_id, site_id, person_type, gender, date_of_joining, status) VALUES
  (1, 'Rahul', 'Verma', 'rahul.verma@zimindustries.com', '+91-9876501001', 'EMP001', 'ZIM-001', 1, 6, 1, 1, 1, 'employee', 'Male', '2020-03-15', 'active'),
  (2, 'Priya', 'Sharma', 'priya.sharma@zimindustries.com', '+91-9876501002', 'EMP002', 'ZIM-002', 2, 4, 1, 1, 1, 'employee', 'Female', '2019-07-01', 'active'),
  (3, 'Amit', 'Patel', 'amit.patel@zimindustries.com', '+91-9876501003', 'EMP003', 'ZIM-003', 4, 11, 1, 1, 2, 'employee', 'Male', '2018-01-10', 'active'),
  (4, 'Sneha', 'Deshmukh', 'sneha.d@zimindustries.com', '+91-9876501004', 'EMP004', 'ZIM-004', 3, 9, 1, 1, 1, 'employee', 'Female', '2021-05-20', 'active'),
  (5, 'Vikram', 'Singh', 'vikram.singh@zimindustries.com', '+91-9876501005', 'EMP005', 'ZIM-005', 1, 7, 1, 1, 3, 'employee', 'Male', '2022-01-03', 'active'),
  (6, 'Anita', 'Kulkarni', 'anita.k@zimindustries.com', '+91-9876501006', 'EMP006', 'ZIM-006', 5, 5, 1, 1, 2, 'employee', 'Female', '2017-09-12', 'active'),
  (7, 'Deepak', 'Joshi', 'deepak.j@zimindustries.com', '+91-9876501007', 'EMP007', 'ZIM-007', 6, 13, 1, 1, 1, 'employee', 'Male', '2016-04-25', 'active'),
  (8, 'Meena', 'Rao', 'meena.rao@zimindustries.com', '+91-9876501008', 'EMP008', 'ZIM-008', 7, 14, 1, 1, 1, 'employee', 'Female', '2023-02-01', 'active'),
  (9, 'Suresh', 'Nair', 'suresh.nair@zimtech.com', '+91-9876501009', 'EMP009', 'ZIM-009', 10, 6, 2, 1, 3, 'employee', 'Male', '2020-11-15', 'active'),
  (10, 'Kavita', 'Iyer', 'kavita.iyer@zimtech.com', '+91-9876501010', 'EMP010', 'ZIM-010', 1, 5, 2, 1, 3, 'employee', 'Female', '2019-06-01', 'active'),
  (11, 'Rajesh', 'Gupta', 'rajesh.gupta@zimindustries.com', '+91-9876501011', 'EMP011', 'ZIM-011', 4, 10, 1, 1, 2, 'employee', 'Male', '2021-08-10', 'active'),
  (12, 'Pooja', 'Mehta', 'pooja.mehta@zimindustries.com', '+91-9876501012', 'EMP012', 'ZIM-012', 9, 9, 1, 1, 1, 'employee', 'Female', '2020-04-01', 'active'),
  (13, 'Mahesh', 'Patil', 'mahesh.patil@zimindustries.com', '+91-9876501013', 'EMP013', 'ZIM-013', 8, 15, 1, 2, 2, 'contractor', 'Male', '2024-01-15', 'active'),
  (14, 'Sunita', 'Bhosale', 'sunita.b@zimindustries.com', '+91-9876501014', 'EMP014', 'ZIM-014', 6, 12, 1, 1, 1, 'employee', 'Female', '2022-07-01', 'active'),
  (15, 'Arun', 'Jadhav', 'arun.j@zimindustries.com', '+91-9876501015', 'EMP015', 'ZIM-015', 4, 10, 1, 2, 2, 'contractor', 'Male', '2024-06-01', 'active'),
  (16, 'Neha', 'Deshpande', 'neha.d@zimtech.com', '+91-9876501016', 'EMP016', 'ZIM-016', 1, 8, 2, 4, 3, 'intern', 'Female', '2025-06-01', 'active'),
  (17, 'Sanjay', 'More', 'sanjay.m@zimindustries.com', '+91-9876501017', 'EMP017', 'ZIM-017', 6, 12, 1, 1, 2, 'employee', 'Male', '2023-03-15', 'active'),
  (18, 'Ritu', 'Kadam', 'ritu.k@zimindustries.com', '+91-9876501018', 'EMP018', 'ZIM-018', 2, 9, 1, 1, 1, 'employee', 'Female', '2021-11-01', 'active'),
  (19, 'Ganesh', 'Wagh', 'ganesh.w@zimindustries.com', '+91-9876501019', 'EMP019', 'ZIM-019', 8, 15, 1, 3, 2, 'contractor', 'Male', '2025-01-10', 'active'),
  (20, 'Pallavi', 'Chavan', 'pallavi.c@zimindustries.com', '+91-9876501020', 'EMP020', 'ZIM-020', 5, 7, 1, 1, 2, 'employee', 'Female', '2022-09-01', 'active');
SELECT setval('people_id_seq', 20);

-- Credentials
INSERT INTO credentials (id, person_id, kind, card_number, facility_code, status) VALUES
  (1, 1, 'rfid', 'CARD-10001', 'FC-001', 'active'),
  (2, 2, 'rfid', 'CARD-10002', 'FC-001', 'active'),
  (3, 3, 'rfid', 'CARD-10003', 'FC-001', 'active'),
  (4, 4, 'rfid', 'CARD-10004', 'FC-001', 'active'),
  (5, 5, 'rfid', 'CARD-10005', 'FC-001', 'active'),
  (6, 6, 'biometric', NULL, NULL, 'active'),
  (7, 7, 'biometric', NULL, NULL, 'active'),
  (8, 9, 'face', NULL, NULL, 'active'),
  (9, 10, 'rfid', 'CARD-10010', 'FC-002', 'active'),
  (10, 14, 'rfid', 'CARD-10014', 'FC-001', 'active');
SELECT setval('credentials_id_seq', 10);

-- Access Cards
INSERT INTO access_cards (id, card_number, card_type, person_id, status) VALUES
  (1, 'CARD-10001', 'employee', 1, 'active'),
  (2, 'CARD-10002', 'employee', 2, 'active'),
  (3, 'CARD-10003', 'employee', 3, 'active'),
  (4, 'CARD-10004', 'employee', 4, 'active'),
  (5, 'CARD-10005', 'employee', 5, 'active'),
  (6, 'CARD-10010', 'employee', 10, 'active'),
  (7, 'CARD-10014', 'employee', 14, 'active'),
  (8, 'CARD-V001', 'visitor', NULL, 'active'),
  (9, 'CARD-V002', 'visitor', NULL, 'active'),
  (10, 'CARD-T001', 'temporary', NULL, 'active');
SELECT setval('access_cards_id_seq', 10);

-- Shifts
INSERT INTO shifts (id, name, code, start_time, end_time, break_duration, grace_period, is_night_shift, full_day_hours, late_threshold_mins) VALUES
  (1, 'General Shift', 'GEN', '09:00', '18:00', 60, 15, false, 8, 15),
  (2, 'Morning Shift', 'MOR', '06:00', '14:00', 30, 10, false, 8, 10),
  (3, 'Afternoon Shift', 'AFT', '14:00', '22:00', 30, 10, false, 8, 10),
  (4, 'Night Shift', 'NGT', '22:00', '06:00', 30, 15, true, 8, 15),
  (5, 'Flexi Shift', 'FLX', '08:00', '20:00', 60, 30, false, 8, 30);
SELECT setval('shifts_id_seq', 5);

-- Shift Assignments
INSERT INTO shift_assignments (id, person_id, shift_id, effective_from, days_of_week) VALUES
  (1, 1, 1, '2024-01-01', '[1,2,3,4,5]'),
  (2, 2, 1, '2024-01-01', '[1,2,3,4,5]'),
  (3, 3, 2, '2024-01-01', '[1,2,3,4,5,6]'),
  (4, 4, 1, '2024-01-01', '[1,2,3,4,5]'),
  (5, 5, 1, '2024-01-01', '[1,2,3,4,5]'),
  (6, 6, 1, '2024-01-01', '[1,2,3,4,5]'),
  (7, 7, 3, '2024-01-01', '[1,2,3,4,5,6]'),
  (8, 11, 2, '2024-01-01', '[1,2,3,4,5,6]'),
  (9, 14, 4, '2024-01-01', '[1,2,3,4,5,6,7]'),
  (10, 17, 4, '2024-01-01', '[1,2,3,4,5,6,7]');
SELECT setval('shift_assignments_id_seq', 10);

-- Holidays (2026)
INSERT INTO holidays (id, name, date, holiday_type, site_id, description) VALUES
  (1, 'Republic Day', '2026-01-26', 'national', NULL, 'Republic Day of India'),
  (2, 'Holi', '2026-03-17', 'national', NULL, 'Festival of Colors'),
  (3, 'Good Friday', '2026-04-03', 'national', NULL, 'Good Friday'),
  (4, 'May Day', '2026-05-01', 'national', NULL, 'International Workers Day'),
  (5, 'Independence Day', '2026-08-15', 'national', NULL, 'Independence Day of India'),
  (6, 'Gandhi Jayanti', '2026-10-02', 'national', NULL, 'Mahatma Gandhi Birthday'),
  (7, 'Diwali', '2026-10-20', 'national', NULL, 'Festival of Lights'),
  (8, 'Christmas', '2026-12-25', 'national', NULL, 'Christmas Day'),
  (9, 'Company Foundation Day', '2026-06-15', 'company', NULL, 'ZIM Industries Foundation Day'),
  (10, 'Annual Shutdown', '2026-12-31', 'company', NULL, 'Year-end shutdown');
SELECT setval('holidays_id_seq', 10);

-- Access Levels
INSERT INTO access_levels (id, name, code, description, priority) VALUES
  (1, 'All Access', 'ALL', 'Full access to all doors and zones', 10),
  (2, 'Office Access', 'OFFICE', 'Standard office building access', 5),
  (3, 'Production Access', 'PROD', 'Production floor access', 5),
  (4, 'High Security', 'HISEC', 'Server room and R&D lab access', 8),
  (5, 'Visitor Access', 'VISIT', 'Limited visitor access - lobby and meeting rooms only', 1),
  (6, 'Gate Security', 'GATE', 'Main gate and parking area only', 2);
SELECT setval('access_levels_id_seq', 6);

-- Access Rules
INSERT INTO access_rules (id, name, description, site_id, zone_id, access_type, time_from, time_to) VALUES
  (1, 'HQ Office Hours', 'Standard access during office hours', 1, NULL, 'scheduled', '08:00', '20:00'),
  (2, 'Production 24x7', 'Round-the-clock production access', 2, NULL, 'permanent', NULL, NULL),
  (3, 'Server Room Restricted', 'IT staff only - limited hours', 1, 3, 'scheduled', '09:00', '18:00'),
  (4, 'R&D Lab Restricted', 'R&D team only', 3, 8, 'scheduled', '08:00', '22:00'),
  (5, 'Visitor Lobby Only', 'Visitors restricted to lobby area', 1, 1, 'temporary', '09:00', '17:00');
SELECT setval('access_rules_id_seq', 5);

-- Person Access (Level Assignments)
INSERT INTO person_access (id, person_id, access_level_id, valid_from) VALUES
  (1, 1, 4, '2024-01-01'),
  (2, 2, 2, '2024-01-01'),
  (3, 3, 3, '2024-01-01'),
  (4, 4, 2, '2024-01-01'),
  (5, 5, 2, '2024-01-01'),
  (6, 6, 3, '2024-01-01'),
  (7, 7, 1, '2024-01-01'),
  (8, 9, 4, '2024-01-01'),
  (9, 10, 2, '2024-01-01'),
  (10, 14, 6, '2024-01-01');
SELECT setval('person_access_id_seq', 10);

-- Visitors
INSERT INTO visitors (id, first_name, last_name, email, phone, company, id_proof_type, id_proof_number) VALUES
  (1, 'Ramesh', 'Agarwal', 'ramesh@techmahindra.com', '+91-9876600001', 'Tech Mahindra', 'national_id', 'AADHAAR-1234-5678'),
  (2, 'Sarah', 'Williams', 'sarah.w@ibm.com', '+91-9876600002', 'IBM India', 'passport', 'PASS-US-123456'),
  (3, 'Manoj', 'Tiwari', 'manoj.t@tataconsultancy.com', '+91-9876600003', 'TCS', 'license', 'DL-MH-2024-001'),
  (4, 'Fatima', 'Sheikh', 'fatima.s@wipro.com', '+91-9876600004', 'Wipro', 'national_id', 'AADHAAR-8765-4321'),
  (5, 'David', 'Johnson', 'david.j@siemens.com', '+91-9876600005', 'Siemens India', 'passport', 'PASS-DE-654321');
SELECT setval('visitors_id_seq', 5);

-- Visits
INSERT INTO visits (id, visitor_id, site_id, host_person_id, purpose, badge_number, status, scheduled_at, check_in_at, check_out_at) VALUES
  (1, 1, 1, 1, 'Software system audit', 'VB-001', 'checked_out', '2026-02-17 10:00:00', '2026-02-17 09:55:00', '2026-02-17 16:30:00'),
  (2, 2, 3, 9, 'R&D collaboration meeting', 'VB-002', 'checked_out', '2026-02-17 14:00:00', '2026-02-17 13:50:00', '2026-02-17 17:00:00'),
  (3, 3, 1, 2, 'HR vendor discussion', 'VB-003', 'checked_in', '2026-02-19 10:00:00', '2026-02-19 09:45:00', NULL),
  (4, 4, 2, 3, 'Production line inspection', 'VB-004', 'scheduled', '2026-02-20 11:00:00', NULL, NULL),
  (5, 5, 3, 10, 'Technology partnership review', 'VB-005', 'scheduled', '2026-02-21 09:00:00', NULL, NULL);
SELECT setval('visits_id_seq', 5);

-- Attendance (last 5 days for key employees)
INSERT INTO attendance (id, person_id, site_id, date, clock_in, clock_out, working_hours, overtime_hours, status, shift_id, late_by_mins, early_by_mins) VALUES
  (1, 1, 1, '2026-02-14', '2026-02-14 08:55:00', '2026-02-14 18:10:00', 8.25, 0.17, 'present', 1, 0, 0),
  (2, 2, 1, '2026-02-14', '2026-02-14 09:20:00', '2026-02-14 18:00:00', 7.67, 0, 'late', 1, 20, 0),
  (3, 3, 2, '2026-02-14', '2026-02-14 05:50:00', '2026-02-14 14:05:00', 8.25, 0.08, 'present', 2, 0, 0),
  (4, 5, 3, '2026-02-14', '2026-02-14 09:05:00', '2026-02-14 18:30:00', 8.42, 0.5, 'present', 1, 5, 0),
  (5, 7, 1, '2026-02-14', '2026-02-14 13:55:00', '2026-02-14 22:10:00', 8.25, 0.17, 'present', 3, 0, 0),
  (6, 3, 2, '2026-02-15', '2026-02-15 06:10:00', '2026-02-15 14:00:00', 7.83, 0, 'present', 2, 10, 0),
  (7, 11, 2, '2026-02-15', '2026-02-15 06:00:00', '2026-02-15 14:15:00', 8.25, 0.25, 'present', 2, 0, 0),
  (8, 14, 1, '2026-02-16', '2026-02-16 22:05:00', '2026-02-17 06:00:00', 7.92, 0, 'present', 4, 5, 0),
  (9, 1, 1, '2026-02-17', '2026-02-17 08:50:00', '2026-02-17 18:00:00', 8.17, 0, 'present', 1, 0, 0),
  (10, 2, 1, '2026-02-17', '2026-02-17 09:00:00', '2026-02-17 17:30:00', 7.5, 0, 'present', 1, 0, 30),
  (11, 3, 2, '2026-02-17', '2026-02-17 06:05:00', '2026-02-17 14:10:00', 8.08, 0.08, 'present', 2, 5, 0),
  (12, 4, 1, '2026-02-17', '2026-02-17 09:00:00', '2026-02-17 18:00:00', 8.0, 0, 'present', 1, 0, 0),
  (13, 5, 3, '2026-02-17', NULL, NULL, 0, 0, 'absent', 1, 0, 0),
  (14, 6, 2, '2026-02-17', '2026-02-17 09:10:00', '2026-02-17 18:00:00', 7.83, 0, 'present', 1, 10, 0),
  (15, 7, 1, '2026-02-17', '2026-02-17 14:00:00', '2026-02-17 22:00:00', 8.0, 0, 'present', 3, 0, 0),
  (16, 9, 3, '2026-02-17', '2026-02-17 09:00:00', '2026-02-17 19:30:00', 9.5, 1.5, 'present', 1, 0, 0),
  (17, 10, 3, '2026-02-17', '2026-02-17 08:45:00', '2026-02-17 18:00:00', 8.25, 0, 'present', 1, 0, 0),
  (18, 1, 1, '2026-02-18', '2026-02-18 09:30:00', '2026-02-18 18:15:00', 7.75, 0, 'late', 1, 30, 0),
  (19, 2, 1, '2026-02-18', '2026-02-18 09:00:00', '2026-02-18 18:00:00', 8.0, 0, 'present', 1, 0, 0),
  (20, 3, 2, '2026-02-18', '2026-02-18 06:00:00', '2026-02-18 14:00:00', 8.0, 0, 'present', 2, 0, 0),
  (21, 4, 1, '2026-02-18', NULL, NULL, 0, 0, 'absent', 1, 0, 0),
  (22, 5, 3, '2026-02-18', '2026-02-18 08:50:00', '2026-02-18 20:00:00', 10.17, 2.17, 'present', 1, 0, 0),
  (23, 6, 2, '2026-02-18', '2026-02-18 09:00:00', '2026-02-18 16:00:00', 6.0, 0, 'half_day', 1, 0, 120),
  (24, 7, 1, '2026-02-18', '2026-02-18 14:10:00', '2026-02-18 22:00:00', 7.83, 0, 'present', 3, 10, 0),
  (25, 9, 3, '2026-02-18', '2026-02-18 09:05:00', '2026-02-18 18:00:00', 7.92, 0, 'present', 1, 5, 0),
  (26, 10, 3, '2026-02-18', '2026-02-18 09:00:00', '2026-02-18 18:30:00', 8.5, 0.5, 'present', 1, 0, 0),
  (27, 11, 2, '2026-02-18', '2026-02-18 05:55:00', '2026-02-18 14:30:00', 8.58, 0.5, 'present', 2, 0, 0),
  (28, 12, 1, '2026-02-18', '2026-02-18 09:00:00', '2026-02-18 18:00:00', 8.0, 0, 'present', 1, 0, 0),
  (29, 1, 1, '2026-02-19', '2026-02-19 08:45:00', NULL, NULL, NULL, 'present', 1, 0, 0),
  (30, 2, 1, '2026-02-19', '2026-02-19 09:00:00', NULL, NULL, NULL, 'present', 1, 0, 0),
  (31, 3, 2, '2026-02-19', '2026-02-19 06:00:00', '2026-02-19 14:00:00', 8.0, 0, 'present', 2, 0, 0),
  (32, 5, 3, '2026-02-19', '2026-02-19 09:00:00', NULL, NULL, NULL, 'present', 1, 0, 0),
  (33, 9, 3, '2026-02-19', '2026-02-19 09:15:00', NULL, NULL, NULL, 'late', 1, 15, 0),
  (34, 10, 3, '2026-02-19', '2026-02-19 08:50:00', NULL, NULL, NULL, 'present', 1, 0, 0);
SELECT setval('attendance_id_seq', 34);

-- Access Logs
INSERT INTO access_logs (id, person_id, visitor_id, device_id, door_id, site_id, zone_id, event_type, access_method, is_authorized, timestamp) VALUES
  (1, 1, NULL, 1, 1, 1, 1, 'entry', 'card', true, '2026-02-19 08:45:00'),
  (2, 2, NULL, 1, 1, 1, 1, 'entry', 'card', true, '2026-02-19 09:00:00'),
  (3, 3, NULL, 5, 5, 2, 5, 'entry', 'card', true, '2026-02-19 06:00:00'),
  (4, 5, NULL, 9, 9, 3, 9, 'entry', 'card', true, '2026-02-19 09:00:00'),
  (5, 9, NULL, 9, 9, 3, 9, 'entry', 'card', true, '2026-02-19 09:15:00'),
  (6, 10, NULL, 9, 9, 3, 9, 'entry', 'card', true, '2026-02-19 08:50:00'),
  (7, NULL, 3, 1, 1, 1, 1, 'entry', 'manual', true, '2026-02-19 09:45:00'),
  (8, 1, NULL, 3, 3, 1, 3, 'entry', 'fingerprint', true, '2026-02-19 10:30:00'),
  (9, NULL, NULL, 1, 1, 1, 1, 'denied', 'card', false, '2026-02-19 07:30:00'),
  (10, 3, NULL, 5, 5, 2, 5, 'exit', 'card', true, '2026-02-19 14:00:00'),
  (11, 1, NULL, 1, 1, 1, 1, 'entry', 'card', true, '2026-02-18 09:30:00'),
  (12, 2, NULL, 1, 1, 1, 1, 'entry', 'card', true, '2026-02-18 09:00:00'),
  (13, 5, NULL, 9, 9, 3, 9, 'entry', 'face', true, '2026-02-18 08:50:00'),
  (14, 9, NULL, 8, 8, 3, 8, 'entry', 'fingerprint', true, '2026-02-18 10:00:00'),
  (15, 1, NULL, 3, 3, 1, 3, 'denied', 'card', false, '2026-02-18 20:30:00');
SELECT setval('access_logs_id_seq', 15);

-- Alerts
INSERT INTO alerts (id, alert_type, severity, title, message, device_id, site_id, door_id, person_id, is_read, is_resolved) VALUES
  (1, 'device', 'high', 'Warehouse Controller Offline', 'Device DEV-007 (Warehouse Gate Controller) has been offline for more than 2 hours', 7, 2, 7, NULL, false, false),
  (2, 'security', 'critical', 'Unauthorized Access Attempt', 'Unknown card presented at Main Entrance at 07:30 AM. Access denied.', 1, 1, 1, NULL, false, false),
  (3, 'security', 'medium', 'After-Hours Access Denied', 'Rahul Verma attempted server room access at 20:30. Outside permitted hours.', 3, 1, 3, 1, true, false),
  (4, 'attendance', 'low', 'Late Arrival Pattern', 'Priya Sharma has been late 3 times this week', NULL, 1, NULL, 2, false, false),
  (5, 'system', 'medium', 'Database Backup Completed', 'Scheduled daily backup completed successfully at 03:00 AM', NULL, NULL, NULL, NULL, true, true),
  (6, 'device', 'medium', 'Biometric Reader Slow Response', 'R&D Biometric Scanner response time above 3 seconds threshold', 8, 3, 8, NULL, false, false),
  (7, 'visitor', 'low', 'Visitor Overstay', 'Visitor Manoj Tiwari has exceeded scheduled visit duration by 2 hours', NULL, 1, NULL, NULL, false, false);
SELECT setval('alerts_id_seq', 7);

-- Exceptions
INSERT INTO exceptions (id, person_id, exception_type, date, old_clock_in, old_clock_out, new_clock_in, new_clock_out, reason, approval_status, requested_by) VALUES
  (1, 2, 'missing_punch', '2026-02-14', '2026-02-14 09:20:00', NULL, '2026-02-14 09:20:00', '2026-02-14 18:00:00', 'Forgot to clock out, was in meeting room', 'approved', '00000000-0000-0000-0000-000000000001'),
  (2, 5, 'regularization', '2026-02-17', NULL, NULL, '2026-02-17 09:00:00', '2026-02-17 18:00:00', 'Was working from home due to doctor appointment', 'pending', '00000000-0000-0000-0000-000000000001'),
  (3, 4, 'leave', '2026-02-18', NULL, NULL, NULL, NULL, 'Personal emergency - family medical issue', 'approved', '00000000-0000-0000-0000-000000000001'),
  (4, 6, 'manual_correction', '2026-02-18', '2026-02-18 09:00:00', '2026-02-18 16:00:00', '2026-02-18 09:00:00', '2026-02-18 18:00:00', 'Biometric did not register clock out. Guard verified departure at 6 PM', 'pending', '00000000-0000-0000-0000-000000000001');
SELECT setval('exceptions_id_seq', 4);

-- System Settings
INSERT INTO system_settings (id, key, value, description) VALUES
  (1, 'company_name', '"ZIM Industries Pvt Ltd"', 'Primary company name'),
  (2, 'company_logo', '"/logo.png"', 'Company logo path'),
  (3, 'timezone', '"Asia/Kolkata"', 'Default system timezone'),
  (4, 'attendance_auto_absent_hour', '12', 'Hour after which no-punch is marked absent'),
  (5, 'max_overtime_hours', '4', 'Maximum overtime hours per day'),
  (6, 'late_grace_period', '15', 'Grace period in minutes before marking late'),
  (7, 'visitor_max_stay_hours', '8', 'Maximum visitor stay duration'),
  (8, 'password_min_length', '6', 'Minimum password length'),
  (9, 'session_timeout_mins', '480', 'Session timeout in minutes'),
  (10, 'essl_connection', '{"host":"192.168.1.200","port":1433,"database":"eaboraborTimeTrax","instance":"SQLEXPRESS","username":"sa","password":""}', 'ESSL Database Connection'),
  (11, 'bios_connection', '{"host":"192.168.1.201","port":1433,"database":"BIOStar2","instance":"","username":"sa","password":""}', 'BIOS Database Connection'),
  (12, 'zkteco_connection', '{"host":"192.168.1.210","port":4370,"serialNumber":"","model":"C3-400"}', 'ZKTeco Controller Connection');
SELECT setval('system_settings_id_seq', 12);

-- ============================================================
-- SETUP COMPLETE!
-- Login with: Username: admin | Password: 123456
-- Email: admin@gmail.com | Role: super_admin
-- ============================================================
