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
    // Ye details Doors table ke liye hain
    CODE: "MG_SYNC_01",           // Unique Identifier (Sabse zaroori)
    DISPLAY_NAME: "Main Gate",    // Door ka naam
    DOOR_TYPE: "gate",            // Enum: gate, standard, etc.

    // Ye details Cron Master table ke liye hain
    TASK_NAME: "COMMON_GATE_AUTH",
    DEFAULT_SECONDS: 30,
    GROUP: "gate_security",
    PRIORITY: "high",
  },
  CABIN_LOCKOUT_SYNC: {
    CODE: "CABIN_LOCK_01",           // Unique Identifier for DB lookup
    DISPLAY_NAME: "Cabin Lockout",    // UI Display Name
    DOOR_TYPE: "system",              // Logical Task
    TASK_NAME: "CABIN_EXIT_MONITOR",  // Function Name

    // --- Execution Frequency (Timer) ---
    DEFAULT_SECONDS: 0,
    DEFAULT_MINUTES: 1,               // Har 1 minute mein check karega
    DEFAULT_HOURS: 0,

    // --- Lockout Policy (New Fields) ---
    DEFAULT_LOCKOUT_HOURS: 24,        // Kitne ghante block rahega
    DEFAULT_LOCKOUT_MINUTES: 0,       // Extra minutes

    GROUP: "security_logic",
    PRIORITY: "high",
  }
};