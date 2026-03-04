# ZIM-ACMS (ZIM Access Control Management System)

## Overview
Enterprise security platform that unifies access control, attendance tracking, visitor management, and real-time monitoring. Built for 5000+ users, 50+ doors, with support for ESSL, BIOS, and ZKTeco integrations.

## Tech Stack
- **Frontend**: React + Vite + TypeScript, Shadcn UI, TanStack Query, Wouter routing
- **Backend**: Node.js + Express, Drizzle ORM
- **Database**: PostgreSQL (Neon-backed via Replit)
- **Auth**: Local session-based auth (bcryptjs + connect-pg-simple)
- **Styling**: Tailwind CSS, light/dark theme support

## Project Structure
```
client/src/
  App.tsx              - Main app with routing, auth, sidebar layout
  components/
    app-sidebar.tsx    - Navigation sidebar with 7 groups (incl Reports)
    data-table.tsx     - Reusable sortable/searchable table
    crud-dialog.tsx    - Reusable create/edit dialog
    page-header.tsx    - Page title + action button
    theme-provider.tsx - Light/dark theme context
    theme-toggle.tsx   - Theme toggle button
    ui/                - Shadcn UI components
  hooks/
    use-auth.ts        - Auth hook (Replit Auth)
    use-crud.ts        - Generic CRUD hook for API operations
    use-toast.ts       - Toast notifications
  pages/
    dashboard.tsx      - Stats overview with cards
    people.tsx         - Employee/contractor management
    visitors.tsx       - Visitor registry + visit management
    attendance.tsx     - Daily attendance tracking
    access-logs.tsx    - Access event history
    access-rules.tsx   - Access permission rules
    access-levels.tsx  - Access permission levels
    credentials.tsx    - Cards, biometrics, PINs
    access-cards.tsx   - Physical card management
    shifts.tsx         - Work shift configuration
    holidays.tsx       - Holiday calendar
    exceptions.tsx     - Attendance exceptions/corrections
    sites.tsx          - Sites & buildings
    zones.tsx          - Zones & doors
    devices.tsx        - Device management
    alerts.tsx         - Security/system alerts
    master-data.tsx    - Departments, designations, categories, companies, vendors
    user-admin.tsx     - User profile & role management
    settings.tsx       - System settings & integration config
    reports.tsx        - 8 report types with filters & CSV export

shared/
  schema.ts           - 30+ Drizzle tables with types & insert schemas
  models/auth.ts      - Auth model (Replit OIDC)

server/
  routes.ts           - All API routes (CRUD, dashboard, attendance summary, visit check-in/out, alert ack/resolve, exception approve/reject)
  storage.ts          - 80+ storage methods for all entities
  db.ts               - Database connection
  replit_integrations/ - Auth setup
```

## Key Features
- Dashboard with real-time stats
- People management (employees, contractors)
- Visitor management with check-in/check-out
- Attendance tracking with daily summary
- Access control (rules, levels, credentials, cards)
- Infrastructure management (sites, buildings, zones, doors, devices)
- Alert system with severity levels
- Exception handling with approval workflow
- Master data management
- User administration with 7 RBAC roles
- System settings with integration placeholders

## RBAC Roles
super_admin, staff, security_admin, worker, employee, reception, gate_security

## External Integrations (Planned)
- ESSL Database (SQL Server - 100+ tables)
- BIOS Database (SQL Server - 37 tables)
- ZKTeco C3-400 (TCP/IP door controllers)

## Design System
- Creative gradient-based design with primary (blue) and accent (violet) gradients
- Glass panel effects, glow effects, subtle animations (fadeSlideIn, pulse-soft, shimmer)
- Custom CSS utilities: gradient-primary, gradient-text, glass-panel, glow-primary, stat-card-gradient
- Premium dark sidebar with gradient logo and visual hierarchy
- Proper light/dark mode with distinct color palettes
- Fonts: Inter (body), Outfit (headings)
- Custom scrollbar styling, staggered entrance animations

## External Integrations
- ESSL Database: SQL Server connection (host, port, database, instance, credentials) - Settings > Integrations
- BIOS Database: SQL Server connection (host, port, database, instance, credentials) - Settings > Integrations
- ZKTeco C3-400: TCP/IP connection (host IP, port, serial number, model) - Settings > Integrations
- Connection test endpoint: POST /api/external-connections/test (TCP socket reachability test)
- Connection save endpoint: POST /api/external-connections/save (stores config in system_settings)
- Setup guide tab in Settings page explains network requirements for all three systems

## Reports System
- 8 Report Types: Attendance, Late Coming, Early Going, Absentee, Overtime, Access Log, Visitor, Employee Summary
- Report API: GET /api/reports/{type} with query param filters (dateFrom, dateTo, departmentId, personId, siteId, status, eventType, personType)
- Storage: 4 report methods (getAttendanceReport, getAccessLogReport, getVisitorReport, getEmployeeSummaryReport) with SQL joins to people/visitors
- Frontend: Gradient report type cards, contextual filter panel, report-specific data tables, CSV export
- Late Coming & Absentee reports filter on attendance status; Early Going & Overtime filter in-memory on earlyByMins/overtimeHours > 0

## Recent Changes
- 2026-02-19: Converted auth from Replit OIDC to local session-based auth (bcryptjs, connect-pg-simple)
- 2026-02-19: Added username/password login form with register toggle on login page
- 2026-02-19: Users table now has username/password columns, session stored in PostgreSQL
- 2026-02-18: Creative design overhaul - gradient system, glass panels, animations, premium color palette
- 2026-02-18: Enhanced dashboard with trend indicators, system health card, progress bars
- 2026-02-18: External database connection UI with test/save for ESSL, BIOS, ZKTeco
- 2026-02-18: Reports section with 8 report types, contextual filters, CSV export, sidebar navigation
- 2026-02-18: Complete frontend build with 19+ pages, reusable components, theme support
