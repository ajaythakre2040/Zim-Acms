export * from "./models/auth";
import {
  pgTable, text, serial, integer, boolean, timestamp, uniqueIndex, jsonb, real, varchar, date, bigserial,
  decimal,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";
import { users } from "./models/auth";
import { bigint } from "drizzle-orm/pg-core";
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique()
    .references(() => users.id, { onDelete: "cascade" }),
  roleId: integer("role_id").notNull()
    .references(() => roles.id),
  employeeCode: varchar("employee_code").unique(),
  department: text("department"),
  designation: text("designation"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
},
  (table) => [
    index("IDX_user_profile_active").on(table.isActive)
  ]);
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  address: text("address"),
  email: text("email"),
  website: text("website"),
  logo: text("logo"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique(),
  description: text("description"),
  managerId: integer("manager_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const designations = pgTable("designations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique(),
  description: text("description"),
  level: integer("level"),
  departmentId: integer("department_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pinCode: text("pin_code"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  msId: integer("ms_id").unique(),
  name: text("name").notNull(),
  code: text("code").unique().notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  timezone: text("timezone").default("Asia/Kolkata"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const buildings = pgTable("buildings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique().notNull(),
  locationId: integer("location_id").notNull(),
  address: text("address"),
  floorCount: integer("floor_count").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const floors = pgTable("floors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  floorNumber: integer("floor_number").notNull(),
  buildingId: integer("building_id").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique().notNull(),
  locationId: integer("location_id").notNull(),
  buildingId: integer("building_id"),
  floorId: integer("floor_id"),
  parentZoneId: integer("parent_zone_id"),
  securityLevel: integer("security_level").default(1),
  isHighRisk: boolean("is_high_risk").default(false),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const doors = pgTable("doors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique().notNull(),
  zoneId: integer("zone_id"),
  locationId: integer("location_id"),
  doorType: text("door_type", { enum: ["standard", "turnstile", "barrier", "gate", "emergency"] }).default("standard"),
  isHighRisk: boolean("is_high_risk").default(false),
  requires2FA: boolean("requires_2fa").default(false),
  inReaderId: integer("in_reader_id"),
  outReaderId: integer("out_reader_id"),
  controllerId: integer("controller_id"),
  status: text("status", { enum: ["normal", "locked", "unlocked", "alarm", "maintenance"] }).default("normal"),
  isActive: boolean("is_active").default(true),
  is_lockout_enabled: boolean("is_lockout_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  msId: integer("ms_id").unique(),
  name: text("name").notNull(),
  deviceDirection: text("device_direction"),
  serialNumber: text("serial_number"),
  opstamp: text("opstamp"),
  lastPing: timestamp("last_ping"),
  lastreset: timestamp("last_reset"),
  activationCode: text("activation_code"),
  isAttendanceDevice: integer("is_attendance_device"),
  deviceType: text("device_type").default("reader"),
  locationId: integer("location_id"),
  zoneId: integer("zone_id"),
  ipAddress: text("ip_address"),
  lastHeartbeat: timestamp("last_heartbeat"),
  status: text("status").default("offline"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id"),
  msId: integer("ms_id"),
  employeeName: text("employee_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  employeeCode: text("employee_code").unique(),
  departmentId: integer("department_id"),
  shiftId: integer("shift_id"),
  designationId: integer("designation_id"),
  companyId: integer("company_id"),
  locationId: integer("location_id"),
  photoUrl: text("photo_url"),
  personType: text("person_type", { enum: ["employee", "contractor", "visitor", "intern", "consultant"] }).default("employee"),
  riskTier: integer("risk_tier").default(1),
  status: text("status", { enum: ["active", "inactive", "suspended", "terminated", "on_leave"] }).default("active"),
  gender: text("gender"),
  dateOfBirth: text("date_of_birth"),
  dateOfJoining: text("date_of_joining"),
  dateOfResignation: text("date_of_resignation"),
  fatherName: text("father_name"),
  address: text("address"),
  permanentAddress: text("permanent_address"),
  emergencyContact: text("emergency_contact"),
  bloodGroup: text("blood_group"),
  aadhaarNumber: text("aadhaar_number"),
  panNumber: text("pan_number"),
  passportNumber: text("passport_number"),
  qualification: text("qualification"),
  experience: text("experience"),
  bankAccountNo: text("bank_account_no"),
  bankIfsc: text("bank_ifsc"),
  bankName: text("bank_name"),
  pfNumber: text("pf_number"),
  esiNumber: text("esi_number"),
  overtimeEligible: boolean("overtime_eligible").default(false),
  overtimeRate: real("overtime_rate"),
  shiftType: text("shift_type", { enum: ["fixed", "rotational", "flexible"] }).default("fixed"),
  externalId: text("external_id"),
  sourceSystem: text("source_system"),
  lastSeenTime: timestamp("last_seen_time", { withTimezone: false }),
  currentZone: text("current_zone").default("OUT"),
  lastPunchDoorId: integer("last_punch_door_id"),
  ruleid: integer("rule_id"),
  is_lockout_enabled: boolean("is_lockout_enabled").default(false),
  activeShiftDate: text("active_shift_date"),
  isNightShiftActive: boolean("is_night_shift_active").default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
});
export const credentials = pgTable("credentials", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull(),
  kind: text("kind", { enum: ["rfid", "pin", "biometric", "mobile", "face", "qr"] }).notNull(),
  cardNumber: text("card_number"),
  facilityCode: text("facility_code"),
  pinCode: text("pin_code"),
  status: text("status", { enum: ["active", "suspended", "blacklisted", "inactive", "lost", "expired"] }).default("active"),
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const accessCards = pgTable("access_cards", {
  id: serial("id").primaryKey(),
  cardNumber: text("card_number").notNull().unique(),
  cardType: text("card_type", { enum: ["employee", "visitor", "contractor", "temporary"] }).default("employee"),
  personId: integer("person_id"),
  status: text("status", { enum: ["active", "inactive", "lost", "expired", "blocked"] }).default("active"),
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().notNull(),
  code: text("code").unique(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  breakDuration: integer("break_duration").default(0),
  halfDayHours: real("half_day_hours").default(4),
  workingHours: real("full_day_hours").default(8),
  thresholdMins: integer("late_threshold_mins").default(15),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const shiftAssignments = pgTable("shift_assignments", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull(),
  shiftId: integer("shift_id").notNull(),
  effectiveFrom: text("effective_from"),
  effectiveTo: text("effective_to"),
  daysOfWeek: jsonb("days_of_week").$type<number[]>().default([1, 2, 3, 4, 5]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  holidayType: text("holiday_type", { enum: ["national", "state", "company", "optional"] }).default("company"),
  locationid: integer("locationid"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  msId: integer("ms_id"),
});
export const accessLevels = pgTable("access_levels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  description: text("description"),
  priority: integer("priority").default(1),
  rules: jsonb("rules").$type<Record<string, any>>().default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const accessRules = pgTable("access_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  personId: integer("person_id"),
  locationId: integer("location_id"),
  zoneId: integer("zone_id"),
  accessType: text("access_type", { enum: ["permanent", "temporary", "scheduled"] }).default("permanent"),
  validFrom: text("valid_from"),
  validTo: text("valid_to"),
  timeFrom: text("time_from"),
  timeTo: text("time_to"),
  daysOfWeek: jsonb("days_of_week").$type<number[]>().default([1, 2, 3, 4, 5, 6, 7]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const personAccess = pgTable("person_access", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull(),
  accessLevelId: integer("access_level_id").notNull(),
  validFrom: text("valid_from"),
  validTo: text("valid_to"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const doorAccessLevels = pgTable("door_access_levels", {
  id: serial("id").primaryKey(),
  doorId: integer("door_id").notNull(),
  accessLevelId: integer("access_level_id").notNull(),
  timeSchedule: jsonb("time_schedule").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const visitors = pgTable("visitors", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  idProofType: text("id_proof_type", { enum: ["passport", "license", "national_id", "other"] }),
  idProofNumber: text("id_proof_number"),
  photoUrl: text("photo_url"),
  address: text("address"),
  isBlacklisted: boolean("is_blacklisted").default(false),
  blacklistReason: text("blacklist_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  visitorId: integer("visitor_id").notNull(),
  locationId: integer("location_id"),
  hostPersonId: integer("host_person_id"),
  purpose: text("purpose"),
  badgeNumber: text("badge_number"),
  qrCode: text("qr_code"),
  status: text("status", { enum: ["scheduled", "checked_in", "checked_out", "cancelled", "no_show"] }).default("scheduled"),
  scheduledAt: timestamp("scheduled_at"),
  checkInAt: timestamp("check_in_at"),
  checkOutAt: timestamp("check_out_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const visitAccess = pgTable("visit_access", {
  id: serial("id").primaryKey(),
  visitId: integer("visit_id").notNull(),
  doorId: integer("door_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull(),
  locationId: integer("location_id"),
  date: text("date").notNull(),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
  clockInDeviceId: integer("clock_in_device_id"),
  clockOutDeviceId: integer("clock_out_device_id"),
  workingHours: real("working_hours"),
  overtimeHours: real("overtime_hours"),
  firstIn: timestamp("first_in"),
  lastOut: timestamp("last_out"),
  totalHours: real("total_hours"),
  status: text("status", { enum: ["present", "absent", "late", "half_day", "on_leave"] }).default("present"),
  shiftId: integer("shift_id"),
  lateByMins: integer("late_by_mins").default(0),
  earlyByMins: integer("early_by_mins").default(0),
  notes: text("notes"),
  sourceSystem: text("source_system"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const accessLogs = pgTable("access_logs", {
  id: serial("id").primaryKey(),
  personId: integer("person_id"),
  visitorId: integer("visitor_id"),
  deviceId: integer("device_id"),
  doorId: integer("door_id"),
  locationId: integer("location_id"),
  zoneId: integer("zone_id"),
  eventType: text("event_type", { enum: ["entry", "exit", "denied", "tailgate", "forced"] }).default("entry"),
  accessMethod: text("access_method", { enum: ["card", "face", "fingerprint", "qr", "pin", "manual"] }).default("card"),
  isAuthorized: boolean("is_authorized").default(true),
  denialReason: text("denial_reason"),
  timestamp: timestamp("timestamp").defaultNow(),
  sourceSystem: text("source_system"),
  externalId: text("external_id"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const accessEvents = pgTable("access_events", {
  id: serial("id").primaryKey(),
  accessLogId: integer("access_log_id"),
  doorId: integer("door_id"),
  credentialId: integer("credential_id"),
  direction: text("direction", { enum: ["in", "out"] }),
  result: text("result", { enum: ["allow", "deny"] }).default("allow"),
  reasonCode: text("reason_code"),
  snapshotUrl: text("snapshot_url"),
  temperature: real("temperature"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  alertType: text("alert_type", { enum: ["security", "device", "system", "visitor", "attendance"] }).notNull(),
  severity: text("severity", { enum: ["low", "medium", "high", "critical"] }).default("medium"),
  title: text("title").notNull(),
  message: text("message"),
  personId: integer("person_id"),
  visitorId: integer("visitor_id"),
  deviceId: integer("device_id"),
  locationId: integer("location_id"),
  doorId: integer("door_id"),
  isRead: boolean("is_read").default(false),
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"),
});
export const exceptions = pgTable("exceptions", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull(),
  exceptionType: text("exception_type", { enum: ["missing_punch", "device_down", "manual_correction", "regularization", "leave", "wfh", "on_duty"] }).notNull(),
  date: text("date").notNull(),
  oldClockIn: timestamp("old_clock_in"),
  oldClockOut: timestamp("old_clock_out"),
  newClockIn: timestamp("new_clock_in"),
  newClockOut: timestamp("new_clock_out"),
  reason: text("reason"),
  approvalStatus: text("approval_status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  requestedBy: varchar("requested_by"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value"),
  description: text("description"),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
  employee: one(people, { fields: [userProfiles.employeeCode], references: [people.employeeCode] }),
  role: one(roles, { fields: [userProfiles.roleId], references: [roles.id] }),
}));
export const buildingsRelations = relations(buildings, ({ one }) => ({
  site: one(sites, { fields: [buildings.locationId], references: [sites.id] }),
}));
export const floorsRelations = relations(floors, ({ one }) => ({
  building: one(buildings, { fields: [floors.buildingId], references: [buildings.id] }),
}));
export const zonesRelations = relations(zones, ({ one }) => ({
  site: one(sites, { fields: [zones.locationId], references: [sites.id] }),
  building: one(buildings, { fields: [zones.buildingId], references: [buildings.id] }),
  floor: one(floors, { fields: [zones.floorId], references: [floors.id] }),
  parentZone: one(zones, { fields: [zones.parentZoneId], references: [zones.id] }),
}));
export const doorsRelations = relations(doors, ({ one }) => ({
  zone: one(zones, { fields: [doors.zoneId], references: [zones.id] }),
  site: one(sites, { fields: [doors.locationId], references: [sites.id] }),
}));
export const devicesRelations = relations(devices, ({ one }) => ({
  site: one(sites, { fields: [devices.locationId], references: [sites.id] }),
  zone: one(zones, { fields: [devices.zoneId], references: [zones.id] }),
}));
export const peopleRelations = relations(people, ({ one }) => ({
  department: one(departments, { fields: [people.departmentId], references: [departments.id] }),
  designation: one(designations, { fields: [people.designationId], references: [designations.id] }),
  company: one(companies, { fields: [people.companyId], references: [companies.id] }),
  site: one(sites, { fields: [people.locationId], references: [sites.id] }),
}));
export const credentialsRelations = relations(credentials, ({ one }) => ({
  person: one(people, { fields: [credentials.personId], references: [people.id] }),
}));
export const accessCardsRelations = relations(accessCards, ({ one }) => ({
  person: one(people, { fields: [accessCards.personId], references: [people.id] }),
}));
export const visitsRelations = relations(visits, ({ one }) => ({
  visitor: one(visitors, { fields: [visits.visitorId], references: [visitors.id] }),
  site: one(sites, { fields: [visits.locationId], references: [sites.id] }),
  host: one(people, { fields: [visits.hostPersonId], references: [people.id] }),
}));
export const attendanceRelations = relations(attendance, ({ one }) => ({
  person: one(people, { fields: [attendance.personId], references: [people.id] }),
  site: one(sites, { fields: [attendance.locationId], references: [sites.id] }),
  shift: one(shifts, { fields: [attendance.shiftId], references: [shifts.id] }),
}));
export const accessLogsRelations = relations(accessLogs, ({ one }) => ({
  person: one(people, { fields: [accessLogs.personId], references: [people.id] }),
  visitor: one(visitors, { fields: [accessLogs.visitorId], references: [visitors.id] }),
  device: one(devices, { fields: [accessLogs.deviceId], references: [devices.id] }),
  door: one(doors, { fields: [accessLogs.doorId], references: [doors.id] }),
  site: one(sites, { fields: [accessLogs.locationId], references: [sites.id] }),
  zone: one(zones, { fields: [accessLogs.zoneId], references: [zones.id] }),
}));
export const alertsRelations = relations(alerts, ({ one }) => ({
  person: one(people, { fields: [alerts.personId], references: [people.id] }),
  visitor: one(visitors, { fields: [alerts.visitorId], references: [visitors.id] }),
  device: one(devices, { fields: [alerts.deviceId], references: [devices.id] }),
  site: one(sites, { fields: [alerts.locationId], references: [sites.id] }),
}));
export const blockUnblockLogs = pgTable("user_block_unblock_logs", {
  id: serial("id").primaryKey(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  deviceId: integer("device_id").notNull(),
  type: text("type", { enum: ["block", "unblock"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
});
export const employeeDoorAssignments = pgTable("employee_door_assignments", {
  id: serial("id").primaryKey(),
  employeeCode: varchar("employee_code", { length: 100 })
    .notNull()
    .unique()
    .references(() => people.employeeCode, { onDelete: 'cascade' }),
  doorIds: integer("door_ids").array().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
export const mainGateLogs = pgTable("main_gate_logs", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull(),
  deviceId: integer("device_id").notNull(),
  direction: text("direction").notNull(),
  punchTime: timestamp("punch_time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    uniquePunchIdx: uniqueIndex("unique_punch_idx").on(
      table.employeeCode,
      table.deviceId,
      table.punchTime
    ),
  };
});
export const doorDevices = pgTable("door_devices", {
  id: serial("id").primaryKey(),
  doorId: integer("door_id").references(() => doors.id, { onDelete: "cascade" }),
  isMainGate: boolean("is_main_gate").default(false),
  inDeviceIds: integer("in_device_ids").array().default([]),
  outDeviceIds: integer("out_device_ids").array().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const cronMaster = pgTable("cron_master", {
  id: serial("id").primaryKey(),
  doorId: integer("door_id"),
  displayName: text("display_name").notNull(),
  code: text("code").unique().notNull(),
  scheduleSecond: integer("schedule_second").default(0),
  scheduleMinute: integer("schedule_minute").default(0),
  scheduleHour: integer("schedule_hour").default(24),
  lockoutHours: integer("lockout_hours").default(24),
  lockoutMinutes: integer("lockout_minutes").default(0),
  task: text("task"),
  group: text("group"),
  lastProcessedId: bigint("last_processed_id", { mode: "number" }).default(0),
  retryCount: integer("retry_count").default(3),
  timeoutMinutes: integer("timeout_minutes").default(15),
  priority: text("priority").default("medium"),
  isActive: boolean("is_active").default(true),
  isRunning: boolean("is_running").default(false),
  lastRun: timestamp("last_run", { withTimezone: false }),
  lastRunDuration: integer("last_run_duration"),
  lastStatus: text("last_status"),
  lastMessage: text("last_message"),
  logRetentionDays: integer("log_retention_days").default(30),
  alertEmail: text("alert_email"),
  createdAt: timestamp("created_at", { withTimezone: false }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { withTimezone: false }).default(sql`CURRENT_TIMESTAMP`),
});
export const cabinLockouts = pgTable("cabin_lockouts", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull(),
  doorId: integer("door_id").notNull(),
  inPunchTime: timestamp("in_punch_time"),
  outPunchTime: timestamp("out_punch_time"),
  lockoutExpiry: timestamp("lockoutExpiry").notNull(),
  status: text("status").default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
});
export const employeeActivityLogs = pgTable("employee_activity_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  deviceLogId: integer("device_log_id").unique(),
  employeeCode: text("employee_code").notNull(),
  employeeName: text("employee_name"),
  deviceId: integer("device_id"),
  deviceName: text("device_name"),
  doorId: integer("door_id"),
  doorName: text("door_name"),
  direction: text("direction"),
  shiftName: text("shift_name"),
  shiftTime: text("shift_time"),
  departmentName: text("department_name"),
  designationName: text("designation_name"),
  locationName: text("location_name"),
  logDate: timestamp("log_date").notNull(),
  onlyDate: date("only_date").notNull(),
  stayDurationMinutes: integer("stay_duration_minutes").default(0),
  prevZone: text("prev_zone"),
  currentZone: text("current_zone"),
  isProductive: boolean("is_productive").default(false),
  departmentId: integer("department_id"),
  designationId: integer("designation_id"),
}, (table) => ({
  empDateIdx: index("idx_logs_emp_date").on(table.employeeCode, table.onlyDate),
}));
export const dailyAttendanceSummary = pgTable("daily_attendance_summary", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  workDate: date("work_date").notNull(),
  employeeCode: text("employee_code").notNull(),
  employeeName: text("employee_name"),
  gender: text("gender"),
  doorName: text("door_name"),
  firstIn: timestamp("first_in"),
  lastOut: timestamp("last_out"),
  shifttime: text("shift_time"),
  shiftname: text("shift_name"),
  totalPresenceMinutes: integer("total_presence_minutes").default(0),
  totalPresenceHours: decimal("total_presence_hours", { precision: 10, scale: 2 }).default("0"),
  productiveMinutes: integer("productive_minutes").default(0),
  productiveHours: decimal("productive_hours", { precision: 10, scale: 2 }).default("0"),
  overtimeMinutes: integer("overtime_minutes").default(0),
  otHours: decimal("ot_hours", { precision: 10, scale: 2 }).default("0"),
  totalPunches: integer("total_punches").default(0),
  efficiencyPercent: decimal("efficiency_percent", { precision: 5, scale: 2 }).default("0"),
  attendanceStatus: text("attendance_status").default("P"),
  departmentName: text("department_name"),
  designationName: text("designation_name"),
  departmentId: integer("department_id"),
  designationId: integer("designation_id"),
}, (table) => ({
  uniqueDateEmp: uniqueIndex("idx_summary_date_emp").on(table.workDate, table.employeeCode),
  dateIdx: index("idx_summary_date").on(table.workDate),
}));
export const syncMeta = pgTable("sync_meta", {
  id: serial("id").primaryKey(),
  syncCode: text("sync_code").unique().notNull(),
  lastProcessedId: integer("last_processed_id").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const menuMaster = pgTable("menu_master", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().unique(),
  code: text("code").notNull().unique(),
  icon: text("icon"),
  parentId: integer("parent_id").default(0),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  roleName: text("role_name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull(),
  menuId: integer("menu_id").notNull(),
  view: boolean("view").default(false),
  add: boolean("add").default(false),
  edit: boolean("edit").default(false),
  delete: boolean("delete").default(false),
  export: boolean("export").default(false),
  print: boolean("print").default(false),
}, (table) => {
  return {
    roleMenuUnique: unique("role_menu_unique").on(table.roleId, table.menuId),
  };
});
export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: text("user_id").notNull(),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  action: text("action").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  changedColumns: text("changed_columns"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const contractors = pgTable("contractors", {
  id: serial("id").primaryKey(),
  contractorName: text("contractor_name").notNull(),
  contractorCode: text("contractor_code").notNull().unique(),
  gender: text("gender").default("Male").notNull(),
  aadhaarNumber: text("aadhaar_number"),
  contactNumber: text("contact_number").notNull(),
  email: text("email"),
  address: text("address"),
  companyName: text("company_name").notNull(),
  startDate: text("start_date").notNull(),
  expiryDate: text("expiry_date").notNull(),
  biometricId: text("biometric_id"),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });
export const insertDesignationSchema = createInsertSchema(designations).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true });
export const insertSiteSchema = createInsertSchema(sites).omit({ id: true, createdAt: true });
export const insertBuildingSchema = createInsertSchema(buildings).omit({ id: true, createdAt: true });
export const insertFloorSchema = createInsertSchema(floors).omit({ id: true, createdAt: true });
export const insertZoneSchema = createInsertSchema(zones).omit({ id: true, createdAt: true });
export const insertDoorSchema = createInsertSchema(doors).omit({ id: true, createdAt: true });
export const insertDeviceSchema = createInsertSchema(devices).omit({ id: true, createdAt: true });
export const insertPersonSchema = createInsertSchema(people).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCredentialSchema = createInsertSchema(credentials).omit({ id: true, createdAt: true });
export const insertAccessCardSchema = createInsertSchema(accessCards).omit({ id: true, createdAt: true });
export const insertShiftSchema = createInsertSchema(shifts).omit({ id: true, createdAt: true });
export const insertShiftAssignmentSchema = createInsertSchema(shiftAssignments).omit({ id: true, createdAt: true });
export const insertHolidaySchema = createInsertSchema(holidays).omit({ id: true, createdAt: true });
export const insertAccessLevelSchema = createInsertSchema(accessLevels).omit({ id: true, createdAt: true });
export const insertAccessRuleSchema = createInsertSchema(accessRules).omit({ id: true, createdAt: true });
export const insertPersonAccessSchema = createInsertSchema(personAccess).omit({ id: true, createdAt: true });
export const insertDoorAccessLevelSchema = createInsertSchema(doorAccessLevels).omit({ id: true, createdAt: true });
export const insertVisitorSchema = createInsertSchema(visitors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVisitSchema = createInsertSchema(visits).omit({ id: true, createdAt: true });
export const insertVisitAccessSchema = createInsertSchema(visitAccess).omit({ id: true, createdAt: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, createdAt: true });
export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({ id: true, createdAt: true });
export const insertAccessEventSchema = createInsertSchema(accessEvents).omit({ id: true, createdAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true });
export const insertExceptionSchema = createInsertSchema(exceptions).omit({ id: true, createdAt: true });
export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({ id: true, createdAt: true });
export const insertBlockUnblockLogSchema = createInsertSchema(blockUnblockLogs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMainGateLogSchema = createInsertSchema(mainGateLogs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCronMasterSchema = createInsertSchema(cronMaster).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDoorDeviceSchema = createInsertSchema(doorDevices).omit({ id: true, createdAt: true });
export const insertEmployeeDoorAssignmentSchema = createInsertSchema(employeeDoorAssignments).omit({ id: true, createdAt: true, updatedAt: true }).extend({ doorIds: z.array(z.number()) });
export const insertEmployeeActivityLogSchema = createInsertSchema(employeeActivityLogs, { logDate: z.any(), onlyDate: z.any() }).omit({ id: true });
export const insertDailyAttendanceSummarySchema = createInsertSchema(dailyAttendanceSummary, { workDate: z.any() }).omit({ id: true });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true })
export const insertMenuMasterSchema = createInsertSchema(menuMaster).omit({ id: true }).extend({ parentId: z.number().nullable().optional().default(0), sortOrder: z.number().optional().default(0), isActive: z.boolean().optional().default(true), });
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ id: true }).extend({ view: z.boolean().default(true), add: z.boolean().default(false), edit: z.boolean().default(false), delete: z.boolean().default(false), export: z.boolean().default(false), print: z.boolean().default(false), });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertContractorSchema = createInsertSchema(contractors)
  .omit({ id: true, createdAt: true })
  .extend({
    contactNumber: z.string().optional().nullable(),
    aadhaarNumber: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    biometricId: z.string().optional().nullable(),
  });


export type Contractor = typeof contractors.$inferSelect;
export type InsertContractor = z.infer<typeof insertContractorSchema>;
export type MenuMaster = typeof menuMaster.$inferSelect;
export type InsertMenuMaster = z.infer<typeof insertMenuMasterSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type EmployeeActivityLog = typeof employeeActivityLogs.$inferSelect;
export type InsertEmployeeActivityLog = z.infer<typeof insertEmployeeActivityLogSchema>;
export type DailyAttendanceSummary = typeof dailyAttendanceSummary.$inferSelect;
export type InsertDailyAttendanceSummary = z.infer<typeof insertDailyAttendanceSummarySchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Designation = typeof designations.$inferSelect;
export type InsertDesignation = z.infer<typeof insertDesignationSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Site = typeof sites.$inferSelect;
export type InsertSite = z.infer<typeof insertSiteSchema>;
export type Building = typeof buildings.$inferSelect;
export type InsertBuilding = z.infer<typeof insertBuildingSchema>;
export type Floor = typeof floors.$inferSelect;
export type InsertFloor = z.infer<typeof insertFloorSchema>;
export type Zone = typeof zones.$inferSelect;
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type Door = typeof doors.$inferSelect;
export type InsertDoor = z.infer<typeof insertDoorSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Person = typeof people.$inferSelect;
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type Credential = typeof credentials.$inferSelect;
export type InsertCredential = z.infer<typeof insertCredentialSchema>;
export type AccessCard = typeof accessCards.$inferSelect;
export type InsertAccessCard = z.infer<typeof insertAccessCardSchema>;
export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type ShiftAssignment = typeof shiftAssignments.$inferSelect;
export type InsertShiftAssignment = z.infer<typeof insertShiftAssignmentSchema>;
export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type AccessLevel = typeof accessLevels.$inferSelect;
export type InsertAccessLevel = z.infer<typeof insertAccessLevelSchema>;
export type AccessRule = typeof accessRules.$inferSelect;
export type InsertAccessRule = z.infer<typeof insertAccessRuleSchema>;
export type PersonAccess = typeof personAccess.$inferSelect;
export type InsertPersonAccess = z.infer<typeof insertPersonAccessSchema>;
export type DoorAccessLevel = typeof doorAccessLevels.$inferSelect;
export type InsertDoorAccessLevel = z.infer<typeof insertDoorAccessLevelSchema>;
export type Visitor = typeof visitors.$inferSelect;
export type InsertVisitor = z.infer<typeof insertVisitorSchema>;
export type Visit = typeof visits.$inferSelect;
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type VisitAccess = typeof visitAccess.$inferSelect;
export type InsertVisitAccess = z.infer<typeof insertVisitAccessSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;
export type AccessEvent = typeof accessEvents.$inferSelect;
export type InsertAccessEvent = z.infer<typeof insertAccessEventSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Exception = typeof exceptions.$inferSelect;
export type InsertException = z.infer<typeof insertExceptionSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type BlockUnblockLog = typeof blockUnblockLogs.$inferSelect;
export type InsertBlockUnblockLog = z.infer<typeof insertBlockUnblockLogSchema>;
export type MainGateLog = typeof mainGateLogs.$inferSelect;
export type InsertMainGateLog = z.infer<typeof insertMainGateLogSchema>;
export type CronMaster = typeof cronMaster.$inferSelect;
export type InsertCronMaster = z.infer<typeof insertCronMasterSchema>;
export type DoorDevice = typeof doorDevices.$inferSelect;
export type InsertDoorDevice = z.infer<typeof insertDoorDeviceSchema>;
export type EmployeeDoorAssignment = typeof employeeDoorAssignments.$inferSelect;
export type InsertEmployeeDoorAssignment = z.infer<typeof insertEmployeeDoorAssignmentSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
