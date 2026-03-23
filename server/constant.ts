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
  // Future mein naye gate ke liye bas ek naya object yahan add karein
  SIDE_GATE_SYNC: {
    CODE: "SG_SYNC_02",
    DISPLAY_NAME: "Side Gate",
    DOOR_TYPE: "gate",
    TASK_NAME: "SIDE_GATE_AUTH",
    DEFAULT_SECONDS: 60,
    GROUP: "gate_security",
    PRIORITY: "medium",
  }
};