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