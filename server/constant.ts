// constant.ts
export const SHIFT_START = "09:00:00";
export const SHIFT_END = "18:00:00";
export const EXPECTED_WORKING_HRS = 9;

// In values ko backend generate karega aur frontend filter karega
export const ATTENDANCE_STATUS = {
  PRESENT: "present",
  LATE: "late",
  ABSENT: "absent",
  HALF_DAY: "half_day",
  ON_LEAVE: "on_leave",
  SINGLE_PUNCH: "single_punch" // Optional: Agar user ne out nahi kiya
};

export const MAIN_GATE_SYNC = {
  CODE: "MG_SYNC_01",
  DISPLAY_NAME: "Main Gate Entry",
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