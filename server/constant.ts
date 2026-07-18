// constant.ts
export const SHIFT_START = "09:00:00";
export const SHIFT_END = "18:00:00";
export const EXPECTED_WORKING_HRS = 9;

export const DEVICE_OFFLINE_THRESHOLD_MINUTES = 5;

export const DEFAULT_ADMIN_CONFIG = {
  EMPLOYEE_CODE: "ADM001",
  EMPLOYEE_NAME: "System Administrator",
  USERNAME: "admin",
  DEFAULT_PASSWORD: "Admin@123",
  ROLE_CODE: "admin_01",
};
// In values ko backend generate karega aur frontend filter karega
export const ATTENDANCE_STATUS = {
  PRESENT: "present",
  // LATE: "late",
  ABSENT: "absent",
  // HALF_DAY: "half_day",
  // ON_LEAVE: "on_leave",
  // SINGLE_PUNCH: "single_punch" // Optional: Agar user ne out nahi kiya
};
export const EMPLOYEE_STATUS = {
  ACTIVE: "active",         // Working: Allowed access
  SUSPENDED: "suspended",   // Blocked: Blocked access
  TERMINATED: "terminated", // Left Company: Removed access
  ON_LEAVE: "on_leave",     // Long Leave: Temporary pause
  INACTIVE: "inactive"      // Standard inactive fallback
} as const;
export const AUTOSUSPEND_CONFIG = {
  MAX_INACTIVE_DAYS: 60, 
} as const;

export const MAIN_GATE_SYNC = {
  CODE: "MG_SYNC_01",
  DISPLAY_NAME: "Main Gate",
  DOOR_TYPE: "gate",           // Physical hardware type
  TASK_NAME: "COMMON_GATE_AUTH",
  DEFAULT_SECONDS: 3,
  GROUP: "gate_security",
  PRIORITY: "high",
};
export const CABIN_LOCKOUT_CONFIG = {
  CODE: "CABIN_LOCK_01",
  DISPLAY_NAME: "Cabin Lockout Policy",
  DOOR_TYPE: "system",         // 'system' means virtual/logic, not a door
  TASK_NAME: "CABIN_EXIT_MONITOR",

  // Execution Timer (Cron kab chalega)
  DEFAULT_SECONDS: 0,
  DEFAULT_MINUTES: 1,
  DEFAULT_HOURS: 0,

  // Policy Settings (Kitni der ke liye lock hoga)
  DEFAULT_LOCKOUT_HOURS: 24,
  DEFAULT_LOCKOUT_MINUTES: 0,

  GROUP: "security_logic",
  PRIORITY: "high",
};

// gateConstants.js

export const ACCESS_RULES = {
  NO_RULE: 0,         // Jab employee ka koi role assigned na ho
  MAIN_GATE_IN: 1,    // Main gate se entry, role restore
  CABIN_IN: 2,        // Lab/Cabin ke andar (Strict block)
  CABIN_OUT: 3,       // Normal cabin exit
  LOCKOUT_ACTIVE: 4,  // Cipla cabin jaisa cooling period
  MAIN_GATE_OUT: 5    // Building se bahar (Internal block)
};

export const ZONES = {
  IN: "IN",
  OUT: "OUT",
  CABIN: "CABIN"
};


export const ALERT_TYPES = {
  SECURITY: "security",
  DEVICE: "device",
  SYSTEM: "system",
  VISITOR: "visitor",
  ATTENDANCE: "attendance"
} as const;

export const SEVERITY_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical"
} as const;

