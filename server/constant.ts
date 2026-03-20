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


export const CRON_TASKS = {
  MAIN_GATE_SYNC: {
    CODE: "MG_SYNC_01",              // Unique ID for DB
    TASK_NAME: "COMMON_GATE_AUTH",   // Logic Identifier
    DISPLAY_NAME: "Main Gate - Sync",
    DEFAULT_SECONDS: 30,             // Sync Interval
    GROUP: "gate_security",
    PRIORITY: "high",
    DOOR_ID: 1,                      // Default Door
  },

// Future mein koi naya task aaye toh yahan add karein
HEALTH_CHECK: {
  CODE: "OFFICE_HC_01",
    TASK_NAME: "health_check",
      DISPLAY_NAME: "Office - Health Check",
        DEFAULT_SECONDS: 3600,
  }
};