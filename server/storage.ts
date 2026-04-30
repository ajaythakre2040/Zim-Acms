import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isBetween from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(utc);
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);
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
  dailyAttendanceSummary,
  MenuMaster,
  InsertMenuMaster,
  menuMaster,
  rolePermissions,
} from "@shared/schema";
import * as schema from "@shared/schema";
import { db, dbMsSql, mssqlPool, mapMsSqlToSchema } from "./db";
import { eq, desc, or, and, ne, count, sql, ilike, notInArray, inArray, asc, lte, gte,between } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";
import { DeviceAdapter, HolidayAdapter, PersonAdapter, SiteAdapter } from "@shared/mssql_schema";
import { SHIFT_START, SHIFT_END, EXPECTED_WORKING_HRS, ATTENDANCE_STATUS, ALERT_TEMPLATES, ACCESS_RULES, ZONES } from './constant';
import { esslService } from "./services/essl-service";
import { MAIN_GATE_SYNC } from "./constant";
dayjs.extend(isBetween);
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
  // getRoles(): Promise<Role[]>;
  // getRole(id: number): Promise<Role | undefined>;
  // createRole(data: InsertRole): Promise<Role>;
  // updateRole(id: number, data: Partial<InsertRole>): Promise<Role>;
  // deleteRole(id: number): Promise<void>;
  getEmployeeRoles(): Promise<EmployeeRole[]>;
  getEmployeeRole(id: number): Promise<EmployeeRole | undefined>;
  createEmployeeRole(data: InsertEmployeeRole): Promise<EmployeeRole>;
  updateEmployeeRole(id: number, data: Partial<InsertEmployeeRole>): Promise<EmployeeRole>;
  deleteEmployeeRole(id: number): Promise<void>;
  getDashboardStats(): Promise<object>;
  getLockoutEligibleDoors(search?: string): Promise<any[]>;
  updateDoorLockoutStatusBulk(doorIds: number[], status: boolean): Promise<any[]>;
  executeEmergencybulkUnblock(userId: string | number, userName: string): Promise<any>;
  getEmployeeDoorAssignments(): Promise<any[]>;
  getEmployeeDoorAssignmentByCode(employeeCode: string): Promise<any | undefined>;
  upsertEmployeeDoorAssignment(data: any): Promise<any>;
  deleteEmployeeDoorAssignment(id: number): Promise<void>;
  getMenus(): Promise<MenuMaster[]>;
  getMenu(id: number): Promise<MenuMaster | undefined>;
  createMenu(menu: InsertMenuMaster): Promise<MenuMaster>;
  updateMenu(id: number, menu: Partial<InsertMenuMaster>): Promise<MenuMaster>;
  deleteMenu(id: number): Promise<void>;
}
export class DatabaseStorage implements IStorage {