export const ALERT_TEMPLATES = {
  // Security
  EMERGENCY_BULK_UNBLOCK: {
    type: ALERT_TYPES.SECURITY,
    severity: SEVERITY_LEVELS.CRITICAL,
    title: "🚨 EMERGENCY BULK UNBLOCK EXECUTED",
    message: (count: number, userName: string) =>
      `System-wide unblock triggered for ${count} commands. Action performed by: ${userName}.`
  },
  UNAUTHORIZED_ACCESS: {
    type: ALERT_TYPES.SECURITY,
    severity: SEVERITY_LEVELS.HIGH,
    title: "⚠️ Unauthorized Access Attempt",
    message: (emp: string, dev: string) => `Employee ${emp} tried to access restricted area: ${dev}.`
  },
  // Device
  DEVICE_OFFLINE: {
    type: ALERT_TYPES.DEVICE,
    severity: SEVERITY_LEVELS.HIGH,
    title: "📡 Device Connection Lost",
    message: (dev: string) => `Device ${dev} is not responding to heartbeat/ping.`
  },
  // System
  DATABASE_SYNC_ERROR: {
    type: ALERT_TYPES.SYSTEM,
    severity: SEVERITY_LEVELS.MEDIUM,
    title: "🗄️ Database Sync Issue",
    message: "Failed to synchronize data between PostgreSQL and MS SQL Server."
  }
};

export const ATTENDANCE_CONFIG = {
  OT_THRESHOLD_MINUTES: 120, // 2 Hours Buffer Policy
};



export const MENU_CONFIG = {
  // --- Dashboard Group ---
  DASHBOARD: { title: "Dashboard", code: "dash_00", icon: "LayoutDashboard" },
  ATTENDANCE_SUMMARY: { title: "Attendance Summary", code: "dash_01", icon: "Activity" },
  SHIFT_ANALYTICS: { title: "Shift Analytics", code: "dash_02", icon: "Zap" },
  LIVE_LOGS: { title: "Live Access Logs", code: "dash_03", icon: "Clock" },

  // --- Master Data Group ---
  MASTER_DATA: { title: "Master Data", code: "mast_00", icon: "Layers" },
  DESIGNATION: { title: "Designation", code: "mast_01", icon: "UserCheck" },
  DEPARTMENT: { title: "Department", code: "mast_02", icon: "Building2" },
  ROLE: { title: "Role", code: "mast_03", icon: "Shield" },
  MENU_MASTER: { title: "Menu", code: "mast_04", icon: "Settings" },
  CATEGORY: { title: "Category", code: "mast_05", icon: "BookOpen" },
  COMPANY: { title: "Company", code: "mast_06", icon: "MapPin" },

  // --- Standalone Menus ---
  EMPLOYEES: { title: "Employees", code: "emp_01", icon: "Users" },
  SHIFTS: { title: "Shifts", code: "shift_01", icon: "CalendarDays" },
  HOLIDAYS: { title: "Holidays", code: "holl_01", icon: "Calendar" },
  REPORTS: { title: "Reports", code: "repo_01", icon: "FileText" },
  CRON_MASTER: { title: "Cron Master", code: "cron_01", icon: "Timer" },
  DOORS: { title: "Doors", code: "door_01", icon: "DoorOpen" },
  DEVICES: { title: "Devices", code: "dev_01", icon: "Cpu" },
  USER_ADMIN: { title: "User Admin", code: "uadmin_01", icon: "UserCog" },
  EMERGENCY_UNBLOCK: { title: "Emergency Unblock All", code: "act_emg_01", icon: "RefreshCw" },
  VISITORS: { title: "Visitors", code: "visit_main", icon: "Users" },
  VISITORS_DETAILS: { title: "Visitor Details", code: "visit_details", icon: "Info" },
  VISITOR_CARDS: { title: "Visitor Cards", code: "visit_cards", icon: "CreditCard" },
  VISITOR_LOGS: { title: "Visitor Logs", code: "visit_logs", icon: "FileText" },
  CONTRACTORS: { title: "Contractors", code: "contr_01", icon: "Users" },
  AUDIT_TRAIL: { title: "Audit Trail", code: "audit_01", icon: "History" },
  NEW_DEVICE_BLOCK: { title: "New Device block All", code: "newDevice_block_01", icon: "Lock" },

} as const;


