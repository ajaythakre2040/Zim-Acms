export * from "./models/auth";

import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, varchar, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./models/auth";

// ==================== USER PROFILES (RBAC) ====================
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  role: text("role", { enum: ["super_admin", "staff", "security_admin", "worker", "employee", "reception", "gate_security"] }).notNull().default("employee"),
  permissions: jsonb("permissions").$type<Record<string, boolean>>().default({}),
  employeeId: varchar("employee_id"),
  department: text("department"),
  designation: text("designation"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==================== COMPANIES ====================
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

// ==================== DEPARTMENTS ====================
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique(),
  description: text("description"),
  managerId: integer("manager_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== DESIGNATIONS ====================
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

// ==================== CATEGORIES ====================
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== VENDORS ====================
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

// ==================== SITES ====================
export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  msId: integer("ms_id").unique(),
  name: text("name").notNull(),
  code: text("code").unique(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  timezone: text("timezone").default("Asia/Kolkata"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== BUILDINGS ====================
export const buildings = pgTable("buildings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  locationId: integer("location_id").notNull(),
  address: text("address"),
  floorCount: integer("floor_count").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== FLOORS ====================
export const floors = pgTable("floors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  floorNumber: integer("floor_number").notNull(),
  buildingId: integer("building_id").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== ZONES ====================
export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
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

// ==================== DOORS ====================
export const doors = pgTable("doors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
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
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== DEVICES ====================
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  msId: integer("ms_id").unique(), // MS SQL DeviceId ke liye
  name: text("name").notNull(), // DeviceName yahan aayega
  deviceDirection: text("device_direction"),
  serialNumber: text("serial_number"),
  opstamp: text("opstamp"),
  lastPing: timestamp("last_ping"),
  lastreset: timestamp("last_reset"),
  activationCode: text("activation_code"),
  isAttendanceDevice: integer("is_attendance_device"),
  deviceType: text("device_type").default("reader"),
  locationId: integer("location_id"), // LocationId yahan aayega
  // Baki fields
  zoneId: integer("zone_id"),
  ipAddress: text("ip_address"),
  lastHeartbeat: timestamp("last_heartbeat"),
  status: text("status").default("offline"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
// export const devices = pgTable("devices", {
//   id: serial("id").primaryKey(),
//   name: text("name").notNull(),
//   code: text("code"),
//   deviceType: text("device_type", { enum: ["reader", "turnstile", "gate", "barrier", "controller", "biometric"] }).default("reader"),
//   locationId: integer("location_id"),
//   zoneId: integer("zone_id"),
//   ipAddress: text("ip_address"),
//   macAddress: text("mac_address"),
//   serialNumber: text("serial_number"),
//   status: text("status", { enum: ["online", "offline", "error", "maintenance"] }).default("offline"),
//   lastHeartbeat: timestamp("last_heartbeat"),
//   firmwareVersion: text("firmware_version"),
//   isActive: boolean("is_active").default(true),
//   createdAt: timestamp("created_at").defaultNow(),
// });
export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id"), 
  msId: integer("ms_id"),
  employeeName: text("employee_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  employeeCode: text("employee_code"),
  departmentId: integer("department_id"),
  designationId: integer("designation_id"),
  companyId: integer("company_id"),
  locationId: integer("location_id"),
  photoUrl: text("photo_url"),
  personType: text("person_type", { enum: ["employee", "contractor", "visitor", "intern", "consultant"] }).default("employee"),
  riskTier: integer("risk_tier").default(1),
  status: text("status", { enum: ["active", "inactive", "suspended"] }).default("active"),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
// ==================== PEOPLE ====================


// ==================== CREDENTIALS ====================
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

// ==================== ACCESS CARDS ====================
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

// ==================== SHIFTS ====================
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  breakDuration: integer("break_duration").default(0),
  gracePeriod: integer("grace_period").default(15),
  isNightShift: boolean("is_night_shift").default(false),
  halfDayHours: real("half_day_hours").default(4),
  fullDayHours: real("full_day_hours").default(8),
  lateThresholdMins: integer("late_threshold_mins").default(15),
  earlyOutThresholdMins: integer("early_out_threshold_mins").default(15),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== SHIFT ASSIGNMENTS ====================
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

// ==================== HOLIDAYS ====================
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

// ==================== ACCESS LEVELS ====================
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

// ==================== ACCESS RULES ====================
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

// ==================== PERSON ACCESS (Level assignments) ====================
export const personAccess = pgTable("person_access", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull(),
  accessLevelId: integer("access_level_id").notNull(),
  validFrom: text("valid_from"),
  validTo: text("valid_to"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== DOOR ACCESS LEVELS ====================
export const doorAccessLevels = pgTable("door_access_levels", {
  id: serial("id").primaryKey(),
  doorId: integer("door_id").notNull(),
  accessLevelId: integer("access_level_id").notNull(),
  timeSchedule: jsonb("time_schedule").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== VISITORS ====================
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

// ==================== VISITS ====================
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

// ==================== VISIT ACCESS (door permissions) ====================
export const visitAccess = pgTable("visit_access", {
  id: serial("id").primaryKey(),
  visitId: integer("visit_id").notNull(),
  doorId: integer("door_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== ATTENDANCE ====================
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

// ==================== ACCESS LOGS ====================
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

// ==================== ACCESS EVENTS (detailed) ====================
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

// ==================== ALERTS ====================
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
});

// ==================== EXCEPTIONS ====================
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

// ==================== SYSTEM SETTINGS ====================
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value"),
  description: text("description"),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== RELATIONS ====================
export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
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
  // category: one(categories, { fields: [people.categoryId], references: [categories.id] }),
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

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  deviceIds: jsonb("device_ids").$type<number[]>().default([]), // Devices store karne ke liye
  isActive: boolean("is_active").default(true),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const blockUnblockLogs = pgTable("user_block_unblock_logs", {
  id: serial("id").primaryKey(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  deviceId: integer("device_id").notNull(),
  type: text("type", { enum: ["block", "unblock"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
export const employeeRoles = pgTable("employee_roles", {
  id: serial("id").primaryKey(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  roleId: integer("role_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
// ==================== INSERT SCHEMAS ====================
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
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true });
export const insertBlockUnblockLogSchema = createInsertSchema(blockUnblockLogs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmployeeRoleSchema = createInsertSchema(employeeRoles).omit({ id: true, createdAt: true, updatedAt: true });


// ==================== TYPES ====================
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
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type BlockUnblockLog = typeof blockUnblockLogs.$inferSelect;
export type InsertBlockUnblockLog = z.infer<typeof insertBlockUnblockLogSchema>;
export type EmployeeRole = typeof employeeRoles.$inferSelect;
export type InsertEmployeeRole = z.infer<typeof insertEmployeeRoleSchema>;