  async getDeviceLogsWithEmployee(filters?: {
    dateFrom?: string;
    dateTo?: string;
    employeeCode?: string;
    deviceId?: string;
    doorName?: string;
  }): Promise<any[]> {
    try {
      const conditions = [];

      if (filters?.dateFrom) {
        conditions.push(
          gte(
            schema.employeeActivityLogs.logDate,
            new Date(filters.dateFrom)
          )
        );
      }

      if (filters?.dateTo) {
        conditions.push(
          lte(
            schema.employeeActivityLogs.logDate,
            new Date(filters.dateTo)
          )
        );
      }

      if (filters?.employeeCode) {
        conditions.push(
          eq(
            schema.employeeActivityLogs.employeeCode,
            filters.employeeCode
          )
        );
      }

      // :white_check_mark: FIXED DOOR FILTER
      const doorFilter = filters?.deviceId || filters?.doorName;

      if (doorFilter) {
        conditions.push(
          eq(
            schema.employeeActivityLogs.doorName,
            doorFilter
          )
        );
      }

      const logs = await db
        .select({
          devicelogid: schema.employeeActivityLogs.deviceLogId,
          deviceid: schema.employeeActivityLogs.deviceId,
          employeecode: schema.employeeActivityLogs.employeeCode,
          logdate: schema.employeeActivityLogs.logDate,
          direction: schema.employeeActivityLogs.direction,

          employee_name: schema.employeeActivityLogs.employeeName,
          department_name: schema.employeeActivityLogs.departmentName,
          designation_name: schema.employeeActivityLogs.designationName,

          door_name: schema.employeeActivityLogs.doorName,
        })
        .from(schema.employeeActivityLogs)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(schema.employeeActivityLogs.deviceLogId));

      return logs;
    } catch (error) {
      console.error("Error in getDeviceLogsWithEmployee:", error);
      throw error;
    }
  }
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
    if (data.name) {
      const [existingName] = await db
        .select()
        .from(sites)
        .where(eq(sites.name, data.name));
      if (existingName) {
        throw new Error(`Site name '${data.name}' already exists.`);
      }
    }
    if (data.code) {
      const [existingCode] = await db
        .select()
        .from(sites)
        .where(eq(sites.code, data.code));
      if (existingCode) {
        throw new Error(`Site code '${data.code}' already exists.`);
      }
    }
    const [created] = await db.insert(sites).values(data).returning();
    try {
      const msData = SiteAdapter.toMsSql(created);
      await dbMsSql.insert({ dbName: 'Locations' }).values({
        Code: msData.Code,
        Description: msData.Description
      });
    } catch (e) {
      console.error("[MSSQL Sync Error]:", e);
    }
    return created;
  }
  async updateSite(id: number, data: Partial<InsertSite>): Promise<Site> {
    if (data.name) {
      const [existingName] = await db
        .select()
        .from(sites)
        .where(and(eq(sites.name, data.name), ne(sites.id, id)));
      if (existingName) {
        throw new Error(`Site name '${data.name}' already exists.`);
      }
    }
    if (data.code) {
      const [existingCode] = await db
        .select()
        .from(sites)
        .where(and(eq(sites.code, data.code), ne(sites.id, id)));
      if (existingCode) {
        throw new Error(`Site code '${data.code}' already exists.`);
      }
    }
    const { id: _, msId: __, createdAt: ___, ...updateData } = data as any;
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
    if (data.name) {
      const [existingName] = await db
        .select()
        .from(buildings)
        .where(eq(buildings.name, data.name));
      if (existingName) {
        throw new Error(`Building name '${data.name}' already exists.`);
      }
    }
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
    if (data.name) {
      const [existing] = await db
        .select()
        .from(buildings)
        .where(and(eq(buildings.name, data.name), ne(buildings.id, id)));
      if (existing) {
        throw new Error(`Building name '${data.name}' already exists.`);
      }
    }
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
  async createZone(data: InsertZone): Promise<Zone> {
    if (!data.code) {
      throw new Error("Zone name is required.");
    }
    const [existing] = await db
      .select()
      .from(zones)
      .where(eq(zones.code, data.code));
    if (existing) {
      throw new Error(`Zone code '${data.code}' already exists.`);
    }
    const [created] = await db.insert(zones).values(data).returning();
    return created;
  }
  async updateZone(id: number, data: Partial<InsertZone>): Promise<Zone> {
    if (data.name) {
      const [existing] = await db
        .select()
        .from(zones)
        .where(
          and(
            eq(zones.name, data.name),
            ne(zones.id, id)
          )
        );
      if (existing) {
        throw new Error(`Zone name '${data.name}' already exists.`);
      }
    }
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
    if (data.name) {
      const [existingName] = await db
        .select()
        .from(doors)
        .where(eq(doors.name, data.name));
      if (existingName) {
        throw new Error(`Door name '${data.name}' already exists.`);
      }
    }
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
    if (data.name) {
      const [existing] = await db
        .select()
        .from(doors)
        .where(and(eq(doors.name, data.name), ne(doors.id, id)));
      if (existing) {
        throw new Error(`Door name '${data.name}' already exists.`);
      }
    }
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
    await db.execute(sql`
    UPDATE ${schema.employeeDoorAssignments} 
    SET door_ids = array_remove(door_ids, ${id}),
        updated_at = CURRENT_TIMESTAMP
    WHERE ${id} = ANY(door_ids)
  `);
    await db.delete(doors).where(eq(doors.id, id));
  }
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  async getDevices(): Promise<any[]> {
    try {
      const msDataRaw = await dbMsSql.select().from({ dbName: 'Devices' }).execute();
      if (!msDataRaw || msDataRaw.length === 0) return [];

      const currentTime = new Date();
      
      const THRESHOLD_MINUTES = 1;

      const formattedDevices = msDataRaw.map((d: any) => {
        let lPing: Date | null = null;
        let calculatedStatus = "offline";

        if (d.LastPing) {
          
          lPing = new Date(d.LastPing);

          
          let diffInMs = currentTime.getTime() - lPing.getTime();
          let diffInMinutes = diffInMs / 60000;

         
          const absDiff = Math.abs(diffInMinutes);

          
          
          if (absDiff <= THRESHOLD_MINUTES || Math.abs(absDiff - 330) <= THRESHOLD_MINUTES) {
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
          lastSeenTime: sql<string>`TO_CHAR(${people.lastSeenTime}, 'YYYY-MM-DD"T"HH24:MI:SS')`
        },
        departmentName: departments.name,
        lastPunchDoorName: doors.name,
      })
        .from(people)
        .leftJoin(departments, eq(people.departmentId, departments.id))
        .leftJoin(doors, eq(people.lastPunchDoorId, doors.id)),
      dbMsSql.select().from({ dbName: 'Employees' }).execute()
    ]);
    const msIds = new Set();
    const ruleIdToName = Object.fromEntries(
      Object.entries(ACCESS_RULES).map(([key, value]) => [value, key])
    );
    const currentPgData = pgDataRaw.map(row => ({
      ...row.person,
      departmentName: row.departmentName || "N/A",
      lastPunchDoorName: row.lastPunchDoorName || "No Door",
      ruleName: row.person.ruleid !== null ? (ruleIdToName[row.person.ruleid] || "UNKNOWN_RULE") : "NO_RULE"
    }));
    for (const msRow of (msDataRaw || [])) {
      const mapped = PersonAdapter.toPostgres(msRow);
      if (!mapped.msId) continue;
      msIds.add(mapped.msId);
      const existingIndex = currentPgData.findIndex(p => p.msId === mapped.msId);
      if (existingIndex === -1) {
        try {
          const [newRec] = await db.insert(people).values({
            msId: mapped.msId,
            employeeCode: mapped.employeeCode,
            employeeName: mapped.employeeName ?? "Unknown",
            address: mapped.address ?? null,
            ruleid: mapped.ruleid ?? null,
            locationId: mapped.locationId ?? null,
            externalId: mapped.externalId ?? null,
            overtimeEligible: mapped.overtimeEligible ?? false,
            personType: "employee",
            status: "active",
            sourceSystem: "mssql_bio",
            updatedAt: new Date(),
            createdAt: new Date(),
          }).returning();
          if (newRec?.employeeCode) {
            await this.executeHardwareSync(newRec.employeeCode, null, true);
          }
          currentPgData.push({
            ...newRec,
            departmentName: "N/A",
            lastPunchDoorName: "No Door",
            ruleName: newRec.ruleid !== null ? (ruleIdToName[newRec.ruleid] || "UNKNOWN_RULE") : "NO_ROLE"
          });
        } catch (e) { console.error("New employee sync error:", e); }
      } else {
        const existing = currentPgData[existingIndex];
        const hasChanged = existing.employeeName !== mapped.employeeName ||
          existing.employeeCode !== mapped.employeeCode ||
          existing.ruleid !== mapped.ruleid;
        if (hasChanged) {
          try {
            const [updatedRec] = await db.update(people)
              .set({
                employeeName: mapped.employeeName ?? "Unknown",
                employeeCode: mapped.employeeCode,
                address: mapped.address ?? null,
                updatedAt: new Date()
              })
              .where(eq(people.msId, mapped.msId))
              .returning();
            currentPgData[existingIndex] = {
              ...existing,
              ...updatedRec,
              ruleName: updatedRec.ruleid !== null ? (ruleIdToName[updatedRec.ruleid] || "UNKNOWN_RULE") : "NO_ROLE"
            };
          } catch (e) { console.error("Employee update sync error:", e); }
        }
      }
    }
    for (const pgRow of currentPgData) {
      if (pgRow.msId && !msIds.has(pgRow.msId)) {
        try { await db.delete(people).where(eq(people.msId, pgRow.msId)); } catch (e) { }
      }
    }
    let results = currentPgData;
    if (search) {
      const term = search.toLowerCase();
      results = results.filter(p =>
        p.employeeName.toLowerCase().includes(term) ||
        (p.employeeCode && p.employeeCode.toLowerCase().includes(term)) ||
        (p.departmentName && p.departmentName.toLowerCase().includes(term)) ||
        (p.ruleName && p.ruleName.toLowerCase().includes(term))
      );
    }
    results.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    return Array.from(new Map(results.map(p => [`${p.msId || p.employeeCode || p.id}`, p])).values()) as Person[];
  }
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
      try {
        if (record.employeeCode) {
          await esslService.deleteEmployee(record.employeeCode.toString());
        }
      } catch (e) {
        console.error("eSSL Deletion Failed:", e);
      }
      if (record.employeeCode) {
        await db
          .delete(schema.employeeDoorAssignments)
          .where(eq(schema.employeeDoorAssignments.employeeCode, record.employeeCode));
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
    return await db.select().from(shifts).orderBy(asc(shifts.id));
  }
  async createShift(data: InsertShift): Promise<Shift> {
    if (!data.code) {
      throw new Error("Shift code is required.");
    }
    const [existing] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.code, data.code));
    if (existing) {
      throw new Error(`Shift code '${data.code}' already exists.`);
    }
    const [created] = await db.insert(shifts).values(data).returning();
    return created;
  }
  async updateShift(id: number, data: Partial<InsertShift>): Promise<Shift> {
    if (data.code) {
      const [existing] = await db
        .select()
        .from(shifts)
        .where(
          and(
            eq(shifts.code, data.code),
            ne(shifts.id, id)
          )
        );
      if (existing) {
        throw new Error(`Shift code '${data.code}' already exists.`);
      }
    }
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
    employeeCode?: string | number;
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
      const currentEmpCode = String(emp.EmployeeCode).trim();
      if (filters.employeeCode && filters.employeeCode !== "all" && currentEmpCode !== String(filters.employeeCode)) {
        return;
      }
      reportDates.forEach((dateStr) => {
        const key = `${currentEmpCode}_${dateStr}`;
        const logs = attendanceMap.get(key) || [];
        const dayOfWeek = new Date(dateStr).getDay();
        let rowData: any = {
          id: `${currentEmpCode}-${dateStr}`,
          employeeCode: currentEmpCode,
          firstName: emp.EmployeeName || "Unknown",
          date: dateStr,
          clockIn: null,
          clockOut: null,
          workingHours: "0.00",
          status: "",
          deviceId: "N/A",
          deviceName: "—"
        };
        if (logs.length === 0) {
          rowData.status = "absent";  
          
        } else {
          const sortedLogs = logs.sort((a, b) => a.time.getTime() - b.time.getTime());
          const firstIn = sortedLogs[0];
          const lastOut = sortedLogs.length > 1 ? sortedLogs[sortedLogs.length - 1] : null;
          rowData.clockIn = firstIn.time.toISOString();
          rowData.deviceId = firstIn.devId;
          const deviceDetail = msSqlDevices.find(d => String(d.DeviceId || d.DeviceID) === firstIn.devId);
          rowData.deviceName = deviceDetail?.DeviceName || `Device ${firstIn.devId}`;
          if (lastOut && (lastOut.time.getTime() - firstIn.time.getTime()) > 60000) {
            rowData.clockOut = lastOut.time.toISOString();
            const workMs = lastOut.time.getTime() - firstIn.time.getTime();
            rowData.workingHours = (workMs / 3600000).toFixed(2);
          }
          rowData.status = "present";
        }
        finalReport.push(rowData);
      });
    });
    return finalReport.filter(row => {
      const matchesStatus = (!filters.status || filters.status === "all") ? true : row.status === filters.status;
      const matchesDevice = (!filters.deviceId || filters.deviceId === "all") ? true : (row.deviceId === String(filters.deviceId));
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
  async getDashboardStats(date?: string): Promise<object> {
    const [peopleCount] = await db.select({ count: count() }).from(people);
    const [doorsCount] = await db.select({ count: count() }).from(doors);
    const [devicesCount] = await db.select({ count: count() }).from(devices);
    const [shiftsCount] = await db.select({ count: count() }).from(shifts);
    const [onlineCount] = await db.select({ count: count() })
      .from(devices)
      .where(eq(devices.status, 'online'));
    return {
      totalPeople: peopleCount.count,
      totalshift: shiftsCount.count,
      totalDoors: doorsCount.count,
      totalDevices: devicesCount.count,
      onlineDevices: onlineCount.count,
      offlineDevices: Math.max(0, devicesCount.count - onlineCount.count)
    };
  }
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  async getDoorWiseStats(date: string) {
    const [totalPeopleResult] = await db.select({
      count: sql<number>`count(*)`
    }).from(people);

    const totalManpower = Number(totalPeopleResult.count) || 0;

    const mappings = await db.select({
      doorId: doors.id,
      doorName: doors.name,
      doorCode: doors.code,
      inIds: doorDevices.inDeviceIds,
      outIds: doorDevices.outDeviceIds,
      isMainGate: doorDevices.isMainGate,
    })
      .from(doors)
      .leftJoin(doorDevices, eq(doors.id, doorDevices.doorId));

    const allDeviceIds = mappings.flatMap(m => [...(m.inIds || []), ...(m.outIds || [])]);

    if (allDeviceIds.length === 0) {
      return { doorStats: [], mainGateIn: 0, mainGateOut: 0, mainGateBal: 0, totalPresent: 0, totalAbsent: totalManpower, totalManpower };
    }

    const msSqlData = await mssqlPool.request()
      .input('filterDate', date)
      .query(`
      SELECT 
        DeviceId, 
        Direction,
        EmployeeCode,
        COUNT(*) as totalPunches -- Har punch ko count karne ke liye
      FROM DeviceLogs 
      WHERE CAST(LogDate AS DATE) = @filterDate
      AND DeviceId IN (${allDeviceIds.join(',')})
      GROUP BY DeviceId, Direction, EmployeeCode
    `);

    const logMap = msSqlData.recordset;

    let mainGateInPunches = 0;
    let mainGateOutPunches = 0;
    const uniquePresentEmployees = new Set();

    const doorStats = mappings.map(m => {
      const inLogs = logMap.filter(l => (m.inIds || []).includes(l.DeviceId) && l.Direction === 'IN');
      const outLogs = logMap.filter(l => (m.outIds || []).includes(l.DeviceId) && l.Direction === 'OUT');

      const inCount = inLogs.reduce((acc, curr) => acc + curr.totalPunches, 0);
      const outCount = outLogs.reduce((acc, curr) => acc + curr.totalPunches, 0);

      if (m.doorCode === MAIN_GATE_SYNC.CODE || m.isMainGate === true) {
        mainGateInPunches = inCount;
        mainGateOutPunches = outCount;

        
        inLogs.forEach(l => uniquePresentEmployees.add(l.EmployeeCode));
      }

      return {
        doorName: m.doorName,
        inCount,
        outCount,
        balance: Math.max(0, inCount - outCount)
      };
    });

    const totalPresent = uniquePresentEmployees.size;

    return {
      doorStats,
      mainGateIn: mainGateInPunches, 
      mainGateOut: mainGateOutPunches, 
      mainGateBal: Math.max(0, mainGateInPunches - mainGateOutPunches),
      totalPresent: totalPresent, 
      totalAbsent: Math.max(0, totalManpower - totalPresent), 
      totalManpower
    };
  }
  async getShiftWiseStats(date: string): Promise<any[]> {
    try {
      const [allShifts, allDoors] = await Promise.all([
        db.select().from(shifts).where(eq(shifts.isActive, true)),
        db.select({
          id: doors.id,
          name: doors.name,
          inIds: doorDevices.inDeviceIds,
        }).from(doors).leftJoin(doorDevices, eq(doors.id, doorDevices.doorId))
      ]);
      const windows = allShifts.map(s => {
        const [h, m] = s.startTime.split(':');
        const shiftStart = dayjs().set('hour', parseInt(h)).set('minute', parseInt(m)).set('second', 0);
        const buffer = s.thresholdMins ?? 30;
        return {
          name: s.name,
          start: shiftStart.subtract(buffer, 'm'),
          end: shiftStart.add(buffer, 'm'),
        };
      });
      const request = mssqlPool.request();
      const deviceIds = allDoors.flatMap(d => d.inIds || []);
      if (deviceIds.length === 0) return [];
      const logsResult = await request
        .input('start', `${date} 00:00:00`)
        .input('end', `${date} 23:59:59`)
        .query(`
        SELECT 
          EmployeeCode, 
          DeviceId, 
          CONVERT(VARCHAR(8), LogDate, 108) as LogTime -- Ye "HH:mm:ss" return karega
        FROM DeviceLogs WITH (NOLOCK)
        WHERE LogDate >= @start AND LogDate <= @end
        AND Direction = 'IN'
        AND DeviceId IN (${deviceIds.join(',')})
        ORDER BY LogDate ASC
      `);
      const rawLogs = logsResult.recordset;
      const deviceToDoor: Record<number, string> = {};
      const stats: Record<string, any> = {};
      allDoors.forEach(d => {
        if (!d.name) return;
        stats[d.name] = { doorName: d.name, totalEmp: 0 };
        allShifts.forEach(s => { if (s.name) stats[d.name][s.name] = 0; });
        d.inIds?.forEach(id => { deviceToDoor[id] = d.name!; });
      });
      const counted = new Set<string>();
      for (const log of rawLogs) {
  const doorName = deviceToDoor[log.DeviceId];
  if (!doorName) continue;

  const [pH, pM, pS] = log.LogTime.split(':');
  const punchTime = dayjs()
    .set('hour', parseInt(pH))
    .set('minute', parseInt(pM))
    .set('second', parseInt(pS));

  for (const win of windows) {
    if (punchTime.isBetween(win.start, win.end, null, '[]')) {

      
      const key = `${doorName}_${win.name}_${log.EmployeeCode}`;

      
      if (counted.has(key)) {
        continue;
      }

      
      counted.add(key);

      stats[doorName][win.name!]++;
      stats[doorName].totalEmp++;

      break;
    }
  }
}
      return Object.values(stats);
    } catch (error) {
      console.error("IST_STATS_ERROR:", error);
      throw error;
    }
  }
  // async getMachineAccessLogs(date: string) {
  //   // 1. Door Mappings fetch karein
  //   const doorMappings = await db.select({
  //     doorName: doors.name,
  //     inIds: doorDevices.inDeviceIds,
  //     outIds: doorDevices.outDeviceIds,
  //   }).from(doors)
  //     .leftJoin(doorDevices, eq(doors.id, doorDevices.doorId));

  //   // 2. MS SQL Query: UNION ALL Success and Illegal Logs
  //   const msSqlData = await mssqlPool.request()
  //     .input('filterDate', date)
  //     .query(`
  //     SELECT 
  //       e.EmployeeName, l.EmployeeCode, l.DeviceId, d.DeviceName, 
  //       d.DeviceDirection as Direction, -- Yahan d.DeviceDirection use kiya
  //       l.LogDate,
  //       'success' as LogStatus, 'Access Granted' as Remarks, NULL as AttPhoto
  //     FROM DeviceLogs l
  //     LEFT JOIN Employees e ON l.EmployeeCode = e.EmployeeCode
  //     LEFT JOIN Devices d ON l.DeviceId = d.DeviceId
  //     WHERE CAST(l.LogDate AS DATE) = @filterDate

  //     UNION ALL

  //     SELECT 
  //       e.EmployeeName, l.EmployeeCode, l.DeviceId, d.DeviceName, 
  //       d.DeviceDirection as Direction, -- Yahan 'IN' ki jagah d.DeviceDirection liya
  //       l.LogDate,
  //       'failed' as LogStatus,
  //       CASE 
  //         WHEN l.EmployeeCode IS NULL OR l.EmployeeCode = '0' THEN 'User Not Registered'
  //         ELSE 'User Blocked / Unauthorized'
  //       END as Remarks,
  //       l.AttPhoto
  //     FROM DeviceIllegalLogs l
  //     LEFT JOIN Employees e ON l.EmployeeCode = e.EmployeeCode
  //     LEFT JOIN Devices d ON l.DeviceId = d.DeviceId
  //     WHERE CAST(l.LogDate AS DATE) = @filterDate

  //     ORDER BY LogDate DESC
  //   `);

  //   const allLogs = msSqlData.recordset;

  //   // 3. Mapping and Photo Conversion
  //   const machineFeed = allLogs.map(log => {
  //     const door = doorMappings.find(m =>
  //       (m.inIds || []).includes(log.DeviceId) ||
  //       (m.outIds || []).includes(log.DeviceId)
  //     );

  //     let photoData = null;
  //     if (log.AttPhoto) {
  //       const base64Content = Buffer.isBuffer(log.AttPhoto)
  //         ? log.AttPhoto.toString('base64')
  //         : String(log.AttPhoto);

  //       photoData = `data:image/jpeg;base64,${base64Content}`;
  //     }

  //     return {
  //       employeeName: log.EmployeeName || (log.LogStatus === 'failed' ? "Unknown" : "Visitor"),
  //       employeeCode: log.EmployeeCode || "N/A",
  //       deviceName: log.DeviceName || `Machine ${log.DeviceId}`,
  //       direction: log.Direction || "N/A", // Ab ye Devices table se aayega
  //       logDate: log.LogDate,
  //       status: log.LogStatus,
  //       remarks: log.Remarks,
  //       photo: photoData,
  //       doorName: door ? door.doorName : (log.DeviceName || "Unknown Door")
  //     };
  //   });

  //   return { machineFeed };
  // }


  async getMachineAccessLogs(date: string) {
    
    const doorMappings = await db.select({
      doorName: doors.name,
      inIds: doorDevices.inDeviceIds,
      outIds: doorDevices.outDeviceIds,
    }).from(doors)
      .leftJoin(doorDevices, eq(doors.id, doorDevices.doorId));

    
    const msSqlData = await mssqlPool.request()
      .input('filterDate', date)
      .query(`
      SELECT 
        e.EmployeeName, 
        l.EmployeeCode, 
        l.DeviceId, 
        d.DeviceName,
        l.Direction, 
        l.LogDate 
      FROM DeviceLogs l
      LEFT JOIN Employees e ON l.EmployeeCode = e.EmployeeCode
      LEFT JOIN Devices d ON l.DeviceId = d.DeviceId
      WHERE CAST(l.LogDate AS DATE) = @filterDate
      ORDER BY l.LogDate DESC
    `);

    const logs = msSqlData.recordset;

    
    const machineFeed = logs.map(log => {
      const door = doorMappings.find(m =>
        (m.inIds || []).includes(log.DeviceId) ||
        (m.outIds || []).includes(log.DeviceId)
      );

      return {
        employeeName: log.EmployeeName || "Unknown",
        employeeCode: log.EmployeeCode,
        deviceName: log.DeviceName || `Machine ${log.DeviceId}`,
        direction: log.Direction,
        logDate: log.LogDate,
        doorName: door ? door.doorName : (log.DeviceName || "Unknown Door")
      };
    });

    return {
      machineFeed
    };
  }


  // async getRoles(): Promise<any[]> {
  //   const allRoles = await db.select().from(roles).orderBy(desc(roles.id));
  //   const allDoors = await db.select({
  //     id: doors.id,
  //     name: doors.name
  //   }).from(doors);
  //   const doorLookup = new Map<number, string>();
  //   allDoors.forEach(d => doorLookup.set(d.id, d.name));
  //   return allRoles.map((role) => {
  //     const idsArray = Array.isArray(role.doorIds) ? role.doorIds : [];
  //     const names = idsArray
  //       .map(id => doorLookup.get(Number(id)))
  //       .filter((name): name is string => Boolean(name));
  //     return {
  //       ...role,
  //       doorIds: idsArray.map(id => String(id)),
  //       assignedDoorNames: names.length > 0 ? names.join(", ") : "No Doors Assigned"
  //     };
  //   });
  // }
  // async getRole(id: number): Promise<any | undefined> {
  //   const [role] = await db.select().from(roles).where(eq(roles.id, id));
  //   if (!role) return undefined;
  //   const idsArray = Array.isArray(role.doorIds) ? role.doorIds : [];
  //   const doorDetails = await db.select({ name: doors.name })
  //     .from(doors)
  //     .where(inArray(doors.id, idsArray.length > 0 ? idsArray : [-1]));
  //   return {
  //     ...role,
  //     assignedDoorNames: doorDetails.map(d => d.name).join(", ")
  //   };
  // }
  // async createRole(data: InsertRole): Promise<Role> {
  //   const [existing] = await db
  //     .select()
  //     .from(roles)
  //     .where(eq(roles.code, data.code));
  //   if (existing) {
  //     throw new Error(`Role code '${data.code}' already exists.`);
  //   }
  //   const [created] = await db.insert(roles).values(data).returning();
  //   return created;
  // }
  // async updateRole(id: number, data: Partial<InsertRole>): Promise<Role> {
  //   return await db.transaction(async (tx) => {
  //     if (data.code) {
  //       const [existing] = await tx
  //         .select()
  //         .from(roles)
  //         .where(and(eq(roles.code, data.code), ne(roles.id, id)));
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
  //     return updated;
  //   });
  // }
  // async deleteRole(id: number): Promise<void> {
  //   await db.delete(roles).where(eq(roles.id, id));
  // }
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
  async createEmployeeRole(insertData: InsertEmployeeRole): Promise<EmployeeRole> {
    return await db.transaction(async (tx) => {
      await tx
        .delete(employeeRoles)
        .where(eq(employeeRoles.employeeCode, insertData.employeeCode));
      const [newMapping] = await tx
        .insert(employeeRoles)
        .values(insertData)
        .returning();
      if (newMapping) {
        const [empData] = await tx
          .select()
          .from(people)
          .where(eq(people.employeeCode, newMapping.employeeCode))
          .limit(1);
        if (empData) {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const hasEnteredToday =
            empData.lastSeenTime &&
            new Date(empData.lastSeenTime) >= todayStart &&
            (empData.currentZone === 'IN' || empData.currentZone === 'CABIN');
          await tx
            .update(people)
            .set({
              roleId: Number(newMapping.roleId),
              updatedAt: new Date()
            })
            .where(eq(people.employeeCode, newMapping.employeeCode));
          const roleForSync = hasEnteredToday ? Number(newMapping.roleId) : null;
          console.log(`[Sync] Triggering Hardware Sync with RoleID: ${roleForSync}`);
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
    const logs = await db
      .select()
      .from(blockUnblockLogs)
      .where(eq(blockUnblockLogs.employeeCode, employeeCode))
      .orderBy(desc(blockUnblockLogs.updatedAt));
    const latestMap = new Map<number, any>();
    for (const log of logs) {
      const dId = Number(log.deviceId);
      if (!latestMap.has(dId)) {
        latestMap.set(dId, {
          id: log.id,
          deviceId: dId,
          type: log.type,
          status: log.type === 'block' ? 'Blocked' : 'Active',
          timestamp: log.updatedAt || log.createdAt
        });
      }
    }
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
  private async executeHardwareSync(employeeCode: string, roleId: number | null = null, blockAll: boolean = false) {
    try {
      const taskConfig = await db.query.cronMaster.findFirst({
        where: eq(cronMaster.code, MAIN_GATE_SYNC.CODE)
      });
      if (!taskConfig?.doorId) return;
      const activeGateId = Number(taskConfig.doorId);
      const [msDevicesRaw, allDoorMappings, empAssignment, lastLogs] = await Promise.all([
        mssqlPool.request().query("SELECT DeviceID, SerialNumber FROM Devices")
          .then((res: any) => res.recordset as any[]),
        db.select().from(doorDevices).execute(),
        db.query.employeeDoorAssignments.findFirst({
          where: eq(schema.employeeDoorAssignments.employeeCode, employeeCode.trim())
        }),
        db.select().from(blockUnblockLogs)
          .where(eq(blockUnblockLogs.employeeCode, employeeCode.trim()))
      ]);
      if (!msDevicesRaw) return;
      const allowedDoorIds = new Set<number>(
        Array.isArray(empAssignment?.doorIds) ? (empAssignment.doorIds as number[]).map(Number) : []
      );
      const deviceToDoorMap = new Map<number, number>();
      const mainGateWhitelistedIds = new Set<number>();
      allDoorMappings.forEach((mapping: any) => {
        const devIds = [...(mapping.inDeviceIds || []), ...(mapping.outDeviceIds || [])].map(Number);
        devIds.forEach(dId => {
          const doorId = Number(mapping.doorId);
          deviceToDoorMap.set(dId, doorId);
          if (doorId === activeGateId) mainGateWhitelistedIds.add(dId);
        });
      });
      const syncPromises = msDevicesRaw.map(async (msDevice: any) => {
        const msDeviceId = Number(msDevice.DeviceID || msDevice.DeviceId);
        const serialNumber = msDevice.SerialNumber?.trim();
        if (!serialNumber) return;
        const isMainGate = mainGateWhitelistedIds.has(msDeviceId);
        let shouldBlock: boolean;
        if (isMainGate) {
          shouldBlock = false;
        } else {
          const doorIdForThisDevice = deviceToDoorMap.get(msDeviceId);
          const isDoorAllowed = doorIdForThisDevice ? allowedDoorIds.has(doorIdForThisDevice) : false;
          shouldBlock = blockAll || !isDoorAllowed;
        }
        const currentStatus = shouldBlock ? "block" : "unblock";
        const lastDeviceLog = lastLogs
          .filter(l => l.deviceId === msDeviceId)
          .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())[0];
        const hasStatusChanged = !lastDeviceLog || lastDeviceLog.type !== currentStatus;
        try {
          await esslService.syncUserBlockStatus(employeeCode.trim(), serialNumber, shouldBlock);
          if (hasStatusChanged) {
            await db.insert(blockUnblockLogs).values({
              employeeCode: employeeCode.trim(),
              deviceId: msDeviceId,
              type: currentStatus,
              updatedAt: new Date()
            });
          }
        } catch (err: any) {
          console.error(`❌ Hardware Error: ${employeeCode} on Device ${msDeviceId}: ${err.message}`);
        }
      });
      await Promise.all(syncPromises);
    } catch (error: any) {
      console.error("💀 Engine Failure:", error.message);
    }
  }
  async executeEmergencybulkUnblock(userId: string, userName: string): Promise<any> {
    const allPeople = await db.select().from(people).where(eq(people.status, "active"));
    const allDevices = await db.select().from(devices).where(eq(devices.isActive, true));
    const taskQueue = [];
    for (const person of allPeople) {
      if (!person.employeeCode) continue;
      for (const device of allDevices) {
        if (device.serialNumber && device.msId !== null && device.msId !== undefined) {
          taskQueue.push({
            employeeCode: person.employeeCode,
            deviceMsId: Number(device.msId),
            serialNumber: device.serialNumber
          });
        }
      }
    }
    if (taskQueue.length === 0) {
      return { status: "Empty", processedCount: 0, message: "No active records found." };
    }
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
    const BATCH_SIZE = 50;
    let processedCount = 0;
    for (let i = 0; i < taskQueue.length; i += BATCH_SIZE) {
      const batch = taskQueue.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (task) => {
        try {
          await db.insert(blockUnblockLogs).values({
            employeeCode: task.employeeCode,
            deviceId: task.deviceMsId,
            type: "unblock",
            createdAt: new Date(),
            updatedAt: new Date()
          });
          esslService.syncUserBlockStatus(
            task.employeeCode,
            task.serialNumber,
            false
          ).catch(err => console.error(`API Sync Fail for ${task.employeeCode}:`, err));
          processedCount++;
        } catch (err) {
          console.error(`PG Log Error for ${task.employeeCode}:`, err);
        }
      }));
      await new Promise(res => setTimeout(res, 100));
    }
    return {
      status: "Success",
      processedCount: processedCount,
      alertId: alertEntry.id
    };
  }
  async getDoorWiseCount(filters: { dateFrom?: string; dateTo?: string; deviceId?: number }) {
    const today = new Date().toISOString().split('T')[0];
    const start = filters.dateFrom || today;
    const end = filters.dateTo || today;
    try {
      const logs = await dbMsSql.select()
        .from({ dbName: 'DeviceLogs' })
        .execute();
      const devices = await db.select().from(schema.devices).execute();
      const doorGroups: Record<string, { deviceName: string, inCount: number, outCount: number }> = {};
      logs.forEach((log: any) => {
        const rawDate = log.LogDate || log.logDate;
        const logDateStr = rawDate ? new Date(rawDate).toISOString().split('T')[0] : null;
        if (!(logDateStr && logDateStr >= start && logDateStr <= end)) return;
        const dId = log.DeviceId || log.deviceId;
        if (filters.deviceId && Number(dId) !== Number(filters.deviceId)) return;
        const deviceObj = devices.find(d => Number(d.msId) === Number(dId));
        if (!deviceObj) return;
        const cleanName = deviceObj.name.replace(/\s+(IN|OUT)$/i, "").trim();
        const direction = (log.Direction || "").toUpperCase();
        if (!doorGroups[cleanName]) {
          doorGroups[cleanName] = { deviceName: cleanName, inCount: 0, outCount: 0 };
        }
        if (direction === "IN") {
          doorGroups[cleanName].inCount++;
        } else if (direction === "OUT") {
          doorGroups[cleanName].outCount++;
        }
      });
      return Object.values(doorGroups);
    } catch (error) {
      console.error("Door Count Error:", error);
      return [];
    }
  }
  async getCabinLockoutReport(filters: {
    dateFrom?: string;
    dateTo?: string;
    employeeCode?: string;
    doorId?: string;
    status?: string;
  }) {
    try {
      const conditions = [];
      if (filters.doorId && filters.doorId !== "all") {
        conditions.push(eq(schema.cabinLockouts.doorId, Number(filters.doorId)));
      }
      if (filters.status && filters.status !== "all") {
        conditions.push(eq(schema.cabinLockouts.status, filters.status));
      }
      if (filters.employeeCode && filters.employeeCode !== "all") {
        conditions.push(eq(schema.cabinLockouts.employeeCode, filters.employeeCode));
      }
      if (filters.dateFrom) {
        if (!filters.dateTo || filters.dateFrom === filters.dateTo) {
          conditions.push(
            sql`CAST(${schema.cabinLockouts.createdAt} AS DATE) = ${filters.dateFrom}`
          );
        }
        else {
          const start = new Date(filters.dateFrom);
          start.setHours(0, 0, 0, 0);
          const end = new Date(filters.dateTo);
          end.setHours(23, 59, 59, 999);
          conditions.push(gte(schema.cabinLockouts.createdAt, start));
          conditions.push(lte(schema.cabinLockouts.createdAt, end));
        }
      }
      const results = await db
        .select({
          id: schema.cabinLockouts.id,
          employeeCode: schema.cabinLockouts.employeeCode,
          employeeName: schema.people.employeeName,
          doorName: schema.doors.name,
          doorId: schema.cabinLockouts.doorId,
          inPunchTime: schema.cabinLockouts.inPunchTime,
          outPunchTime: schema.cabinLockouts.outPunchTime,
          lockoutExpiry: schema.cabinLockouts.lockoutExpiry,
          status: schema.cabinLockouts.status,
          createdAt: schema.cabinLockouts.createdAt,
        })
        .from(schema.cabinLockouts)
        .leftJoin(schema.people, eq(schema.cabinLockouts.employeeCode, schema.people.employeeCode))
        .leftJoin(schema.doors, eq(schema.cabinLockouts.doorId, schema.doors.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(schema.cabinLockouts.createdAt))
        .execute();
      return results;
    } catch (error) {
      console.error("Lockout Join Report Error:", error);
      throw error;
    }
  }
  async getEmployeeDoorAssignments(): Promise<any[]> {
    const assignments = await db
      .select({
        id: schema.employeeDoorAssignments.id,
        employeeCode: schema.employeeDoorAssignments.employeeCode,
        employeeName: schema.people.employeeName,
        doorIds: schema.employeeDoorAssignments.doorIds,
        updatedAt: schema.employeeDoorAssignments.updatedAt
      })
      .from(schema.employeeDoorAssignments)
      .leftJoin(schema.people, eq(schema.employeeDoorAssignments.employeeCode, schema.people.employeeCode));
    const doorList = await db.select({
      id: schema.doors.id,
      name: schema.doors.name
    }).from(schema.doors);
    const doorMap = new Map(doorList.map(d => [d.id, d.name]));
    return assignments.map(asgn => ({
      ...asgn,
      doors: (asgn.doorIds || []).map(id => {
        const doorId = Number(id);
        return {
          id: doorId,
          name: doorMap.get(doorId) || "Unknown Door"
        };
      })
    }));
  }
  async getEmployeeDoorAssignmentByCode(employeeCode: string): Promise<any | undefined> {
    const [assignment] = await db
      .select({
        id: schema.employeeDoorAssignments.id,
        employeeCode: schema.employeeDoorAssignments.employeeCode,
        employeeName: schema.people.employeeName,
        doorIds: schema.employeeDoorAssignments.doorIds,
        updatedAt: schema.employeeDoorAssignments.updatedAt,
      })
      .from(schema.employeeDoorAssignments)
      .leftJoin(schema.people, eq(schema.employeeDoorAssignments.employeeCode, schema.people.employeeCode))
      .where(eq(schema.employeeDoorAssignments.employeeCode, employeeCode));
    if (!assignment) return undefined;
    if (assignment.doorIds && assignment.doorIds.length > 0) {
      const doorList = await db
        .select({ id: schema.doors.id, name: schema.doors.name })
        .from(schema.doors)
        .where(inArray(schema.doors.id, assignment.doorIds));
      return {
        ...assignment,
        doors: doorList
      };
    }
    return { ...assignment, doors: [] };
  }
  async upsertEmployeeDoorAssignment(data: { employeeCode: string; doorIds: number[] }) {
    const result = await db.transaction(async (tx: any) => {
      const uniqueDoorIds = [...new Set(data.doorIds.map(id => Number(id)))];
      const [person] = await tx
        .select()
        .from(schema.people)
        .where(eq(schema.people.employeeCode, data.employeeCode.toString()))
        .limit(1);
      if (!person) throw new Error(`Employee ${data.employeeCode} not found.`);
      if (uniqueDoorIds.length > 0) {
        const validDoors = await tx
          .select({ id: schema.doors.id })
          .from(schema.doors)
          .where(inArray(schema.doors.id, uniqueDoorIds));
        if (validDoors.length !== uniqueDoorIds.length) {
          throw new Error(`Invalid Door IDs detected.`);
        }
      }
      const [upserted] = await tx
        .insert(schema.employeeDoorAssignments)
        .values({
          employeeCode: data.employeeCode.toString(),
          doorIds: uniqueDoorIds,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: schema.employeeDoorAssignments.employeeCode,
          set: { doorIds: uniqueDoorIds, updatedAt: new Date() },
        })
        .returning();
      return { upserted, person };
    });
    try {
      const { person } = result;
      /**
       * Logic using ZONES constant:
       * Agar banda IN ya CABIN mein hai, toh assigned doors unblock honge.
       * Agar OUT hai, toh internal doors block ho jayenge.
       */
      const isCurrentlyInside = (
        person.currentZone === ZONES.IN ||
        person.currentZone === ZONES.CABIN
      );
      const shouldBlockAll = !isCurrentlyInside;
      await this.executeHardwareSync(data.employeeCode.toString(), null, shouldBlockAll);
    } catch (syncError) {
      console.error(`[Hardware Sync Engine Error]:`, syncError);
    }
    return result.upserted;
  }
  async deleteEmployeeDoorAssignment(id: number): Promise<void> {
    await db
      .delete(schema.employeeDoorAssignments)
      .where(eq(schema.employeeDoorAssignments.id, id));
  }

  // 1 & 5: Daily Performance aur Daily Efficiency ke liye
  async getDailyReport(date: string) {
    return await db
      .select()
      .from(dailyAttendanceSummary)
      .where(eq(dailyAttendanceSummary.workDate, date));
  }

  // 2 & 3: Muster Roll aur Overtime Matrix (Date Range)
  async getRangeReport(startDate: string, endDate: string) {
    return await db
      .select()
      .from(dailyAttendanceSummary)
      .where(between(dailyAttendanceSummary.workDate, startDate, endDate))
      .orderBy(asc(dailyAttendanceSummary.workDate));
  }
  // async getRangeReport(startDate: string, endDate: string) {
  //   return await db
  //     .select({
  //       employeeCode: dailyAttendanceSummary.employeeCode,
  //       employeeName: dailyAttendanceSummary.employeeName,
  //       departmentName: dailyAttendanceSummary.departmentName,
  //       // Aggregated Calculations
  //       totalDays: sql<number>`count(${dailyAttendanceSummary.id})`,
  //       totalPresent: sql<number>`count(case when ${dailyAttendanceSummary.status} = 'P' then 1 end)`,
  //       totalAbsent: sql<number>`count(case when ${dailyAttendanceSummary.status} = 'A' then 1 end)`,
  //       totalHalfDay: sql<number>`count(case when ${dailyAttendanceSummary.status} = 'HD' then 1 end)`,
  //       totalWeeklyOff: sql<number>`count(case when ${dailyAttendanceSummary.status} = 'WO' then 1 end)`,
  //       totalHoliday: sql<number>`count(case when ${dailyAttendanceSummary.status} = 'HL' then 1 end)`,

  //       // Minutes to Hours conversion
  //       totalOTHours: sql<number>`sum(${dailyAttendanceSummary.overtimeMinutes}) / 60.0`,
  //       totalProductiveHours: sql<number>`sum(${dailyAttendanceSummary.productiveMinutes}) / 60.0`,
  //       totalOfficeHours: sql<number>`sum(${dailyAttendanceSummary.totalOfficeMinutes}) / 60.0`,

  //       avgEfficiency: sql<number>`avg(${dailyAttendanceSummary.efficiencyPercent})`
  //     })
  //     .from(dailyAttendanceSummary)
  //     .where(between(dailyAttendanceSummary.workDate, startDate, endDate))
  //     .groupBy(
  //       dailyAttendanceSummary.employeeCode,
  //       dailyAttendanceSummary.employeeName,
  //       dailyAttendanceSummary.departmentName
  //     )
  //     .orderBy(asc(dailyAttendanceSummary.employeeName));
  // }
  // 4: Department Wise Manpower & OT Summary
  async getDeptSummary(date: string) {
    return await db
      .select({
        department: dailyAttendanceSummary.departmentName,
        totalEmployees: sql<number>`count(*)`,
        totalOT: sql<number>`sum(${dailyAttendanceSummary.overtimeMinutes})`,
        avgEfficiency: sql<number>`avg(${dailyAttendanceSummary.efficiencyPercent})`,
        totalProductive: sql<number>`sum(${dailyAttendanceSummary.productiveMinutes})`
      })
      .from(dailyAttendanceSummary)
      .where(eq(dailyAttendanceSummary.workDate, date))
      .groupBy(dailyAttendanceSummary.departmentName);
  }

  // 6: Efficiency Analytics (Over a period)
  async getEfficiencyAnalytics(startDate: string, endDate: string, empCode?: string) {
    let conditions = [between(dailyAttendanceSummary.workDate, startDate, endDate)];

    if (empCode) {
      conditions.push(eq(dailyAttendanceSummary.employeeCode, empCode));
    }

    return await db
      .select({
        employeeCode: dailyAttendanceSummary.employeeCode,
        totalDays: sql<number>`count(distinct ${dailyAttendanceSummary.workDate})`,
        avgEfficiency: sql<number>`avg(${dailyAttendanceSummary.efficiencyPercent})`,
        totalProductiveMins: sql<number>`sum(${dailyAttendanceSummary.productiveMinutes})`,
      })
      .from(dailyAttendanceSummary)
      .where(and(...conditions))
      .groupBy(dailyAttendanceSummary.employeeCode);
  }
  // async getMenus(): Promise<MenuMaster[]> {
  //   return await db.select().from(menuMaster).orderBy(asc(menuMaster.sortOrder));
  // }
  async getMenus(): Promise<any[]> {
    const allMenus = await db
      .select()
      .from(menuMaster)
      .orderBy(asc(menuMaster.sortOrder));

    const menuMap: Record<number, any> = {};
    allMenus.forEach((item) => {
      menuMap[item.id] = { ...item, subMenus: [] };
    });

    const tree: any[] = [];

    allMenus.forEach((item) => {
      
      if (item.parentId === 0 || item.parentId === null) {
        tree.push(menuMap[item.id]);
      } else {
        
        const pId = item.parentId as number;
        if (menuMap[pId]) {
          menuMap[pId].subMenus.push(menuMap[item.id]);
        }
      }
    });

    return tree;
  }
  async getMenu(id: number): Promise<MenuMaster | undefined> {
    const [menu] = await db.select().from(menuMaster).where(eq(menuMaster.id, id));
    return menu;
  }

  async createMenu(insertMenu: InsertMenuMaster): Promise<MenuMaster> {
    const [menu] = await db.insert(menuMaster).values(insertMenu).returning();
    return menu;
  }

  async updateMenu(id: number, data: Partial<InsertMenuMaster>): Promise<MenuMaster> {
    const [updatedMenu] = await db
      .update(menuMaster)
      .set(data)
      .where(eq(menuMaster.id, id))
      .returning();
    if (!updatedMenu) throw new Error("Menu not found");
    return updatedMenu;
  }

  async deleteMenu(id: number): Promise<void> {
    await db.delete(menuMaster).where(eq(menuMaster.id, id));
  }
  async getParentMenus(): Promise<MenuMaster[]> {
    return await db
      .select()
      .from(menuMaster)
      .where(eq(menuMaster.parentId, 0)) // Sirf main menus (parentId = 0)
      .orderBy(asc(menuMaster.sortOrder));
  }
  // Sabhi roles fetch karna
  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles);
  }
  async getRoleByCode(roleCode: string): Promise<any | undefined> {
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.roleCode, roleCode));
    return role;
  }

  // Kisi specific role ki saari permissions fetch karna (with Menu details)
  async getRolePermissions(roleId: number) {
    return await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  }

  // Naya Role banana aur default permissions set karna
  async createRoleWithPermissions(roleData: any, permissions: any[]) {
    return await db.transaction(async (tx) => {
      // 1. Pehle Role insert karein
      const [newRole] = await tx.insert(roles).values(roleData).returning();

      // 2. Permissions ko roleId ke sath map karke insert karein
      if (permissions && permissions.length > 0) {
        const permsToInsert = permissions.map((p: any) => ({
          ...p,
          roleId: newRole.id,
        }));
        await tx.insert(rolePermissions).values(permsToInsert);
      }
      return newRole;
    });
  }

  // UPDATE: Role details aur uski Matrix ek sath
  async updateRoleWithPermissions(roleId: number, roleData: any, permissions: any[]) {
    return await db.transaction(async (tx) => {
      // 1. Update Role Metadata
      await tx.update(roles).set(roleData).where(eq(roles.id, roleId));

      if (permissions && permissions.length > 0) {
        // 2. Data Sanitization: Remove duplicate menuIds from incoming array (Safety first)
        const uniquePermissions = Array.from(
          new Map(permissions.map((p) => [p.menuId, p])).values()
        );

        // 3. Clear existing mapping and insert new clean set
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

        const permsToInsert = uniquePermissions.map((p: any) => ({
          roleId: roleId,
          menuId: p.menuId,
          view: p.view ?? false,
          add: p.add ?? false,
          edit: p.edit ?? false,
          delete: p.delete ?? false,
          export: p.export ?? false,
          print: p.print ?? false,
        }));

        await tx.insert(rolePermissions).values(permsToInsert);
      }
    });
  }

  async deleteRole(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
      await tx.delete(roles).where(eq(roles.id, id));
    });
  }

};
export const storage = new DatabaseStorage();