export const TABLES = {
  ACCESS_CARDS: "access_cards",
  ACCESS_EVENTS: "access_events",
  ACCESS_LEVELS: "access_levels",
  ACCESS_LOGS: "access_logs",
  ACCESS_RULES: "access_rules",
  ALERTS: "alerts",
  ATTENDANCE: "attendance",
  AUDIT_LOGS: "audit_logs",
  BUILDINGS: "buildings",
  CABIN_LOCKOUTS: "cabin_lockouts",
  CATEGORIES: "categories",
  COMPANIES: "companies",
  CREDENTIALS: "credentials",
  CRON_MASTER: "cron_master",
  DAILY_ATTENDANCE_SUMMARY: "daily_attendance_summary",
  DEPARTMENTS: "departments",
  DESIGNATIONS: "designations",
  DEVICES: "devices",
  DOORS: "doors",
  DOOR_ACCESS_LEVELS: "door_access_levels",
  DOOR_DEVICES: "door_devices",
  EMPLOYEE_ACTIVITY_LOGS: "employee_activity_logs",
  EMPLOYEE_DOOR_ASSIGNMENTS: "employee_door_assignments",
  EXCEPTIONS: "exceptions",
  FLOORS: "floors",
  HOLIDAYS: "holidays",
  MAIN_GATE_LOGS: "main_gate_logs",
  MENU_MASTER: "menu_master",
  PEOPLE: "people",
  PERSON_ACCESS: "person_access",
  ROLES: "roles",
  ROLE_PERMISSIONS: "role_permissions",
  SESSIONS: "sessions",
  SHIFTS: "shifts",
  SHIFT_ASSIGNMENTS: "shift_assignments",
  SITES: "sites",
  SYNC_META: "sync_meta",
  SYSTEM_SETTINGS: "system_settings",
  USERS: "users",
  USER_BLOCK_UNBLOCK_LOGS: "user_block_unblock_logs",
  USER_PROFILES: "user_profiles",
  VENDORS: "vendors",
  VISITORS: "visitors",
  VISITS: "visits",
  VISIT_ACCESS: "visit_access",
  ZONES: "zones",
  CONTRACTORS: "contractors",
  VISITOR_CARDS: "visitor_cards",
  DEVICE_VISITOR_CARDS: "visitor_card_logs",

} as const;

export const RFID_CARDS = [
  { id: 1, name: "RFID Card 1", cardNumber: "5468103", expiryFrom: "2000-01-01T00:00:00", expiryTo: "3000-01-01T00:00:00", locationId: 1, location: 1 },
  { id: 2, name: "RFID Card 2", cardNumber: "3062587", expiryFrom: "2000-01-01T00:00:00", expiryTo: "3000-01-01T00:00:00", locationId: 1, location: 1 },
  { id: 3, name: "RFID Card 3", cardNumber: "8892104", expiryFrom: "2000-01-01T00:00:00", expiryTo: "3000-01-01T00:00:00", locationId: 1, location: 1 },
  { id: 4, name: "RFID Card 4", cardNumber: "7741295", expiryFrom: "2000-01-01T00:00:00", expiryTo: "3000-01-01T00:00:00", locationId: 1, location: 1 },
  { id: 5, name: "RFID Card 5", cardNumber: "9938472", expiryFrom: "2000-01-01T00:00:00", expiryTo: "3000-01-01T00:00:00", locationId: 1, location: 1 },
  { id: 6, name: "RFID Card 6", cardNumber: "2201948", expiryFrom: "2000-01-01T00:00:00", expiryTo: "3000-01-01T00:00:00", locationId: 1, location: 1 },
  { id: 7, name: "RFID Card 7", cardNumber: "6657301", expiryFrom: "2000-01-01T00:00:00", expiryTo: "3000-01-01T00:00:00", locationId: 1, location: 1 },
  { id: 8, name: "RFID Card 8", cardNumber: "3384756", expiryFrom: "2000-01-01T00:00:00", expiryTo: "3000-01-01T00:00:00", locationId: 1, location: 1 },
  { id: 9, name: "RFID Card 9", cardNumber: "1192837", expiryFrom: "2000-01-01T00:00:00", expiryTo: "3000-01-01T00:00:00", locationId: 1, location: 1 },
  { id: 10, name: "RFID Card 10", cardNumber: "4475629", expiryFrom: "2000-01-01T00:00:00", expiryTo: "3000-01-01T00:00:00", locationId: 1, location: 1 },
];

export type TableNames = typeof TABLES[keyof typeof TABLES];