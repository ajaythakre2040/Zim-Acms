// constant.ts
export const SHIFT_START = "09:00:00";
export const SHIFT_END = "18:00:00";
export const EXPECTED_WORKING_HRS = 9;

// In values ko backend generate karega aur frontend filter karega
export const ATTENDANCE_STATUS = {
  PRESENT: "present",
  // LATE: "late",
  ABSENT: "absent",
  // HALF_DAY: "half_day",
  // ON_LEAVE: "on_leave",
  // SINGLE_PUNCH: "single_punch" // Optional: Agar user ne out nahi kiya
};

export const MAIN_GATE_SYNC = {
  CODE: "MG_SYNC_01",
  DISPLAY_NAME: "Main Gate",
  DOOR_TYPE: "gate",           // Physical hardware type
  TASK_NAME: "COMMON_GATE_AUTH",
  DEFAULT_SECONDS: 30,
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