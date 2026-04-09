import {
  userProfiles, companies, departments, designations, categories, vendors,
  sites, buildings, floors, zones, doors, devices, people, credentials,
  accessCards, shifts, shiftAssignments, holidays, accessLevels, accessRules,
  personAccess, visitors, visits, attendance, accessLogs, alerts, exceptions,
  systemSettings, InsertRole, Role, roles, EmployeeRole,
  InsertEmployeeRole,
  employeeRoles,
  type User, type UpsertUser,
  type UserProfile, type InsertUserProfile,
  type Company, type InsertCompany,
  type Department, type InsertDepartment,
  type Designation, type InsertDesignation,
  type Category, type InsertCategory,
  type Vendor, type InsertVendor,
  type Site, type InsertSite,
  type Building, type InsertBuilding,
  type Floor, type InsertFloor,
  type Zone, type InsertZone,
  type Door, type InsertDoor,
  type Device, type InsertDevice,
  type Person, type InsertPerson,
  type Credential, type InsertCredential,
  type AccessCard, type InsertAccessCard,
  type Shift, type InsertShift,
  type ShiftAssignment, type InsertShiftAssignment,
  type Holiday, type InsertHoliday,
  type AccessLevel, type InsertAccessLevel,
  type AccessRule, type InsertAccessRule,
  type PersonAccess, type InsertPersonAccess,
  type Visitor, type InsertVisitor,
  type Visit, type InsertVisit,
  type Attendance, type InsertAttendance,
  type AccessLog, type InsertAccessLog,
  type Alert, type InsertAlert,
  type Exception, type InsertException,
  type SystemSetting, type InsertSystemSetting,
  blockUnblockLogs,
  CronMaster,
  cronMaster,
  InsertCronMaster,
  doorDevices,
  InsertDoorDevice,
  DoorDevice,
  BlockUnblockLog,
  InsertBlockUnblockLog,
} from "@shared/schema";
import * as schema from "@shared/schema";
import { db, dbMsSql, mssqlPool, mapMsSqlToSchema } from "./db";
import { eq, desc, or, and, ne, count, sql, ilike, notInArray, inArray } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";
import { DeviceAdapter, HolidayAdapter, PersonAdapter, SiteAdapter } from "@shared/mssql_schema";
import { SHIFT_START, SHIFT_END, EXPECTED_WORKING_HRS, ATTENDANCE_STATUS, ALERT_TEMPLATES, ACCESS_RULES } from './constant';
import { esslService } from "./essl-service";
import { MAIN_GATE_SYNC } from "./constant";
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserProfiles(): Promise<UserProfile[]>;
  getUserProfile(id: number): Promise<UserProfile | undefined>;
  getUserProfileByUserId(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(id: number, profile: Partial<InsertUserProfile>): Promise<UserProfile>;
  getCompanies(): Promise<Company[]>;
  createCompany(data: InsertCompany): Promise<Company>;
  updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company>;
  deleteCompany(id: number): Promise<void>;
  getDepartments(): Promise<Department[]>;
  createDepartment(data: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, data: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;
  getDesignations(): Promise<Designation[]>;
  createDesignation(data: InsertDesignation): Promise<Designation>;
  updateDesignation(id: number, data: Partial<InsertDesignation>): Promise<Designation>;
  deleteDesignation(id: number): Promise<void>;
  getCategories(): Promise<Category[]>;
  createCategory(data: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  getVendors(): Promise<Vendor[]>;
  createVendor(data: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, data: Partial<InsertVendor>): Promise<Vendor>;
  deleteVendor(id: number): Promise<void>;
  getSites(): Promise<Site[]>;
  createSite(data: InsertSite): Promise<Site>;
  updateSite(id: number, data: Partial<InsertSite>): Promise<Site>;
  deleteSite(id: number): Promise<void>;
  getBuildings(locationId?: number): Promise<Building[]>;
  createBuilding(data: InsertBuilding): Promise<Building>;
  updateBuilding(id: number, data: Partial<InsertBuilding>): Promise<Building>;
  deleteBuilding(id: number): Promise<void>;
  getFloors(buildingId?: number): Promise<Floor[]>;
  createFloor(data: InsertFloor): Promise<Floor>;
  updateFloor(id: number, data: Partial<InsertFloor>): Promise<Floor>;
  deleteFloor(id: number): Promise<void>;
  getZones(locationId?: number, buildingId?: number): Promise<Zone[]>;
  createZone(data: InsertZone): Promise<Zone>;
  updateZone(id: number, data: Partial<InsertZone>): Promise<Zone>;
  deleteZone(id: number): Promise<void>;
  getDoors(): Promise<Door[]>;
  createDoor(data: InsertDoor): Promise<Door>;
  updateDoor(id: number, data: Partial<InsertDoor>): Promise<Door>;
  deleteDoor(id: number): Promise<void>;
  getDevices(): Promise<Device[]>;
  createDevice(data: InsertDevice): Promise<Device>;
  updateDevice(id: number, data: Partial<InsertDevice>): Promise<Device>;
  deleteDevice(id: number): Promise<void>;
  getPeople(search?: string): Promise<Person[]>;
  getPerson(id: number): Promise<Person | undefined>;
  createPerson(data: InsertPerson): Promise<Person>;
  updatePerson(id: number, data: Partial<InsertPerson>): Promise<Person>;
  deletePerson(id: number): Promise<void>;
  getCredentials(personId?: number): Promise<Credential[]>;
  createCredential(data: InsertCredential): Promise<Credential>;
  updateCredential(id: number, data: Partial<InsertCredential>): Promise<Credential>;
  deleteCredential(id: number): Promise<void>;
  getAccessCards(): Promise<AccessCard[]>;
  createAccessCard(data: InsertAccessCard): Promise<AccessCard>;
  updateAccessCard(id: number, data: Partial<InsertAccessCard>): Promise<AccessCard>;
  deleteAccessCard(id: number): Promise<void>;
  getShifts(): Promise<Shift[]>;
  createShift(data: InsertShift): Promise<Shift>;
  updateShift(id: number, data: Partial<InsertShift>): Promise<Shift>;
  deleteShift(id: number): Promise<void>;
  getShiftAssignments(personId?: number): Promise<ShiftAssignment[]>;
  createShiftAssignment(data: InsertShiftAssignment): Promise<ShiftAssignment>;
  updateShiftAssignment(id: number, data: Partial<InsertShiftAssignment>): Promise<ShiftAssignment>;
  deleteShiftAssignment(id: number): Promise<void>;
  getHolidays(): Promise<Holiday[]>;
  createHoliday(data: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, data: Partial<InsertHoliday>): Promise<Holiday>;
  deleteHoliday(id: number): Promise<void>;
  getAccessLevels(): Promise<AccessLevel[]>;
  createAccessLevel(data: InsertAccessLevel): Promise<AccessLevel>;
  updateAccessLevel(id: number, data: Partial<InsertAccessLevel>): Promise<AccessLevel>;
  deleteAccessLevel(id: number): Promise<void>;
  getAccessRules(): Promise<AccessRule[]>;
  createAccessRule(data: InsertAccessRule): Promise<AccessRule>;
  updateAccessRule(id: number, data: Partial<InsertAccessRule>): Promise<AccessRule>;
  deleteAccessRule(id: number): Promise<void>;
  getPersonAccess(personId?: number): Promise<PersonAccess[]>;
  createPersonAccess(data: InsertPersonAccess): Promise<PersonAccess>;
  deletePersonAccess(id: number): Promise<void>;
  getVisitors(): Promise<Visitor[]>;
  getVisitor(id: number): Promise<Visitor | undefined>;
  createVisitor(data: InsertVisitor): Promise<Visitor>;
  updateVisitor(id: number, data: Partial<InsertVisitor>): Promise<Visitor>;
  deleteVisitor(id: number): Promise<void>;
  getVisits(status?: string): Promise<Visit[]>;
  createVisit(data: InsertVisit): Promise<Visit>;
  updateVisit(id: number, data: Partial<InsertVisit>): Promise<Visit>;
  getAttendance(date?: string, locationId?: number, personId?: number): Promise<Attendance[]>;
  createAttendance(data: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, data: Partial<InsertAttendance>): Promise<Attendance>;
  getAccessLogs(limit?: number, locationId?: number): Promise<AccessLog[]>;
  createAccessLog(data: InsertAccessLog): Promise<AccessLog>;
  getAlerts(isResolved?: boolean): Promise<Alert[]>;
  createAlert(data: InsertAlert): Promise<Alert>;
  updateAlert(id: number, data: Partial<InsertAlert>): Promise<Alert>;
  getExceptions(status?: string): Promise<Exception[]>;
  createException(data: InsertException): Promise<Exception>;
  updateException(id: number, data: Partial<InsertException>): Promise<Exception>;
  getSystemSettings(): Promise<SystemSetting[]>;
  upsertSystemSetting(data: InsertSystemSetting): Promise<SystemSetting>;
  getAttendanceReport(filters: { dateFrom?: string; dateTo?: string; status?: string; departmentId?: number; personId?: number; locationId?: number }): Promise<any[]>;
  getAccessLogReport(filters: { dateFrom?: string; dateTo?: string; eventType?: string; personId?: number; locationId?: number; doorId?: number }): Promise<any[]>;
  getVisitorReport(filters: { dateFrom?: string; dateTo?: string; status?: string }): Promise<any[]>;
  getEmployeeSummaryReport(filters: { departmentId?: number; status?: string; personType?: string }): Promise<any[]>;
  getRoles(): Promise<Role[]>;
  getRole(id: number): Promise<Role | undefined>;
  createRole(data: InsertRole): Promise<Role>;
  updateRole(id: number, data: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: number): Promise<void>;
  getEmployeeRoles(): Promise<EmployeeRole[]>;
  getEmployeeRole(id: number): Promise<EmployeeRole | undefined>;
  createEmployeeRole(data: InsertEmployeeRole): Promise<EmployeeRole>;
  updateEmployeeRole(id: number, data: Partial<InsertEmployeeRole>): Promise<EmployeeRole>;
  deleteEmployeeRole(id: number): Promise<void>;
  getDashboardStats(): Promise<object>;
  getLockoutEligibleDoors(search?: string): Promise<any[]>;
  updateDoorLockoutStatusBulk(doorIds: number[], status: boolean): Promise<any[]>;
  executeEmergencybulkUnblock(userId: string | number, userName: string): Promise<any>; }
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    return authStorage.getUser(id);
  }
  async upsertUser(user: UpsertUser): Promise<User> {
    return authStorage.upsertUser(user);
  }
  async getUserProfiles(): Promise<UserProfile[]> {
    return await db.select().from(userProfiles);
  }
  async getUserProfile(id: number): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, id));
    return profile;
  }
  async getUserProfileByUserId(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }
  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }
  async updateUserProfile(id: number, profile: Partial<InsertUserProfile>): Promise<UserProfile> {
    const [updated] = await db.update(userProfiles).set({ ...profile, updatedAt: new Date() }).where(eq(userProfiles.id, id)).returning();
    return updated;
  }
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }
  async createCompany(data: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(data).returning();
    return created;
  }
  async updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company> {
    const [updated] = await db.update(companies).set(data).where(eq(companies.id, id)).returning();
    return updated;
  }
  async deleteCompany(id: number): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments);
  }
  async createDepartment(data: InsertDepartment): Promise<Department> {
    const [created] = await db.insert(departments).values(data).returning();
    return created;
  }
  async updateDepartment(id: number, data: Partial<InsertDepartment>): Promise<Department> {
    const [updated] = await db.update(departments).set(data).where(eq(departments.id, id)).returning();
    return updated;
  }
  async deleteDepartment(id: number): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }
  async getDesignations(): Promise<Designation[]> {
    return await db.select().from(designations);
  }
  async createDesignation(data: InsertDesignation): Promise<Designation> {
    const [created] = await db.insert(designations).values(data).returning();
    return created;
  }
  async updateDesignation(id: number, data: Partial<InsertDesignation>): Promise<Designation> {
    const [updated] = await db.update(designations).set(data).where(eq(designations.id, id)).returning();
    return updated;
  }
  async deleteDesignation(id: number): Promise<void> {
    await db.delete(designations).where(eq(designations.id, id));
  }
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }
  async createCategory(data: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(data).returning();
    return created;
  }
  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category> {
    const [updated] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return updated;
  }
  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }
  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors);
  }
  async createVendor(data: InsertVendor): Promise<Vendor> {
    const [created] = await db.insert(vendors).values(data).returning();
    return created;
  }
  async updateVendor(id: number, data: Partial<InsertVendor>): Promise<Vendor> {
    const [updated] = await db.update(vendors).set(data).where(eq(vendors.id, id)).returning();
    return updated;
  }
  async deleteVendor(id: number): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
  }
  async getSites(): Promise<Site[]> {
    const [pgData, msDataRaw] = await Promise.all([
      db.select().from(sites),
      dbMsSql.select().from({ dbName: 'Locations' }).execute()
    ]);
    const msIds = new Set();
    const currentSites = [...pgData];
    for (const msRow of (msDataRaw || [])) {
      const mapped = SiteAdapter.toPostgres(msRow);
      msIds.add(mapped.msId);
      const exists = currentSites.find(s => s.msId === mapped.msId);
      if (mapped.msId && !exists) {
        try {
          const [newRec] = await db.insert(sites).values({
            msId: mapped.msId,
            name: mapped.name,
            code: mapped.code,
            timezone: "Asia/Kolkata",
            isActive: true,
            createdAt: new Date(),
          }).returning();
          currentSites.push(newRec);
        } catch (e) { }
      }
    }
    for (const pgRow of currentSites) {
      if (pgRow.msId && !msIds.has(pgRow.msId)) {
        try {
          await db.delete(sites).where(eq(sites.msId, pgRow.msId));
        } catch (e) { }
      }
    }
    return currentSites;
  }
  async createSite(data: InsertSite): Promise<Site> {
    // 1. Validation & Duplicate Name Check
    if (data.name) {
      const [existingName] = await db
        .select()
        .from(sites)
        .where(eq(sites.name, data.name));

      if (existingName) {
        throw new Error(`Site name '${data.name}' already exists.`);
      }
    }

    // 2. Duplicate Code Check (Mandatory for Unique Constraint)
    if (data.code) {
      const [existingCode] = await db
        .select()
        .from(sites)
        .where(eq(sites.code, data.code));

      if (existingCode) {
        throw new Error(`Site code '${data.code}' already exists.`);
      }
    }

    // 3. PostgreSQL mein Insert karein
    const [created] = await db.insert(sites).values(data).returning();

    // 4. MSSQL Synchronization (Optional Sync)
    try {
      const msData = SiteAdapter.toMsSql(created);
      await dbMsSql.insert({ dbName: 'Locations' }).values({
        Code: msData.Code,
        Description: msData.Description
      });
      console.log(`[SYNC SUCCESS] Site ${created.code} synced to MSSQL.`);
    } catch (e) {
      // Sync fail hone par main operation (PG Insert) ko mat rokiye
      console.error("[MSSQL Sync Error]:", e);
    }

    return created;
  }
  async updateSite(id: number, data: Partial<InsertSite>): Promise<Site> {
    // 1. Update ke waqt Name check (current ID ko chhod kar)
    if (data.name) {
      const [existingName] = await db
        .select()
        .from(sites)
        .where(and(eq(sites.name, data.name), ne(sites.id, id)));

      if (existingName) {
        throw new Error(`Site name '${data.name}' already exists.`);
      }
    }

    // 2. Update ke waqt Code check (current ID ko chhod kar)
    if (data.code) {
      const [existingCode] = await db
        .select()
        .from(sites)
        .where(and(eq(sites.code, data.code), ne(sites.id, id)));

      if (existingCode) {
        throw new Error(`Site code '${data.code}' already exists.`);
      }
    }

    // 3. Destructure karke system fields ko remove karein taaki update crash na ho
    const { id: _, msId: __, createdAt: ___, ...updateData } = data as any;

    // 4. PostgreSQL mein Update karein
    const [updated] = await db
      .update(sites)
      .set(updateData)
      .where(eq(sites.id, id))
      .returning();

    if (!updated) {
      throw new Error("Site not found");
    }

    return updated;
  }
  async deleteSite(id: number): Promise<void> {
    const [record] = await db.select().from(sites).where(eq(sites.id, id));
    if (record) {
      if (record.msId) {
        try {
          await dbMsSql.delete({ dbName: 'Locations', pk: 'Id' })
            .where({ value: record.msId });
        } catch (e) { }
      }
      await db.delete(sites).where(eq(sites.id, id));
    }
  }
  async getBuildings(locationId?: number): Promise<Building[]> {
    if (locationId) {
      return await db.select().from(buildings).where(eq(buildings.locationId, locationId));
    }
    return await db.select().from(buildings);
  }
  async createBuilding(data: InsertBuilding): Promise<Building> {
    // 1. Duplicate Name Check
    if (data.name) {
      const [existingName] = await db
        .select()
        .from(buildings)
        .where(eq(buildings.name, data.name));
      if (existingName) {
        throw new Error(`Building name '${data.name}' already exists.`);
      }
    }

    // 2. Duplicate Code Check
    if (data.code) {
      const [existingCode] = await db
        .select()
        .from(buildings)
        .where(eq(buildings.code, data.code));
      if (existingCode) {
        throw new Error(`Building code '${data.code}' already exists.`);
      }
    }

    const [created] = await db.insert(buildings).values(data).returning();
    return created;
  }
  async updateBuilding(id: number, data: Partial<InsertBuilding>): Promise<Building> {
    // 1. Update ke waqt Name check (Current ID ko chhod kar)
    if (data.name) {
      const [existing] = await db
        .select()
        .from(buildings)
        .where(and(eq(buildings.name, data.name), ne(buildings.id, id)));
      if (existing) {
        throw new Error(`Building name '${data.name}' already exists.`);
      }
    }

    // 2. Update ke waqt Code check
    if (data.code) {
      const [existingCode] = await db
        .select()
        .from(buildings)
        .where(and(eq(buildings.code, data.code), ne(buildings.id, id)));
      if (existingCode) {
        throw new Error(`Building code '${data.code}' already exists.`);
      }
    }

    const [updated] = await db
      .update(buildings)
      .set(data)
      .where(eq(buildings.id, id))
      .returning();

    if (!updated) throw new Error("Building not found");
    return updated;
  }
  async deleteBuilding(id: number): Promise<void> {
    await db.delete(buildings).where(eq(buildings.id, id));
  }
  async getFloors(buildingId?: number): Promise<Floor[]> {
    if (buildingId) {
      return await db.select().from(floors).where(eq(floors.buildingId, buildingId));
    }
    return await db.select().from(floors);
  }
  async createFloor(data: InsertFloor): Promise<Floor> {
    const [created] = await db.insert(floors).values(data).returning();
    return created;
  }
  async updateFloor(id: number, data: Partial<InsertFloor>): Promise<Floor> {
    const [updated] = await db.update(floors).set(data).where(eq(floors.id, id)).returning();
    return updated;
  }
  async deleteFloor(id: number): Promise<void> {
    await db.delete(floors).where(eq(floors.id, id));
  }
  async getZones(locationId?: number, buildingId?: number): Promise<Zone[]> {
    const conditions = [];
    if (locationId) conditions.push(eq(zones.locationId, locationId));
    if (buildingId) conditions.push(eq(zones.buildingId, buildingId));
    if (conditions.length > 0) {
      return await db.select().from(zones).where(and(...conditions));
    }
    return await db.select().from(zones);
  }
  // server/storage.ts

  async createZone(data: InsertZone): Promise<Zone> {
    // 1. Type Guard: Ensure 'name' exists to avoid TS error 2769
    if (!data.code) {
      throw new Error("Zone name is required.");
    }

    // 2. Duplicate Check: Check if Zone name already exists
    const [existing] = await db
      .select()
      .from(zones)
      .where(eq(zones.code, data.code));

    if (existing) {
      // 'already exists' use karna zaroori hai handleDbError trigger karne ke liye
      throw new Error(`Zone code '${data.code}' already exists.`);
    }

    // 3. Safe Insert
    const [created] = await db.insert(zones).values(data).returning();
    return created;
  }
  async updateZone(id: number, data: Partial<InsertZone>): Promise<Zone> {
    // 1. Agar name update ho raha hai, toh check karein ki wo duplicate na ho
    if (data.name) {
      const [existing] = await db
        .select()
        .from(zones)
        .where(
          and(
            eq(zones.name, data.name),
            ne(zones.id, id) // Apne aap ko chod kar baaki zones check karein
          )
        );

      if (existing) {
        // 'already exists' likhna handleDbError ke liye zaroori hai
        throw new Error(`Zone name '${data.name}' already exists.`);
      }
    }

    // 2. Data update karein
    const [updated] = await db
      .update(zones)
      .set(data)
      .where(eq(zones.id, id))
      .returning();

    if (!updated) {
      throw new Error("Zone not found");
    }

    return updated;
  }
  async deleteZone(id: number): Promise<void> {
    await db.delete(zones).where(eq(zones.id, id));
  }
  async getDoors(): Promise<any[]> {
    try {
      const [allDoors, allDoorDevices, allDevices] = await Promise.all([
        db.select().from(doors),
        db.select().from(doorDevices),
        db.select().from(devices)
      ]);
      return allDoors.map((door) => {
        const mapping = allDoorDevices.find((md) => md.doorId === door.id);
        const resolveDevices = (ids: any[] | null) => {
          if (!ids || !Array.isArray(ids)) return [];
          return ids.map(id => {
            const dev = allDevices.find(d => Number(d.msId) === Number(id));
            return dev ? { id: dev.id, msId: dev.msId, name: dev.name } : null;
          }).filter((d): d is { id: number; msId: number; name: string } => d !== null);
        };
        const inDevices = resolveDevices(mapping?.inDeviceIds || []);
        const outDevices = resolveDevices(mapping?.outDeviceIds || []);
        return {
          ...door,
          inDevices,
          outDevices,
          inCount: inDevices.length,
          outCount: outDevices.length
        };
      });
    } catch (error) {
      console.error("getDoors MS_ID Sync Error:", error);
      return [];
    }
  }
  async createDoor(data: InsertDoor): Promise<Door> {
    // 1. Check for Duplicate Name
    if (data.name) {
      const [existingName] = await db
        .select()
        .from(doors)
        .where(eq(doors.name, data.name));
      if (existingName) {
        throw new Error(`Door name '${data.name}' already exists.`);
      }
    }

    // 2. Check for Duplicate Code (Kyunki code unique hai)
    if (data.code) {
      const [existingCode] = await db
        .select()
        .from(doors)
        .where(eq(doors.code, data.code));
      if (existingCode) {
        throw new Error(`Door code '${data.code}' already exists.`);
      }
    }

    const [created] = await db.insert(doors).values(data).returning();
    return created;
  }
  async updateDoor(id: number, data: Partial<InsertDoor>): Promise<Door> {
    // 1. Update ke waqt Name check karein (current ID ko chhod kar)
    if (data.name) {
      const [existing] = await db
        .select()
        .from(doors)
        .where(and(eq(doors.name, data.name), ne(doors.id, id)));
      if (existing) {
        throw new Error(`Door name '${data.name}' already exists.`);
      }
    }

    // 2. Update ke waqt Code check karein
    if (data.code) {
      const [existingCode] = await db
        .select()
        .from(doors)
        .where(and(eq(doors.code, data.code), ne(doors.id, id)));
      if (existingCode) {
        throw new Error(`Door code '${data.code}' already exists.`);
      }
    }

    const [updated] = await db
      .update(doors)
      .set(data)
      .where(eq(doors.id, id))
      .returning();

    if (!updated) throw new Error("Door not found");
    return updated;
  }
  async deleteDoor(id: number): Promise<void> {
    await db.delete(doors).where(eq(doors.id, id));
  }
  async getDevices(): Promise<any[]> {
    try {
      const msDataRaw = await dbMsSql.select().from({ dbName: 'Devices' }).execute();
      if (!msDataRaw || msDataRaw.length === 0) return [];
      const currentTime = new Date();
      const THRESHOLD_MINUTES = 1;
      const formattedDevices = msDataRaw.map((d: any) => {
        const lPing = d.LastPing ? new Date(d.LastPing) : null;
        let calculatedStatus = "offline";
        if (lPing) {
          const diffInMinutes = (currentTime.getTime() - lPing.getTime()) / 60000;
          if (diffInMinutes <= THRESHOLD_MINUTES) {
            calculatedStatus = "online";
          }
        }
        return {
          msId: d.DeviceId || d.DeviceID,
          name: d.DeviceName || "Unnamed Device",
          deviceDirection: d.DeviceDirection || null,
          serialNumber: d.SerialNumber || d.serialno,
          opstamp: d.OpStamp ? String(d.OpStamp) : null,
          lastPing: lPing,
          lastreset: d.LastReset ? new Date(d.LastReset) : null,
          activationCode: d.ActivationCode || "",
          isAttendanceDevice: d.IsAttendanceDevice ? 1 : 0,
          deviceType: String(d.DeviceType || "-").toLowerCase(),
          locationId: d.LocationId || null,
          ipAddress: d.IpAddress || "",
          lastHeartbeat: lPing,
          status: calculatedStatus,
          isActive: true
        };
      });
      for (const dev of formattedDevices) {
        await db.insert(devices)
          .values(dev)
          .onConflictDoUpdate({
            target: devices.msId,
            set: {
              name: dev.name,
              deviceDirection: dev.deviceDirection,
              serialNumber: dev.serialNumber,
              opstamp: dev.opstamp,
              lastPing: dev.lastPing,
              lastreset: dev.lastreset,
              activationCode: dev.activationCode,
              isAttendanceDevice: dev.isAttendanceDevice,
              deviceType: dev.deviceType,
              locationId: dev.locationId,
              ipAddress: dev.ipAddress,
              lastHeartbeat: dev.lastHeartbeat,
              status: dev.status,
              isActive: true
            }
          });
      }
      const currentMsIds = formattedDevices.map(d => d.msId as number);
      if (currentMsIds.length > 0) {
        await db.delete(devices).where(notInArray(devices.msId, currentMsIds));
      }
      return formattedDevices;
    } catch (error) {
      console.error("Device Sync Error:", error);
      return [];
    }
  }
  async createDevice(data: InsertDevice): Promise<Device> {
    let mssqlId: number | null = null;
    try {
      const msRes = await dbMsSql.insert({ dbName: 'Devices' })
        .values(DeviceAdapter.toMsSql(data));
      if (msRes.recordset && msRes.recordset.length > 0) {
        mssqlId = msRes.recordset[0].DeviceId || msRes.recordset[0].Id;
      }
    } catch (e) {
      console.error("MS SQL Device Sync Error:", e);
    }
    const [created] = await db.insert(devices)
      .values({
        ...data,
        msId: mssqlId,
        isActive: true
      })
      .returning();
    return created;
  }
  async updateDevice(id: number, data: Partial<InsertDevice>): Promise<Device> {
    const [record] = await db.select()
      .from(devices)
      .where(or(eq(devices.id, id), eq(devices.msId, id)));
    if (!record) {
      throw new Error("Device not found in Postgres.");
    }
    const [updated] = await db.update(devices)
      .set(data)
      .where(eq(devices.id, record.id))
      .returning();
    if (updated.msId) {
      try {
        await dbMsSql.update({ dbName: 'Devices', pk: 'DeviceId' })
          .set(DeviceAdapter.toMsSql(data))
          .where({ value: updated.msId });
      } catch (e) {
        console.error("MS SQL Device Update Error", e);
      }
    }
    return updated;
  }
  async deleteDevice(msId: number): Promise<void> {
    const [record] = await db.select()
      .from(devices)
      .where(eq(devices.msId, msId));
    if (record) {
      try {
        await dbMsSql.delete({ dbName: 'Devices', pk: 'DeviceId' })
          .where({ value: msId });
      } catch (e) {
        console.error("MS SQL Sync Delete Error:", e);
      }
      await db.delete(devices).where(eq(devices.msId, msId));
    }
  }
  async getPeople(search?: string): Promise<Person[]> {
    const [pgDataRaw, msDataRaw] = await Promise.all([
      db.select({
        person: {
          ...people,
          // 🔥 FIX: lastSeenTime ko string mein convert kar rahe hain taaki 'Z' na aaye
          lastSeenTime: sql<string>`TO_CHAR(${people.lastSeenTime}, 'YYYY-MM-DD"T"HH24:MI:SS')`
        },
        roleName: roles.name,
        departmentName: departments.name,
        lastPunchDoorName: doors.name,
       
      })
        .from(people)
        .leftJoin(roles, eq(people.roleId, roles.id))
        .leftJoin(departments, eq(people.departmentId, departments.id))
        .leftJoin(doors, eq(people.lastPunchDoorId, doors.id)),

      dbMsSql.select().from({ dbName: 'Employees' }).execute()
    ]);
    const msIds = new Set();
    // 2. Rule ID to Rule Name Mapping (Using your Constants)
    // Inverse mapping: ID se Key nikalne ke liye
    const ruleIdToName = Object.fromEntries(
      Object.entries(ACCESS_RULES).map(([key, value]) => [value, key])
    );

    const currentPgData = pgDataRaw.map(row => {
      const p = row.person;
      return {
        ...p,
        roleName: row.roleName || null,
        departmentName: row.departmentName || "N/A",
        lastPunchDoorName: row.lastPunchDoorName || "No Door",
        // Rule Name mapping from constant file
        ruleName: p.ruleid !== null ? (ruleIdToName[p.ruleid] || "UNKNOWN_RULE") : "NO_ROLE"
      };
    });
    for (const msRow of (msDataRaw || [])) {
      const mapped = PersonAdapter.toPostgres(msRow);
      msIds.add(mapped.msId);
      const exists = currentPgData.find(p => p.msId === mapped.msId);
      if (mapped.msId && !exists) {
        try {
          const [newRec] = await db.insert(people).values({
            msId: mapped.msId,
            employeeName: mapped.employeeName ?? "Unknown",
            employeeCode: mapped.employeeCode,
            locationId: mapped.locationId,
            address: mapped.address,
            overtimeEligible: mapped.overtimeEligible,
            personType: "employee",
            status: "active",
            sourceSystem: "mssql_bio",
            externalId: mapped.externalId,
            updatedAt: new Date(),
            createdAt: new Date(),
          }).returning();
          currentPgData.push({
            ...newRec,
            roleName: null,
            departmentName: "N/A",
            lastPunchDoorName: "No Door",
            ruleName: "NO_ROLE"
          });
          if (newRec && newRec.employeeCode) {
            this.executeHardwareSync(newRec.employeeCode, null, true);
          }
        } catch (e) { console.error("Sync insert error"); }
      }
    }
    for (const pgRow of currentPgData) {
      if (pgRow.msId && !msIds.has(pgRow.msId)) {
        try {
          await db.delete(people).where(eq(people.msId, pgRow.msId));
        } catch (e) { }
      }
    }
    // 5. Filtering & Sorting
    let results = currentPgData;
    if (search) {
      const term = search.toLowerCase();
      results = results.filter(p =>
        p.employeeName.toLowerCase().includes(term) ||
        (p.employeeCode && p.employeeCode.toLowerCase().includes(term)) ||
        (p.roleName && p.roleName.toLowerCase().includes(term)) ||
        (p.departmentName && p.departmentName.toLowerCase().includes(term)) ||
        (p.ruleName && p.ruleName.toLowerCase().includes(term))
      );
    }
    // Sorting: Newest first
    results.sort((a, b) => (b.id || 0) - (a.id || 0));    return Array.from(
      new Map(results.map(p => [`${p.msId || p.employeeCode || p.id}`, p])).values()
    );
  }
  // async getPeople(search?: string): Promise<Person[]> {
  //   const [pgDataRaw, msDataRaw] = await Promise.all([
  //     db.select({
  //       person: people,
  //       roleName: roles.name,
  //     })
  //       .from(people)
  //       .leftJoin(roles, eq(people.roleId, roles.id)),
  //     dbMsSql.select().from({ dbName: 'Employees' }).execute()
  //   ]);
  //   const msIds = new Set();
  //   const currentPgData = pgDataRaw.map(row => ({
  //     ...row.person,
  //     roleName: row.roleName || null
  //   }));
  //   for (const msRow of (msDataRaw || [])) {
  //     const mapped = PersonAdapter.toPostgres(msRow);
  //     msIds.add(mapped.msId);
  //     const exists = currentPgData.find(p => p.msId === mapped.msId);
  //     if (mapped.msId && !exists) {
  //       try {
  //         const [newRec] = await db.insert(people).values({
  //           msId: mapped.msId,
  //           employeeName: mapped.employeeName ?? "Unknown",
  //           employeeCode: mapped.employeeCode,
  //           locationId: mapped.locationId,
  //           address: mapped.address,
  //           overtimeEligible: mapped.overtimeEligible,
  //           personType: "employee",
  //           status: "active",
  //           sourceSystem: "mssql_bio",
  //           externalId: mapped.externalId,
  //           updatedAt: new Date(),
  //           createdAt: new Date(),
  //         }).returning();
  //         currentPgData.push({ ...newRec, roleName: null });
  //         if (newRec && newRec.employeeCode) {
  //           this.executeHardwareSync(newRec.employeeCode, null, true);
  //         }
  //       } catch (e) { }
  //     }
  //   }
  //   for (const pgRow of currentPgData) {
  //     if (pgRow.msId && !msIds.has(pgRow.msId)) {
  //       try {
  //         await db.delete(people).where(eq(people.msId, pgRow.msId));
  //       } catch (e) { }
  //     }
  //   }
  //   let results = currentPgData.map(p => ({
  //     ...p,
  //     roleId: p.roleName ? p.roleId : null
  //   }));
  //   if (search) {
  //     const term = search.toLowerCase();
  //     results = results.filter(p =>
  //       p.employeeName.toLowerCase().includes(term) ||
  //       (p.employeeCode && p.employeeCode.toLowerCase().includes(term)) ||
  //       (p.roleName && p.roleName.toLowerCase().includes(term))
  //     );
  //   }
  //   const sortedResults = results.sort((a, b) => (b.id || 0) - (a.id || 0));
  //   return Array.from(
  //     new Map(results.map(p => [`${p.msId || p.employeeCode || p.id}`, p])).values()
  //   );
  // }
  async getPerson(id: number): Promise<Person | undefined> {
    const [person] = await db.select().from(people).where(eq(people.id, id));
    return person;
  }
  async createPerson(data: InsertPerson): Promise<Person> {
    let mssqlId: number | null = null;
    try {
      const msRes = await dbMsSql.insert({ dbName: 'Employees' })
        .values(PersonAdapter.toMsSql(data));
      const rawId = msRes.recordset?.[0]?.EmployeeId || msRes.recordset?.[0]?.Id;
      mssqlId = rawId ? Number(rawId) : null;
    } catch (e) {
      console.error("MS SQL Person Sync Error:", e);
    }
    const [created] = await db.insert(people).values({
      ...data,
      msId: mssqlId,
      updatedAt: new Date()
    }).returning();
    return created;
  }
  async updatePerson(id: number, data: Partial<InsertPerson>): Promise<Person> {
    const [updated] = await db.update(people)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(people.id, id))
      .returning();
    if (!updated) throw new Error("Person not found");
    if (updated.msId) {
      try {
        await dbMsSql.update({ dbName: 'Employees', pk: 'EmployeeId' })
          .set(PersonAdapter.toMsSql(data))
          .where({ value: updated.msId });
      } catch (e) {
        console.error("MS SQL Person Update Error:", e);
      }
    }
    return updated;
  }
  async deletePerson(id: number): Promise<void> {
    const [record] = await db.select().from(people).where(eq(people.id, id));
    if (record) {
      if (record.msId) {
        try {
          await dbMsSql.delete({ dbName: 'Employees', pk: 'EmployeeId' })
            .where({ value: record.msId });
        } catch (e) {
          console.error("MS SQL Person Delete Error:", e);
        }
      }
      await db.delete(people).where(eq(people.id, id));
    }
  }
  async getCredentials(personId?: number): Promise<Credential[]> {
    if (personId) {
      return await db.select().from(credentials).where(eq(credentials.personId, personId));
    }
    return await db.select().from(credentials);
  }
  async createCredential(data: InsertCredential): Promise<Credential> {
    const [created] = await db.insert(credentials).values(data).returning();
    return created;
  }
  async updateCredential(id: number, data: Partial<InsertCredential>): Promise<Credential> {
    const [updated] = await db.update(credentials).set(data).where(eq(credentials.id, id)).returning();
    return updated;
  }
  async deleteCredential(id: number): Promise<void> {
    await db.delete(credentials).where(eq(credentials.id, id));
  }
  async getAccessCards(): Promise<AccessCard[]> {
    return await db.select().from(accessCards);
  }
  async createAccessCard(data: InsertAccessCard): Promise<AccessCard> {
    const [created] = await db.insert(accessCards).values(data).returning();
    return created;
  }
  async updateAccessCard(id: number, data: Partial<InsertAccessCard>): Promise<AccessCard> {
    const [updated] = await db.update(accessCards).set(data).where(eq(accessCards.id, id)).returning();
    return updated;
  }
  async deleteAccessCard(id: number): Promise<void> {
    await db.delete(accessCards).where(eq(accessCards.id, id));
  }
  async getShifts(): Promise<Shift[]> {
    return await db.select().from(shifts);
  }
  // async createShift(data: InsertShift): Promise<Shift> {
  //   const [created] = await db.insert(shifts).values(data).returning();
  //   return created;
  // }
  // server/storage.ts
  // server/storage.ts

  async createShift(data: InsertShift): Promise<Shift> {
    // Option 1: Type Guard (Sabse Safe aur Professional)
    if (!data.code) {
      throw new Error("Shift code is required.");
    }

    const [existing] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.code, data.code)); // Ab data.code pakka string hai

    if (existing) {
      throw new Error(`Shift code '${data.code}' already exists.`);
    }

    const [created] = await db.insert(shifts).values(data).returning();
    return created;
  }
  async updateShift(id: number, data: Partial<InsertShift>): Promise<Shift> {
    // 1. Agar 'code' update ho raha hai, toh check karein ki wo duplicate na ho
    if (data.code) {
      const [existing] = await db
        .select()
        .from(shifts)
        .where(
          and(
            eq(shifts.code, data.code),
            ne(shifts.id, id) // Apne aap ko chod kar baaki records check karein
          )
        );

      if (existing) {
        throw new Error(`Shift code '${data.code}' already exists.`);
      }
    }

    // 2. Data update karein
    const [updated] = await db
      .update(shifts)
      .set(data)
      .where(eq(shifts.id, id))
      .returning();

    if (!updated) {
      throw new Error("Shift not found");
    }

    return updated;
  }
  async deleteShift(id: number): Promise<void> {
    await db.delete(shifts).where(eq(shifts.id, id));
  }
  async getShiftAssignments(personId?: number): Promise<ShiftAssignment[]> {
    if (personId) {
      return await db.select().from(shiftAssignments).where(eq(shiftAssignments.personId, personId));
    }
    return await db.select().from(shiftAssignments);
  }
  async createShiftAssignment(data: InsertShiftAssignment): Promise<ShiftAssignment> {
    const [created] = await db.insert(shiftAssignments).values(data as any).returning();
    return created;
  }
  async updateShiftAssignment(id: number, data: Partial<InsertShiftAssignment>): Promise<ShiftAssignment> {
    const [updated] = await db.update(shiftAssignments).set(data as any).where(eq(shiftAssignments.id, id)).returning();
    return updated;
  }
  async deleteShiftAssignment(id: number): Promise<void> {
    await db.delete(shiftAssignments).where(eq(shiftAssignments.id, id));
  }
  async getHolidays(): Promise<Holiday[]> {
    const [pgData, msDataRaw] = await Promise.all([
      db.select().from(holidays),
      dbMsSql.select().from({ dbName: 'Holidays' }).execute()
    ]);
    for (const msRow of (msDataRaw || [])) {
      const msId = msRow.Id || msRow.id;
      if (!pgData.find(p => p.msId === msId)) {
        const [newRec] = await db.insert(holidays).values({
          name: msRow.Name || msRow.name,
          date: msRow.Date ? new Date(msRow.Date).toISOString().split('T')[0] : "",
          msId: msId,
          holidayType: "company"
        }).returning();
        pgData.push(newRec);
      }
    }
    return Array.from(new Map(pgData.map(h => [`${h.name}-${h.date}`, h])).values());
  }
  async createHoliday(data: InsertHoliday): Promise<Holiday> {
    let mssqlId: number | null = null;
    try {
      const msRes = await dbMsSql.insert({ dbName: 'Holidays' }).values(HolidayAdapter.toMsSql(data));
      mssqlId = msRes.recordset?.[0]?.Id || msRes.recordset?.[0]?.id || null;
    } catch (e) {
      console.error("MS SQL Sync Error:", e);
    }
    const [created] = await db.insert(holidays).values({ ...data, msId: mssqlId }).returning();
    return created;
  }
  async updateHoliday(id: number, data: Partial<InsertHoliday>): Promise<Holiday> {
    const [updated] = await db.update(holidays)
      .set(data)
      .where(eq(holidays.id, id))
      .returning();
    if (!updated) {
      throw new Error("This record is not synced with Postgres yet. Please recreate it.");
    }
    if (updated.msId) {
      try {
        await dbMsSql.update({ dbName: 'Holidays' })
          .set(HolidayAdapter.toMsSql(data))
          .where({ value: updated.msId });
      } catch (e) { console.error("MS SQL Sync Error", e); }
    }
    return updated;
  }
  async deleteHoliday(id: number): Promise<void> {
    const [record] = await db.select().from(holidays).where(eq(holidays.id, id));
    if (record) {
      if (record.msId) {
        await dbMsSql.delete({ dbName: 'Holidays' }).where({ value: record.msId });
      }
      await db.delete(holidays).where(eq(holidays.id, id));
    }
  }
  async getAccessLevels(): Promise<AccessLevel[]> {
    return await db.select().from(accessLevels);
  }
  async createAccessLevel(data: InsertAccessLevel): Promise<AccessLevel> {
    const [created] = await db.insert(accessLevels).values(data).returning();
    return created;
  }
  async updateAccessLevel(id: number, data: Partial<InsertAccessLevel>): Promise<AccessLevel> {
    const [updated] = await db.update(accessLevels).set(data).where(eq(accessLevels.id, id)).returning();
    return updated;
  }
  async deleteAccessLevel(id: number): Promise<void> {
    await db.delete(accessLevels).where(eq(accessLevels.id, id));
  }
  async getAccessRules(): Promise<AccessRule[]> {
    return await db.select().from(accessRules);
  }
  async createAccessRule(data: InsertAccessRule): Promise<AccessRule> {
    const [created] = await db.insert(accessRules).values(data as any).returning();
    return created;
  }
  async updateAccessRule(id: number, data: Partial<InsertAccessRule>): Promise<AccessRule> {
    const [updated] = await db.update(accessRules).set(data as any).where(eq(accessRules.id, id)).returning();
    return updated;
  }
  async deleteAccessRule(id: number): Promise<void> {
    await db.delete(accessRules).where(eq(accessRules.id, id));
  }
  async getPersonAccess(personId?: number): Promise<PersonAccess[]> {
    if (personId) {
      return await db.select().from(personAccess).where(eq(personAccess.personId, personId));
    }
    return await db.select().from(personAccess);
  }
  async createPersonAccess(data: InsertPersonAccess): Promise<PersonAccess> {
    const [created] = await db.insert(personAccess).values(data).returning();
    return created;
  }
  async deletePersonAccess(id: number): Promise<void> {
    await db.delete(personAccess).where(eq(personAccess.id, id));
  }
  async getVisitors(): Promise<Visitor[]> {
    return await db.select().from(visitors);
  }
  async getVisitor(id: number): Promise<Visitor | undefined> {
    const [visitor] = await db.select().from(visitors).where(eq(visitors.id, id));
    return visitor;
  }
  async createVisitor(data: InsertVisitor): Promise<Visitor> {
    const [created] = await db.insert(visitors).values(data).returning();
    return created;
  }
  async updateVisitor(id: number, data: Partial<InsertVisitor>): Promise<Visitor> {
    const [updated] = await db.update(visitors).set({ ...data, updatedAt: new Date() }).where(eq(visitors.id, id)).returning();
    return updated;
  }
  async deleteVisitor(id: number): Promise<void> {
    await db.delete(visitors).where(eq(visitors.id, id));
  }
  async getVisits(status?: string): Promise<Visit[]> {
    if (status) {
      return await db.select().from(visits).where(eq(visits.status, status as any)).orderBy(desc(visits.createdAt));
    }
    return await db.select().from(visits).orderBy(desc(visits.createdAt));
  }
  async createVisit(data: InsertVisit): Promise<Visit> {
    const [created] = await db.insert(visits).values(data).returning();
    return created;
  }
  async updateVisit(id: number, data: Partial<InsertVisit>): Promise<Visit> {
    const [updated] = await db.update(visits).set(data).where(eq(visits.id, id)).returning();
    return updated;
  }
  async getAttendance(date?: string, locationId?: number, personId?: number): Promise<any[]> {
    const [msLogs, msEmployees] = await Promise.all([
      dbMsSql.select().from({ dbName: 'DeviceLogs' }).execute(),
      dbMsSql.select().from({ dbName: 'Employees' }).execute()
    ]);
    const targetDate = date || new Date().toISOString().split('T')[0];
    console.log("Backend filtering for exact date:", targetDate);
    const dailyLogsMap = new Map<string, Date[]>();
    (msLogs || []).forEach(log => {
      const rawVal = log.LogDate || log.logdate;
      if (!rawVal) return;
      const d = new Date(rawVal);
      const logYear = d.getFullYear();
      const logMonth = String(d.getMonth() + 1).padStart(2, '0');
      const logDay = String(d.getDate()).padStart(2, '0');
      const logDateStr = `${logYear}-${logMonth}-${logDay}`;
      if (logDateStr === targetDate) {
        const empId = String(log.EmployeeId || log.employeeid).trim();
        if (!dailyLogsMap.has(empId)) dailyLogsMap.set(empId, []);
        dailyLogsMap.get(empId)!.push(d);
      }
    });
    const attendanceList = msEmployees.map(emp => {
      const empId = String(emp.EmployeeId).trim();
      const logs = dailyLogsMap.get(empId) || [];
      const sorted = logs.sort((a, b) => a.getTime() - b.getTime());
      const clockIn = sorted.length > 0 ? sorted[0].toISOString() : null;
      const clockOut = sorted.length > 1 ? sorted[sorted.length - 1].toISOString() : null;
      let status = "absent";
      if (logs.length > 0) status = "present";
      return {
        id: emp.EmployeeId,
        personId: emp.EmployeeId,
        locationId: emp.locationId || emp.locationId,
        employeeCode: emp.EmployeeCode,
        firstName: emp.EmployeeName || `${emp.FirstName || ''} ${emp.LastName || ''}`.trim() || "Unknown",
        date: targetDate,
        clockIn,
        clockOut,
        status: status,
        workingHours: logs.length > 1 ? ((sorted[sorted.length - 1].getTime() - sorted[0].getTime()) / 3600000).toFixed(2) : "0.00"
      };
    });
    return attendanceList.filter(row => {
      const matchesPerson = !personId || Number(row.personId) === Number(personId);
      const matchesSite = !locationId || Number(row.locationId) === Number(locationId);
      return matchesPerson && matchesSite;
    });
  }
  async createAttendance(data: InsertAttendance): Promise<Attendance> {
    const [created] = await db.insert(attendance).values(data).returning();
    return created;
  }
  async updateAttendance(id: number, data: Partial<InsertAttendance>): Promise<Attendance> {
    const [updated] = await db.update(attendance).set(data).where(eq(attendance.id, id)).returning();
    return updated;
  }
  async getAccessLogs(limit?: number, locationId?: number): Promise<AccessLog[]> {
    if (locationId) {
      return await db.select().from(accessLogs).where(eq(accessLogs.locationId, locationId)).orderBy(desc(accessLogs.timestamp)).limit(limit || 100);
    }
    return await db.select().from(accessLogs).orderBy(desc(accessLogs.timestamp)).limit(limit || 100);
  }
  async createAccessLog(data: InsertAccessLog): Promise<AccessLog> {
    const [created] = await db.insert(accessLogs).values(data).returning();
    return created;
  }
  async getAlerts(isResolved?: boolean): Promise<Alert[]> {
    if (isResolved !== undefined) {
      return await db.select().from(alerts).where(eq(alerts.isResolved, isResolved)).orderBy(desc(alerts.createdAt));
    }
    return await db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }
  async createAlert(data: InsertAlert): Promise<Alert> {
    const [created] = await db.insert(alerts).values(data).returning();
    return created;
  }
  async updateAlert(id: number, data: Partial<InsertAlert>): Promise<Alert> {
    const [updated] = await db.update(alerts).set(data).where(eq(alerts.id, id)).returning();
    return updated;
  }
  async getExceptions(status?: string): Promise<Exception[]> {
    if (status) {
      return await db.select().from(exceptions).where(eq(exceptions.approvalStatus, status as any)).orderBy(desc(exceptions.createdAt));
    }
    return await db.select().from(exceptions).orderBy(desc(exceptions.createdAt));
  }
  async createException(data: InsertException): Promise<Exception> {
    const [created] = await db.insert(exceptions).values(data).returning();
    return created;
  }
  async updateException(id: number, data: Partial<InsertException>): Promise<Exception> {
    const [updated] = await db.update(exceptions).set(data).where(eq(exceptions.id, id)).returning();
    return updated;
  }
  async getSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings);
  }
  async upsertSystemSetting(data: InsertSystemSetting): Promise<SystemSetting> {
    const [setting] = await db
      .insert(systemSettings)
      .values(data)
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return setting;
  }
  async getAttendanceReport(filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    deviceId?: string | number;
    personId?: string | number;
  }): Promise<any[]> {
    const rawLogs = await dbMsSql.select().from({ dbName: 'DeviceLogs' }).execute();
    const msSqlEmployees = await dbMsSql.select().from({ dbName: 'Employees' }).execute();
    const msSqlDevices = await dbMsSql.select().from({ dbName: 'devices' }).execute();
    const attendanceMap = new Map<string, { time: Date, devId: string }[]>();
    rawLogs.forEach((log: any) => {
      const empCode = String(log.EmployeeCode || log.employeecode || "").trim();
      const timestamp = new Date(log.LogDate || log.logdate);
      if (isNaN(timestamp.getTime())) return;
      const dateStr = timestamp.toISOString().split('T')[0];
      const key = `${empCode}_${dateStr}`;
      if (!attendanceMap.has(key)) attendanceMap.set(key, []);
      attendanceMap.get(key)!.push({
        time: timestamp,
        devId: String(log.deviceid || log.DeviceId || "").trim()
      });
    });
    const reportDates: string[] = [];
    let startDate = filters.dateFrom ? new Date(filters.dateFrom) : new Date();
    const endDate = filters.dateTo ? new Date(filters.dateTo) : new Date();
    let tempDate = new Date(startDate);
    while (tempDate <= endDate) {
      reportDates.push(tempDate.toISOString().split('T')[0]);
      tempDate.setDate(tempDate.getDate() + 1);
    }
    const finalReport: any[] = [];
    msSqlEmployees.forEach((emp: any) => {
      const empCode = String(emp.EmployeeCode).trim();
      if (filters.personId && filters.personId !== "all" && empCode !== String(filters.personId)) return;
      reportDates.forEach((dateStr) => {
        const key = `${empCode}_${dateStr}`;
        const logs = attendanceMap.get(key) || [];
        const dayOfWeek = new Date(dateStr).getDay();
        let rowData: any = {
          id: `${empCode}-${dateStr}`,
          employeeCode: empCode,
          firstName: emp.EmployeeName || "Unknown",
          date: dateStr,
          clockIn: null,
          clockOut: null,
          workingHours: "0.00",
          lateByMins: 0,
          earlyByMins: 0,
          status: "",
          deviceId: "N/A",
          deviceName: "—"
        };
        if (logs.length === 0) {
          rowData.status = (dayOfWeek === 0) ? "weekly_off" : ATTENDANCE_STATUS.ABSENT;
        }
        else {
          const sortedLogs = logs.sort((a, b) => a.time.getTime() - b.time.getTime());
          const firstIn = sortedLogs[0];
          const lastOut = sortedLogs.length > 1 ? sortedLogs[sortedLogs.length - 1] : null;
          const isValidOut = lastOut && (lastOut.time.getTime() - firstIn.time.getTime()) > 60000;
          rowData.clockIn = firstIn.time.toISOString();
          rowData.deviceId = firstIn.devId;
          const deviceDetail = msSqlDevices.find(d => String(d.DeviceId || d.DeviceID) === firstIn.devId);
          rowData.deviceName = deviceDetail?.DeviceName || `Device ${firstIn.devId}`;
          if (!isValidOut) {
            rowData.status = ATTENDANCE_STATUS.SINGLE_PUNCH;
          }
          else {
            rowData.clockOut = lastOut!.time.toISOString();
            const workMs = lastOut!.time.getTime() - firstIn.time.getTime();
            rowData.workingHours = (workMs / 3600000).toFixed(2);
            const shiftStart = new Date(`${dateStr}T${SHIFT_START}`);
            const shiftEnd = new Date(`${dateStr}T${SHIFT_END}`);
            rowData.lateByMins = firstIn.time > shiftStart ? Math.round((firstIn.time.getTime() - shiftStart.getTime()) / 60000) : 0;
            rowData.earlyByMins = lastOut!.time < shiftEnd ? Math.round((shiftEnd.getTime() - lastOut!.time.getTime()) / 60000) : 0;
            if (parseFloat(rowData.workingHours) < (EXPECTED_WORKING_HRS / 2)) {
              rowData.status = ATTENDANCE_STATUS.HALF_DAY;
            } else if (rowData.lateByMins > 0 && rowData.earlyByMins > 0) {
              rowData.status = "late_early";
            } else if (rowData.lateByMins > 0) {
              rowData.status = ATTENDANCE_STATUS.LATE;
            } else if (rowData.earlyByMins > 0) {
              rowData.status = "early_going";
            } else {
              rowData.status = ATTENDANCE_STATUS.PRESENT;
            }
          }
        }
        finalReport.push(rowData);
      });
    });
    return finalReport.filter(row => {
      const matchesStatus = (!filters.status || filters.status === "all") ? true : row.status === filters.status;
      const matchesDevice = (!filters.deviceId || filters.deviceId === "all")
        ? true
        : (row.deviceId === String(filters.deviceId));
      return matchesStatus && matchesDevice;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }
  async getAccessLogReport(filters: any): Promise<any[]> {
    const conditions = [
      filters.dateFrom && sql`DATE(${accessLogs.timestamp}) >= ${filters.dateFrom}`,
      filters.dateTo && sql`DATE(${accessLogs.timestamp}) <= ${filters.dateTo}`,
      filters.eventType && eq(accessLogs.eventType, filters.eventType),
      filters.personId && eq(accessLogs.personId, filters.personId),
      filters.locationId && eq(accessLogs.locationId, filters.locationId),
      filters.doorId && eq(accessLogs.doorId, filters.doorId)
    ].filter(Boolean);
    const query = db
      .select({
        id: accessLogs.id,
        employeeName: people.employeeName,
        employeeCode: people.employeeCode,
        eventType: accessLogs.eventType,
        isAuthorized: accessLogs.isAuthorized,
        timestamp: accessLogs.timestamp,
        locationId: accessLogs.locationId
      })
      .from(accessLogs)
      .leftJoin(people, eq(accessLogs.personId, people.id))
      .orderBy(desc(accessLogs.timestamp));
    return conditions.length ? await query.where(and(...conditions)) : await query.limit(500);
  }
  async getVisitorReport(filters: { dateFrom?: string; dateTo?: string; status?: string }): Promise<any[]> {
    const conditions = [];
    if (filters.dateFrom) conditions.push(sql`DATE(${visits.createdAt}) >= ${filters.dateFrom}`);
    if (filters.dateTo) conditions.push(sql`DATE(${visits.createdAt}) <= ${filters.dateTo}`);
    if (filters.status) conditions.push(eq(visits.status, filters.status as any));
    const query = db
      .select({
        id: visits.id,
        visitorId: visits.visitorId,
        firstName: visitors.firstName,
        lastName: visitors.lastName,
        company: visitors.company,
        phone: visitors.phone,
        purpose: visits.purpose,
        status: visits.status,
        checkInAt: visits.checkInAt,
        checkOutAt: visits.checkOutAt,
        scheduledAt: visits.scheduledAt,
        locationId: visits.locationId,
      })
      .from(visits)
      .leftJoin(visitors, eq(visits.visitorId, visitors.id));
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(visits.createdAt));
    }
    return await query.orderBy(desc(visits.createdAt)).limit(500);
  }
  async getEmployeeSummaryReport(filters: { departmentId?: number; status?: string; personType?: string }): Promise<any[]> {
    const conditions = [
      filters.departmentId ? eq(people.departmentId, filters.departmentId) : undefined,
      filters.status ? eq(people.status, filters.status as any) : undefined,
      filters.personType ? eq(people.personType, filters.personType as any) : undefined
    ].filter(Boolean) as any[];
    const query = db
      .select({
        id: people.id,
        employeeName: people.employeeName,
        email: people.email,
        phone: people.phone,
        employeeCode: people.employeeCode,
        departmentId: people.departmentId,
        designationId: people.designationId,
        companyId: people.companyId,
        personType: people.personType,
        status: people.status,
        gender: people.gender,
        dateOfJoining: people.dateOfJoining,
        locationId: people.locationId,
      })
      .from(people)
      .orderBy(people.employeeName);
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query.limit(500);
  }
  async getDashboardStats(): Promise<object> {
    const today = new Date().toISOString().split("T")[0];
    const [peopleCount] = await db.select({ count: count() }).from(people);
    const [visitorsCount] = await db.select({ count: count() }).from(visitors);
    const [devicesCount] = await db.select({ count: count() }).from(devices);
    const [todayAttendance] = await db.select({ count: count() }).from(attendance).where(eq(attendance.date, today));
    const [alertsCount] = await db.select({ count: count() }).from(alerts).where(eq(alerts.isResolved, false));
    const [accessLogsCount] = await db.select({ count: count() }).from(accessLogs).where(sql`DATE(${accessLogs.timestamp}) = ${today}`);
    return {
      totalPeople: peopleCount.count,
      totalVisitors: visitorsCount.count,
      totalDevices: devicesCount.count,
      todayAttendance: todayAttendance.count,
      unresolvedAlerts: alertsCount.count,
      todayAccessLogs: accessLogsCount.count,
    };
  }
  async getRoles(): Promise<any[]> {
    // 1. Saare roles fetch karein
    const allRoles = await db.select().from(roles).orderBy(desc(roles.id));

    // 2. Postgres se saare doors fetch karein (Lookup ke liye)
    const allDoors = await db.select({
      id: doors.id,
      name: doors.name
    }).from(doors);

    // 3. Door ID -> Door Name ka ek map banayein
    const doorLookup = new Map<number, string>();
    allDoors.forEach(d => doorLookup.set(d.id, d.name));

    // 4. Roles ko map karke names attach karein
    return allRoles.map((role) => {
      const idsArray = Array.isArray(role.doorIds) ? role.doorIds : [];

      // Door IDs ko unke names mein convert karein
      const names = idsArray
        .map(id => doorLookup.get(Number(id)))
        .filter((name): name is string => Boolean(name));

      return {
        ...role,
        // Frontend compatibility ke liye string array bhej rahe hain
        doorIds: idsArray.map(id => String(id)),
        assignedDoorNames: names.length > 0 ? names.join(", ") : "No Doors Assigned"
      };
    });
  }
  async getRole(id: number): Promise<any | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    if (!role) return undefined;

    const idsArray = Array.isArray(role.doorIds) ? role.doorIds : [];

    // Doors table se names fetch karein
    const doorDetails = await db.select({ name: doors.name })
      .from(doors)
      .where(inArray(doors.id, idsArray.length > 0 ? idsArray : [-1]));

    return {
      ...role,
      assignedDoorNames: doorDetails.map(d => d.name).join(", ")
    };
  }
  async createRole(data: InsertRole): Promise<Role> {
    const [existing] = await db
      .select()
      .from(roles)
      .where(eq(roles.code, data.code));
    if (existing) {
      throw new Error(`Role code '${data.code}' already exists.`);
    }
    const [created] = await db.insert(roles).values(data).returning();
    return created;
  }
  async updateRole(id: number, data: Partial<InsertRole>): Promise<Role> {
    return await db.transaction(async (tx) => {
      // 1. Validation: Check if new role code already exists
      if (data.code) {
        const [existing] = await tx
          .select()
          .from(roles)
          .where(and(eq(roles.code, data.code), ne(roles.id, id)));
        if (existing) {
          throw new Error(`Role code '${data.code}' already exists.`);
        }
      }

      // 2. Update the Role
      const [updated] = await tx
        .update(roles)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(roles.id, id))
        .returning();

      if (!updated) {
        throw new Error("Role not found");
      }

      // 3. Find all employees who have this role
      const affectedEmployees = await tx
        .select()
        .from(employeeRoles)
        .where(eq(employeeRoles.roleId, id));

      // 4. Trigger Sync for each employee (Background)
      for (const emp of affectedEmployees) {
        // Hum await nahi kar rahe taaki API jaldi return ho jaye
        this.executeHardwareSync(emp.employeeCode, id).catch(err =>
          console.error(`Sync failed for ${emp.employeeCode}:`, err)
        );
      }

      return updated;
    });
  }
  // async updateRole(id: number, data: Partial<InsertRole>): Promise<Role> {
  //   return await db.transaction(async (tx) => {
  //     if (data.code) {
  //       const [existing] = await tx
  //         .select()
  //         .from(roles)
  //         .where(
  //           and(
  //             eq(roles.code, data.code),
  //             ne(roles.id, id)
  //           )
  //         );
  //       if (existing) {
  //         throw new Error(`Role code '${data.code}' already exists.`);
  //       }
  //     }
  //     const [updated] = await tx
  //       .update(roles)
  //       .set({
  //         ...data,
  //         updatedAt: new Date(),
  //       })
  //       .where(eq(roles.id, id))
  //       .returning();
  //     if (!updated) {
  //       throw new Error("Role not found");
  //     }
  //     const affectedEmployees = await tx
  //       .select()
  //       .from(employeeRoles)
  //       .where(eq(employeeRoles.roleId, id));
  //     for (const emp of affectedEmployees) {
  //       this.executeHardwareSync(emp.employeeCode, id);
  //     }
  //     return updated;
  //   });
  // }
  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }
  async getEmployeeRoles(): Promise<EmployeeRole[]> {
    return await db.select().from(employeeRoles);
  }
  async getEmployeeRole(id: number): Promise<EmployeeRole | undefined> {
    const [result] = await db
      .select()
      .from(employeeRoles)
      .where(eq(employeeRoles.id, id));
    return result;
  }
  // async createEmployeeRole(insertData: InsertEmployeeRole): Promise<EmployeeRole> {
  //   return await db.transaction(async (tx) => {
  //     await tx
  //       .delete(employeeRoles)
  //       .where(eq(employeeRoles.employeeCode, insertData.employeeCode));
  //     const [newMapping] = await tx
  //       .insert(employeeRoles)
  //       .values(insertData)
  //       .returning();
  //     if (newMapping) {
  //       await tx
  //         .update(people)
  //         .set({
  //           roleId: Number(newMapping.roleId),
  //           updatedAt: new Date()
  //         })
  //         .where(eq(people.employeeCode, newMapping.employeeCode));
  //       const roleForSync = Number(newMapping.roleId) === 0 ? null : Number(newMapping.roleId);
  //       this.executeHardwareSync(newMapping.employeeCode, roleForSync, false);
  //     }
  //     return newMapping;
  //   });
  // }
  async createEmployeeRole(insertData: InsertEmployeeRole): Promise<EmployeeRole> {
    return await db.transaction(async (tx) => {
      // 1. Purani mapping delete karein
      await tx
        .delete(employeeRoles)
        .where(eq(employeeRoles.employeeCode, insertData.employeeCode));

      // 2. Nayi role mapping insert karein
      const [newMapping] = await tx
        .insert(employeeRoles)
        .values(insertData)
        .returning();

      if (newMapping) {
        // 3. Employee ka current status check karein (People Table se)
        const [empData] = await tx
          .select()
          .from(people)
          .where(eq(people.employeeCode, newMapping.employeeCode))
          .limit(1);

        if (empData) {
          // --- Nayi Requirement ka Logic ---
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          // Check karein kya aaj Main Gate entry hui hai?
          // Hum check kar rahe hain lastSeenTime aaj ka hai aur Zone 'IN' ya 'CABIN' hai
          const hasEnteredToday =
            empData.lastSeenTime &&
            new Date(empData.lastSeenTime) >= todayStart &&
            (empData.currentZone === 'IN' || empData.currentZone === 'CABIN');

          console.log(`[Role Assignment] Emp: ${empData.employeeCode} | HasEnteredToday: ${hasEnteredToday}`);

          // 4. Role Update karein People table mein
          await tx
            .update(people)
            .set({
              roleId: Number(newMapping.roleId),
              updatedAt: new Date()
            })
            .where(eq(people.employeeCode, newMapping.employeeCode));

          // 5. Hardware Sync Trigger
          // Agar aaj entry NAHI hui hai, toh hum 'null' role pass karenge sync mein 
          // taaki hardware manager use block kar de (Except Main Gate)
          const roleForSync = hasEnteredToday ? Number(newMapping.roleId) : null;

          console.log(`[Sync] Triggering Hardware Sync with RoleID: ${roleForSync}`);
          this.executeHardwareSync(newMapping.employeeCode, roleForSync, false);
        }
      }
      return newMapping;
    });
  }
  async updateEmployeeRole(id: number, data: Partial<InsertEmployeeRole>): Promise<EmployeeRole> {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(employeeRoles)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(employeeRoles.id, id))
        .returning();
      if (!updated) {
        throw new Error(`Employee Role assignment not found.`);
      }
      await tx
        .update(people)
        .set({
          roleId: Number(updated.roleId),
          updatedAt: new Date()
        })
        .where(eq(people.employeeCode, updated.employeeCode));
      this.executeHardwareSync(updated.employeeCode, Number(updated.roleId));
      return updated;
    });
  }
  async deleteEmployeeRole(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      const mapping = await this.getEmployeeRole(id);
      if (mapping) {
        await tx.delete(employeeRoles).where(eq(employeeRoles.id, id));
        await tx
          .update(people)
          .set({
            roleId: null,
            updatedAt: new Date()
          })
          .where(eq(people.employeeCode, mapping.employeeCode));
        this.executeHardwareSync(mapping.employeeCode, null, false);
      }
    });
  }
  async getRoleEligibleDevices(): Promise<any[]> {
    try {

      const msDataRaw = await dbMsSql.select().from({ dbName: 'Devices' }).execute();
      if (!msDataRaw || msDataRaw.length === 0) return [];


      const gateConfig = await db.query.cronMaster.findFirst({
        where: eq(cronMaster.code, MAIN_GATE_SYNC.CODE)
      });

      const whitelistedIds = new Set<number>();
      if (gateConfig?.doorId) {
        const mappings = await db.select().from(doorDevices)
          .where(eq(doorDevices.doorId, gateConfig.doorId))
          .execute();

        mappings.forEach(m => {

          [...(m.inDeviceIds || []), ...(m.outDeviceIds || [])].forEach(id => whitelistedIds.add(Number(id)));
        });
      }


      return msDataRaw
        .filter(d => !whitelistedIds.has(Number(d.DeviceId || d.DeviceID)))
        .map(d => ({
          msId: d.DeviceId || d.DeviceID,
          name: d.DeviceName || "Unnamed Device",
          serialNumber: d.SerialNumber || d.serialno,
          ipAddress: d.IpAddress || "",
          status: "online"
        }));

    } catch (error) {
      console.error("Error fetching role-eligible devices:", error);
      return [];
    }
  }
  async getCronMasters(): Promise<CronMaster[]> {
    return await db.select().from(cronMaster).orderBy(desc(cronMaster.createdAt));
  }
  async createCronMaster(data: InsertCronMaster): Promise<CronMaster> {
    const [newCron] = await db.insert(cronMaster).values(data).returning();
    return newCron;
  }
  async updateCronMaster(id: number, data: Partial<InsertCronMaster>): Promise<CronMaster> {
    const [updatedCron] = await db
      .update(cronMaster)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cronMaster.id, id))
      .returning();
    if (!updatedCron) throw new Error("Cron not found");
    return updatedCron;
  }
  async deleteCronMaster(id: number): Promise<void> {
    await db.delete(cronMaster).where(eq(cronMaster.id, id));
  }
  async getDoorDevices(): Promise<DoorDevice[]> {
    return await db.select().from(doorDevices).orderBy(desc(doorDevices.createdAt));
  }
  async createDoorDevice(data: InsertDoorDevice): Promise<DoorDevice> {
    const [newMapping] = await db.insert(doorDevices).values(data).returning();
    return newMapping;
  }
  async updateDoorDevice(id: number, data: Partial<InsertDoorDevice>): Promise<DoorDevice> {
    const [updatedMapping] = await db
      .update(doorDevices)
      .set({
        ...data,
        inDeviceIds: data.inDeviceIds,
        outDeviceIds: data.outDeviceIds,
      })
      .where(eq(doorDevices.id, id))
      .returning();
    if (!updatedMapping) throw new Error("Mapping not found");
    return updatedMapping;
  }
  async deleteDoorDevice(id: number): Promise<void> {
    await db.delete(doorDevices).where(eq(doorDevices.id, id));
  }
  async getBlockUnblockLogs(): Promise<any[]> {
    try {
      return await db
        .select({
          id: blockUnblockLogs.id,
          employeeCode: blockUnblockLogs.employeeCode,
          deviceId: blockUnblockLogs.deviceId,
          deviceName: devices.name,
          type: blockUnblockLogs.type,
          createdAt: blockUnblockLogs.createdAt,
          updatedAt: blockUnblockLogs.updatedAt,
        })
        .from(blockUnblockLogs)
        .leftJoin(devices, eq(blockUnblockLogs.deviceId, devices.msId))
        .orderBy(desc(blockUnblockLogs.createdAt));
    } catch (error) {
      console.error("Error fetching logs:", error);
      return [];
    }
  }
  async createBlockUnblockLog(data: InsertBlockUnblockLog): Promise<BlockUnblockLog> {
    const [log] = await db
      .insert(blockUnblockLogs)
      .values(data)
      .returning();
    return log;
  }
  async updateBlockUnblockLog(id: number, data: Partial<InsertBlockUnblockLog>): Promise<BlockUnblockLog> {
    const [updated] = await db
      .update(blockUnblockLogs)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(blockUnblockLogs.id, id))
      .returning();
    return updated;
  }
  async deleteBlockUnblockLog(id: number): Promise<void> {
    await db
      .delete(blockUnblockLogs)
      .where(eq(blockUnblockLogs.id, id));
  }
  async getBlockUnblockLogById(id: number): Promise<BlockUnblockLog | null> {
    const [log] = await db
      .select()
      .from(blockUnblockLogs)
      .where(eq(blockUnblockLogs.id, id))
      .limit(1);
    return log || null;
  } async getEmployeeDeviceStatuses(employeeCode: string) {
    // 1. Saare logs fetch karein, Latest (Naya) pehle aaye (desc order)
    const logs = await db
      .select()
      .from(blockUnblockLogs)
      .where(eq(blockUnblockLogs.employeeCode, employeeCode))
      // Yahan ensure karein ki 'updatedAt' ya 'createdAt' jo bhi naya hai wo use ho
      .orderBy(desc(blockUnblockLogs.updatedAt));

    // 2. Map ka use karke sirf Latest entry rakhein
    const latestMap = new Map<number, any>();

    for (const log of logs) {
      const dId = Number(log.deviceId);

      // Agar is DeviceID ki entry Map mein nahi hai, 
      // iska matlab yeh sabse latest entry hai (kyunki humne DESC order mein fetch kiya hai)
      if (!latestMap.has(dId)) {
        latestMap.set(dId, {
          id: log.id,
          deviceId: dId,
          type: log.type, // 'block' ya 'unblock'
          status: log.type === 'block' ? 'Blocked' : 'Active', // Readable status
          timestamp: log.updatedAt || log.createdAt
        });
      }
    }

    // 3. Map ko wapas array mein convert karke return karein
    return Array.from(latestMap.values());
  }
 
  async toggleEmployeeDeviceAccess(params: {
    employeeCode: string;
    deviceId: number;
    serialNumber: string;
    action: "block" | "unblock";
  }) {
    const { employeeCode, deviceId, serialNumber, action } = params;
    const [logEntry] = await db.insert(blockUnblockLogs).values({
      employeeCode,
      deviceId,
      type: action,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    esslService.syncUserBlockStatus(employeeCode, serialNumber, action === "block")
      .then(() => {
        console.log(`:white_check_mark: MS SQL Updated: ${employeeCode} on ${serialNumber}`);
      })
      .catch((err) => {
        console.error(`:x: MS SQL Sync Failed:`, err.message);
      });
    return logEntry;
  }

  async getLockoutEligibleDoors(search?: string): Promise<any[]> {
    const mainGateCode = MAIN_GATE_SYNC.CODE;


    const query = db.select()
      .from(doors)
      .where(
        and(
          ne(doors.code, mainGateCode),
          eq(doors.isActive, true),

          search ? ilike(doors.name, `%${search}%`) : undefined
        )
      )
      .orderBy(doors.name);

    return await query;
  }

  async updateDoorLockoutStatusBulk(doorIds: number[], status: boolean): Promise<any[]> {
    const mainGateCode = MAIN_GATE_SYNC.CODE;


    if (!doorIds || doorIds.length === 0) return [];

    const updatedDoors = await db.update(doors)
      .set({

        is_lockout_enabled: status,
        updatedAt: new Date()
      })
      .where(
        and(
          inArray(doors.id, doorIds.map(id => Number(id))),
          ne(doors.code, mainGateCode)
        )
      )
      .returning();


    return updatedDoors;
  }
  private async executeHardwareSync(employeeCode: string, roleId: number | null, blockAll: boolean = false) {
    try {
      // 1. Get Gateway Config
      const taskConfig = await db.query.cronMaster.findFirst({
        where: eq(cronMaster.code, MAIN_GATE_SYNC.CODE)
      });
      if (!taskConfig?.doorId) return;
      const activeGateId = taskConfig.doorId;

      // 2. Fetch data in parallel
      // roleId narrowing to avoid TS error 2345
      const validRoleId = (roleId && roleId > 0) ? roleId : null;

      const [role, msDevicesRaw, allDoorMappings] = await Promise.all([
        validRoleId ? this.getRole(validRoleId) : Promise.resolve(null),
        mssqlPool.request().query("SELECT DeviceID, SerialNumber FROM Devices")
          .then((res: any) => res.recordset as any[]),
        db.select().from(doorDevices).execute()
      ]);

      if (!msDevicesRaw) return;

      // 3. Build Mapping (Device -> Door)
      const deviceToDoorMap = new Map<number, number>();
      const mainGateWhitelistedIds = new Set<number>();

      allDoorMappings.forEach((mapping: any) => {
        const devIds = [
          ...(mapping.inDeviceIds || []),
          ...(mapping.outDeviceIds || [])
        ].map(Number);

        devIds.forEach(dId => {
          deviceToDoorMap.set(dId, mapping.doorId);
          if (mapping.doorId === activeGateId) {
            mainGateWhitelistedIds.add(dId);
          }
        });
      });

      // 4. Get Allowed Doors from Role
      const allowedDoorIds = new Set<number>(
        Array.isArray(role?.doorIds) ? (role.doorIds as number[]).map(Number) : []
      );

      // 5. Sync each Device
      const syncPromises = msDevicesRaw.map(async (msDevice: any) => {
        const msDeviceId = Number(msDevice.DeviceID || msDevice.DeviceId);
        const serialNumber = msDevice.SerialNumber?.trim();
        if (!serialNumber) return;

        const isMainGate = mainGateWhitelistedIds.has(msDeviceId);
        let shouldBlock: boolean;

        if (isMainGate) {
          shouldBlock = false; // Gateway hamesha open
        } else {
          const doorIdForThisDevice = deviceToDoorMap.get(msDeviceId);
          const isDoorAllowed = doorIdForThisDevice ? allowedDoorIds.has(doorIdForThisDevice) : false;
          shouldBlock = blockAll || !isDoorAllowed;
        }

        const actionType = shouldBlock ? "block" : "unblock";

        try {
          // ESSl Hardware Call
          await esslService.syncUserBlockStatus(employeeCode.trim(), serialNumber, shouldBlock);

          // Log the action
          await db.insert(blockUnblockLogs).values({
            employeeCode: employeeCode.trim(),
            deviceId: msDeviceId,
            type: actionType,
            updatedAt: new Date()
          }).catch(() => { });

          console.log(`[${isMainGate ? 'GATE' : 'SYNC'}] ${employeeCode} -> Device ${msDeviceId}: ${actionType}`);
        } catch (err: any) {
          console.error(`❌ Sync Failed: User ${employeeCode} on Device ${msDeviceId}: ${err.message}`);
        }
      });

      await Promise.all(syncPromises);
    } catch (error: any) {
      console.error("💀 Hardware Sync Engine Failure:", error.message);
    }
  }

  async executeEmergencybulkUnblock(userId: string, userName: string): Promise<any> {
    // 1. Data Fetch: Active users aur devices nikalna
    const allPeople = await db.select().from(people).where(eq(people.status, "active"));
    const allDevices = await db.select().from(devices).where(eq(devices.isActive, true));
    console.log(`Found People: ${allPeople.length}, Found Devices: ${allDevices.length}`);
    // 2. Task Queue Build
    const taskQueue = [];
    for (const person of allPeople) {
      if (!person.employeeCode) continue;
      for (const device of allDevices) {
        // Ensure deviceMsId exists and is a valid number
        if (device.serialNumber && device.msId !== null && device.msId !== undefined) {
          taskQueue.push({
            employeeCode: person.employeeCode,
            deviceMsId: Number(device.msId), // Explicitly convert to number for integer column
            serialNumber: device.serialNumber
          });
        }
      }
    }

    if (taskQueue.length === 0) {
      return { status: "Empty", processedCount: 0, message: "No active records found." };
    }

    // 3. PostgreSQL Alert Entry (Audit Trail)
    // createdBy: varchar hone ki wajah se UUID accept ho jayegi
    const [alertEntry] = await db.insert(alerts).values({
      alertType: "security",
      severity: "critical",
      title: "🚨 EMERGENCY BULK UNBLOCK",
      message: `System-wide unblock triggered by ${userName} for ${taskQueue.length} records.`,
      createdBy: userId,
      resolvedBy: userName,
      isRead: false,
      isResolved: true,
      resolvedAt: new Date(),
      createdAt: new Date()
    }).returning();

    // 4. Batch Processing (50 at a time)
    const BATCH_SIZE = 50;
    let processedCount = 0;

    for (let i = 0; i < taskQueue.length; i += BATCH_SIZE) {
      const batch = taskQueue.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (task) => {
        try {
          // A. PostgreSQL Log (user_block_unblock_logs)
          // Yahan deviceId integer hai, isliye task.deviceMsId number hona chahiye
          await db.insert(blockUnblockLogs).values({
            employeeCode: task.employeeCode,
            deviceId: task.deviceMsId,
            type: "unblock",
            createdAt: new Date(),
            updatedAt: new Date()
          });

          // B. eSSL Hardware Sync (Non-blocking call)
          // Yeh call internals ke through MS SQL mein entry handle karta hai
          esslService.syncUserBlockStatus(
            task.employeeCode,
            task.serialNumber,
            false // false = unblock
          ).catch(err => console.error(`API Sync Fail for ${task.employeeCode}:`, err));

          processedCount++;
        } catch (err) {
          // Agar PG log fail ho toh yahan detail dikhegi
          console.error(`PG Log Error for ${task.employeeCode}:`, err);
        }
      }));

      // Small delay for stability
      await new Promise(res => setTimeout(res, 100));
    }

    return {
      status: "Success",
      processedCount: processedCount,
      alertId: alertEntry.id
    };
  }
  // --- Filtered Door & Employee Report ---
  // async getAttendanceByDoor(filters: {
  //   dateFrom?: string;
  //   dateTo?: string;
  //   deviceId?: number;
  //   employeeCode?: string;
  // }) {
  //   const today = new Date().toISOString().split('T')[0];
  //   const start = filters.dateFrom || today;
  //   const end = filters.dateTo || today;

  //   try {
  //     // 1. Direct MS SQL Fetch (No schema dependency)
  //     // Humne { dbName: 'DeviceLogs' } pass kiya hai jo db.ts handle kar lega
  //     const logs = await dbMsSql.select().from({ dbName: 'DeviceLogs' }).execute();

  //     // People/Employees table agar MS SQL mein hai toh use bhi aise hi fetch karein
  //     const employees = await dbMsSql.select().from({ dbName: 'Employees' }).execute();
  //     // Devices (Postgres se, kyunki ye sync ho chuke hain)
  //     const devices = await db.select().from(schema.devices).execute();

  //     // 2. Filter & Map Logic
  //     return logs
  //       .filter((log: any) => {
  //         // MS SQL mein column names 'LogDate' ya 'LogDateTime' ho sakte hain
  //         const rawDate = log.LogDate || log.logDate || log.LogDateTime;
  //         const logDateStr = rawDate ? new Date(rawDate).toISOString().split('T')[0] : null;

  //         const isDateMatch = logDateStr && logDateStr >= start && logDateStr <= end;

  //         // DeviceId/Door filter (Standardized check)
  //         const currentLogDeviceId = log.DeviceId || log.deviceId;
  //         const isDoorMatch = filters.deviceId && Number(filters.deviceId) !== 0
  //           ? Number(currentLogDeviceId) === Number(filters.deviceId)
  //           : true;

  //         const currentEmpCode = log.EmployeeCode || log.employeeCode;
  //         const isEmployeeMatch = filters.employeeCode
  //           ? currentEmpCode?.toString().includes(filters.employeeCode)
  //           : true;

  //         return isDateMatch && isDoorMatch && isEmployeeMatch;
  //       })
  //       .map((log: any) => {
  //         const currentEmpCode = log.EmployeeCode || log.employeeCode;
  //         const currentLogDeviceId = log.DeviceId || log.deviceId;

  //         const emp = employees.find((e: any) => (e.EmployeeCode || e.employeeCode) === currentEmpCode);
  //         const dev = devices.find((d: any) => d.msId === currentLogDeviceId);

  //         return {
  //           id: log.DeviceLogId || log.id,
  //           employeeName: emp?.EmployeeName || emp?.employeeName || "Unknown Employee",
  //           employeeCode: currentEmpCode,
  //           logTime: log.LogDate || log.logDate,
  //           direction: (log.Direction || log.direction || "N/A").toUpperCase(),
  //           doorName: dev?.name || `Door ${currentLogDeviceId}`,
  //           doorId: currentLogDeviceId
  //         };
  //       })
  //       .sort((a, b) => new Date(b.logTime).getTime() - new Date(a.logTime).getTime());

  //   } catch (error) {
  //     console.error("Direct MS SQL Fetch Error:", error);
  //     return [];
  //   }
  // }
  async getDoorWiseCount(filters: { dateFrom?: string; dateTo?: string; deviceId?: number }) {
    const today = new Date().toISOString().split('T')[0];
    const start = filters.dateFrom || today;
    const end = filters.dateTo || today;

    try {
      // 1. Pehle data ko .execute() karke array nikalna hoga
      const logs = await dbMsSql.select()
        .from({ dbName: 'DeviceLogs' })
        .execute(); // Yeh call karna zaroori hai data lene ke liye

      const devices = await db.select().from(schema.devices).execute();

      // 2. Grouping Object
      const doorGroups: Record<string, { deviceName: string, inCount: number, outCount: number }> = {};

      // 3. Array par loop chalayein
      logs.forEach((log: any) => {
        // Date Filter
        const rawDate = log.LogDate || log.logDate;
        const logDateStr = rawDate ? new Date(rawDate).toISOString().split('T')[0] : null;
        if (!(logDateStr && logDateStr >= start && logDateStr <= end)) return;

        // Device ID Check
        const dId = log.DeviceId || log.deviceId;
        if (filters.deviceId && Number(dId) !== Number(filters.deviceId)) return;

        // Device Info nikalna
        const deviceObj = devices.find(d => Number(d.msId) === Number(dId));
        if (!deviceObj) return;

        // Name Cleaning (e.g., "Main IN" -> "Main")
        const cleanName = deviceObj.name.replace(/\s+(IN|OUT)$/i, "").trim();
        const direction = (log.Direction || "").toUpperCase();

        if (!doorGroups[cleanName]) {
          doorGroups[cleanName] = { deviceName: cleanName, inCount: 0, outCount: 0 };
        }

        // 4. Property Name Fix: outTotal ki jagah outCount use karein
        if (direction === "IN") {
          doorGroups[cleanName].inCount++;
        } else if (direction === "OUT") {
          doorGroups[cleanName].outCount++; // Fixed here
        }
      });

      return Object.values(doorGroups);

    } catch (error) {
      console.error("Door Count Error:", error);
      return [];
    }
  }
  // --- 2. CEFALO REPORT (Using your Custom Builder Format) ---
  async getCabinLockoutReport(filters: { dateFrom?: string; dateTo?: string }) {
    try {
      const results = await db
        .select({
          id: schema.cabinLockouts.id,
          employeeCode: schema.cabinLockouts.employeeCode,
          employeeName: schema.people.employeeName, // Joined from people table
          doorName: schema.doors.name,             // Joined from doors table
          inPunchTime: schema.cabinLockouts.inPunchTime,
          outPunchTime: schema.cabinLockouts.outPunchTime,
          lockoutExpiry: schema.cabinLockouts.lockoutExpiry,
          status: schema.cabinLockouts.status,
        })
        .from(schema.cabinLockouts)
        // Employee join: matching employee_code
        .leftJoin(
          schema.people,
          eq(schema.cabinLockouts.employeeCode, schema.people.employeeCode)
        )
        // Door join: matching door_id from lockout table to id in doors table
        .leftJoin(
          schema.doors,
          eq(schema.cabinLockouts.doorId, schema.doors.id)
        )
        .orderBy(desc(schema.cabinLockouts.createdAt))
        .execute();

      return results;
    } catch (error) {
      console.error("Lockout Join Report Error:", error);
      throw error;
    }
  }

};
export const storage = new DatabaseStorage();
