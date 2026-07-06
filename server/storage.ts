import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isBetween from "dayjs/plugin/isBetween";
import customParseFormat from "dayjs/plugin/customParseFormat";
import mssql from "mssql";
dayjs.extend(utc);
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);
import {
  userProfiles, companies, departments, designations, categories, vendors, sites, buildings, floors, zones, doors, devices, people, credentials, accessCards, shifts, shiftAssignments, holidays, accessLevels, accessRules, personAccess, visitors, visits, attendance, accessLogs, alerts, exceptions, systemSettings, InsertRole, Role, roles,
  type User, type UpsertUser, type UserProfile, type InsertUserProfile, type Company, type InsertCompany, type Department, type InsertDepartment, type Designation, type InsertDesignation, type Category, type InsertCategory, type Vendor, type InsertVendor, type Site, type InsertSite, type Building, type InsertBuilding, type Floor, type InsertFloor, type Zone, type InsertZone, type Door, type InsertDoor, type Device, type InsertDevice, type Person, type InsertPerson, type Credential, type InsertCredential, type AccessCard, type InsertAccessCard, type Shift, type InsertShift, type ShiftAssignment, type InsertShiftAssignment, type Holiday, type InsertHoliday, type AccessLevel, type InsertAccessLevel, type AccessRule, type InsertAccessRule, type PersonAccess, type InsertPersonAccess, type Visitor, type InsertVisitor, type Visit, type InsertVisit, type Attendance, type InsertAttendance, type AccessLog, type InsertAccessLog, type Alert, type InsertAlert, type Exception, type InsertException, type SystemSetting, type InsertSystemSetting,
  blockUnblockLogs, CronMaster, cronMaster, InsertCronMaster, doorDevices, InsertDoorDevice, DoorDevice, BlockUnblockLog, InsertBlockUnblockLog, dailyAttendanceSummary, MenuMaster, InsertMenuMaster, menuMaster, rolePermissions, users, auditLogs, InsertAuditLog, Contractor, InsertContractor, contractors,
  sessions,
  InsertLoginAttempt,
  loginAttempts,
  visitorCards,
  peopleAdditionalDetails,
} from "@shared/schema";
import * as schema from "@shared/schema";
import { db, dbMsSql, mssqlPool, mapMsSqlToSchema } from "./db";
import { eq, desc, or, and, ne, count, sql, ilike, notInArray, inArray, asc, lte, gte, between, not, } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";
import { DeviceAdapter, HolidayAdapter, PersonAdapter, SiteAdapter, VisitorCardAdapter, } from "@shared/mssql_schema";
import { SHIFT_START, SHIFT_END, EXPECTED_WORKING_HRS, ATTENDANCE_STATUS, ALERT_TEMPLATES, ACCESS_RULES, ZONES, EMPLOYEE_STATUS, DEVICE_OFFLINE_THRESHOLD_MINUTES, } from "./constant";
import { esslService } from "./services/essl-service";
import { MAIN_GATE_SYNC } from "./constant";
import { withPagination } from "./utils/pagination.utils";
import bcryptjs from "bcryptjs";
dayjs.extend(isBetween);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserProfiles(): Promise<UserProfile[]>;
  getUserProfile(id: number): Promise<UserProfile | undefined>;
  getUserProfileByUserId(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(
    id: number,
    profile: Partial<InsertUserProfile>,
  ): Promise<UserProfile>;
  getCompanies(): Promise<Company[]>;
  createCompany(data: InsertCompany): Promise<Company>;
  updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company>;
  deleteCompany(id: number): Promise<void>;
  getDepartments(): Promise<Department[]>;
  createDepartment(data: InsertDepartment): Promise<Department>;
  updateDepartment(
    id: number,
    data: Partial<InsertDepartment>,
  ): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;
  getDesignations(): Promise<Designation[]>;
  createDesignation(data: InsertDesignation): Promise<Designation>;
  updateDesignation(
    id: number,
    data: Partial<InsertDesignation>,
  ): Promise<Designation>;
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
  updateCredential(
    id: number,
    data: Partial<InsertCredential>,
  ): Promise<Credential>;
  deleteCredential(id: number): Promise<void>;
  getAccessCards(): Promise<AccessCard[]>;
  createAccessCard(data: InsertAccessCard): Promise<AccessCard>;
  updateAccessCard(
    id: number,
    data: Partial<InsertAccessCard>,
  ): Promise<AccessCard>;
  deleteAccessCard(id: number): Promise<void>;
  getShifts(): Promise<Shift[]>;
  createShift(data: InsertShift): Promise<Shift>;
  updateShift(id: number, data: Partial<InsertShift>): Promise<Shift>;
  deleteShift(id: number): Promise<void>;
  getShiftAssignments(personId?: number): Promise<ShiftAssignment[]>;
  createShiftAssignment(data: InsertShiftAssignment): Promise<ShiftAssignment>;
  updateShiftAssignment(
    id: number,
    data: Partial<InsertShiftAssignment>,
  ): Promise<ShiftAssignment>;
  deleteShiftAssignment(id: number): Promise<void>;
  getHolidays(): Promise<Holiday[]>;
  createHoliday(data: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, data: Partial<InsertHoliday>): Promise<Holiday>;
  deleteHoliday(id: number): Promise<void>;
  getAccessLevels(): Promise<AccessLevel[]>;
  createAccessLevel(data: InsertAccessLevel): Promise<AccessLevel>;
  updateAccessLevel(
    id: number,
    data: Partial<InsertAccessLevel>,
  ): Promise<AccessLevel>;
  deleteAccessLevel(id: number): Promise<void>;
  getAccessRules(): Promise<AccessRule[]>;
  createAccessRule(data: InsertAccessRule): Promise<AccessRule>;
  updateAccessRule(
    id: number,
    data: Partial<InsertAccessRule>,
  ): Promise<AccessRule>;
  deleteAccessRule(id: number): Promise<void>;
  getPersonAccess(personId?: number): Promise<PersonAccess[]>;
  createPersonAccess(data: InsertPersonAccess): Promise<PersonAccess>;
  deletePersonAccess(id: number): Promise<void>;
  getVisitors(
    page?: number,
    pageSize?: number,
    search?: string
  ): Promise<{ data: Visitor[]; totalCount: number; totalPages: number } | Visitor[]>; getVisitor(id: number): Promise<Visitor | undefined>;
  createVisitor(data: InsertVisitor): Promise<Visitor>;
  updateVisitor(id: number, data: Partial<InsertVisitor>): Promise<Visitor>;
  deleteVisitor(id: number): Promise<void>;
  getVisits(status?: string): Promise<Visit[]>;
  createVisit(data: InsertVisit): Promise<Visit>;
  updateVisit(id: number, data: Partial<InsertVisit>): Promise<Visit>;
  getAttendance(
    date?: string,
    locationId?: number,
    personId?: number,
  ): Promise<Attendance[]>;
  createAttendance(data: InsertAttendance): Promise<Attendance>;
  updateAttendance(
    id: number,
    data: Partial<InsertAttendance>,
  ): Promise<Attendance>;
  getAccessLogs(limit?: number, locationId?: number): Promise<AccessLog[]>;
  createAccessLog(data: InsertAccessLog): Promise<AccessLog>;
  getAlerts(isResolved?: boolean): Promise<Alert[]>;
  createAlert(data: InsertAlert): Promise<Alert>;
  updateAlert(id: number, data: Partial<InsertAlert>): Promise<Alert>;
  getExceptions(status?: string): Promise<Exception[]>;
  createException(data: InsertException): Promise<Exception>;
  updateException(
    id: number,
    data: Partial<InsertException>,
  ): Promise<Exception>;
  getSystemSettings(): Promise<SystemSetting[]>;
  upsertSystemSetting(data: InsertSystemSetting): Promise<SystemSetting>;
  getAttendanceReport(filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    departmentId?: number;
    personId?: number;
    locationId?: number;
  }): Promise<any[]>;
  getAccessLogReport(filters: {
    dateFrom?: string;
    dateTo?: string;
    eventType?: string;
    personId?: number;
    locationId?: number;
    doorId?: number;
  }): Promise<any[]>;
  getVisitorReport(filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }): Promise<any[]>;
  getEmployeeSummaryReport(filters: {
    departmentId?: number;
    status?: string;
    personType?: string;
  }): Promise<any[]>;
  // getRoles(): Promise<Role[]>;
  // getRole(id: number): Promise<Role | undefined>;
  // createRole(data: InsertRole): Promise<Role>;
  // updateRole(id: number, data: Partial<InsertRole>): Promise<Role>;
  // deleteRole(id: number): Promise<void>;
  getDashboardStats(): Promise<object>;
  getLockoutEligibleDoors(search?: string): Promise<any[]>;
  updateDoorLockoutStatusBulk(
    doorIds: number[],
    status: boolean,
  ): Promise<any[]>;
  executeEmergencybulkUnblock(
    userId: string | number,
    userName: string,
  ): Promise<any>;
  getEmployeeDoorAssignments(): Promise<any[]>;
  getEmployeeDoorAssignmentByCode(
    employeeCode: string,
  ): Promise<any | undefined>;
  upsertEmployeeDoorAssignment(data: any): Promise<any>;
  deleteEmployeeDoorAssignment(id: number): Promise<void>;
  getMenus(): Promise<MenuMaster[]>;
  getMenu(id: number): Promise<MenuMaster | undefined>;
  createMenu(menu: InsertMenuMaster): Promise<MenuMaster>;
  updateMenu(id: number, menu: Partial<InsertMenuMaster>): Promise<MenuMaster>;
  deleteMenu(id: number): Promise<void>;

  getContractors(): Promise<schema.Contractor[]>;
  getContractor(id: number): Promise<Contractor | undefined>;
  createContractor(contractor: InsertContractor): Promise<Contractor>;
  updateContractor(id: number, contractor: Partial<InsertContractor>): Promise<Contractor>;
  deleteContractor(id: number): Promise<boolean>;

  getVisitorCards(): Promise<any[]>;
  createVisitorCard(card: any): Promise<any>;
  updateVisitorCard(id: number, card: any): Promise<any>;
  deleteVisitorCard(id: number): Promise<void>;
  getVisitorCardById(id: number): Promise<any>;
}
export class DatabaseStorage implements IStorage {
  // async getDeviceLogsWithEmployee(filters?: {
  //   dateFrom?: string;
  //   dateTo?: string;
  //   employeeCode?: string;
  //   deviceId?: string;
  //   doorName?: string;
  // }): Promise<any[]> {
  //   try {
  //     const conditions = [];
  //     if (filters?.dateFrom) {
  //       conditions.push(
  //         gte(schema.employeeActivityLogs.logDate, new Date(filters.dateFrom)),
  //       );
  //     }
  //     if (filters?.dateTo) {
  //       conditions.push(
  //         lte(schema.employeeActivityLogs.logDate, new Date(filters.dateTo)),
  //       );
  //     }
  //     if (filters?.employeeCode) {
  //       conditions.push(
  //         eq(schema.employeeActivityLogs.employeeCode, filters.employeeCode),
  //       );
  //     }
  //     // :white_check_mark: FIXED DOOR FILTER
  //     const doorFilter = filters?.deviceId || filters?.doorName;
  //     if (doorFilter) {
  //       conditions.push(eq(schema.employeeActivityLogs.doorName, doorFilter));
  //     }
  //     const logs = await db
  //       .select({
  //         devicelogid: schema.employeeActivityLogs.deviceLogId,
  //         deviceid: schema.employeeActivityLogs.deviceId,
  //         employeecode: schema.employeeActivityLogs.employeeCode,
  //         logdate: schema.employeeActivityLogs.logDate,
  //         direction: schema.employeeActivityLogs.direction,
  //         employee_name: schema.employeeActivityLogs.employeeName,
  //         department_name: schema.employeeActivityLogs.departmentName,
  //         designation_name: schema.employeeActivityLogs.designationName,
  //         door_name: schema.employeeActivityLogs.doorName,
  //       })
  //       .from(schema.employeeActivityLogs)
  //       .where(conditions.length ? and(...conditions) : undefined)
  //       .orderBy(desc(schema.employeeActivityLogs.deviceLogId));
  //     return logs;
  //   } catch (error) {
  //     console.error("Error in getDeviceLogsWithEmployee:", error);
  //     throw error;
  //   }
  // }
  async getDeviceLogsWithEmployee(
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      employeeCode?: string;
      doorId?: string;
      doorName?: string;
    },
    page?: number | string,
    pageSize?: number | string,
  ): Promise<any> {
    try {
      const conditions = [];
      // if (filters?.dateFrom) {
      //   conditions.push(
      //     gte(schema.employeeActivityLogs.logDate, new Date(filters.dateFrom)),
      //   );
      // }
      // if (filters?.dateTo) {
      //   const endDate = new Date(filters.dateTo);
      //   endDate.setHours(23, 59, 59, 999);

      //   conditions.push(lte(schema.employeeActivityLogs.logDate, endDate));
      // }
      if (filters?.dateFrom) {
        conditions.push(
          sql`DATE(${schema.employeeActivityLogs.logDate}) >= ${filters.dateFrom}`
        );
      }

      if (filters?.dateTo) {
        conditions.push(
          sql`DATE(${schema.employeeActivityLogs.logDate}) <= ${filters.dateTo}`
        );
      }
      // if (filters?.employeeCode) {
      //   conditions.push(
      //     eq(schema.employeeActivityLogs.employeeCode, filters.employeeCode),
      //   );
      // }
      if (filters?.employeeCode) {
        conditions.push(
          or(
            ilike(
              schema.employeeActivityLogs.employeeName,
              `%${filters.employeeCode}%`,
            ),

            ilike(
              schema.employeeActivityLogs.employeeCode,
              `%${filters.employeeCode}%`,
            ),
          ),
        );
      }
      const doorFilter = filters?.doorId;
      if (doorFilter) {
        conditions.push(
          eq(schema.employeeActivityLogs.doorId, parseInt(doorFilter, 10)),
        );
      }
      const logs = await db
        .select({
          devicelogid: schema.employeeActivityLogs.deviceLogId,
          deviceid: schema.employeeActivityLogs.deviceId,
          device_name: schema.employeeActivityLogs.deviceName,
          employeecode: schema.employeeActivityLogs.employeeCode,
          logdate: schema.employeeActivityLogs.logDate,
          direction: schema.employeeActivityLogs.direction,
          employee_name: schema.employeeActivityLogs.employeeName,
          department_name: schema.employeeActivityLogs.departmentName,
          designation_name: schema.employeeActivityLogs.designationName,
          door_name: schema.employeeActivityLogs.doorName,
          door_id: schema.employeeActivityLogs.doorId,
        })
        .from(schema.employeeActivityLogs)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(schema.employeeActivityLogs.deviceLogId));
      return withPagination(
        null,
        null,
        JSON.parse(JSON.stringify(logs)),
        page,
        pageSize,
      );
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
  async getUserProfile(id: number): Promise<any | undefined> {
    const [profile] = await db
      .select({
        id: userProfiles.id,
        employeeCode: userProfiles.employeeCode,
        roleId: userProfiles.roleId,
        isActive: userProfiles.isActive,
        userId: userProfiles.userId,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        roleName: roles.roleName,
        roleCode: roles.code,
      })
      .from(userProfiles)
      .leftJoin(users, eq(userProfiles.userId, users.id))
      .leftJoin(roles, eq(userProfiles.roleId, roles.id))
      .where(eq(userProfiles.id, id));
    return profile;
  }
  async getUserProfiles(
    page?: number | string,
    pageSize?: number | string,
  ): Promise<any> {
    const query = db
      .select({
        id: users.id, // Frontend ko main ID hamesha users table ki UUID milegi
        profileId: userProfiles.id, // Safe index lookup data tracking ke liye alag rakha hai
        employeeCode: userProfiles.employeeCode,
        roleId: userProfiles.roleId,
        isActive: userProfiles.isActive,
        userId: userProfiles.userId,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        roleName: roles.roleName,
        roleCode: roles.code,
        isAccountActive: users.isAccountActive,
      })
      .from(userProfiles)
      .leftJoin(users, eq(userProfiles.userId, users.id))
      .leftJoin(roles, eq(userProfiles.roleId, roles.id))
      .orderBy(asc(userProfiles.id));
    return await withPagination(db, userProfiles, query, page, pageSize);
  }
  async getUserProfileByUserId(
    userId: string,
  ): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile;
  }
  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }
  async updateUserProfile(
    id: number,
    profile: Partial<InsertUserProfile>,
  ): Promise<UserProfile> {
    const [updated] = await db
      .update(userProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(userProfiles.id, id))
      .returning();
    return updated;
  }
  async deleteUser(userId: string): Promise<void> {
    if (!userId || userId.trim() === "") {
      throw new Error("User ID is required for deletion.");
    }
    await db.transaction(async (tx) => {
      await tx.delete(userProfiles).where(eq(userProfiles.userId, userId));
      const [deletedUser] = await tx
        .delete(users)
        .where(eq(users.id, userId))
        .returning();
      if (!deletedUser) {
        throw new Error("User record not found or already deleted.");
      }
    });
  }
  // async getCompanies(page?: number, pageSize?: number): Promise<any> {
  //   const query = db.select().from(companies).orderBy(asc(companies.id));
  //   return await withPagination(db, companies, query, page, pageSize);
  // }

  async getCompanies(
    page?: number,
    pageSize?: number,
    search?: string,
  ): Promise<any> {
    const conditions = [];

    // 🔥 SEARCH FILTER
    if (search && search.trim() !== "") {
      conditions.push(
        or(
          ilike(companies.name, `%${search}%`),
          ilike(companies.shortName, `%${search}%`),
          ilike(companies.email, `%${search}%`),
        ),
      );
    }

    // 🔥 FINAL QUERY
    const baseQuery = db
      .select()
      .from(companies)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(companies.id));

    return await withPagination(db, companies, baseQuery, page, pageSize);
  }
  async createCompany(data: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(data).returning();
    return created;
  }
  async updateCompany(
    id: number,
    data: Partial<InsertCompany>,
  ): Promise<Company> {
    const [updated] = await db
      .update(companies)
      .set(data)
      .where(eq(companies.id, id))
      .returning();
    return updated;
  }
  async deleteCompany(id: number): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  // async getDepartments(page?: number, pageSize?: number): Promise<any> {
  //   const query = db.select().from(departments).orderBy(asc(departments.name));
  //   return await withPagination(db, departments, query, page, pageSize);
  // }
  async getDepartments(
    page?: number,
    pageSize?: number,
    search?: string,
  ): Promise<any> {
    // 1. Base query banao
    let query = db.select().from(departments);

    // 2. Agar search term hai, toh filters add karo
    if (search) {
      query = query.where(
        or(
          ilike(departments.name, `%${search}%`),
          ilike(departments.code, `%${search}%`),
        ),
      ) as any;
    }

    // 3. Order set karo
    query.orderBy(asc(departments.name));

    // 4. Pagination ke saath return karo
    return await withPagination(db, departments, query, page, pageSize);
  }
  // async createDepartment(data: InsertDepartment): Promise<Department> {
  //   const [created] = await db.insert(departments).values(data).returning();
  //   return created;
  // }
  async createDepartment(data: InsertDepartment): Promise<Department> {
    if (!data.code) {
      throw new Error("Department code is required.");
    }

    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.code, data.code));

    if (existing) {
      throw new Error(`Department code '${data.code}' already exists.`);
    }

    const [created] = await db.insert(departments).values(data).returning();

    return created;
  }
  async updateDepartment(
    id: number,
    data: Partial<InsertDepartment>,
  ): Promise<Department> {
    const [updated] = await db
      .update(departments)
      .set(data)
      .where(eq(departments.id, id))
      .returning();
    return updated;
  }
  async deleteDepartment(id: number): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }
  // async getDesignations(page?: number, pageSize?: number): Promise<any> {
  //   const query = db
  //     .select()
  //     .from(designations)
  //     .orderBy(asc(designations.name));
  //   return await withPagination(db, designations, query, page, pageSize);
  // }
  async getDesignations(
    page?: number,
    pageSize?: number,
    search?: string,
  ): Promise<any> {
    const baseQuery = db.select().from(designations);

    const query = search
      ? baseQuery.where(ilike(designations.name, `%${search}%`))
      : baseQuery;

    return await withPagination(
      db,
      designations,
      query.orderBy(asc(designations.name)),
      page,
      pageSize,
    );
  }
  // async createDesignation(data: InsertDesignation): Promise<Designation> {
  //   const [created] = await db.insert(designations).values(data).returning();
  //   return created;
  // }
  async createDesignation(data: InsertDesignation): Promise<Designation> {
    if (!data.code) {
      throw new Error("Designation code is required.");
    }

    const [existing] = await db
      .select()
      .from(designations)
      .where(eq(designations.code, data.code));

    if (existing) {
      throw new Error(`Designation code '${data.code}' already exists.`);
    }

    const [created] = await db.insert(designations).values(data).returning();

    return created;
  }
  async updateDesignation(
    id: number,
    data: Partial<InsertDesignation>,
  ): Promise<Designation> {
    const [updated] = await db
      .update(designations)
      .set(data)
      .where(eq(designations.id, id))
      .returning();
    return updated;
  }
  async deleteDesignation(id: number): Promise<void> {
    await db.delete(designations).where(eq(designations.id, id));
  }
  // async getCategories(page?: number, pageSize?: number): Promise<any> {
  //   const query = db.select().from(categories).orderBy(asc(categories.id));
  //   return await withPagination(db, categories, query, page, pageSize);
  // }
  async getCategories(
    page?: number,
    pageSize?: number,
    search?: string,
  ): Promise<any> {
    const baseQuery = db.select().from(categories);

    const query = search
      ? baseQuery.where(ilike(categories.name, `%${search}%`))
      : baseQuery;

    return await withPagination(
      db,
      categories,
      query.orderBy(asc(categories.id)),
      page,
      pageSize,
    );
  }
  async createCategory(data: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(data).returning();
    return created;
  }
  async updateCategory(
    id: number,
    data: Partial<InsertCategory>,
  ): Promise<Category> {
    const [updated] = await db
      .update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
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
    const [updated] = await db
      .update(vendors)
      .set(data)
      .where(eq(vendors.id, id))
      .returning();
    return updated;
  }
  async deleteVendor(id: number): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
  }
  async getSites(): Promise<Site[]> {
    const [pgData, msDataRaw] = await Promise.all([
      db.select().from(sites),
      dbMsSql.select().from({ dbName: "Locations" }).execute(),
    ]);
    const msIds = new Set();
    const currentSites = [...pgData];
    for (const msRow of msDataRaw || []) {
      const mapped = SiteAdapter.toPostgres(msRow);
      msIds.add(mapped.msId);
      const exists = currentSites.find((s) => s.msId === mapped.msId);
      if (mapped.msId && !exists) {
        try {
          const [newRec] = await db
            .insert(sites)
            .values({
              msId: mapped.msId,
              name: mapped.name,
              code: mapped.code,
              timezone: "Asia/Kolkata",
              isActive: true,
              createdAt: new Date(),
            })
            .returning();
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
      await dbMsSql.insert({ dbName: "Locations" }).values({
        Code: msData.Code,
        Description: msData.Description,
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
          await dbMsSql
            .delete({ dbName: "Locations", pk: "Id" })
            .where({ value: record.msId });
        } catch (e) { }
      }
      await db.delete(sites).where(eq(sites.id, id));
    }
  }
  async getBuildings(locationId?: number): Promise<Building[]> {
    if (locationId) {
      return await db
        .select()
        .from(buildings)
        .where(eq(buildings.locationId, locationId));
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
  async updateBuilding(
    id: number,
    data: Partial<InsertBuilding>,
  ): Promise<Building> {
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
      return await db
        .select()
        .from(floors)
        .where(eq(floors.buildingId, buildingId));
    }
    return await db.select().from(floors);
  }
  async createFloor(data: InsertFloor): Promise<Floor> {
    const [created] = await db.insert(floors).values(data).returning();
    return created;
  }
  async updateFloor(id: number, data: Partial<InsertFloor>): Promise<Floor> {
    const [updated] = await db
      .update(floors)
      .set(data)
      .where(eq(floors.id, id))
      .returning();
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
      return await db
        .select()
        .from(zones)
        .where(and(...conditions));
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
        .where(and(eq(zones.name, data.name), ne(zones.id, id)));
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
  // async getDoors(
  //   page?: number | string,
  //   pageSize?: number | string,
  // ): Promise<any> {
  //   try {
  //     // Data fetch karte waqt hi order laga diya taaki sorting bani rahe
  //     const [allDoors, allDoorDevices, allDevices] = await Promise.all([
  //       db.select().from(doors).orderBy(asc(doors.id)),
  //       db.select().from(doorDevices),
  //       db.select().from(devices),
  //     ]);
  //     const resolvedDoors = allDoors.map((door) => {
  //       const mapping = allDoorDevices.find((md) => md.doorId === door.id);
  //       const resolveDevices = (ids: any[] | null) => {
  //         if (!ids || !Array.isArray(ids)) return [];
  //         return ids
  //           .map((id) => {
  //             const dev = allDevices.find((d) => Number(d.msId) === Number(id));
  //             return dev
  //               ? { id: dev.id, msId: dev.msId, name: dev.name }
  //               : null;
  //           })
  //           .filter(
  //             (d): d is { id: number; msId: number; name: string } =>
  //               d !== null,
  //           );
  //       };
  //       const inDevices = resolveDevices(mapping?.inDeviceIds || []);
  //       const outDevices = resolveDevices(mapping?.outDeviceIds || []);
  //       return {
  //         ...door,
  //         inDevices,
  //         outDevices,
  //         inCount: inDevices.length,
  //         outCount: outDevices.length,
  //       };
  //     });
  //     // --- Pagination Layer ---
  //     // Rule: Agar pageSize nahi mila, toh jaise abhi simple array response aa raha hai, waisa hi return karo
  //     if (!pageSize) {
  //       return resolvedDoors;
  //     }
  //     // Rule: Agar pageSize -1 hai, toh object format mein all data do
  //     if (pageSize === -1 || pageSize === "-1") {
  //       return {
  //         data: resolvedDoors,
  //         totalCount: resolvedDoors.length,
  //         totalPages: 1,
  //         currentPage: 1,
  //         pageSize: resolvedDoors.length,
  //       };
  //     }
  //     const p = page && Number(page) > 0 ? Number(page) : 1;
  //     const size = Number(pageSize) > 0 ? Number(pageSize) : 1;
  //     const start = (p - 1) * size;
  //     const end = start + size;
  //     const paginatedData = resolvedDoors.slice(start, end);
  //     return {
  //       data: paginatedData,
  //       totalCount: resolvedDoors.length,
  //       totalPages: Math.ceil(resolvedDoors.length / size),
  //       currentPage: p,
  //       pageSize: size,
  //     };
  //   } catch (error) {
  //     console.error("getDoors MS_ID Sync Error:", error);
  //     // Fallback response handling based on pageSize presence
  //     return pageSize
  //       ? {
  //         data: [],
  //         totalCount: 0,
  //         totalPages: 0,
  //         currentPage: 1,
  //         pageSize: 0,
  //       }
  //       : [];
  //   }
  // }

  // async getDoors(): Promise<any[]> {
  //   try {
  //     const [allDoors, allDoorDevices, allDevices] = await Promise.all([
  //       db.select().from(doors),
  //       db.select().from(doorDevices),
  //       db.select().from(devices)
  //     ]);
  //     return allDoors.map((door) => {
  //       const mapping = allDoorDevices.find((md) => md.doorId === door.id);
  //       const resolveDevices = (ids: any[] | null) => {
  //         if (!ids || !Array.isArray(ids)) return [];
  //         return ids.map(id => {
  //           const dev = allDevices.find(d => Number(d.msId) === Number(id));
  //           return dev ? { id: dev.id, msId: dev.msId, name: dev.name } : null;
  //         }).filter((d): d is { id: number; msId: number; name: string } => d !== null);
  //       };
  //       const inDevices = resolveDevices(mapping?.inDeviceIds || []);
  //       const outDevices = resolveDevices(mapping?.outDeviceIds || []);
  //       return {
  //         ...door,
  //         inDevices,
  //         outDevices,
  //         inCount: inDevices.length,
  //         outCount: outDevices.length
  //       };
  //     });
  //   } catch (error) {
  //     console.error("getDoors MS_ID Sync Error:", error);
  //     return [];
  //   }
  // }

  async getDoors(
    page?: number | string,
    pageSize?: number | string,
    search?: string,
  ): Promise<any> {
    try {
      const [allDoors, allDoorDevices, allDevices] = await Promise.all([
        db.select().from(doors).orderBy(asc(doors.id)),
        db.select().from(doorDevices),
        db.select().from(devices),
      ]);

      // -------------------------
      // DEVICE MAPPING
      // -------------------------
      const resolvedDoors = allDoors.map((door) => {
        const mapping = allDoorDevices.find((md) => md.doorId === door.id);

        const resolveDevices = (ids: any[] | null) => {
          if (!ids || !Array.isArray(ids)) return [];

          return ids
            .map((id) => {
              const dev = allDevices.find((d) => Number(d.msId) === Number(id));

              return dev
                ? { id: dev.id, msId: dev.msId, name: dev.name }
                : null;
            })
            .filter(Boolean) as { id: number; msId: number; name: string }[];
        };

        const inDevices = resolveDevices(mapping?.inDeviceIds || []);
        const outDevices = resolveDevices(mapping?.outDeviceIds || []);

        return {
          ...door,
          inDevices,
          outDevices,
          inCount: inDevices.length,
          outCount: outDevices.length,
        };
      });

      // -------------------------
      // SEARCH LOGIC
      // -------------------------
      const searchText = search?.toLowerCase().trim();

      const filteredDoors = searchText
        ? resolvedDoors.filter((door) => {
          return (
            door.name?.toLowerCase().includes(searchText) ||
            door.code?.toLowerCase().includes(searchText) ||
            door.doorType?.toLowerCase().includes(searchText)
          );
        })
        : resolvedDoors;

      // -------------------------
      // NO PAGINATION CASE
      // -------------------------
      if (!pageSize) {
        return filteredDoors;
      }

      // -------------------------
      // ALL DATA CASE
      // -------------------------
      if (pageSize === -1 || pageSize === "-1") {
        return {
          data: filteredDoors,
          totalCount: filteredDoors.length,
          totalPages: 1,
          currentPage: 1,
          pageSize: filteredDoors.length,
        };
      }

      // -------------------------
      // PAGINATION
      // -------------------------
      const p = page && Number(page) > 0 ? Number(page) : 1;
      const size = Number(pageSize) > 0 ? Number(pageSize) : 10;

      const start = (p - 1) * size;
      const end = start + size;

      const paginatedData = filteredDoors.slice(start, end);

      return {
        data: paginatedData,
        totalCount: filteredDoors.length,
        totalPages: Math.ceil(filteredDoors.length / size),
        currentPage: p,
        pageSize: size,
      };
    } catch (error) {
      console.error("getDoors Error:", error);

      return pageSize
        ? {
          data: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: 1,
          pageSize: 0,
        }
        : [];
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

  // async getDevices(
  //   page?: number | string,
  //   pageSize?: number | string,
  // ): Promise<any> {
  //   try {
  //     const msDataRaw = await dbMsSql
  //       .select()
  //       .from({ dbName: "Devices" })
  //       .execute();
  //     if (!msDataRaw || msDataRaw.length === 0) {
  //       return pageSize
  //         ? {
  //           data: [],
  //           totalCount: 0,
  //           totalPages: 0,
  //           currentPage: 1,
  //           pageSize: 0,
  //           onlineCount: 0,
  //           offlineCount: 0,
  //         }
  //         : [];
  //     }
  //     const currentTime = new Date();
  //     const THRESHOLD_MINUTES = 1;
  //     // Counts track karne ke liye counters
  //     let onlineCount = 0;
  //     let offlineCount = 0;
  //     const formattedDevices = msDataRaw.map((d: any) => {
  //       let lPing: Date | null = null;
  //       let calculatedStatus = "offline";
  //       if (d.LastPing) {
  //         lPing = new Date(d.LastPing);
  //         let diffInMs = currentTime.getTime() - lPing.getTime();
  //         let diffInMinutes = diffInMs / 60000;
  //         const absDiff = Math.abs(diffInMinutes);
  //         if (
  //           absDiff <= THRESHOLD_MINUTES ||
  //           Math.abs(absDiff - 330) <= THRESHOLD_MINUTES
  //         ) {
  //           calculatedStatus = "online";
  //         }
  //       }
  //       // Loop chalte waise hi status count kar rahe hain (Alag se loop chalane ki zarurat nahi, performance bachegi)
  //       if (calculatedStatus === "online") {
  //         onlineCount++;
  //       } else {
  //         offlineCount++;
  //       }
  //       return {
  //         msId: d.DeviceId || d.DeviceID,
  //         name: d.DeviceName || "Unnamed Device",
  //         deviceDirection: d.DeviceDirection || null,
  //         serialNumber: d.SerialNumber || d.serialno,
  //         opstamp: d.OpStamp ? String(d.OpStamp) : null,
  //         lastPing: lPing,
  //         lastreset: d.LastReset ? new Date(d.LastReset) : null,
  //         activationCode: d.ActivationCode || "",
  //         isAttendanceDevice: d.IsAttendanceDevice ? 1 : 0,
  //         deviceType: String(d.DeviceType || "-").toLowerCase(),
  //         locationId: d.LocationId || null,
  //         ipAddress: d.IpAddress || "",
  //         lastHeartbeat: lPing,
  //         status: calculatedStatus,
  //         isActive: true,
  //       };
  //     });
  //     // Sync to Local Postgres
  //     for (const dev of formattedDevices) {
  //       await db
  //         .insert(devices)
  //         .values(dev)
  //         .onConflictDoUpdate({
  //           target: devices.msId,
  //           set: { ...dev },
  //         });
  //     }
  //     const currentMsIds = formattedDevices.map((d) => d.msId as number);
  //     if (currentMsIds.length > 0) {
  //       await db.delete(devices).where(notInArray(devices.msId, currentMsIds));
  //     }
  //     // --- Pagination Logic ---
  //     // Rule: Agar pageSize nahi mila, toh normal array format
  //     if (!pageSize) {
  //       return formattedDevices;
  //     }
  //     // Rule: Agar pageSize -1 hai, toh object format mein all data + counts
  //     if (pageSize === -1 || pageSize === "-1") {
  //       return {
  //         data: formattedDevices,
  //         totalCount: formattedDevices.length,
  //         totalPages: 1,
  //         currentPage: 1,
  //         pageSize: formattedDevices.length,
  //         onlineCount, // <-- Added here
  //         offlineCount, // <-- Added here
  //       };
  //     }
  //     const p = page && Number(page) > 0 ? Number(page) : 1;
  //     const size = Number(pageSize) > 0 ? Number(pageSize) : 1;
  //     const start = (p - 1) * size;
  //     const end = start + size;
  //     const paginatedData = formattedDevices.slice(start, end);
  //     return {
  //       data: paginatedData,
  //       totalCount: formattedDevices.length,
  //       totalPages: Math.ceil(formattedDevices.length / size),
  //       currentPage: p,
  //       pageSize: size,
  //       onlineCount, // <-- Added here
  //       offlineCount, // <-- Added here
  //     };
  //   } catch (error) {
  //     console.error("Device Sync Error:", error);
  //     return pageSize
  //       ? {
  //         data: [],
  //         totalCount: 0,
  //         totalPages: 0,
  //         currentPage: 1,
  //         pageSize: 0,
  //         onlineCount: 0,
  //         offlineCount: 0,
  //       }
  //       : [];
  //   }
  // }

  async getDevices(
    page?: number | string,
    pageSize?: number | string,
    search?: string,
  ): Promise<any> {
    try {
      const msDataRaw = await dbMsSql
        .select()
        .from({ dbName: "Devices" })
        .execute();

      if (!msDataRaw || msDataRaw.length === 0) {
        return {
          data: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: 1,
          pageSize: 0,
          onlineCount: 0,
          offlineCount: 0,
        };
      }

      const currentTime = new Date();
      const THRESHOLD_MINUTES = DEVICE_OFFLINE_THRESHOLD_MINUTES;

      let onlineCount = 0;
      let offlineCount = 0;

      // 🔥 STEP 1: FORMAT DATA
      let formattedDevices = msDataRaw.map((d: any) => {
        let lPing: Date | null = null;
        let calculatedStatus = "offline";

        if (d.LastPing) {
          lPing = new Date(d.LastPing);
          let diffInMs = currentTime.getTime() - lPing.getTime();
          let diffInMinutes = diffInMs / 60000;

          const absDiff = Math.abs(diffInMinutes);

          if (
            absDiff <= THRESHOLD_MINUTES ||
            Math.abs(absDiff - 330) <= THRESHOLD_MINUTES
          ) {
            calculatedStatus = "online";
          }
        }

        if (calculatedStatus === "online") onlineCount++;
        else offlineCount++;

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
          isActive: true,
        };
      });

      // 🔥 STEP 2: SEARCH FILTER (IMPORTANT)
      if (search && search.trim()) {
        const s = search.toLowerCase();

        formattedDevices = formattedDevices.filter(
          (d) =>
            d.name?.toLowerCase().includes(s) ||
            d.ipAddress?.toLowerCase().includes(s) ||
            d.serialNumber?.toLowerCase().includes(s) ||
            d.deviceType?.toLowerCase().includes(s),
        );
      }

      // 🔥 STEP 3: SYNC DB
      for (const dev of formattedDevices) {
        await db
          .insert(devices)
          .values(dev)
          .onConflictDoUpdate({
            target: devices.msId,
            set: { ...dev },
          });
      }

      const currentMsIds = formattedDevices.map((d) => d.msId as number);

      if (currentMsIds.length > 0) {
        await db.delete(devices).where(notInArray(devices.msId, currentMsIds));
      }

      // 🔥 STEP 4: PAGINATION
      if (!pageSize) return formattedDevices;

      if (pageSize === -1 || pageSize === "-1") {
        return {
          data: formattedDevices,
          totalCount: formattedDevices.length,
          totalPages: 1,
          currentPage: 1,
          pageSize: formattedDevices.length,
          onlineCount,
          offlineCount,
        };
      }

      const p = page && Number(page) > 0 ? Number(page) : 1;
      const size = Number(pageSize) > 0 ? Number(pageSize) : 1;

      const start = (p - 1) * size;
      const end = start + size;

      const paginatedData = formattedDevices.slice(start, end);

      return {
        data: paginatedData,
        totalCount: formattedDevices.length,
        totalPages: Math.ceil(formattedDevices.length / size),
        currentPage: p,
        pageSize: size,
        onlineCount,
        offlineCount,
      };
    } catch (error) {
      console.error("Device Sync Error:", error);

      return {
        data: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        pageSize: 0,
        onlineCount: 0,
        offlineCount: 0,
      };
    }
  }

  // async getDevices(): Promise<any[]> {
  //   try {
  //     const msDataRaw = await dbMsSql
  //       .select()
  //       .from({ dbName: "Devices" })
  //       .execute();
  //     if (!msDataRaw || msDataRaw.length === 0) return [];
  //     const currentTime = new Date();
  //     const THRESHOLD_MINUTES = 1;
  //     const formattedDevices = msDataRaw.map((d: any) => {
  //       let lPing: Date | null = null;
  //       let calculatedStatus = "offline";
  //       if (d.LastPing) {
  //         lPing = new Date(d.LastPing);
  //         let diffInMs = currentTime.getTime() - lPing.getTime();
  //         let diffInMinutes = diffInMs / 60000;
  //         const absDiff = Math.abs(diffInMinutes);
  //         if (
  //           absDiff <= THRESHOLD_MINUTES ||
  //           Math.abs(absDiff - 330) <= THRESHOLD_MINUTES
  //         ) {
  //           calculatedStatus = "online";
  //         }
  //       }
  //       return {
  //         msId: d.DeviceId || d.DeviceID,
  //         name: d.DeviceName || "Unnamed Device",
  //         deviceDirection: d.DeviceDirection || null,
  //         serialNumber: d.SerialNumber || d.serialno,
  //         opstamp: d.OpStamp ? String(d.OpStamp) : null,
  //         lastPing: lPing,
  //         lastreset: d.LastReset ? new Date(d.LastReset) : null,
  //         activationCode: d.ActivationCode || "",
  //         isAttendanceDevice: d.IsAttendanceDevice ? 1 : 0,
  //         deviceType: String(d.DeviceType || "-").toLowerCase(),
  //         locationId: d.LocationId || null,
  //         ipAddress: d.IpAddress || "",
  //         lastHeartbeat: lPing,
  //         status: calculatedStatus,
  //         isActive: true,
  //       };
  //     });
  //     for (const dev of formattedDevices) {
  //       await db
  //         .insert(devices)
  //         .values(dev)
  //         .onConflictDoUpdate({
  //           target: devices.msId,
  //           set: {
  //             name: dev.name,
  //             deviceDirection: dev.deviceDirection,
  //             serialNumber: dev.serialNumber,
  //             opstamp: dev.opstamp,
  //             lastPing: dev.lastPing,
  //             lastreset: dev.lastreset,
  //             activationCode: dev.activationCode,
  //             isAttendanceDevice: dev.isAttendanceDevice,
  //             deviceType: dev.deviceType,
  //             locationId: dev.locationId,
  //             ipAddress: dev.ipAddress,
  //             lastHeartbeat: dev.lastHeartbeat,
  //             status: dev.status,
  //             isActive: true,
  //           },
  //         });
  //     }
  //     const currentMsIds = formattedDevices.map((d) => d.msId as number);
  //     if (currentMsIds.length > 0) {
  //       await db.delete(devices).where(notInArray(devices.msId, currentMsIds));
  //     }
  //     return formattedDevices;
  //   } catch (error) {
  //     console.error("Device Sync Error:", error);
  //     return [];
  //   }
  // }
  async createDevice(data: InsertDevice): Promise<Device> {
    let mssqlId: number | null = null;
    try {
      const msRes = await dbMsSql
        .insert({ dbName: "Devices" })
        .values(DeviceAdapter.toMsSql(data));
      if (msRes.recordset && msRes.recordset.length > 0) {
        mssqlId = msRes.recordset[0].DeviceId || msRes.recordset[0].Id;
      }
    } catch (e) {
      console.error("MS SQL Device Sync Error:", e);
    }
    const [created] = await db
      .insert(devices)
      .values({
        ...data,
        msId: mssqlId,
        isActive: true,
      })
      .returning();
    return created;
  }
  async updateDevice(id: number, data: Partial<InsertDevice>): Promise<Device> {
    const [record] = await db
      .select()
      .from(devices)
      .where(or(eq(devices.id, id), eq(devices.msId, id)));
    if (!record) {
      throw new Error("Device not found in Postgres.");
    }
    const [updated] = await db
      .update(devices)
      .set(data)
      .where(eq(devices.id, record.id))
      .returning();
    if (updated.msId) {
      try {
        await dbMsSql
          .update({ dbName: "Devices", pk: "DeviceId" })
          .set(DeviceAdapter.toMsSql(data))
          .where({ value: updated.msId });
      } catch (e) {
        console.error("MS SQL Device Update Error", e);
      }
    }
    return updated;
  }
  async deleteDevice(msId: number): Promise<void> {
    const [record] = await db
      .select()
      .from(devices)
      .where(eq(devices.msId, msId));
    if (record) {
      try {
        await dbMsSql
          .delete({ dbName: "Devices", pk: "DeviceId" })
          .where({ value: msId });
      } catch (e) {
        console.error("MS SQL Sync Delete Error:", e);
      }
      await db.delete(devices).where(eq(devices.msId, msId));
    }
  }

  // ==========================
  // STORAGE
  // ==========================

  // async getPeople(
  //   search?: string,
  //   page?: number | string,
  //   pageSize?: number | string,
  // ): Promise<any> {
  //   const [pgDataRaw, msDataRaw] = await Promise.all([
  //     db
  //       .select({
  //         person: {
  //           ...people,
  //           lastSeenTime: sql<string>`
  //           TO_CHAR(${people.lastSeenTime}, 'YYYY-MM-DD"T"HH24:MI:SS')
  //         `,
  //         },
  //         departmentName: departments.name,
  //         designationName: designations.name,
  //         lastPunchDoorName: doors.name,
  //       })
  //       .from(people)
  //       .leftJoin(departments, eq(people.departmentId, departments.id))
  //       .leftJoin(designations, eq(people.designationId, designations.id))
  //       .leftJoin(doors, eq(people.lastPunchDoorId, doors.id)),

  //     dbMsSql.select().from({ dbName: "Employees" }).execute(),
  //   ]);

  //   const msIds = new Set();

  //   const ruleIdToName = Object.fromEntries(
  //     Object.entries(ACCESS_RULES).map(([key, value]) => [value, key]),
  //   );

  //   const currentPgData = pgDataRaw.map((row) => ({
  //     ...row.person,
  //     departmentName: row.departmentName || "N/A",
  //     designationName: row.designationName || "N/A",
  //     lastPunchDoorName: row.lastPunchDoorName || "No Door",
  //     ruleName:
  //       row.person.ruleid !== null
  //         ? ruleIdToName[row.person.ruleid] || "UNKNOWN_RULE"
  //         : "NO_RULE",
  //   }));

  //   // ==========================
  //   // MSSQL SYNC
  //   // ==========================

  //   for (const msRow of msDataRaw || []) {
  //     const mapped = PersonAdapter.toPostgres(msRow);

  //     if (!mapped.msId) continue;

  //     msIds.add(mapped.msId);

  //     const existingIndex = currentPgData.findIndex(
  //       (p) => p.msId === mapped.msId,
  //     );

  //     // ==========================
  //     // INSERT
  //     // ==========================

  //     if (existingIndex === -1) {
  //       try {
  //         const [newRec] = await db
  //           .insert(people)
  //           .values({
  //             msId: mapped.msId,
  //             employeeCode: mapped.employeeCode,
  //             employeeName: mapped.employeeName ?? "Unknown",
  //             // address: mapped.address ?? null,
  //             ruleid: mapped.ruleid ?? null,
  //             locationId: mapped.locationId ?? null,
  //             externalId: mapped.externalId ?? null,
  //             overtimeEligible: mapped.overtimeEligible ?? false,
  //             personType: "employee",
  //             status: "active",
  //             sourceSystem: "mssql_bio",
  //             updatedAt: new Date(),
  //             createdAt: new Date(),
  //           })
  //           .returning();

  //         if (newRec?.employeeCode) {
  //           // await this.executeHardwareSync(newRec.employeeCode, null, true);
  //           this.executeHardwareSyncBackground(newRec.employeeCode);
  //         }

  //         currentPgData.push({
  //           ...newRec,
  //           departmentName: "N/A",
  //           designationName: "N/A",
  //           lastPunchDoorName: "No Door",
  //           ruleName:
  //             newRec.ruleid !== null
  //               ? ruleIdToName[newRec.ruleid] || "UNKNOWN_RULE"
  //               : "NO_ROLE",
  //         });
  //       } catch (e) {
  //         console.error("New employee sync error:", e);
  //       }
  //     }

  //     // ==========================
  //     // UPDATE
  //     // ==========================
  //     else {
  //       const existing = currentPgData[existingIndex];

  //       const hasChanged =
  //         existing.employeeName !== mapped.employeeName ||
  //         existing.employeeCode !== mapped.employeeCode ||
  //         existing.ruleid !== mapped.ruleid;

  //       if (hasChanged) {
  //         try {
  //           const [updatedRec] = await db
  //             .update(people)
  //             .set({
  //               employeeName: mapped.employeeName ?? "Unknown",
  //               employeeCode: mapped.employeeCode,
  //               // address: mapped.address ?? null,
  //               updatedAt: new Date(),
  //             })
  //             .where(eq(people.msId, mapped.msId))
  //             .returning();

  //           currentPgData[existingIndex] = {
  //             ...existing,
  //             ...updatedRec,
  //             ruleName:
  //               updatedRec.ruleid !== null
  //                 ? ruleIdToName[updatedRec.ruleid] || "UNKNOWN_RULE"
  //                 : "NO_ROLE",
  //           };
  //         } catch (e) {
  //           console.error("Employee update sync error:", e);
  //         }
  //       }
  //     }
  //   }

  //   // ==========================
  //   // DELETE REMOVED MSSQL USERS
  //   // ==========================

  //   for (const pgRow of currentPgData) {
  //     if (pgRow.msId && !msIds.has(pgRow.msId)) {
  //       try {
  //         await db.delete(people).where(eq(people.msId, pgRow.msId));
  //       } catch (e) { }
  //     }
  //   }

  //   // ==========================
  //   // SEARCH
  //   // ==========================

  //   let results = currentPgData;

  //   if (search?.trim()) {
  //     const term = search.toLowerCase();

  //     results = results.filter(
  //       (p) =>
  //         p.employeeName?.toLowerCase().includes(term) ||
  //         p.employeeCode?.toLowerCase().includes(term) ||
  //         p.departmentName?.toLowerCase().includes(term) ||
  //         p.ruleName?.toLowerCase().includes(term),
  //     );
  //   }

  //   // ==========================
  //   // SORT
  //   // ==========================

  //   results.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

  //   // ==========================
  //   // UNIQUE
  //   // ==========================

  //   const uniquePeople = Array.from(
  //     new Map(
  //       results.map((p) => [`${p.msId || p.employeeCode || p.id}`, p]),
  //     ).values(),
  //   );

  //   // ==========================
  //   // OLD FORMAT
  //   // ==========================

  //   if (!pageSize) {
  //     return uniquePeople as Person[];
  //   }

  //   // ==========================
  //   // ALL RECORDS
  //   // ==========================

  //   if (pageSize === -1 || pageSize === "-1") {
  //     return {
  //       data: uniquePeople,
  //       totalCount: uniquePeople.length,
  //       totalPages: 1,
  //       currentPage: 1,
  //       pageSize: uniquePeople.length,
  //     };
  //   }

  //   // ==========================
  //   // PAGINATION
  //   // ==========================

  //   const p = page && Number(page) > 0 ? Number(page) : 1;

  //   const size = Number(pageSize) > 0 ? Number(pageSize) : 10;

  //   const start = (p - 1) * size;

  //   const end = start + size;

  //   const paginatedData = uniquePeople.slice(start, end);

  //   return {
  //     data: paginatedData,
  //     totalCount: uniquePeople.length,
  //     totalPages: Math.ceil(uniquePeople.length / size),
  //     currentPage: p,
  //     pageSize: size,
  //   };
  // }

  async getPeople(
    search?: string,
    page?: number | string,
    pageSize?: number | string,
  ): Promise<any> {
    // ==========================
    // 1. FETCH RAW DATA FROM POSTGRES & MSSQL
    // ==========================
    const [pgDataRaw, msDataRaw] = await Promise.all([
      db
        .select({
          person: {
            ...people,
            lastSeenTime: sql<string>`
            TO_CHAR(${people.lastSeenTime}, 'YYYY-MM-DD"T"HH24:MI:SS')
          `,
          },
          departmentName: departments.name,
          designationName: designations.name,
          lastPunchDoorName: doors.name,
          additionalDetails: peopleAdditionalDetails,
        })
        .from(people)
        .leftJoin(departments, eq(people.departmentId, departments.id))
        .leftJoin(designations, eq(people.designationId, designations.id))
        .leftJoin(doors, eq(people.lastPunchDoorId, doors.id))
        .leftJoin(peopleAdditionalDetails, eq(people.employeeCode, peopleAdditionalDetails.employeeCode)),

      dbMsSql.select().from({ dbName: "Employees" }).execute(),
    ]);

    const msIds = new Set();

    const ruleIdToName = Object.fromEntries(
      Object.entries(ACCESS_RULES).map(([key, value]) => [value, key]),
    );

    // ==========================
    // FLAT MAPPING (Sare Columns Ek Sath)
    // ==========================
    const currentPgData = pgDataRaw.map((row) => {
      // logo ke additional details ke id aur timestamps ko destructure kar rahe hain 
      // taaki wo main people table ke id, createdAt, updatedAt ko overwrite na karein.
      const {
        id: _detailId,
        employeeCode: _detailCode,
        createdAt: _detailCreated,
        updatedAt: _detailUpdated,
        ...restOfAdditionalDetails
      } = row.additionalDetails || {};

      return {
        ...row.person,                  // Main people data
        ...restOfAdditionalDetails,     // Flat additional details (cardNo, companyUnit, etc.)
        departmentName: row.departmentName || "N/A",
        designationName: row.designationName || "N/A",
        lastPunchDoorName: row.lastPunchDoorName || "No Door",
        ruleName:
          row.person.ruleid !== null
            ? ruleIdToName[row.person.ruleid] || "UNKNOWN_RULE"
            : "NO_RULE",
      };
    });

    // ==========================
    // 2. MSSQL SYNC (INSERT & UPDATE)
    // ==========================
    for (const msRow of msDataRaw || []) {
      const mapped = PersonAdapter.toPostgres(msRow);

      if (!mapped.msId) continue;

      msIds.add(mapped.msId);

      const existingIndex = currentPgData.findIndex(
        (p) => p.msId === mapped.msId,
      );

      // --------------------------
      // INSERT NEW EMPLOYEE
      // --------------------------
      if (existingIndex === -1) {
        try {
          const [newRec] = await db
            .insert(people)
            .values({
              msId: mapped.msId,
              employeeCode: mapped.employeeCode,
              employeeName: mapped.employeeName ?? "Unknown",
              ruleid: mapped.ruleid ?? null,
              locationId: mapped.locationId ?? null,
              externalId: mapped.externalId ?? null,
              overtimeEligible: mapped.overtimeEligible ?? false,
              personType: "employee",
              status: "active",
              sourceSystem: "mssql_bio",
              updatedAt: new Date(),
              createdAt: new Date(),
            })
            .returning();

          if (newRec?.employeeCode) {
            this.executeHardwareSyncBackground(newRec.employeeCode);
          }

          currentPgData.push({
            ...newRec,
            departmentName: "N/A",
            designationName: "N/A",
            lastPunchDoorName: "No Door",
            ruleName:
              newRec.ruleid !== null
                ? ruleIdToName[newRec.ruleid] || "UNKNOWN_RULE"
                : "NO_ROLE",
          });
        } catch (e) {
          console.error("New employee sync error:", e);
        }
      }
      // --------------------------
      // UPDATE EXISTING EMPLOYEE
      // --------------------------
      else {
        const existing = currentPgData[existingIndex];

        const hasChanged =
          existing.employeeName !== mapped.employeeName ||
          existing.employeeCode !== mapped.employeeCode ||
          existing.ruleid !== mapped.ruleid;

        if (hasChanged) {
          try {
            const [updatedRec] = await db
              .update(people)
              .set({
                employeeName: mapped.employeeName ?? "Unknown",
                employeeCode: mapped.employeeCode,
                updatedAt: new Date(),
              })
              .where(eq(people.msId, mapped.msId))
              .returning();

            currentPgData[existingIndex] = {
              ...existing,
              ...updatedRec,
              ruleName:
                updatedRec.ruleid !== null
                  ? ruleIdToName[updatedRec.ruleid] || "UNKNOWN_RULE"
                  : "NO_ROLE",
            };
          } catch (e) {
            console.error("Employee update sync error:", e);
          }
        }
      }
    }

    // ==========================
    // 3. DELETE REMOVED MSSQL USERS
    // ==========================
    for (const pgRow of currentPgData) {
      if (pgRow.msId && !msIds.has(pgRow.msId)) {
        try {
          await db.delete(people).where(eq(people.msId, pgRow.msId));
        } catch (e) {
          console.error("Delete sync error:", e);
        }
      }
    }

    // ==========================
    // 4. SEARCH
    // ==========================
    let results = currentPgData;

    if (search?.trim()) {
      const term = search.toLowerCase();

      results = results.filter(
        (p) =>
          p.employeeName?.toLowerCase().includes(term) ||
          p.employeeCode?.toLowerCase().includes(term) ||
          p.departmentName?.toLowerCase().includes(term) ||
          p.ruleName?.toLowerCase().includes(term),
      );
    }

    // ==========================
    // 5. SORT BY ID DESCENDING
    // ==========================
    results.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

    // ==========================
    // 6. UNIQUE RECORDS FILTER
    // ==========================
    const uniquePeople = Array.from(
      new Map(
        results.map((p) => [`${p.msId || p.employeeCode || p.id}`, p]),
      ).values(),
    );

    // ==========================
    // 7. PAGINATION & RETURN FORMATS
    // ==========================
    if (!pageSize) {
      return uniquePeople;
    }

    if (pageSize === -1 || pageSize === "-1") {
      return {
        data: uniquePeople,
        totalCount: uniquePeople.length,
        totalPages: 1,
        currentPage: 1,
        pageSize: uniquePeople.length,
      };
    }

    const p = page && Number(page) > 0 ? Number(page) : 1;
    const size = Number(pageSize) > 0 ? Number(pageSize) : 10;
    const start = (p - 1) * size;
    const end = start + size;
    const paginatedData = uniquePeople.slice(start, end);

    return {
      data: paginatedData,
      totalCount: uniquePeople.length,
      totalPages: Math.ceil(uniquePeople.length / size),
      currentPage: p,
      pageSize: size,
    };
  }

  // 🛠️ Helper function to trigger sync in the background without locking the main thread
  private async executeHardwareSyncBackground(employeeCode: string) {
    // Thoda sa delay taaki biometric database user ko fully process karle
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      console.log(`⚡ Background Hardware Sync Started for New Employee: ${employeeCode}`);

      // blockAll ko 'false' bhejenge, kuki aapke executeHardwareSync ke andar logic pehle se likha hai ki:
      // Agar employee assignments me nahi hai (AllowedDoorIds khali hai), toh Main Gate ko chodkar baki sab automatic block ho jayenge!
      await this.executeHardwareSync(employeeCode, null, false);

      console.log(`✅ Background Hardware Sync Completed for: ${employeeCode}`);
    } catch (err: any) {
      console.error(`❌ Background Hardware Sync Failed for ${employeeCode}:`, err.message);
    }
  }
  // async getPeople(search?: string): Promise<Person[]> {
  //   const [pgDataRaw, msDataRaw] = await Promise.all([
  //     db
  //       .select({
  //         person: {
  //           ...people,
  //           lastSeenTime: sql<string>`TO_CHAR(${people.lastSeenTime}, 'YYYY-MM-DD"T"HH24:MI:SS')`,
  //         },
  //         departmentName: departments.name,
  //         lastPunchDoorName: doors.name,
  //       })
  //       .from(people)
  //       .leftJoin(departments, eq(people.departmentId, departments.id))
  //       .leftJoin(doors, eq(people.lastPunchDoorId, doors.id)),
  //     dbMsSql.select().from({ dbName: "Employees" }).execute(),
  //   ]);
  //   const msIds = new Set();
  //   const ruleIdToName = Object.fromEntries(
  //     Object.entries(ACCESS_RULES).map(([key, value]) => [value, key]),
  //   );
  //   const currentPgData = pgDataRaw.map((row) => ({
  //     ...row.person,
  //     departmentName: row.departmentName || "N/A",
  //     lastPunchDoorName: row.lastPunchDoorName || "No Door",
  //     ruleName:
  //       row.person.ruleid !== null
  //         ? ruleIdToName[row.person.ruleid] || "UNKNOWN_RULE"
  //         : "NO_RULE",
  //   }));
  //   for (const msRow of msDataRaw || []) {
  //     const mapped = PersonAdapter.toPostgres(msRow);
  //     if (!mapped.msId) continue;
  //     msIds.add(mapped.msId);
  //     const existingIndex = currentPgData.findIndex(
  //       (p) => p.msId === mapped.msId,
  //     );
  //     if (existingIndex === -1) {
  //       try {
  //         const [newRec] = await db
  //           .insert(people)
  //           .values({
  //             msId: mapped.msId,
  //             employeeCode: mapped.employeeCode,
  //             employeeName: mapped.employeeName ?? "Unknown",
  //             address: mapped.address ?? null,
  //             ruleid: mapped.ruleid ?? null,
  //             locationId: mapped.locationId ?? null,
  //             externalId: mapped.externalId ?? null,
  //             overtimeEligible: mapped.overtimeEligible ?? false,
  //             personType: "employee",
  //             status: "active",
  //             sourceSystem: "mssql_bio",
  //             updatedAt: new Date(),
  //             createdAt: new Date(),
  //           })
  //           .returning();
  //         if (newRec?.employeeCode) {
  //           await this.executeHardwareSync(newRec.employeeCode, null, true);
  //         }
  //         currentPgData.push({
  //           ...newRec,
  //           departmentName: "N/A",
  //           lastPunchDoorName: "No Door",
  //           ruleName:
  //             newRec.ruleid !== null
  //               ? ruleIdToName[newRec.ruleid] || "UNKNOWN_RULE"
  //               : "NO_ROLE",
  //         });
  //       } catch (e) {
  //         console.error("New employee sync error:", e);
  //       }
  //     } else {
  //       const existing = currentPgData[existingIndex];
  //       const hasChanged =
  //         existing.employeeName !== mapped.employeeName ||
  //         existing.employeeCode !== mapped.employeeCode ||
  //         existing.ruleid !== mapped.ruleid;
  //       if (hasChanged) {
  //         try {
  //           const [updatedRec] = await db
  //             .update(people)
  //             .set({
  //               employeeName: mapped.employeeName ?? "Unknown",
  //               employeeCode: mapped.employeeCode,
  //               address: mapped.address ?? null,
  //               updatedAt: new Date(),
  //             })
  //             .where(eq(people.msId, mapped.msId))
  //             .returning();
  //           currentPgData[existingIndex] = {
  //             ...existing,
  //             ...updatedRec,
  //             ruleName:
  //               updatedRec.ruleid !== null
  //                 ? ruleIdToName[updatedRec.ruleid] || "UNKNOWN_RULE"
  //                 : "NO_ROLE",
  //           };
  //         } catch (e) {
  //           console.error("Employee update sync error:", e);
  //         }
  //       }
  //     }
  //   }
  //   for (const pgRow of currentPgData) {
  //     if (pgRow.msId && !msIds.has(pgRow.msId)) {
  //       try {
  //         await db.delete(people).where(eq(people.msId, pgRow.msId));
  //       } catch (e) {}
  //     }
  //   }
  //   let results = currentPgData;
  //   if (search) {
  //     const term = search.toLowerCase();
  //     results = results.filter(
  //       (p) =>
  //         p.employeeName.toLowerCase().includes(term) ||
  //         (p.employeeCode && p.employeeCode.toLowerCase().includes(term)) ||
  //         (p.departmentName && p.departmentName.toLowerCase().includes(term)) ||
  //         (p.ruleName && p.ruleName.toLowerCase().includes(term)),
  //     );
  //   }
  //   results.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
  //   return Array.from(
  //     new Map(
  //       results.map((p) => [`${p.msId || p.employeeCode || p.id}`, p]),
  //     ).values(),
  //   ) as Person[];
  // }

  // async getPerson(id: number): Promise<any> {
  //   const [result] = await db
  //     .select({
  //       person: people,
  //       departmentName: departments.name,
  //       designationName: designations.name,
  //     })
  //     .from(people)
  //     .leftJoin(
  //       departments,
  //       eq(people.departmentId, departments.id)
  //     )
  //     .leftJoin(
  //       designations,
  //       eq(people.designationId, designations.id)
  //     )
  //     .leftJoin(
  //     schema.peopleAdditionalDetails,
  //     eq(people.employeeCode, schema.peopleAdditionalDetails.employeeCode) // employee_code ke basis par join
  //   )
  //     .where(eq(people.id, id));

  //   if (!result) return undefined;

  //   return {
  //     ...result.person,
  //     departmentName: result.departmentName,
  //     designationName: result.designationName,
  //   };
  // }

  async getPerson(id: number): Promise<any> {
    const [result] = await db
      .select({
        person: people,
        departmentName: departments.name,
        designationName: designations.name,
        // Yahan se additional details ke saare columns select ho jayenge
        additionalDetails: peopleAdditionalDetails,
      })
      .from(people)
      .leftJoin(
        departments,
        eq(people.departmentId, departments.id)
      )
      .leftJoin(
        designations,
        eq(people.designationId, designations.id)
      )
      .leftJoin(
        schema.peopleAdditionalDetails,
        eq(people.employeeCode, peopleAdditionalDetails.employeeCode) // employee_code ke basis par join
      )
      .where(eq(people.id, id));

    if (!result) return undefined;

    return {
      ...result.person,
      departmentName: result.departmentName,
      designationName: result.designationName,
      // Agar additional details mili hain toh unhe bhi root object me spread kar denge
      ...(result.additionalDetails || {}),
    };
  }
  // async getPerson(id: number): Promise<Person | undefined> {
  //   const [person] = await db.select().from(people).where(eq(people.id, id));
  //   return person;
  // }
  async getPersonByCode(code: string): Promise<Person | undefined> {
    return (
      await db.select().from(people).where(eq(people.employeeCode, code))
    )[0];
  }
  async createPerson(data: InsertPerson): Promise<Person> {
    let mssqlId: number | null = null;
    try {
      const msRes = await dbMsSql
        .insert({ dbName: "Employees" })
        .values(PersonAdapter.toMsSql(data));
      const rawId =
        msRes.recordset?.[0]?.EmployeeId || msRes.recordset?.[0]?.Id;
      mssqlId = rawId ? Number(rawId) : null;
    } catch (e) {
      console.error("MS SQL Person Sync Error:", e);
    }
    const [created] = await db
      .insert(people)
      .values({
        ...data,
        msId: mssqlId,
        updatedAt: new Date(),
      })
      .returning();
    return created;
  }
  // async updatePerson(id: number, data: Partial<InsertPerson>): Promise<Person> {
  //   const existing = await db.select().from(people).where(eq(people.id, id));
  //   console.log("Existing Person Record:", existing);
  //   const [updated] = await db
  //     .update(people)
  //     .set({ ...data, updatedAt: new Date() })
  //     .where(eq(people.id, id))
  //     .returning();
  //   if (!updated) throw new Error("Person not found");
  //   if (updated.msId) {
  //     try {
  //       await dbMsSql
  //         .update({ dbName: "Employees", pk: "EmployeeId" })
  //         .set(PersonAdapter.toMsSql(data))
  //         .where({ value: updated.msId });
  //     } catch (e) {
  //       console.error("MS SQL Person Update Error:", e);
  //     }
  //   }
  //   return updated;
  // }
  async updatePerson(id: number, data: any): Promise<Person> {
    // --- :rotating_light: CRITICAL FIX FOR DRIZZLE TIMESTAMP ERROR :rotating_light: ---
    // Agar lastSeenTime ya koi aur date field string ke roop me aa rahi hai,
    // toh use proper JS Date object me badal dete hain taaki Drizzle ka mapToDriverValue crash na ho
    if (data.lastSeenTime && typeof data.lastSeenTime === 'string') {
      data.lastSeenTime = new Date(data.lastSeenTime);
    }
    // Agar activeShiftDate ya koi aur timestamp check ho toh use bhi safe kar sakte hain
    // -----------------------------------------------------

    // 1. Ab baaki ka purana destructuring chalne do
    const {
      cardNo, companyUnit, guardianName, serviceCategory, section, employment,
      employerName, maritalStatus, reportingManager, leavingReason,
      presentAddress1, presentAddress2, presentDistrict, presentPincode, presentState,
      permanentAddress1, permanentAddress2, permanentDistrict, permanentPincode, permanentState,
      stream, perDayRate, perHourRate, uanNumber, selfDeclaration, policeVerification, authorizedDevice,
      ...mainPersonData
    } = data;

    const additionalData = {
      cardNo, companyUnit, guardianName, serviceCategory, section, employment,
      employerName, maritalStatus, reportingManager, leavingReason,
      presentAddress1, presentAddress2, presentDistrict, presentPincode, presentState,
      permanentAddress1, permanentAddress2, permanentDistrict, permanentPincode, permanentState,
      stream, perDayRate, perHourRate, uanNumber, selfDeclaration, policeVerification, authorizedDevice
    };

    const currentIsoDate = new Date();

    // 2. Main 'people' table ko update karte hain (Ab Drizzle crash nahi karega)
    const [updated] = await db
      .update(people)
      .set({
        ...mainPersonData,
        updatedAt: currentIsoDate
      })
      .where(eq(people.id, id))
      .returning();

    if (!updated) throw new Error("Person not found in primary table");

    // 3. 'people_additional_details' table ko update/insert karte hain
    if (updated.employeeCode) {
      try {
        const existingDetails = await db
          .select()
          .from(peopleAdditionalDetails)
          .where(eq(peopleAdditionalDetails.employeeCode, updated.employeeCode));

        const cleanAdditionalData = Object.fromEntries(
          Object.entries(additionalData).filter(([_, v]) => v !== undefined && v !== null)
        );

        if (Object.keys(cleanAdditionalData).length > 0) {
          if (existingDetails.length > 0) {
            await db
              .update(peopleAdditionalDetails)
              .set({
                ...cleanAdditionalData,
                updatedAt: currentIsoDate
              })
              .where(eq(peopleAdditionalDetails.employeeCode, updated.employeeCode));
          } else {
            await db
              .insert(peopleAdditionalDetails)
              .values({
                employeeCode: updated.employeeCode,
                ...cleanAdditionalData,
                createdAt: currentIsoDate,
                updatedAt: currentIsoDate
              });
          }
        }
      } catch (err) {
        console.error("PostgreSQL Additional Details Sync Error:", err);
      }
    }

    // 4. MS SQL Sync Logic
    if (updated.msId) {
      try {
        await dbMsSql
          .update({ dbName: "Employees", pk: "EmployeeId" })
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
          .where(
            eq(
              schema.employeeDoorAssignments.employeeCode,
              record.employeeCode,
            ),
          );
      }
      await db.delete(people).where(eq(people.id, id));
    }
  }
  async getCredentials(personId?: number): Promise<Credential[]> {
    if (personId) {
      return await db
        .select()
        .from(credentials)
        .where(eq(credentials.personId, personId));
    }
    return await db.select().from(credentials);
  }
  async createCredential(data: InsertCredential): Promise<Credential> {
    const [created] = await db.insert(credentials).values(data).returning();
    return created;
  }
  async updateCredential(
    id: number,
    data: Partial<InsertCredential>,
  ): Promise<Credential> {
    const [updated] = await db
      .update(credentials)
      .set(data)
      .where(eq(credentials.id, id))
      .returning();
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
  async updateAccessCard(
    id: number,
    data: Partial<InsertAccessCard>,
  ): Promise<AccessCard> {
    const [updated] = await db
      .update(accessCards)
      .set(data)
      .where(eq(accessCards.id, id))
      .returning();
    return updated;
  }
  async deleteAccessCard(id: number): Promise<void> {
    await db.delete(accessCards).where(eq(accessCards.id, id));
  }
  // async getShifts(): Promise<Shift[]> {
  //   return await db.select().from(shifts).orderBy(asc(shifts.id));
  // }
  // async getShifts(page?: number, pageSize?: number): Promise<any> {
  //   const query = db.select().from(shifts).orderBy(asc(shifts.id));
  //   return await withPagination(db, shifts, query, page, pageSize);
  // }

  async getShifts(
    page?: number,
    pageSize?: number,
    search?: string,
  ): Promise<any> {
    try {
      const searchText = search?.toLowerCase().trim();

      // -------------------------
      // BASE QUERY (WITH FILTER IF NEEDED)
      // -------------------------
      const baseQuery = db.select().from(shifts).orderBy(asc(shifts.id));

      const finalQuery = searchText
        ? db
          .select()
          .from(shifts)
          .where(
            or(
              ilike(shifts.name, `%${searchText}%`),
              ilike(shifts.code, `%${searchText}%`),
            ),
          )
          .orderBy(asc(shifts.id))
        : baseQuery;

      // -------------------------
      // PAGINATION
      // -------------------------
      return await withPagination(db, shifts, finalQuery, page, pageSize);
    } catch (error) {
      console.error("getShifts error:", error);

      return {
        data: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        pageSize: 0,
      };
    }
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
        .where(and(eq(shifts.code, data.code), ne(shifts.id, id)));
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
      return await db
        .select()
        .from(shiftAssignments)
        .where(eq(shiftAssignments.personId, personId));
    }
    return await db.select().from(shiftAssignments);
  }
  async createShiftAssignment(
    data: InsertShiftAssignment,
  ): Promise<ShiftAssignment> {
    const [created] = await db
      .insert(shiftAssignments)
      .values(data as any)
      .returning();
    return created;
  }
  async updateShiftAssignment(
    id: number,
    data: Partial<InsertShiftAssignment>,
  ): Promise<ShiftAssignment> {
    const [updated] = await db
      .update(shiftAssignments)
      .set(data as any)
      .where(eq(shiftAssignments.id, id))
      .returning();
    return updated;
  }
  async deleteShiftAssignment(id: number): Promise<void> {
    await db.delete(shiftAssignments).where(eq(shiftAssignments.id, id));
  }
  // async getHolidays(page?: number, pageSize?: number): Promise<any> {
  //   const [pgData, msDataRaw] = await Promise.all([
  //     db.select().from(holidays).orderBy(asc(holidays.id)),
  //     dbMsSql.select().from({ dbName: "Holidays" }).execute(),
  //   ]);
  //   for (const msRow of msDataRaw || []) {
  //     const msId = msRow.Id || msRow.id;
  //     if (!pgData.find((p) => p.msId === msId)) {
  //       const [newRec] = await db
  //         .insert(holidays)
  //         .values({
  //           name: msRow.Name || msRow.name,
  //           date: msRow.Date
  //             ? new Date(msRow.Date).toISOString().split("T")[0]
  //             : "",
  //           msId: msId,
  //           holidayType: "company",
  //         })
  //         .returning();
  //       if (newRec) pgData.push(newRec);
  //     }
  //   }
  //   // Aapka original deduplication logic (bilkul same hai)
  //   const uniqueHolidays = Array.from(
  //     new Map(pgData.map((h) => [`${h.name}-${h.date}`, h])).values(),
  //   );
  //   // Sirf return format change hoga agar pageSize milega toh
  //   if (!pageSize) {
  //     return uniqueHolidays;
  //   }
  //   const p = page && Number(page) > 0 ? Number(page) : 1;
  //   const size = Number(pageSize);
  //   if (size === -1) {
  //     return {
  //       data: uniqueHolidays,
  //       totalCount: uniqueHolidays.length,
  //       totalPages: 1,
  //       currentPage: 1,
  //       pageSize: uniqueHolidays.length,
  //     };
  //   }
  //   const start = (p - 1) * size;
  //   const end = start + size;
  //   const paginatedData = uniqueHolidays.slice(start, end);
  //   return {
  //     data: paginatedData,
  //     totalCount: uniqueHolidays.length,
  //     totalPages: Math.ceil(uniqueHolidays.length / size),
  //     currentPage: p,
  //     pageSize: size,
  //   };
  // }

  async getHolidays(
    page?: number,
    pageSize?: number,
    search?: string,
  ): Promise<any> {
    const [pgData, msDataRaw] = await Promise.all([
      db.select().from(holidays).orderBy(asc(holidays.id)),
      dbMsSql.select().from({ dbName: "Holidays" }).execute(),
    ]);

    // MSSQL sync
    for (const msRow of msDataRaw || []) {
      const msId = msRow.Id || msRow.id;

      if (!pgData.find((p) => p.msId === msId)) {
        const [newRec] = await db
          .insert(holidays)
          .values({
            name: msRow.Name || msRow.name,
            date: msRow.Date
              ? new Date(msRow.Date).toISOString().split("T")[0]
              : "",
            msId: msId,
            holidayType: "company",
          })
          .returning();

        if (newRec) pgData.push(newRec);
      }
    }

    // Deduplicate
    let uniqueHolidays = Array.from(
      new Map(pgData.map((h) => [`${h.name}-${h.date}`, h])).values(),
    );

    // ✅ SEARCH FILTER
    if (search && search.trim() !== "") {
      const term = search.toLowerCase();

      uniqueHolidays = uniqueHolidays.filter((h) =>
        [h.name, h.holidayType, h.date]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(term)),
      );
    }

    // No pagination
    if (!pageSize) {
      return uniqueHolidays;
    }

    const p = page && Number(page) > 0 ? Number(page) : 1;
    const size = Number(pageSize);

    // All data
    if (size === -1) {
      return {
        data: uniqueHolidays,
        totalCount: uniqueHolidays.length,
        totalPages: 1,
        currentPage: 1,
        pageSize: uniqueHolidays.length,
      };
    }

    // Pagination
    const start = (p - 1) * size;
    const end = start + size;

    const paginatedData = uniqueHolidays.slice(start, end);

    return {
      data: paginatedData,
      totalCount: uniqueHolidays.length,
      totalPages: Math.ceil(uniqueHolidays.length / size),
      currentPage: p,
      pageSize: size,
    };
  }
  async createHoliday(data: InsertHoliday): Promise<Holiday> {
    let mssqlId: number | null = null;
    try {
      const msRes = await dbMsSql
        .insert({ dbName: "Holidays" })
        .values(HolidayAdapter.toMsSql(data));
      mssqlId = msRes.recordset?.[0]?.Id || msRes.recordset?.[0]?.id || null;
    } catch (e) {
      console.error("MS SQL Sync Error:", e);
    }
    const [created] = await db
      .insert(holidays)
      .values({ ...data, msId: mssqlId })
      .returning();
    return created;
  }
  async updateHoliday(
    id: number,
    data: Partial<InsertHoliday>,
  ): Promise<Holiday> {
    const [updated] = await db
      .update(holidays)
      .set(data)
      .where(eq(holidays.id, id))
      .returning();
    if (!updated) {
      throw new Error(
        "This record is not synced with Postgres yet. Please recreate it.",
      );
    }
    if (updated.msId) {
      try {
        await dbMsSql
          .update({ dbName: "Holidays" })
          .set(HolidayAdapter.toMsSql(data))
          .where({ value: updated.msId });
      } catch (e) {
        console.error("MS SQL Sync Error", e);
      }
    }
    return updated;
  }
  async deleteHoliday(id: number): Promise<void> {
    const [record] = await db
      .select()
      .from(holidays)
      .where(eq(holidays.id, id));
    if (record) {
      if (record.msId) {
        await dbMsSql
          .delete({ dbName: "Holidays" })
          .where({ value: record.msId });
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
  async updateAccessLevel(
    id: number,
    data: Partial<InsertAccessLevel>,
  ): Promise<AccessLevel> {
    const [updated] = await db
      .update(accessLevels)
      .set(data)
      .where(eq(accessLevels.id, id))
      .returning();
    return updated;
  }
  async deleteAccessLevel(id: number): Promise<void> {
    await db.delete(accessLevels).where(eq(accessLevels.id, id));
  }
  async getAccessRules(): Promise<AccessRule[]> {
    return await db.select().from(accessRules);
  }
  async createAccessRule(data: InsertAccessRule): Promise<AccessRule> {
    const [created] = await db
      .insert(accessRules)
      .values(data as any)
      .returning();
    return created;
  }
  async updateAccessRule(
    id: number,
    data: Partial<InsertAccessRule>,
  ): Promise<AccessRule> {
    const [updated] = await db
      .update(accessRules)
      .set(data as any)
      .where(eq(accessRules.id, id))
      .returning();
    return updated;
  }
  async deleteAccessRule(id: number): Promise<void> {
    await db.delete(accessRules).where(eq(accessRules.id, id));
  }
  async getPersonAccess(personId?: number): Promise<PersonAccess[]> {
    if (personId) {
      return await db
        .select()
        .from(personAccess)
        .where(eq(personAccess.personId, personId));
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
  async getVisitors(
    page?: number,
    pageSize?: number,
    search?: string
  ): Promise<{ data: Visitor[]; totalCount: number; totalPages: number }> {

    // 1. Base query taiyar karein
    let query = db.select().from(visitors).$dynamic();

    // 2. Safe search check
    let whereClause: any = undefined;
    if (search && search.trim() !== "" && search !== "undefined") {
      whereClause = or(
        ilike(visitors.nameOfVisitor, `%${search}%`),
        ilike(visitors.visitorsCompanyName, `%${search}%`),
        ilike(visitors.whomToMeet, `%${search}%`),
        ilike(visitors.contactNo, `%${search}%`)
      );

      query = query.where(whereClause);
    }

    // 3. Sorting apply karein
    query = query.orderBy(desc(visitors.id));

    // 4. Bilkul zero-hardcoding ke sath parameters ko aage bhejien
    const result = await withPagination(db, visitors, query, page, pageSize, whereClause);

    return result;
  }

  async getVisitor(id: number): Promise<Visitor | undefined> {
    const [visitor] = await db.select().from(visitors).where(eq(visitors.id, id));
    return visitor;
  }

  // async createVisitor(data: InsertVisitor): Promise<Visitor> {
  //   return await db.transaction(async (tx) => {
  //     const [created] = await tx.insert(visitors).values(data).returning();
  //     try {
  //       await dbMsSql.insert(visitors).values(data);
  //     } catch (err) {
  //       console.error("MS SQL Sync Insert Error:", err);
  //       tx.rollback();
  //       throw new Error("MS SQL Sync Failed during creation");
  //     }
  //     return created;
  //   });
  // }

  async createVisitor(data: InsertVisitor): Promise<Visitor> {
    let insertedMsSqlId: number | null = null;

    // ==========================================
    // STEP 1: PEHLE MS SQL (VisitorLogs) ME INSERT KAREIN
    // ==========================================
    try {
      // 🌟 FIX 1: dbMsSql ki jagah mssqlPool ka request use kiya jo mssql package se aata h
      if (!mssqlPool.connected && typeof mssqlPool.connect === 'function') {
        await mssqlPool.connect();
      }
      const request = mssqlPool.request();

      // 🌟 FIX 2: data.name ko badal kar data.nameOfVisitor kiya jo aapke schema me h
      request.input('Name', mssql.NVarChar, data.nameOfVisitor);

      // Agar baki fields bhi MS SQL me bhejne ho toh aap is tarah bind kar sakte hain:
      // request.input('ContactNo', mssql.NVarChar, data.contactNo);
      // request.input('WhomToMeet', mssql.NVarChar, data.whomToMeet);

      const msSqlResult = await request.query(`
      INSERT INTO VisitorLogs (Name)
      VALUES (@Name);
      SELECT SCOPE_IDENTITY() AS id;
    `);

      if (msSqlResult.recordset && msSqlResult.recordset.length > 0) {
        insertedMsSqlId = msSqlResult.recordset[0].id;
      }

      if (!insertedMsSqlId) {
        throw new Error("MS SQL Inserted but failed to retrieve generated Identity ID.");
      }
    } catch (msSqlErr: any) {
      throw new Error(`MS SQL creation failed: ${msSqlErr.message || "Unknown error"}`);
    }

    // ==========================================
    // STEP 2: AB POSTGRES ME MS_ID KE SATH INSERT KAREIN
    // ==========================================
    return await db.transaction(async (tx) => {
      try {
        const [created] = await tx
          .insert(visitors)
          .values({
            ...data,
            msId: insertedMsSqlId, // 🌟 MS SQL ki generated ID yahan save ho gayi
          })
          .returning();

        return created;
      } catch (pgErr: any) {
        tx.rollback();
        throw new Error(`Postgres transaction failed and rolled back. Error: ${pgErr.message}`);
      }
    });
  }

  // async updateVisitor(id: number, data: Partial<InsertVisitor>): Promise<Visitor> {
  //   return await db.transaction(async (tx) => {
  //     const [updated] = await tx.update(visitors)
  //       .set({ ...data, updatedAt: new Date() })
  //       .where(eq(visitors.id, id))
  //       .returning();

  //     try {
  //       await dbMsSql.update(visitors).set({ ...data, updatedAt: new Date() }).where(eq(visitors.id, id));
  //     } catch (err) {
  //       console.error("MS SQL Sync Update Error:", err);
  //       tx.rollback();
  //       throw new Error("MS SQL Sync Failed during update");
  //     }
  //     return updated;
  //   });
  // }

  async updateVisitor(id: number, data: Partial<InsertVisitor>): Promise<Visitor> {
    // 1. Postgres se purana visitor data nikaalo msId lene ke liye
    const currentVisitor = await db
      .select()
      .from(visitors)
      .where(eq(visitors.id, id))
      .limit(1);

    if (currentVisitor.length === 0) {
      throw new Error(`Visitor update failed: Record with local ID '${id}' not found.`);
    }

    const targetMsId = currentVisitor[0].msId;

    if (!targetMsId) {
      throw new Error(`Visitor update failed: This record doesn't have a valid MS SQL Link ('msId' is missing).`);
    }

    // ==========================================
    // STEP 1: PEHLE MS SQL (VisitorLogs) ME UPDATE KAREIN
    // ==========================================
    try {
      if (!mssqlPool.connected && typeof mssqlPool.connect === 'function') {
        await mssqlPool.connect();
      }
      const request = mssqlPool.request();

      // Agar data me nameOfVisitor bheja gaya hai toh use karo, nahi toh purana wala fallback rakho
      const finalName = data.nameOfVisitor || currentVisitor[0].nameOfVisitor;

      request.input('TargetMsId', mssql.Int, targetMsId);
      request.input('Name', mssql.NVarChar, finalName);

      // Baaki fields jo update karne ho, unhe bhi is tarah bind kar sakte ho:
      // request.input('ContactNo', mssql.NVarChar, data.contactNo || currentVisitor[0].contactNo);

      await request.query(`
      UPDATE VisitorLogs 
      SET Name = @Name
      WHERE Id = @TargetMsId
    `);
    } catch (msSqlErr: any) {
      throw new Error(`MS SQL Update Failed: ${msSqlErr.message || 'Unknown Sync Error'}`);
    }

    // ==========================================
    // STEP 2: LOCAL POSTGRES ME UPDATE KAREIN
    // ==========================================
    return await db.transaction(async (tx) => {
      try {
        const [updated] = await tx
          .update(visitors)
          .set({
            ...data,
            updatedAt: new Date()
          })
          .where(eq(visitors.id, id))
          .returning();

        return updated;
      } catch (pgErr: any) {
        tx.rollback();
        throw new Error(`Postgres transaction failed and rolled back: ${pgErr.message}`);
      }
    });
  }

  async deleteVisitor(id: number): Promise<void> {
    // 1. Pehle Postgres se purana data nikaalo taaki 'msId' mil sake
    const currentVisitor = await db
      .select()
      .from(visitors)
      .where(eq(visitors.id, id))
      .limit(1);

    if (currentVisitor.length === 0) {
      throw new Error(`Visitor deletion failed: Record with local ID '${id}' not found.`);
    }

    const targetMsId = currentVisitor[0].msId;

    if (!targetMsId) {
      throw new Error(`Visitor deletion failed: This record doesn't have a valid MS SQL Link ('msId' is missing).`);
    }

    // 2. Ab Master Transaction shuru karein
    return await db.transaction(async (tx) => {

      // STEP A: Local Postgres se delete karein
      try {
        await tx.delete(visitors).where(eq(visitors.id, id));
      } catch (pgErr: any) {
        tx.rollback();
        throw new Error(`Postgres Deletion Failed: ${pgErr.message}`);
      }

      // STEP B: Ab MS SQL se sahi 'targetMsId' use karke delete karein
      try {
        if (!mssqlPool.connected && typeof mssqlPool.connect === 'function') {
          await mssqlPool.connect();
        }
        const request = mssqlPool.request();

        // YAHA PE DHAYAN DEIN: Hum targetMsId pass kar rahe hain, local id nahi!
        request.input('TargetMsId', mssql.Int, targetMsId);

        await request.query(`
        DELETE FROM VisitorLogs 
        WHERE Id = @TargetMsId
      `);

      } catch (msSqlErr: any) {
        console.error("MS SQL Sync Delete Error inside transaction:", msSqlErr);
        // Agar MS SQL fail hua, toh Postgres ka delete bhi rollback
        tx.rollback();
        throw new Error(`Sync Failed: MS SQL failed to delete. Postgres changes rolled back. Reason: ${msSqlErr.message}`);
      }
    });
  }
  async getVisits(status?: string): Promise<Visit[]> {
    if (status) {
      return await db
        .select()
        .from(visits)
        .where(eq(visits.status, status as any))
        .orderBy(desc(visits.createdAt));
    }
    return await db.select().from(visits).orderBy(desc(visits.createdAt));
  }
  async createVisit(data: InsertVisit): Promise<Visit> {
    const [created] = await db.insert(visits).values(data).returning();
    return created;
  }
  async updateVisit(id: number, data: Partial<InsertVisit>): Promise<Visit> {
    const [updated] = await db
      .update(visits)
      .set(data)
      .where(eq(visits.id, id))
      .returning();
    return updated;
  }
  async getAttendance(
    date?: string,
    locationId?: number,
    personId?: number,
  ): Promise<any[]> {
    const [msLogs, msEmployees] = await Promise.all([
      dbMsSql.select().from({ dbName: "DeviceLogs" }).execute(),
      dbMsSql.select().from({ dbName: "Employees" }).execute(),
    ]);
    const targetDate = date || new Date().toISOString().split("T")[0];
    const dailyLogsMap = new Map<string, Date[]>();
    (msLogs || []).forEach((log) => {
      const rawVal = log.LogDate || log.logdate;
      if (!rawVal) return;
      const d = new Date(rawVal);
      const logYear = d.getFullYear();
      const logMonth = String(d.getMonth() + 1).padStart(2, "0");
      const logDay = String(d.getDate()).padStart(2, "0");
      const logDateStr = `${logYear}-${logMonth}-${logDay}`;
      if (logDateStr === targetDate) {
        const empId = String(log.EmployeeId || log.employeeid).trim();
        if (!dailyLogsMap.has(empId)) dailyLogsMap.set(empId, []);
        dailyLogsMap.get(empId)!.push(d);
      }
    });
    const attendanceList = msEmployees.map((emp) => {
      const empId = String(emp.EmployeeId).trim();
      const logs = dailyLogsMap.get(empId) || [];
      const sorted = logs.sort((a, b) => a.getTime() - b.getTime());
      const clockIn = sorted.length > 0 ? sorted[0].toISOString() : null;
      const clockOut =
        sorted.length > 1 ? sorted[sorted.length - 1].toISOString() : null;
      let status = "absent";
      if (logs.length > 0) status = "present";
      return {
        id: emp.EmployeeId,
        personId: emp.EmployeeId,
        locationId: emp.locationId || emp.locationId,
        employeeCode: emp.EmployeeCode,
        firstName:
          emp.EmployeeName ||
          `${emp.FirstName || ""} ${emp.LastName || ""}`.trim() ||
          "Unknown",
        date: targetDate,
        clockIn,
        clockOut,
        status: status,
        workingHours:
          logs.length > 1
            ? (
              (sorted[sorted.length - 1].getTime() - sorted[0].getTime()) /
              3600000
            ).toFixed(2)
            : "0.00",
      };
    });
    return attendanceList.filter((row) => {
      const matchesPerson =
        !personId || Number(row.personId) === Number(personId);
      const matchesSite =
        !locationId || Number(row.locationId) === Number(locationId);
      return matchesPerson && matchesSite;
    });
  }
  async createAttendance(data: InsertAttendance): Promise<Attendance> {
    const [created] = await db.insert(attendance).values(data).returning();
    return created;
  }
  async updateAttendance(
    id: number,
    data: Partial<InsertAttendance>,
  ): Promise<Attendance> {
    const [updated] = await db
      .update(attendance)
      .set(data)
      .where(eq(attendance.id, id))
      .returning();
    return updated;
  }
  async getAccessLogs(
    limit?: number,
    locationId?: number,
  ): Promise<AccessLog[]> {
    if (locationId) {
      return await db
        .select()
        .from(accessLogs)
        .where(eq(accessLogs.locationId, locationId))
        .orderBy(desc(accessLogs.timestamp))
        .limit(limit || 100);
    }
    return await db
      .select()
      .from(accessLogs)
      .orderBy(desc(accessLogs.timestamp))
      .limit(limit || 100);
  }
  async createAccessLog(data: InsertAccessLog): Promise<AccessLog> {
    const [created] = await db.insert(accessLogs).values(data).returning();
    return created;
  }
  async getAlerts(isResolved?: boolean): Promise<Alert[]> {
    if (isResolved !== undefined) {
      return await db
        .select()
        .from(alerts)
        .where(eq(alerts.isResolved, isResolved))
        .orderBy(desc(alerts.createdAt));
    }
    return await db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }
  async createAlert(data: InsertAlert): Promise<Alert> {
    const [created] = await db.insert(alerts).values(data).returning();
    return created;
  }
  async updateAlert(id: number, data: Partial<InsertAlert>): Promise<Alert> {
    const [updated] = await db
      .update(alerts)
      .set(data)
      .where(eq(alerts.id, id))
      .returning();
    return updated;
  }
  async getExceptions(status?: string): Promise<Exception[]> {
    if (status) {
      return await db
        .select()
        .from(exceptions)
        .where(eq(exceptions.approvalStatus, status as any))
        .orderBy(desc(exceptions.createdAt));
    }
    return await db
      .select()
      .from(exceptions)
      .orderBy(desc(exceptions.createdAt));
  }
  async createException(data: InsertException): Promise<Exception> {
    const [created] = await db.insert(exceptions).values(data).returning();
    return created;
  }
  async updateException(
    id: number,
    data: Partial<InsertException>,
  ): Promise<Exception> {
    const [updated] = await db
      .update(exceptions)
      .set(data)
      .where(eq(exceptions.id, id))
      .returning();
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
  // async getAttendanceReport(filters: {
  //   dateFrom?: string;
  //   dateTo?: string;
  //   status?: string;
  //   deviceId?: string | number;
  //   employeeCode?: string | number;
  // }): Promise<any[]> {
  //   const rawLogs = await dbMsSql
  //     .select()
  //     .from({ dbName: "DeviceLogs" })
  //     .execute();
  //   const msSqlEmployees = await dbMsSql
  //     .select()
  //     .from({ dbName: "Employees" })
  //     .execute();
  //   const msSqlDevices = await dbMsSql
  //     .select()
  //     .from({ dbName: "devices" })
  //     .execute();
  //   const attendanceMap = new Map<string, { time: Date; devId: string }[]>();
  //   rawLogs.forEach((log: any) => {
  //     const empCode = String(log.EmployeeCode || log.employeecode || "").trim();
  //     const timestamp = new Date(log.LogDate || log.logdate);
  //     if (isNaN(timestamp.getTime())) return;
  //     const dateStr = timestamp.toISOString().split("T")[0];
  //     const key = `${empCode}_${dateStr}`;
  //     if (!attendanceMap.has(key)) attendanceMap.set(key, []);
  //     attendanceMap.get(key)!.push({
  //       time: timestamp,
  //       devId: String(log.deviceid || log.DeviceId || "").trim(),
  //     });
  //   });
  //   const reportDates: string[] = [];
  //   let startDate = filters.dateFrom ? new Date(filters.dateFrom) : new Date();
  //   const endDate = filters.dateTo ? new Date(filters.dateTo) : new Date();
  //   let tempDate = new Date(startDate);
  //   while (tempDate <= endDate) {
  //     reportDates.push(tempDate.toISOString().split("T")[0]);
  //     tempDate.setDate(tempDate.getDate() + 1);
  //   }
  //   const finalReport: any[] = [];
  //   msSqlEmployees.forEach((emp: any) => {
  //     const currentEmpCode = String(emp.EmployeeCode).trim();
  //     if (
  //       filters.employeeCode &&
  //       filters.employeeCode !== "all" &&
  //       currentEmpCode !== String(filters.employeeCode)
  //     ) {
  //       return;
  //     }
  //     reportDates.forEach((dateStr) => {
  //       const key = `${currentEmpCode}_${dateStr}`;
  //       const logs = attendanceMap.get(key) || [];
  //       const dayOfWeek = new Date(dateStr).getDay();
  //       let rowData: any = {
  //         id: `${currentEmpCode}-${dateStr}`,
  //         employeeCode: currentEmpCode,
  //         firstName: emp.EmployeeName || "Unknown",
  //         date: dateStr,
  //         clockIn: null,
  //         clockOut: null,
  //         workingHours: "0.00",
  //         status: "",
  //         deviceId: "N/A",
  //         deviceName: "—",
  //       };
  //       if (logs.length === 0) {
  //         rowData.status = "absent";
  //       } else {
  //         const sortedLogs = logs.sort(
  //           (a, b) => a.time.getTime() - b.time.getTime(),
  //         );
  //         const firstIn = sortedLogs[0];
  //         const lastOut =
  //           sortedLogs.length > 1 ? sortedLogs[sortedLogs.length - 1] : null;
  //         rowData.clockIn = firstIn.time.toISOString();
  //         rowData.deviceId = firstIn.devId;
  //         const deviceDetail = msSqlDevices.find(
  //           (d) => String(d.DeviceId || d.DeviceID) === firstIn.devId,
  //         );
  //         rowData.deviceName =
  //           deviceDetail?.DeviceName || `Device ${firstIn.devId}`;
  //         if (
  //           lastOut &&
  //           lastOut.time.getTime() - firstIn.time.getTime() > 60000
  //         ) {
  //           rowData.clockOut = lastOut.time.toISOString();
  //           const workMs = lastOut.time.getTime() - firstIn.time.getTime();
  //           rowData.workingHours = (workMs / 3600000).toFixed(2);
  //         }
  //         rowData.status = "present";
  //       }
  //       finalReport.push(rowData);
  //     });
  //   });
  //   return finalReport
  //     .filter((row) => {
  //       const matchesStatus =
  //         !filters.status || filters.status === "all"
  //           ? true
  //           : row.status === filters.status;
  //       const matchesDevice =
  //         !filters.deviceId || filters.deviceId === "all"
  //           ? true
  //           : row.deviceId === String(filters.deviceId);
  //       return matchesStatus && matchesDevice;
  //     })
  //     .sort((a, b) => b.date.localeCompare(a.date));
  // }
  async getAttendanceReport(
    filters: {
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      employeeCode?: string | number;
    },
    page?: number | string,
    pageSize?: number | string,
  ): Promise<any> {
    // 1. Agar frontend se date nahi aayi toh Aaj ki date default set hogi
    const todayStr = new Date().toISOString().split("T")[0];
    const fromDate = filters.dateFrom || todayStr;
    const toDate = filters.dateTo || todayStr;
    // 2. Fetch All Active Employees
    const allEmployees = await db
      .select({
        employeeCode: people.employeeCode,
        employeeName: people.employeeName,
      })
      .from(people);
    // 3. Fetch Present Data from Daily Summary Table
    const presentRecords = await db
      .select({
        employeeCode: dailyAttendanceSummary.employeeCode,
        firstName: dailyAttendanceSummary.employeeName,
        date: dailyAttendanceSummary.workDate,
        clockIn: dailyAttendanceSummary.firstIn,
        status: dailyAttendanceSummary.attendanceStatus,
      })
      .from(dailyAttendanceSummary)
      .where(
        and(
          gte(dailyAttendanceSummary.workDate, fromDate),
          lte(dailyAttendanceSummary.workDate, toDate),
        ),
      );
    const presentMap = new Map<string, any>();
    presentRecords.forEach((rec) => {
      const key = `${rec.employeeCode}_${rec.date}`;
      presentMap.set(key, rec);
    });
    // 4. Generate Date Array Safely (Timezone issues avoid karne ke liye string calculation)
    const reportDates: string[] = [];
    let dStart = new Date(fromDate);
    const dEnd = new Date(toDate);
    while (dStart <= dEnd) {
      reportDates.push(dStart.toISOString().split("T")[0]);
      dStart.setDate(dStart.getDate() + 1);
    }
    // 5. Merge Data: loop dates aur employees ke base par chalega taaki absent entries create ho sakein
    const finalReport: any[] = [];
    allEmployees.forEach((emp) => {
      reportDates.forEach((dateStr) => {
        const key = `${emp.employeeCode}_${dateStr}`;
        const presentRow = presentMap.get(key);
        if (presentRow) {
          finalReport.push({
            id: `${emp.employeeCode}-${dateStr}`,
            firstName: presentRow.firstName || emp.employeeName,
            employeeCode: emp.employeeCode,
            date: dateStr,
            clockIn: presentRow.clockIn,
            status:
              String(presentRow.status).toLowerCase() === "p" ||
                String(presentRow.status).toLowerCase() === "present"
                ? "present"
                : presentRow.status,
          });
        } else {
          // Agar date range ke andar summary table me entry nahi mili, toh bande ko strictly ABSENT add kiya jayega
          finalReport.push({
            id: `${emp.employeeCode}-${dateStr}`,
            firstName: emp.employeeName || "Unknown",
            employeeCode: emp.employeeCode,
            date: dateStr,
            clockIn: null,
            status: "absent",
          });
        }
      });
    });
    // 6. Global Filters Application (Dono types ke rows par filter execute hoga)
    const processedData = finalReport
      .filter((row) => {
        // const matchesEmployee =
        //   !filters.employeeCode || filters.employeeCode === "all"
        //     ? true
        //     : String(row.employeeCode) === String(filters.employeeCode);
        const matchesEmployee =
          !filters.employeeCode || filters.employeeCode === "all"
            ? true
            : String(row.employeeCode)
              .toLowerCase()
              .includes(String(filters.employeeCode).toLowerCase()) ||
            String(row.firstName)
              .toLowerCase()
              .includes(String(filters.employeeCode).toLowerCase());
        const matchesStatus =
          !filters.status || filters.status === "all"
            ? true
            : String(row.status).toLowerCase() ===
            String(filters.status).toLowerCase();
        return matchesEmployee && matchesStatus;
      })
      .sort((a, b) => {
        // 🔥 Date Desc
        const dateCompare = b.date.localeCompare(a.date);

        if (dateCompare !== 0) {
          return dateCompare;
        }

        // 🔥 Employee Code Asc
        return String(a.employeeCode).localeCompare(
          String(b.employeeCode),
          undefined,
          { numeric: true },
        );
      });
    // 7. Dynamic Util Pagination (Case A Trigger)
    return withPagination(null, null, processedData, page, pageSize);
  }
  // async getAccessLogReport(filters: any): Promise<any[]> {
  //   const conditions = [
  //     filters.dateFrom &&
  //       sql`DATE(${accessLogs.timestamp}) >= ${filters.dateFrom}`,
  //     filters.dateTo && sql`DATE(${accessLogs.timestamp}) <= ${filters.dateTo}`,
  //     filters.eventType && eq(accessLogs.eventType, filters.eventType),
  //     filters.personId && eq(accessLogs.personId, filters.personId),
  //     filters.locationId && eq(accessLogs.locationId, filters.locationId),
  //     filters.doorId && eq(accessLogs.doorId, filters.doorId),
  //   ].filter(Boolean);
  //   const query = db
  //     .select({
  //       id: accessLogs.id,
  //       employeeName: people.employeeName,
  //       employeeCode: people.employeeCode,
  //       eventType: accessLogs.eventType,
  //       isAuthorized: accessLogs.isAuthorized,
  //       timestamp: accessLogs.timestamp,
  //       locationId: accessLogs.locationId,
  //     })
  //     .from(accessLogs)
  //     .leftJoin(people, eq(accessLogs.personId, people.id))
  //     .orderBy(desc(accessLogs.timestamp));
  //   return conditions.length
  //     ? await query.where(and(...conditions))
  //     : await query.limit(500);
  // }
  async getAccessLogReport(
    filters: any,
    page?: number | string,
    pageSize?: number | string,
  ): Promise<any> {
    const conditions = [
      filters.dateFrom &&
      sql`DATE(${accessLogs.timestamp}) >= ${filters.dateFrom}`,
      filters.dateTo && sql`DATE(${accessLogs.timestamp}) <= ${filters.dateTo}`,
      filters.eventType && eq(accessLogs.eventType, filters.eventType),
      filters.personId && eq(accessLogs.personId, filters.personId),
      filters.locationId && eq(accessLogs.locationId, filters.locationId),
      filters.doorId && eq(accessLogs.doorId, filters.doorId),
    ].filter(Boolean);
    const query = db
      .select({
        id: accessLogs.id,
        employeeName: people.employeeName,
        employeeCode: people.employeeCode,
        eventType: accessLogs.eventType,
        isAuthorized: accessLogs.isAuthorized,
        timestamp: accessLogs.timestamp,
        locationId: accessLogs.locationId,
      })
      .from(accessLogs)
      .leftJoin(people, eq(accessLogs.personId, people.id))
      .orderBy(desc(accessLogs.timestamp));
    const data = conditions.length
      ? await query.where(and(...conditions))
      : await query.limit(500);
    // Pagination Apply
    return withPagination(null, null, data, page, pageSize);
  }
  async getVisitorReport(filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }): Promise<any[]> {
    const conditions = [];
    if (filters.dateFrom)
      conditions.push(sql`DATE(${visits.createdAt}) >= ${filters.dateFrom}`);
    if (filters.dateTo)
      conditions.push(sql`DATE(${visits.createdAt}) <= ${filters.dateTo}`);
    if (filters.status)
      conditions.push(eq(visits.status, filters.status as any));
    const query = db
      .select({
        id: visits.id,
        visitorId: visits.visitorId,
        nameOfVisitor: visitors.nameOfVisitor,
        company: visitors.visitorsCompanyName,
        phone: visitors.contactNo,
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
      return await query
        .where(and(...conditions))
        .orderBy(desc(visits.createdAt));
    }
    return await query.orderBy(desc(visits.createdAt)).limit(500);
  }
  async getEmployeeSummaryReport(filters: {
    departmentId?: number;
    status?: string;
    personType?: string;
  }): Promise<any[]> {
    const conditions = [
      filters.departmentId
        ? eq(people.departmentId, filters.departmentId)
        : undefined,
      filters.status ? eq(people.status, filters.status as any) : undefined,
      filters.personType
        ? eq(people.personType, filters.personType as any)
        : undefined,
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
    const [onlineCount] = await db
      .select({ count: count() })
      .from(devices)
      .where(eq(devices.status, "online"));
    return {
      totalPeople: peopleCount.count,
      totalshift: shiftsCount.count,
      totalDoors: doorsCount.count,
      totalDevices: devicesCount.count,
      onlineDevices: onlineCount.count,
      offlineDevices: Math.max(0, devicesCount.count - onlineCount.count),
    };
  }
  // async getDoorWiseStats(date: string) {
  //   const [totalPeopleResult] = await db
  //     .select({
  //       count: sql<number>`count(*)`,
  //     })
  //     .from(people);
  //   const totalManpower = Number(totalPeopleResult.count) || 0;
  //   const mappings = await db
  //     .select({
  //       doorId: doors.id,
  //       doorName: doors.name,
  //       doorCode: doors.code,
  //       inIds: doorDevices.inDeviceIds,
  //       outIds: doorDevices.outDeviceIds,
  //       isMainGate: doorDevices.isMainGate,
  //     })
  //     .from(doors)
  //     .leftJoin(doorDevices, eq(doors.id, doorDevices.doorId));
  //   const allDeviceIds = mappings.flatMap((m) => [
  //     ...(m.inIds || []),
  //     ...(m.outIds || []),
  //   ]);
  //   if (allDeviceIds.length === 0) {
  //     return {
  //       doorStats: [],
  //       mainGateIn: 0,
  //       mainGateOut: 0,
  //       mainGateBal: 0,
  //       totalPresent: 0,
  //       totalAbsent: totalManpower,
  //       totalManpower,
  //     };
  //   }
  //   const msSqlData = await mssqlPool.request().input("filterDate", date)
  //     .query(`
  //     SELECT
  //       DeviceId,
  //       Direction,
  //       EmployeeCode,
  //       COUNT(*) as totalPunches -- Har punch ko count karne ke liye
  //     FROM DeviceLogs
  //     WHERE CAST(LogDate AS DATE) = @filterDate
  //     AND DeviceId IN (${allDeviceIds.join(",")})
  //     GROUP BY DeviceId, Direction, EmployeeCode
  //   `);
  //   const logMap = msSqlData.recordset;
  //   let mainGateInPunches = 0;
  //   let mainGateOutPunches = 0;
  //   const uniquePresentEmployees = new Set();
  //   const doorStats = mappings.map((m) => {
  //     const inLogs = logMap.filter(
  //       (l) => (m.inIds || []).includes(l.DeviceId) && l.Direction === "IN",
  //     );
  //     const outLogs = logMap.filter(
  //       (l) => (m.outIds || []).includes(l.DeviceId) && l.Direction === "OUT",
  //     );
  //     const inCount = inLogs.reduce((acc, curr) => acc + curr.totalPunches, 0);
  //     const outCount = outLogs.reduce(
  //       (acc, curr) => acc + curr.totalPunches,
  //       0,
  //     );
  //     if (m.doorCode === MAIN_GATE_SYNC.CODE || m.isMainGate === true) {
  //       mainGateInPunches = inCount;
  //       mainGateOutPunches = outCount;
  //       inLogs.forEach((l) => uniquePresentEmployees.add(l.EmployeeCode));
  //     }
  //     return {
  //       doorName: m.doorName,
  //       inCount,
  //       outCount,
  //       balance: Math.max(0, inCount - outCount),
  //     };
  //   });
  //   const totalPresent = uniquePresentEmployees.size;
  //   return {
  //     doorStats,
  //     mainGateIn: mainGateInPunches,
  //     mainGateOut: mainGateOutPunches,
  //     mainGateBal: Math.max(0, mainGateInPunches - mainGateOutPunches),
  //     totalPresent: totalPresent,
  //     totalAbsent: Math.max(0, totalManpower - totalPresent),
  //     totalManpower,
  //   };
  // }
  async getDoorWiseStats(date: string) {
    const [totalPeopleResult] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(people);
    const totalManpower = Number(totalPeopleResult.count) || 0;

    const mappings = await db
      .select({
        doorId: doors.id,
        doorName: doors.name,
        doorCode: doors.code,
        inIds: doorDevices.inDeviceIds,
        outIds: doorDevices.outDeviceIds,
        isMainGate: doorDevices.isMainGate,
      })
      .from(doors)
      .leftJoin(doorDevices, eq(doors.id, doorDevices.doorId));

    const allDeviceIds = mappings.flatMap((m) => [
      ...(m.inIds || []),
      ...(m.outIds || []),
    ]);

    if (allDeviceIds.length === 0) {
      return {
        doorStats: [],
        mainGateIn: 0,
        mainGateOut: 0,
        mainGateBal: 0,
        yesterdayInBalance: 0, // Fallback for empty state
        totalPresent: 0,
        totalAbsent: totalManpower,
        totalManpower,
      };
    }

    const targetDateStr = new Date(date).toISOString().split("T")[0];

    // SQL Query: Pichle din se lekar aaj tak ke saare logs sequence me
    const msSqlData = await mssqlPool.request().input("filterDate", date)
      .query(`
      SELECT 
        DeviceId, 
        Direction,
        EmployeeCode,
        LogDate
      FROM DeviceLogs 
      WHERE LogDate >= CAST(DATEADD(day, -1, @filterDate) AS DATETIME)
      AND LogDate < CAST(DATEADD(day, 1, @filterDate) AS DATETIME)
      AND DeviceId IN (${allDeviceIds.join(",")})
      ORDER BY LogDate ASC
    `);

    const rawLogs = msSqlData.recordset;

    let mainGateInPunches = 0;
    let mainGateOutPunches = 0;
    const uniquePresentEmployees = new Set();

    const employeeLastState = new Map<string, "IN" | "OUT">();
    // 🔥 Kal ke balance ko map karne ke liye tracker array/state
    const yesterdayLastState = new Map<string, "IN" | "OUT">();

    // 1. DOOR WISE STATS (Inner doors logic remains clean)
    const doorStats = mappings.map((m) => {
      let inCount = 0;
      let outCount = 0;
      const doorEmployeeState = new Map<string, "IN" | "OUT">();

      rawLogs.forEach((log) => {
        const logDateOnly = new Date(log.LogDate).toISOString().split("T")[0];
        const isIdIn = (m.inIds || []).includes(log.DeviceId);
        const isIdOut = (m.outIds || []).includes(log.DeviceId);

        const lastState = doorEmployeeState.get(log.EmployeeCode);

        if (isIdIn && log.Direction === "IN") {
          if (lastState !== "IN") {
            doorEmployeeState.set(log.EmployeeCode, "IN");
            if (logDateOnly === targetDateStr) {
              inCount++;
            }
          }
        }

        if (isIdOut && log.Direction === "OUT") {
          if (lastState === "IN") {
            doorEmployeeState.set(log.EmployeeCode, "OUT");
            if (logDateOnly === targetDateStr) {
              outCount++;
            }
          }
        }
      });

      return {
        doorName: m.doorName,
        inCount,
        outCount,
        balance: Math.max(0, inCount - outCount),
      };
    });

    // 2. MAIN GATE GLOBAL COUNTERS + YESTERDAY BALANCE CALCULATION
    const mainGateMapping = mappings.find(
      (m) => m.doorCode === MAIN_GATE_SYNC.CODE || m.isMainGate === true,
    );

    if (mainGateMapping) {
      rawLogs.forEach((log) => {
        const logDateOnly = new Date(log.LogDate).toISOString().split("T")[0];
        const isMainIn =
          (mainGateMapping.inIds || []).includes(log.DeviceId) &&
          log.Direction === "IN";
        const isMainOut =
          (mainGateMapping.outIds || []).includes(log.DeviceId) &&
          log.Direction === "OUT";
        const globalLastState = employeeLastState.get(log.EmployeeCode);

        // --- Global State Management ---
        if (isMainIn && globalLastState !== "IN") {
          employeeLastState.set(log.EmployeeCode, "IN");

          // PICHLE DIN KA LOGIC: Agar punch target date se pehle (yesterday) ka hai
          if (logDateOnly !== targetDateStr) {
            yesterdayLastState.set(log.EmployeeCode, "IN");
          }

          // AAJ KA IN COUNTER
          if (logDateOnly === targetDateStr) {
            mainGateInPunches++;
            uniquePresentEmployees.add(log.EmployeeCode);
          }
        } else if (isMainOut && globalLastState === "IN") {
          employeeLastState.set(log.EmployeeCode, "OUT");

          // PICHLE DIN KA LOGIC: Agar kal hi IN hoke kal hi OUT ho gaya
          if (logDateOnly !== targetDateStr) {
            yesterdayLastState.set(log.EmployeeCode, "OUT");
          }

          // AAJ KA OUT COUNTER
          if (logDateOnly === targetDateStr) {
            mainGateOutPunches++;
          }
        }
      });
    }

    // 🔥 Loop ke baad ginn lo ki kal raat ko kitne bande 'IN' status par hi chhut gaye the
    let yesterdayInBalance = 0;
    yesterdayLastState.forEach((status) => {
      if (status === "IN") {
        yesterdayInBalance++;
      }
    });

    const totalPresent = uniquePresentEmployees.size;

    return {
      doorStats,
      mainGateIn: mainGateInPunches,
      mainGateOut: mainGateOutPunches,
      mainGateBal: Math.max(0, mainGateInPunches - mainGateOutPunches),
      yesterdayInBalance, // 👈 Ye mil gaya aapko kal ka strictly leftover night shift balance data!
      totalPresent: totalPresent,
      totalAbsent: Math.max(0, totalManpower - totalPresent),
      totalManpower,
    };
  } // async getDoorWiseStats(date: string) {
  //   const [totalPeopleResult] = await db
  //     .select({
  //       count: sql<number>`count(*)`,
  //     })
  //     .from(people);
  //   const totalManpower = Number(totalPeopleResult.count) || 0;

  //   const mappings = await db
  //     .select({
  //       doorId: doors.id,
  //       doorName: doors.name,
  //       doorCode: doors.code,
  //       inIds: doorDevices.inDeviceIds,
  //       outIds: doorDevices.outDeviceIds,
  //       isMainGate: doorDevices.isMainGate,
  //     })
  //     .from(doors)
  //     .leftJoin(doorDevices, eq(doors.id, doorDevices.doorId));

  //   const allDeviceIds = mappings.flatMap((m) => [
  //     ...(m.inIds || []),
  //     ...(m.outIds || []),
  //   ]);

  //   if (allDeviceIds.length === 0) {
  //     return {
  //       doorStats: [],
  //       mainGateIn: 0,
  //       mainGateOut: 0,
  //       mainGateBal: 0,
  //       totalPresent: 0,
  //       totalAbsent: totalManpower,
  //       totalManpower,
  //     };
  //   }

  //   const targetDateStr = new Date(date).toISOString().split('T')[0];

  //   // SQL Query: Pichle din se lekar aaj tak ke saare logs sequence me
  //   const msSqlData = await mssqlPool.request().input("filterDate", date)
  //     .query(`
  //     SELECT
  //       DeviceId,
  //       Direction,
  //       EmployeeCode,
  //       LogDate
  //     FROM DeviceLogs
  //     WHERE LogDate >= CAST(DATEADD(day, -1, @filterDate) AS DATETIME)
  //     AND LogDate < CAST(DATEADD(day, 1, @filterDate) AS DATETIME)
  //     AND DeviceId IN (${allDeviceIds.join(",")})
  //     ORDER BY LogDate ASC
  //   `);

  //   const rawLogs = msSqlData.recordset;

  //   let mainGateInPunches = 0;
  //   let mainGateOutPunches = 0;
  //   const uniquePresentEmployees = new Set(); // Isme sirf AAJ IN karne wale aayenge

  //   const employeeLastState = new Map<string, "IN" | "OUT">();

  //   const doorStats = mappings.map((m) => {
  //     let inCount = 0;
  //     let outCount = 0;
  //     const doorEmployeeState = new Map<string, "IN" | "OUT">();
  //     const isMainGateDoor = (m.doorCode === MAIN_GATE_SYNC.CODE || m.isMainGate === true);

  //     rawLogs.forEach((log) => {
  //       const logDateOnly = new Date(log.LogDate).toISOString().split('T')[0];
  //       const isIdIn = (m.inIds || []).includes(log.DeviceId);
  //       const isIdOut = (m.outIds || []).includes(log.DeviceId);

  //       const lastState = doorEmployeeState.get(log.EmployeeCode);

  //       // --- DOOR WISE IN TRACKING ---
  //       if (isIdIn && log.Direction === "IN") {
  //         if (lastState !== "IN") {
  //           doorEmployeeState.set(log.EmployeeCode, "IN");
  //           if (logDateOnly === targetDateStr) {
  //             inCount++;
  //           }
  //         }
  //       }

  //       // --- DOOR WISE OUT TRACKING ---
  //       if (isIdOut && log.Direction === "OUT") {
  //         if (lastState === "IN") {
  //           doorEmployeeState.set(log.EmployeeCode, "OUT");
  //           if (logDateOnly === targetDateStr) {
  //             outCount++;
  //           }
  //         }
  //       }
  //     });

  //     // --- MAIN GATE GLOBAL COUNTERS & PRESENT/ABSENT FIX ---
  //     if (isMainGateDoor) {
  //       rawLogs.forEach((log) => {
  //         const logDateOnly = new Date(log.LogDate).toISOString().split('T')[0];
  //         const isMainIn = (m.inIds || []).includes(log.DeviceId) && log.Direction === "IN";
  //         const isMainOut = (m.outIds || []).includes(log.DeviceId) && log.Direction === "OUT";
  //         const globalLastState = employeeLastState.get(log.EmployeeCode);

  //         if (isMainIn && globalLastState !== "IN") {
  //           employeeLastState.set(log.EmployeeCode, "IN");
  //           if (logDateOnly === targetDateStr) {
  //             mainGateInPunches++;
  //             // 🔥 FIXED: Presenti sirf tabhi lagegi jab banda AAJ (Target Date) me IN hua ho
  //             uniquePresentEmployees.add(log.EmployeeCode);
  //           }
  //         }
  //         else if (isMainOut && globalLastState === "IN") {
  //           employeeLastState.set(log.EmployeeCode, "OUT");
  //           if (logDateOnly === targetDateStr) {
  //             mainGateOutPunches++;
  //             // ❌ FIXED: Night shift out wale bande ko uniquePresentEmployees me add NAHI kar rahe hain
  //           }
  //         }
  //       });
  //     }

  //     return {
  //       doorName: m.doorName,
  //       inCount,
  //       outCount,
  //       balance: Math.max(0, inCount - outCount),
  //     };
  //   });

  //   const totalPresent = uniquePresentEmployees.size;

  //   return {
  //     doorStats,
  //     mainGateIn: mainGateInPunches,
  //     mainGateOut: mainGateOutPunches,
  //     mainGateBal: Math.max(0, mainGateInPunches - mainGateOutPunches),
  //     totalPresent: totalPresent, // Yeh bilkul accurate aaj ki daily attendance dikhayega
  //     totalAbsent: Math.max(0, totalManpower - totalPresent),
  //     totalManpower,
  //   };
  // }
  async getShiftWiseStats(date: string): Promise<any[]> {
    try {
      const [allShifts, allDoors] = await Promise.all([
        db.select().from(shifts).where(eq(shifts.isActive, true)),
        db
          .select({
            id: doors.id,
            name: doors.name,
            inIds: doorDevices.inDeviceIds,
          })
          .from(doors)
          .leftJoin(doorDevices, eq(doors.id, doorDevices.doorId)),
      ]);
      const windows = allShifts.map((s) => {
        const [h, m] = s.startTime.split(":");
        const shiftStart = dayjs()
          .set("hour", parseInt(h))
          .set("minute", parseInt(m))
          .set("second", 0);
        const buffer = s.thresholdMins ?? 30;
        return {
          name: s.name,
          start: shiftStart.subtract(buffer, "m"),
          end: shiftStart.add(buffer, "m"),
        };
      });
      const request = mssqlPool.request();
      const deviceIds = allDoors.flatMap((d) => d.inIds || []);
      if (deviceIds.length === 0) return [];
      const logsResult = await request
        .input("start", `${date} 00:00:00`)
        .input("end", `${date} 23:59:59`).query(`
        SELECT 
          EmployeeCode, 
          DeviceId, 
          CONVERT(VARCHAR(8), LogDate, 108) as LogTime -- Ye "HH:mm:ss" return karega
        FROM DeviceLogs WITH (NOLOCK)
        WHERE LogDate >= @start AND LogDate <= @end
        AND Direction = 'IN'
        AND DeviceId IN (${deviceIds.join(",")})
        ORDER BY LogDate ASC
      `);
      const rawLogs = logsResult.recordset;
      const deviceToDoor: Record<number, string> = {};
      const stats: Record<string, any> = {};
      allDoors.forEach((d) => {
        if (!d.name) return;
        stats[d.name] = { doorName: d.name, totalEmp: 0 };
        allShifts.forEach((s) => {
          if (s.name) stats[d.name][s.name] = 0;
        });
        d.inIds?.forEach((id) => {
          deviceToDoor[id] = d.name!;
        });
      });
      const counted = new Set<string>();
      for (const log of rawLogs) {
        const doorName = deviceToDoor[log.DeviceId];
        if (!doorName) continue;
        const [pH, pM, pS] = log.LogTime.split(":");
        const punchTime = dayjs()
          .set("hour", parseInt(pH))
          .set("minute", parseInt(pM))
          .set("second", parseInt(pS));
        for (const win of windows) {
          if (punchTime.isBetween(win.start, win.end, null, "[]")) {
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
    const doorMappings = await db
      .select({
        doorName: doors.name,
        inIds: doorDevices.inDeviceIds,
        outIds: doorDevices.outDeviceIds,
      })
      .from(doors)
      .leftJoin(doorDevices, eq(doors.id, doorDevices.doorId));
    const msSqlData = await mssqlPool.request().input("filterDate", date)
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
    const machineFeed = logs.map((log) => {
      const door = doorMappings.find(
        (m) =>
          (m.inIds || []).includes(log.DeviceId) ||
          (m.outIds || []).includes(log.DeviceId),
      );
      return {
        employeeName: log.EmployeeName || "Unknown",
        employeeCode: log.EmployeeCode,
        deviceName: log.DeviceName || `Machine ${log.DeviceId}`,
        direction: log.Direction,
        logDate: log.LogDate,
        doorName: door ? door.doorName : log.DeviceName || "Unknown Door",
      };
    });
    return {
      machineFeed,
    };
  }
  async getRoleEligibleDevices(): Promise<any[]> {
    try {
      const msDataRaw = await dbMsSql
        .select()
        .from({ dbName: "Devices" })
        .execute();
      if (!msDataRaw || msDataRaw.length === 0) return [];
      const gateConfig = await db.query.cronMaster.findFirst({
        where: eq(cronMaster.code, MAIN_GATE_SYNC.CODE),
      });
      const whitelistedIds = new Set<number>();
      if (gateConfig?.doorId) {
        const mappings = await db
          .select()
          .from(doorDevices)
          .where(eq(doorDevices.doorId, gateConfig.doorId))
          .execute();
        mappings.forEach((m) => {
          [...(m.inDeviceIds || []), ...(m.outDeviceIds || [])].forEach((id) =>
            whitelistedIds.add(Number(id)),
          );
        });
      }
      return msDataRaw
        .filter((d) => !whitelistedIds.has(Number(d.DeviceId || d.DeviceID)))
        .map((d) => ({
          msId: d.DeviceId || d.DeviceID,
          name: d.DeviceName || "Unnamed Device",
          serialNumber: d.SerialNumber || d.serialno,
          ipAddress: d.IpAddress || "",
          status: "online",
        }));
    } catch (error) {
      console.error("Error fetching role-eligible devices:", error);
      return [];
    }
  }
  async getCronMasters(): Promise<CronMaster[]> {
    return await db
      .select()
      .from(cronMaster)
      .orderBy(desc(cronMaster.createdAt));
  }
  async createCronMaster(data: InsertCronMaster): Promise<CronMaster> {
    const [newCron] = await db.insert(cronMaster).values(data).returning();
    return newCron;
  }
  async updateCronMaster(
    id: number,
    data: Partial<InsertCronMaster>,
  ): Promise<CronMaster> {
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
    return await db
      .select()
      .from(doorDevices)
      .orderBy(desc(doorDevices.createdAt));
  }
  async createDoorDevice(data: InsertDoorDevice): Promise<DoorDevice> {
    const [newMapping] = await db.insert(doorDevices).values(data).returning();
    return newMapping;
  }
  async updateDoorDevice(
    id: number,
    data: Partial<InsertDoorDevice>,
  ): Promise<DoorDevice> {
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
  async createBlockUnblockLog(
    data: InsertBlockUnblockLog,
  ): Promise<BlockUnblockLog> {
    const [log] = await db.insert(blockUnblockLogs).values(data).returning();
    return log;
  }
  async updateBlockUnblockLog(
    id: number,
    data: Partial<InsertBlockUnblockLog>,
  ): Promise<BlockUnblockLog> {
    const [updated] = await db
      .update(blockUnblockLogs)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(blockUnblockLogs.id, id))
      .returning();
    return updated;
  }
  async deleteBlockUnblockLog(id: number): Promise<void> {
    await db.delete(blockUnblockLogs).where(eq(blockUnblockLogs.id, id));
  }
  async getBlockUnblockLogById(id: number): Promise<BlockUnblockLog | null> {
    const [log] = await db
      .select()
      .from(blockUnblockLogs)
      .where(eq(blockUnblockLogs.id, id))
      .limit(1);
    return log || null;
  }
  async getEmployeeDeviceStatuses(employeeCode: string) {
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
          status: log.type === "block" ? "Blocked" : "Active",
          timestamp: log.updatedAt || log.createdAt,
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
    const [logEntry] = await db
      .insert(blockUnblockLogs)
      .values({
        employeeCode,
        deviceId,
        type: action,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    esslService
      .syncUserBlockStatus(employeeCode, serialNumber, action === "block")
      .then(() => {
        console.log(
          `:white_check_mark: MS SQL Updated: ${employeeCode} on ${serialNumber}`,
        );
      })
      .catch((err) => {
        console.error(`:x: MS SQL Sync Failed:`, err.message);
      });
    return logEntry;
  }
  async getLockoutEligibleDoors(search?: string): Promise<any[]> {
    const mainGateCode = MAIN_GATE_SYNC.CODE;
    const query = db
      .select()
      .from(doors)
      .where(
        and(
          ne(doors.code, mainGateCode),
          eq(doors.isActive, true),
          search ? ilike(doors.name, `%${search}%`) : undefined,
        ),
      )
      .orderBy(doors.name);
    return await query;
  }
  async updateDoorLockoutStatusBulk(
    doorIds: number[],
    status: boolean,
  ): Promise<any[]> {
    const mainGateCode = MAIN_GATE_SYNC.CODE;
    if (!doorIds || doorIds.length === 0) return [];
    const updatedDoors = await db
      .update(doors)
      .set({
        is_lockout_enabled: status,
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(
            doors.id,
            doorIds.map((id) => Number(id)),
          ),
          ne(doors.code, mainGateCode),
        ),
      )
      .returning();
    return updatedDoors;
  }
  async executeHardwareSync(
    employeeCode: string,
    roleId: number | null = null,
    blockAll: boolean = false,
  ) {
    try {
      const taskConfig = await db.query.cronMaster.findFirst({
        where: eq(cronMaster.code, MAIN_GATE_SYNC.CODE),
      });
      if (!taskConfig?.doorId) return;
      const activeGateId = Number(taskConfig.doorId);
      const [msDevicesRaw, allDoorMappings, empAssignment, lastLogs] =
        await Promise.all([
          mssqlPool
            .request()
            .query("SELECT DeviceID, SerialNumber FROM Devices")
            .then((res: any) => res.recordset as any[]),
          db.select().from(doorDevices).execute(),
          db.query.employeeDoorAssignments.findFirst({
            where: eq(
              schema.employeeDoorAssignments.employeeCode,
              employeeCode.trim(),
            ),
          }),
          db
            .select()
            .from(blockUnblockLogs)
            .where(eq(blockUnblockLogs.employeeCode, employeeCode.trim())),
        ]);
      if (!msDevicesRaw) return;
      const allowedDoorIds = new Set<number>(
        Array.isArray(empAssignment?.doorIds)
          ? (empAssignment.doorIds as number[]).map(Number)
          : [],
      );
      const deviceToDoorMap = new Map<number, number>();
      const mainGateWhitelistedIds = new Set<number>();
      allDoorMappings.forEach((mapping: any) => {
        const devIds = [
          ...(mapping.inDeviceIds || []),
          ...(mapping.outDeviceIds || []),
        ].map(Number);
        devIds.forEach((dId) => {
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

          const isDoorAllowed = doorIdForThisDevice

            ? allowedDoorIds.has(doorIdForThisDevice)

            : false;

          shouldBlock = blockAll || !isDoorAllowed;

        }
        const currentStatus = shouldBlock ? "block" : "unblock";
        const lastDeviceLog = lastLogs
          .filter((l) => l.deviceId === msDeviceId)
          .sort(
            (a, b) =>
              new Date(b.updatedAt!).getTime() -
              new Date(a.updatedAt!).getTime(),
          )[0];
        const hasStatusChanged =
          !lastDeviceLog || lastDeviceLog.type !== currentStatus;
        try {
          await esslService.syncUserBlockStatus(
            employeeCode.trim(),
            serialNumber,
            shouldBlock,
          );
          if (hasStatusChanged) {
            await db.insert(blockUnblockLogs).values({
              employeeCode: employeeCode.trim(),
              deviceId: msDeviceId,
              type: currentStatus,
              updatedAt: new Date(),
            });
          }
        } catch (err: any) {
          console.error(
            `❌ Hardware Error: ${employeeCode} on Device ${msDeviceId}: ${err.message}`,
          );
        }
      });
      await Promise.all(syncPromises);
    } catch (error: any) {
      console.error("💀 Engine Failure:", error.message);
    }
  }
  async executeEmergencybulkUnblock(
    userId: string,
    userName: string,
  ): Promise<any> {
    const allPeople = await db
      .select()
      .from(people)
      .where(eq(people.status, "active"));
    const allDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.isActive, true));
    const taskQueue = [];
    for (const person of allPeople) {
      if (!person.employeeCode) continue;
      for (const device of allDevices) {
        if (
          device.serialNumber &&
          device.msId !== null &&
          device.msId !== undefined
        ) {
          taskQueue.push({
            employeeCode: person.employeeCode,
            deviceMsId: Number(device.msId),
            serialNumber: device.serialNumber,
          });
        }
      }
    }
    if (taskQueue.length === 0) {
      return {
        status: "Empty",
        processedCount: 0,
        message: "No active records found.",
      };
    }
    const [alertEntry] = await db
      .insert(alerts)
      .values({
        alertType: "security",
        severity: "critical",
        title: "🚨 EMERGENCY BULK UNBLOCK",
        message: `System-wide unblock triggered by ${userName} for ${taskQueue.length} records.`,
        createdBy: userId,
        resolvedBy: userName,
        isRead: false,
        isResolved: true,
        resolvedAt: new Date(),
        createdAt: new Date(),
      })
      .returning();
    const BATCH_SIZE = 50;
    let processedCount = 0;
    for (let i = 0; i < taskQueue.length; i += BATCH_SIZE) {
      const batch = taskQueue.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (task) => {
          try {
            await db.insert(blockUnblockLogs).values({
              employeeCode: task.employeeCode,
              deviceId: task.deviceMsId,
              type: "unblock",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            esslService
              .syncUserBlockStatus(task.employeeCode, task.serialNumber, false)
              .catch((err) =>
                console.error(`API Sync Fail for ${task.employeeCode}:`, err),
              );
            processedCount++;
          } catch (err) {
            console.error(`PG Log Error for ${task.employeeCode}:`, err);
          }
        }),
      );
      await new Promise((res) => setTimeout(res, 100));
    }
    return {
      status: "Success",
      processedCount: processedCount,
      alertId: alertEntry.id,
    };
  }
  async getDoorWiseCount(filters: {
    dateFrom?: string;
    dateTo?: string;
    deviceId?: number;
  }) {
    const today = new Date().toISOString().split("T")[0];
    const start = filters.dateFrom || today;
    const end = filters.dateTo || today;
    try {
      const logs = await dbMsSql
        .select()
        .from({ dbName: "DeviceLogs" })
        .execute();
      const devices = await db.select().from(schema.devices).execute();
      const doorGroups: Record<
        string,
        { deviceName: string; inCount: number; outCount: number }
      > = {};
      logs.forEach((log: any) => {
        const rawDate = log.LogDate || log.logDate;
        const logDateStr = rawDate
          ? new Date(rawDate).toISOString().split("T")[0]
          : null;
        if (!(logDateStr && logDateStr >= start && logDateStr <= end)) return;
        const dId = log.DeviceId || log.deviceId;
        if (filters.deviceId && Number(dId) !== Number(filters.deviceId))
          return;
        const deviceObj = devices.find((d) => Number(d.msId) === Number(dId));
        if (!deviceObj) return;
        const cleanName = deviceObj.name.replace(/\s+(IN|OUT)$/i, "").trim();
        const direction = (log.Direction || "").toUpperCase();
        if (!doorGroups[cleanName]) {
          doorGroups[cleanName] = {
            deviceName: cleanName,
            inCount: 0,
            outCount: 0,
          };
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
  // async getCabinLockoutReport(filters: {
  //   dateFrom?: string;
  //   dateTo?: string;
  //   employeeCode?: string;
  //   doorId?: string;
  //   status?: string;
  // }) {
  //   try {
  //     const conditions = [];
  //     if (filters.doorId && filters.doorId !== "all") {
  //       conditions.push(
  //         eq(schema.cabinLockouts.doorId, Number(filters.doorId)),
  //       );
  //     }
  //     if (filters.status && filters.status !== "all") {
  //       conditions.push(eq(schema.cabinLockouts.status, filters.status));
  //     }
  //     if (filters.employeeCode && filters.employeeCode !== "all") {
  //       conditions.push(
  //         eq(schema.cabinLockouts.employeeCode, filters.employeeCode),
  //       );
  //     }
  //     if (filters.dateFrom) {
  //       if (!filters.dateTo || filters.dateFrom === filters.dateTo) {
  //         conditions.push(
  //           sql`CAST(${schema.cabinLockouts.createdAt} AS DATE) = ${filters.dateFrom}`,
  //         );
  //       } else {
  //         const start = new Date(filters.dateFrom);
  //         start.setHours(0, 0, 0, 0);
  //         const end = new Date(filters.dateTo);
  //         end.setHours(23, 59, 59, 999);
  //         conditions.push(gte(schema.cabinLockouts.createdAt, start));
  //         conditions.push(lte(schema.cabinLockouts.createdAt, end));
  //       }
  //     }
  //     const results = await db
  //       .select({
  //         id: schema.cabinLockouts.id,
  //         employeeCode: schema.cabinLockouts.employeeCode,
  //         employeeName: schema.people.employeeName,
  //         doorName: schema.doors.name,
  //         doorId: schema.cabinLockouts.doorId,
  //         inPunchTime: schema.cabinLockouts.inPunchTime,
  //         outPunchTime: schema.cabinLockouts.outPunchTime,
  //         lockoutExpiry: schema.cabinLockouts.lockoutExpiry,
  //         status: schema.cabinLockouts.status,
  //         createdAt: schema.cabinLockouts.createdAt,
  //       })
  //       .from(schema.cabinLockouts)
  //       .leftJoin(
  //         schema.people,
  //         eq(schema.cabinLockouts.employeeCode, schema.people.employeeCode),
  //       )
  //       .leftJoin(
  //         schema.doors,
  //         eq(schema.cabinLockouts.doorId, schema.doors.id),
  //       )
  //       .where(conditions.length > 0 ? and(...conditions) : undefined)
  //       .orderBy(desc(schema.cabinLockouts.createdAt))
  //       .execute();
  //     return results;
  //   } catch (error) {
  //     console.error("Lockout Join Report Error:", error);
  //     throw error;
  //   }
  // }
  async getCabinLockoutReport(
    filters: {
      dateFrom?: string;
      dateTo?: string;
      employeeCode?: string;
      doorId?: string;
      status?: string;
    },
    page?: number | string,
    pageSize?: number | string,
  ) {
    try {
      const conditions = [];

      if (filters.doorId && filters.doorId !== "all") {
        conditions.push(
          eq(schema.cabinLockouts.doorId, Number(filters.doorId)),
        );
      }

      if (filters.status && filters.status !== "all") {
        conditions.push(eq(schema.cabinLockouts.status, filters.status));
      }

      // if (filters.employeeCode && filters.employeeCode !== "all") {
      //   conditions.push(
      //     eq(schema.cabinLockouts.employeeCode, filters.employeeCode),
      //   );
      // }
      if (filters.employeeCode && filters.employeeCode !== "all") {
        conditions.push(
          or(
            ilike(schema.people.employeeName, `%${filters.employeeCode}%`),

            sql`CAST(${schema.cabinLockouts.employeeCode} AS TEXT)
          ILIKE ${`%${filters.employeeCode}%`}`,
          ),
        );
      }

      if (filters.dateFrom) {
        if (!filters.dateTo || filters.dateFrom === filters.dateTo) {
          conditions.push(
            sql`CAST(${schema.cabinLockouts.createdAt} AS DATE) = ${filters.dateFrom}`,
          );
        } else {
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
        .leftJoin(
          schema.people,
          eq(schema.cabinLockouts.employeeCode, schema.people.employeeCode),
        )
        .leftJoin(
          schema.doors,
          eq(schema.cabinLockouts.doorId, schema.doors.id),
        )
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(schema.cabinLockouts.createdAt))
        .execute();

      return withPagination(
        null,
        null,
        JSON.parse(JSON.stringify(results)),
        page,
        pageSize,
      );
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
        updatedAt: schema.employeeDoorAssignments.updatedAt,
      })
      .from(schema.employeeDoorAssignments)
      .leftJoin(
        schema.people,
        eq(
          schema.employeeDoorAssignments.employeeCode,
          schema.people.employeeCode,
        ),
      );
    const doorList = await db
      .select({
        id: schema.doors.id,
        name: schema.doors.name,
      })
      .from(schema.doors);
    const doorMap = new Map(doorList.map((d) => [d.id, d.name]));
    return assignments.map((asgn) => ({
      ...asgn,
      doors: (asgn.doorIds || []).map((id) => {
        const doorId = Number(id);
        return {
          id: doorId,
          name: doorMap.get(doorId) || "Unknown Door",
        };
      }),
    }));
  }
  async getEmployeeDoorAssignmentByCode(
    employeeCode: string,
  ): Promise<any | undefined> {
    const [assignment] = await db
      .select({
        id: schema.employeeDoorAssignments.id,
        employeeCode: schema.employeeDoorAssignments.employeeCode,
        employeeName: schema.people.employeeName,
        doorIds: schema.employeeDoorAssignments.doorIds,
        updatedAt: schema.employeeDoorAssignments.updatedAt,
      })
      .from(schema.employeeDoorAssignments)
      .leftJoin(
        schema.people,
        eq(
          schema.employeeDoorAssignments.employeeCode,
          schema.people.employeeCode,
        ),
      )
      .where(eq(schema.employeeDoorAssignments.employeeCode, employeeCode));
    if (!assignment) return undefined;
    if (assignment.doorIds && assignment.doorIds.length > 0) {
      const doorList = await db
        .select({ id: schema.doors.id, name: schema.doors.name })
        .from(schema.doors)
        .where(inArray(schema.doors.id, assignment.doorIds));
      return {
        ...assignment,
        doors: doorList,
      };
    }
    return { ...assignment, doors: [] };
  }
  async upsertEmployeeDoorAssignment(data: {
    employeeCode: string;
    doorIds: number[];
  }) {
    console.log(`Upsert Request for Employee ${data.employeeCode} with Doors: ${data.doorIds.join(
      ",",
    )}`,
    );
    const result = await db.transaction(async (tx: any) => {
      const uniqueDoorIds = [...new Set(data.doorIds.map((id) => Number(id)))];
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
          updatedAt: new Date(),
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
      const isCurrentlyInside =
        person.currentZone === ZONES.IN || person.currentZone === ZONES.CABIN;
      const shouldBlockAll = !isCurrentlyInside;
      // const shouldBlockAll = false;
      await this.executeHardwareSync(
        data.employeeCode.toString(),
        null,
        shouldBlockAll,
      );
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
  // async getDailyReport(date: string) {
  //   return await db
  //     .select()
  //     .from(dailyAttendanceSummary)
  //     .where(eq(dailyAttendanceSummary.workDate, date));
  // }

  // async getDailyReport(
  //   date: string,
  //   page?: number | string,
  //   pageSize?: number | string,
  // ) {
  //   const data = await db
  //     .select()
  //     .from(dailyAttendanceSummary)
  //     .where(eq(dailyAttendanceSummary.workDate, date));
  //   return withPagination(
  //     null,
  //     null,
  //     JSON.parse(JSON.stringify(data)),
  //     page,
  //     pageSize,
  //   );
  // }

  async getDailyReport(
    date: string,
    employeeCode?: string,
    page?: number | string,
    pageSize?: number | string,
  ) {
    const data = await db
      .select()
      .from(dailyAttendanceSummary)
      .where(
        and(
          eq(dailyAttendanceSummary.workDate, date),
          // employeeCode
          //   ? eq(dailyAttendanceSummary.employeeCode, employeeCode)
          //   : undefined
          employeeCode
            ? or(
              ilike(dailyAttendanceSummary.employeeName, `%${employeeCode}%`),

              sql`CAST(${dailyAttendanceSummary.employeeCode} AS TEXT)
          ILIKE ${`%${employeeCode}%`}`,
            )
            : undefined,
        ),
      );

    return withPagination(
      null,
      null,
      JSON.parse(JSON.stringify(data)),
      page,
      pageSize,
    );
  }

  // 2 & 3: Muster Roll aur Overtime Matrix (Date Range)
  // async getRangeReport(startDate: string, endDate: string) {
  //   return await db
  //     .select()
  //     .from(dailyAttendanceSummary)
  //     .where(between(dailyAttendanceSummary.workDate, startDate, endDate))
  //     .orderBy(asc(dailyAttendanceSummary.workDate));
  // }

  // async getRangeReport(
  //   startDate: string,
  //   endDate: string,
  //   page?: number | string,
  //   pageSize?: number | string,
  // ) {
  //   const data = await db
  //     .select()
  //     .from(dailyAttendanceSummary)
  //     .where(between(dailyAttendanceSummary.workDate, startDate, endDate))
  //     .orderBy(asc(dailyAttendanceSummary.workDate));
  //   return withPagination(
  //     null,
  //     null,
  //     JSON.parse(JSON.stringify(data)),
  //     page,
  //     pageSize,
  //   );
  // }

  async getRangeReport(
    startDate: string,
    endDate: string,
    employeeCode?: string,
    page?: number | string,
    pageSize?: number | string,
  ) {
    let query = db
      .select()
      .from(dailyAttendanceSummary)
      .where(
        and(
          between(dailyAttendanceSummary.workDate, startDate, endDate),
          // employeeCode
          //   ? eq(dailyAttendanceSummary.employeeCode, employeeCode)
          //   : undefined
          employeeCode
            ? or(
              ilike(dailyAttendanceSummary.employeeName, `%${employeeCode}%`),

              sql`CAST(${dailyAttendanceSummary.employeeCode} AS TEXT)
          ILIKE ${`%${employeeCode}%`}`,
            )
            : undefined,
        ),
      )
      .orderBy(asc(dailyAttendanceSummary.workDate));

    const data = await query;

    // 🔥 Group by employee
    const grouped: Record<string, any> = {};

    data.forEach((r: any) => {
      const key = r.employeeName;

      if (!grouped[key]) {
        grouped[key] = {
          employeeName: r.employeeName,
          employeeCode: r.employeeCode,
          perDayRate: r.perDayRate || 0,
          records: [],
        };
      }

      grouped[key].records.push(r);
    });

    const employees = Object.values(grouped);

    return withPagination(null, null, employees, page, pageSize);
  }

  //   async getRangeReport(
  //   startDate: string,
  //   endDate: string,
  //   page?: number | string,
  //   pageSize?: number | string,
  // ) {
  //   const currentPage = Number(page || 1);
  //   const limit = Number(pageSize || 10);
  //   const offset = (currentPage - 1) * limit;

  //   // ✅ Distinct employees
  //   const employees = await db
  //     .selectDistinct({
  //       employeeCode: dailyAttendanceSummary.employeeCode,
  //       employeeName: dailyAttendanceSummary.employeeName,
  //     })
  //     .from(dailyAttendanceSummary)
  //     .where(
  //       between(dailyAttendanceSummary.workDate, startDate, endDate)
  //     )
  //     .orderBy(asc(dailyAttendanceSummary.employeeName));

  //   // ✅ Total employees count
  //   const totalCount = employees.length;

  //   // ✅ Pagination on employees
  //   const paginatedEmployees = employees.slice(
  //     offset,
  //     offset + limit
  //   );

  //   // ✅ Current page employee codes
  //   const employeeCodes = paginatedEmployees.map(
  //     (e) => e.employeeCode
  //   );

  //   // ✅ Attendance records only for paginated employees
  //   const data = await db
  //     .select()
  //     .from(dailyAttendanceSummary)
  //     .where(
  //       and(
  //         between(
  //           dailyAttendanceSummary.workDate,
  //           startDate,
  //           endDate
  //         ),
  //         inArray(
  //           dailyAttendanceSummary.employeeCode,
  //           employeeCodes
  //         )
  //       )
  //     )
  //     .orderBy(
  //       asc(dailyAttendanceSummary.employeeName),
  //       asc(dailyAttendanceSummary.workDate)
  //     );

  //   return {
  //     data: JSON.parse(JSON.stringify(data)),
  //     totalCount,
  //     totalPages: Math.ceil(totalCount / limit),
  //     currentPage,
  //     pageSize: limit,
  //   };
  // }
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
        totalProductive: sql<number>`sum(${dailyAttendanceSummary.productiveMinutes})`,
      })
      .from(dailyAttendanceSummary)
      .where(eq(dailyAttendanceSummary.workDate, date))
      .groupBy(dailyAttendanceSummary.departmentName);
  }
  // 6: Efficiency Analytics (Over a period)
  async getEfficiencyAnalytics(
    startDate: string,
    endDate: string,
    empCode?: string,
  ) {
    let conditions = [
      between(dailyAttendanceSummary.workDate, startDate, endDate),
    ];
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
    const [menu] = await db
      .select()
      .from(menuMaster)
      .where(eq(menuMaster.id, id));
    return menu;
  }
  async createMenu(insertMenu: InsertMenuMaster): Promise<MenuMaster> {
    const [existing] = await db
      .select()
      .from(menuMaster)
      .where(eq(menuMaster.code, insertMenu.code))
      .limit(1);
    if (existing) {
      // 💡 'code' aur 'already exists' keywords use karein
      // taaki common handleDbError ise identify kar sake
      throw new Error(`Menu code already exists.`);
    }
    const [menu] = await db.insert(menuMaster).values(insertMenu).returning();
    return menu;
  }
  async updateMenu(
    id: number,
    data: Partial<InsertMenuMaster>,
  ): Promise<MenuMaster> {
    if (data.code) {
      const [existing] = await db
        .select()
        .from(menuMaster)
        .where(and(eq(menuMaster.code, data.code), ne(menuMaster.id, id)))
        .limit(1);
      if (existing) {
        // 💡 Yahan bhi keywords ka dhyan rakhein
        throw new Error(`The provided menu code already exists.`);
      }
    }
    const [updatedMenu] = await db
      .update(menuMaster)
      .set(data)
      .where(eq(menuMaster.id, id))
      .returning();
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
  async getRoleByCode(code: string): Promise<any | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.code, code));
    return role;
  }
  // Sabhi roles fetch karna
  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(asc(roles.id));
  }
  // Kisi specific role ki saari permissions fetch karna (with Menu details)
  // async getRolePermissions(roleId: number) {
  //   // 1. Role ki basic details fetch karein
  //   const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  //   if (!role) return null;
  //   // 2. Us role ki saari permissions fetch karein
  //   const permissions = await db
  //     .select()
  //     .from(rolePermissions)
  //     .where(eq(rolePermissions.roleId, roleId));
  //   // 3. Dono ko merge karke return karein
  //   return {
  //     ...role,
  //     permissions: permissions,
  //   };
  // }

  async getRolePermissions(roleId: number) {
    // 1. Role ki basic details fetch karein
    const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
    if (!role) return null;

    // 2. RolePermissions aur MenuMaster ko Join karein
    const permissionsWithMenu = await db
      .select({
        id: rolePermissions.id,
        roleId: rolePermissions.roleId,
        menuId: rolePermissions.menuId,
        // Menu Master se details lein
        menuTitle: menuMaster.title,
        menuCode: menuMaster.code,
        // Permissions
        view: rolePermissions.view,
        add: rolePermissions.add,
        edit: rolePermissions.edit,
        delete: rolePermissions.delete,
        export: rolePermissions.export,
        print: rolePermissions.print,
      })
      .from(rolePermissions)
      .leftJoin(menuMaster, eq(rolePermissions.menuId, menuMaster.id))
      .where(eq(rolePermissions.roleId, roleId));

    // 3. Result return karein
    return {
      ...role,
      permissions: permissionsWithMenu,
    };
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
  async updateRoleWithPermissions(
    roleId: number,
    roleData: any,
    permissions: any[],
  ) {
    return await db.transaction(async (tx) => {
      // ✅ 1. Duplicate Code Check (Manual Validation)
      // Hum check kar rahe hain ki kya ye code kisi DOOSRE role (other than roleId) ke paas toh nahi hai
      if (roleData.code) {
        const existingRole = await tx
          .select()
          .from(roles)
          .where(
            and(
              eq(roles.code, roleData.code),
              not(eq(roles.id, roleId)), // Apne aap ko exclude karein
            ),
          )
          .limit(1);
        if (existingRole.length > 0) {
          // Yeh message seedha frontend par dikhega
          throw new Error(
            `Role code "${roleData.code}" already exists for another role.`,
          );
        }
      }
      // 2. Update Role Metadata
      await tx.update(roles).set(roleData).where(eq(roles.id, roleId));
      if (permissions && permissions.length > 0) {
        // 3. Data Sanitization
        const uniquePermissions = Array.from(
          new Map(permissions.map((p) => [p.menuId, p])).values(),
        );
        // 4. Clear existing mapping
        await tx
          .delete(rolePermissions)
          .where(eq(rolePermissions.roleId, roleId));
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
        // 5. Insert new set
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
  // async getEmployeeProductiveReport(filters?: {
  //   date?: string;
  //   employeeCode?: string;
  // }) {
  //   try {
  //     const conditions = [];
  //     // =========================
  //     // Selected Date
  //     // =========================
  //     const selectedDate = filters?.date
  //       ? filters.date
  //       : new Date().toISOString().split("T")[0];
  //     // Next day (night shift punches ke liye)
  //     // Previous Date
  //     const previousDateObj = new Date(selectedDate);
  //     previousDateObj.setDate(previousDateObj.getDate() - 1);
  //     const previousDateStr = previousDateObj.toISOString().split("T")[0];
  //     // Next Date
  //     const nextDateObj = new Date(selectedDate);
  //     nextDateObj.setDate(nextDateObj.getDate() + 1);
  //     const nextDateStr = nextDateObj.toISOString().split("T")[0];
  //     // Fetch previous + selected + next
  //     conditions.push(
  //       gte(schema.employeeActivityLogs.onlyDate, previousDateStr),
  //     );
  //     conditions.push(lte(schema.employeeActivityLogs.onlyDate, nextDateStr));
  //     conditions.push(lte(schema.employeeActivityLogs.onlyDate, nextDateStr));
  //     if (filters?.employeeCode) {
  //       conditions.push(
  //         eq(schema.employeeActivityLogs.employeeCode, filters.employeeCode),
  //       );
  //     }
  //     const logs = await db
  //       .select({
  //         employeeCode: schema.employeeActivityLogs.employeeCode,
  //         employeeName: schema.employeeActivityLogs.employeeName,
  //         gender: schema.people.gender,
  //         shiftName: schema.employeeActivityLogs.shiftName,
  //         shiftTime: schema.employeeActivityLogs.shiftTime,
  //         workingHours: schema.shifts.workingHours,
  //         logDate: schema.employeeActivityLogs.logDate,
  //         onlyDate: schema.employeeActivityLogs.onlyDate,
  //         direction: schema.employeeActivityLogs.direction,
  //         doorId: schema.employeeActivityLogs.doorId,
  //         doorName: schema.employeeActivityLogs.doorName,
  //         deviceId: schema.employeeActivityLogs.deviceId,
  //         doorType: schema.doors.doorType,
  //       })
  //       .from(schema.employeeActivityLogs)
  //       .leftJoin(
  //         schema.doors,
  //         eq(schema.employeeActivityLogs.doorId, schema.doors.id),
  //       )
  //       .leftJoin(
  //         schema.people,
  //         eq(
  //           schema.employeeActivityLogs.employeeCode,
  //           schema.people.employeeCode,
  //         ),
  //       )
  //       .leftJoin(
  //         schema.shifts,
  //         eq(schema.employeeActivityLogs.shiftName, schema.shifts.name),
  //       )
  //       .where(conditions.length ? and(...conditions) : undefined)
  //       .orderBy(
  //         asc(schema.employeeActivityLogs.employeeCode),
  //         asc(schema.employeeActivityLogs.logDate),
  //       );
  //     // =========================
  //     // GROUP BY EMPLOYEE
  //     // =========================
  //     const grouped: Record<string, any[]> = {};
  //     for (const log of logs) {
  //       const key = log.employeeCode;
  //       if (!grouped[key]) {
  //         grouped[key] = [];
  //       }
  //       grouped[key].push(log);
  //     }
  //     const result = [];
  //     // =========================
  //     // PROCESS EACH EMPLOYEE
  //     // =========================
  //     for (const key of Object.keys(grouped)) {
  //       const allLogs = grouped[key];
  //       // =========================
  //       // Selected date ka FIRST IN
  //       // =========================
  //       const todayFirstIn = allLogs.find(
  //         (l) => l.onlyDate === selectedDate && l.direction === "IN",
  //       );
  //       // Agar selected date pe IN hi nahi mila
  //       if (!todayFirstIn) {
  //         continue;
  //       }
  //       const todayFirstInTime = new Date(todayFirstIn.logDate).getTime();
  //       // =========================
  //       // Previous date ka FIRST IN
  //       // =========================
  //       // Previous day ke saare IN punches
  //       const previousDayIns = allLogs.filter(
  //         (l) => l.onlyDate < selectedDate && l.direction === "IN",
  //       );
  //       // Check karo kya current first IN
  //       // kisi previous session ke andar aa raha hai
  //       // Previous date ke gate logs
  //       const previousGateLogs = allLogs.filter(
  //         (l) => l.onlyDate < selectedDate && l.doorType === "gate",
  //       );
  //       // Previous session ka last gate log
  //       const lastPreviousGateLog = previousGateLogs.at(-1);
  //       // Agar previous session gate OUT pe end hua hai
  //       // to next day ka IN new session hoga
  //       const previousSessionClosed = lastPreviousGateLog?.direction === "OUT";
  //       // Agar previous session closed nahi hua
  //       // aur current IN subah ka continuation hai
  //       if (!previousSessionClosed) {
  //         const previousLogTime = new Date(
  //           lastPreviousGateLog?.logDate,
  //         ).getTime();
  //         const diffHours =
  //           (todayFirstInTime - previousLogTime) / (1000 * 60 * 60);
  //         // 12 hr ke andar firse IN
  //         // matlab continuation
  //         if (diffHours <= 12) {
  //           continue;
  //         }
  //       }
  //       // =========================
  //       // FINAL SESSION START
  //       // =========================
  //       const shiftStartLog = todayFirstIn;
  //       // =========================
  //       // Session cutoff
  //       // =========================
  //       const startTime = new Date(shiftStartLog.logDate).getTime();
  //       const cutoffTime = startTime + 16 * 60 * 60 * 1000;
  //       // =========================
  //       // Session logs
  //       // =========================
  //       const employeeLogs = allLogs.filter((l) => {
  //         const logTime = new Date(l.logDate).getTime();
  //         return logTime >= startTime && logTime <= cutoffTime;
  //       });
  //       // =========================
  //       // Calculations
  //       // =========================
  //       let productiveMinutes = 0;
  //       const movementDetails: any[] = [];
  //       let stack: Record<string, any> = {};
  //       let firstTime: number | null = null;
  //       let lastTime: number | null = null;
  //       for (const log of employeeLogs) {
  //         const time = new Date(log.logDate).getTime();
  //         if (firstTime === null) {
  //           firstTime = time;
  //         }
  //         lastTime = time;
  //         const isGate = log.doorType === "gate";
  //         const doorKey = log.doorId;
  //         // =========================
  //         // IN
  //         // =========================
  //         if (log.direction === "IN") {
  //           stack[doorKey] = log;
  //         }
  //         // =========================
  //         // OUT
  //         // =========================
  //         else if (log.direction === "OUT") {
  //           const inLog = stack[doorKey];
  //           if (!inLog) {
  //             continue;
  //           }
  //           const duration =
  //             (new Date(log.logDate).getTime() -
  //               new Date(inLog.logDate).getTime()) /
  //             60000;
  //           const safeDuration = Math.max(0, duration);
  //           // Gate duration productive me add nahi hoga
  //           if (!isGate) {
  //             productiveMinutes += safeDuration;
  //           }
  //           movementDetails.push({
  //             doorName: log.doorName,
  //             doorType: log.doorType,
  //             inDeviceId: inLog.deviceId,
  //             inTime: inLog.logDate,
  //             outDeviceId: log.deviceId,
  //             outTime: log.logDate,
  //             durationMinutes: Math.floor(safeDuration),
  //             isGateEntry: isGate,
  //           });
  //           delete stack[doorKey];
  //         }
  //       }
  //       // =========================
  //       // Presence
  //       // =========================
  //       const totalPresenceMinutes =
  //         firstTime && lastTime ? (lastTime - firstTime) / 60000 : 0;
  //       const productiveHours = productiveMinutes / 60;
  //       const shiftHours = Number(employeeLogs[0]?.workingHours || 8);
  //       // =========================
  //       // OT
  //       // =========================
  //       let otHours = 0;
  //       if (productiveHours >= shiftHours + 2) {
  //         otHours = Math.floor(productiveHours - shiftHours);
  //       }
  //       // =========================
  //       // FINAL RESULT
  //       // =========================
  //       result.push({
  //         employeeCode: employeeLogs[0]?.employeeCode,
  //         employeeName: employeeLogs[0]?.employeeName,
  //         gender: employeeLogs[0]?.gender || "-",
  //         shift: employeeLogs[0]?.shiftName || "-",
  //         shiftTime: employeeLogs[0]?.shiftTime || "-",
  //         workingHours: employeeLogs[0]?.workingHours || "-",
  //         latestPunchDoor: employeeLogs.at(-1)?.doorName || "-",
  //         inPunch: employeeLogs[0]?.logDate || null,
  //         outPunch: employeeLogs.at(-1)?.logDate || null,
  //         productiveMinutes: Math.floor(productiveMinutes),
  //         productiveHours: productiveHours.toFixed(2),
  //         totalPresenceMinutes: Math.floor(totalPresenceMinutes),
  //         totalPresenceHours: (totalPresenceMinutes / 60).toFixed(2),
  //         hoursWorked: productiveHours.toFixed(2),
  //         otHours,
  //         dutyStatus: "Present",
  //         // Business date
  //         date: selectedDate,
  //         totalSessions: movementDetails.length,
  //         movementDetails,
  //       });
  //     }
  //     return result;
  //   } catch (err) {
  //     console.error(err);
  //     throw err;
  //   }
  // }
  async getEmployeeProductiveReport(
    filters?: {
      date?: string;
      employeeCode?: string;
    },
    page?: number | string,
    pageSize?: number | string,
  ) {
    try {
      const conditions = [];
      // =========================
      // Selected Date
      // =========================
      const selectedDate = filters?.date
        ? filters.date
        : new Date().toISOString().split("T")[0];
      // Previous Date
      const previousDateObj = new Date(selectedDate);
      previousDateObj.setDate(previousDateObj.getDate() - 1);
      const previousDateStr = previousDateObj.toISOString().split("T")[0];
      // Next Date
      const nextDateObj = new Date(selectedDate);
      nextDateObj.setDate(nextDateObj.getDate() + 1);
      const nextDateStr = nextDateObj.toISOString().split("T")[0];
      // Fetch previous + selected + next
      // conditions.push(
      //   gte(schema.employeeActivityLogs.onlyDate, previousDateStr),
      // );
      // conditions.push(lte(schema.employeeActivityLogs.onlyDate, nextDateStr));
      // conditions.push(lte(schema.employeeActivityLogs.onlyDate, nextDateStr));
      conditions.push(
        gte(sql`DATE(${schema.employeeActivityLogs.logDate})`, previousDateStr),
      );

      conditions.push(
        lte(sql`DATE(${schema.employeeActivityLogs.logDate})`, nextDateStr),
      );
      // if (filters?.employeeCode) {
      //   conditions.push(
      //     eq(schema.employeeActivityLogs.employeeCode, filters.employeeCode),
      //   );
      // }
      if (filters?.employeeCode) {
        conditions.push(
          or(
            ilike(
              schema.employeeActivityLogs.employeeName,
              `%${filters.employeeCode}%`,
            ),

            sql`CAST(${schema.employeeActivityLogs.employeeCode} AS TEXT)
          ILIKE ${`%${filters.employeeCode}%`}`,
          ),
        );
      }
      const logs = await db
        .select({
          employeeCode: schema.employeeActivityLogs.employeeCode,
          employeeName: schema.employeeActivityLogs.employeeName,
          gender: schema.people.gender,
          shiftName: schema.employeeActivityLogs.shiftName,
          shiftTime: schema.employeeActivityLogs.shiftTime,
          workingHours: schema.shifts.workingHours,
          logDate: schema.employeeActivityLogs.logDate,
          // onlyDate: schema.employeeActivityLogs.onlyDate,
          onlyDate: sql<string>`
          DATE(${schema.employeeActivityLogs.logDate}) `,
          direction: schema.employeeActivityLogs.direction,
          doorId: schema.employeeActivityLogs.doorId,
          doorName: schema.employeeActivityLogs.doorName,
          deviceId: schema.employeeActivityLogs.deviceId,
          doorType: schema.doors.doorType,
        })
        .from(schema.employeeActivityLogs)
        .leftJoin(
          schema.doors,
          eq(schema.employeeActivityLogs.doorId, schema.doors.id),
        )
        .leftJoin(
          schema.people,
          eq(
            schema.employeeActivityLogs.employeeCode,
            schema.people.employeeCode,
          ),
        )
        .leftJoin(
          schema.shifts,
          eq(schema.employeeActivityLogs.shiftName, schema.shifts.name),
        )
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(
          asc(schema.employeeActivityLogs.employeeCode),
          asc(schema.employeeActivityLogs.logDate),
        );
      // =========================
      // GROUP BY EMPLOYEE
      // =========================
      const grouped: Record<string, any[]> = {};
      for (const log of logs) {
        const key = log.employeeCode;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(log);
      }
      const result = [];
      // =========================
      // PROCESS EACH EMPLOYEE
      // =========================
      for (const key of Object.keys(grouped)) {
        const allLogs = grouped[key];
        // =========================
        // Selected date ka FIRST IN
        // =========================
        const todayFirstIn = allLogs.find(
          (l) => l.onlyDate === selectedDate && l.direction === "IN",
        );
        // Agar selected date pe IN hi nahi mila
        if (!todayFirstIn) {
          continue;
        }
        const todayFirstInTime = new Date(todayFirstIn.logDate).getTime();
        // Previous date ke gate logs
        const previousGateLogs = allLogs.filter(
          (l) => l.onlyDate < selectedDate && l.doorType === "gate",
        );
        // Previous session ka last gate log
        const lastPreviousGateLog = previousGateLogs.at(-1);
        // Agar previous session gate OUT pe end hua hai
        const previousSessionClosed = lastPreviousGateLog?.direction === "OUT";
        // Continuation logic
        if (!previousSessionClosed) {
          const previousLogTime = new Date(
            lastPreviousGateLog?.logDate,
          ).getTime();
          const diffHours =
            (todayFirstInTime - previousLogTime) / (1000 * 60 * 60);
          if (diffHours <= 12) {
            continue;
          }
        }
        // =========================
        // FINAL SESSION START
        // =========================
        const shiftStartLog = todayFirstIn;
        // Session cutoff
        const startTime = new Date(shiftStartLog.logDate).getTime();
        const cutoffTime = startTime + 16 * 60 * 60 * 1000;
        // Session logs
        const employeeLogs = allLogs.filter((l) => {
          const logTime = new Date(l.logDate).getTime();
          return logTime >= startTime && logTime <= cutoffTime;
        });
        // =========================
        // Calculations
        // =========================
        let productiveMinutes = 0;
        const movementDetails: any[] = [];
        let stack: Record<string, any> = {};
        let firstTime: number | null = null;
        let lastTime: number | null = null;
        for (const log of employeeLogs) {
          const time = new Date(log.logDate).getTime();
          if (firstTime === null) {
            firstTime = time;
          }
          lastTime = time;
          const isGate = log.doorType === "gate";
          const doorKey = log.doorId;
          // IN
          if (log.direction === "IN") {
            // Agar already open session hai toh duplicate IN ignore karo
            if (!stack[doorKey]) {
              stack[doorKey] = log;
            }
          }
          // OUT
          else if (log.direction === "OUT") {
            const inLog = stack[doorKey];
            if (!inLog) {
              continue;
            }
            const duration =
              (new Date(log.logDate).getTime() -
                new Date(inLog.logDate).getTime()) /
              60000;
            const safeDuration = Math.max(0, duration);
            // Gate duration productive me add nahi hoga
            if (!isGate) {
              productiveMinutes += safeDuration;
            }
            movementDetails.push({
              doorName: log.doorName,
              doorType: log.doorType,
              inDeviceId: inLog.deviceId,
              inTime: inLog.logDate,
              outDeviceId: log.deviceId,
              outTime: log.logDate,
              durationMinutes: Math.floor(safeDuration),
              isGateEntry: isGate,
            });
            delete stack[doorKey];
          }
        }
        // Presence
        const totalPresenceMinutes =
          firstTime && lastTime ? (lastTime - firstTime) / 60000 : 0;
        const productiveHours = productiveMinutes / 60;
        const shiftHours = Number(employeeLogs[0]?.workingHours || 8);
        // OT
        let otHours = 0;
        if (productiveHours >= shiftHours + 2) {
          otHours = Math.floor(productiveHours - shiftHours);
        }
        // FINAL RESULT
        result.push({
          employeeCode: employeeLogs[0]?.employeeCode,
          employeeName: employeeLogs[0]?.employeeName,
          gender: employeeLogs[0]?.gender || "-",
          shift: employeeLogs[0]?.shiftName || "-",
          shiftTime: employeeLogs[0]?.shiftTime || "-",
          workingHours: employeeLogs[0]?.workingHours || "-",
          latestPunchDoor: employeeLogs.at(-1)?.doorName || "-",
          inPunch: employeeLogs[0]?.logDate || null,
          outPunch: employeeLogs.at(-1)?.logDate || null,
          productiveMinutes: Math.floor(productiveMinutes),
          productiveHours: productiveHours.toFixed(2),
          totalPresenceMinutes: Math.floor(totalPresenceMinutes),
          totalPresenceHours: (totalPresenceMinutes / 60).toFixed(2),
          hoursWorked: productiveHours.toFixed(2),
          otHours,
          dutyStatus: "Present",
          date: selectedDate,
          totalSessions: movementDetails.length,
          movementDetails,
        });
      }
      return withPagination(
        null,
        null,
        JSON.parse(JSON.stringify(result)),
        page,
        pageSize,
      );
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  // async getEmplyeeEefficiency(fromDate: string, toDate: string, employeeCode?: string) {
  //   // 1. Base Query taiyar karo
  //   let conditions = [
  //     gte(dailyAttendanceSummary.workDate, fromDate),
  //     lte(dailyAttendanceSummary.workDate, toDate)
  //   ];
  //   // 2. Agar user ne specific Employee select kiya hai (aur "all" nahi hai)
  //   if (employeeCode && employeeCode !== "all" && employeeCode !== "") {
  //     conditions.push(eq(dailyAttendanceSummary.employeeCode, employeeCode));
  //   }
  //   const reportData = await db
  //     .select({
  //       employeeCode: dailyAttendanceSummary.employeeCode,
  //       employeeName: dailyAttendanceSummary.employeeName,
  //       // Date range ko string ki tarah format karke bhej rahe hain
  //       dateRange: sql<string>`${fromDate} || ' to ' || ${toDate}`,
  //       totalDays: sql<number>`COUNT(DISTINCT ${dailyAttendanceSummary.workDate})`,
  //       totalHours: sql<string>`SUM(CAST(${dailyAttendanceSummary.totalPresenceHours} AS NUMERIC))`,
  //       productiveHours: sql<string>`SUM(CAST(${dailyAttendanceSummary.productiveHours} AS NUMERIC))`,
  //       avgEfficiency: sql<string>`ROUND(AVG(CAST(${dailyAttendanceSummary.efficiencyPercent} AS NUMERIC)), 2)`,
  //     })
  //     .from(dailyAttendanceSummary)
  //     .where(and(...conditions))
  //     .groupBy(dailyAttendanceSummary.employeeCode, dailyAttendanceSummary.employeeName);
  //   return reportData;
  // }
  async getEmplyeeEefficiency(
    fromDate: string,
    toDate: string,
    employeeCode?: string,
    page?: number | string,
    pageSize?: number | string,
  ) {
    // Base Conditions
    let conditions = [
      gte(dailyAttendanceSummary.workDate, fromDate),
      lte(dailyAttendanceSummary.workDate, toDate),
    ];

    // Employee Filter
    // if (employeeCode && employeeCode !== "all" && employeeCode !== "") {
    //   conditions.push(eq(dailyAttendanceSummary.employeeCode, employeeCode));
    // }
    if (employeeCode && employeeCode !== "all" && employeeCode !== "") {
      conditions.push(
        or(
          ilike(dailyAttendanceSummary.employeeName, `%${employeeCode}%`),

          sql`CAST(${dailyAttendanceSummary.employeeCode} AS TEXT)
          ILIKE ${`%${employeeCode}%`}`,
        )!,
      );
    }

    const reportData = await db
      .select({
        employeeCode: dailyAttendanceSummary.employeeCode,
        employeeName: dailyAttendanceSummary.employeeName,

        dateRange: sql<string>`
        ${fromDate} || ' to ' || ${toDate}
      `,

        totalDays: sql<number>`
        COUNT(DISTINCT ${dailyAttendanceSummary.workDate})
      `,

        totalHours: sql<string>`
        SUM(CAST(${dailyAttendanceSummary.totalPresenceHours} AS NUMERIC))
      `,

        productiveHours: sql<string>`
        SUM(CAST(${dailyAttendanceSummary.productiveHours} AS NUMERIC))
      `,

        avgEfficiency: sql<string>`
        ROUND(
          AVG(
            CAST(${dailyAttendanceSummary.efficiencyPercent} AS NUMERIC)
          ),
          2
        )
      `,
      })
      .from(dailyAttendanceSummary)
      .where(and(...conditions))
      .groupBy(
        dailyAttendanceSummary.employeeCode,
        dailyAttendanceSummary.employeeName,
      );

    return withPagination(
      null,
      null,
      JSON.parse(JSON.stringify(reportData)),
      page,
      pageSize,
    );
  }
  // async getDepartmentEfficiencyReport(fromDate: string, toDate: string, filterDeptId?: number) {
  //   // 1. Base filters (Date Range)
  //   let conditions = [
  //     gte(dailyAttendanceSummary.workDate, fromDate),
  //     lte(dailyAttendanceSummary.workDate, toDate)
  //   ];
  //   // 2. Direct ID Filter: Agar dropdown se Department ID aayi hai
  //   if (filterDeptId && filterDeptId !== 0) {
  //     conditions.push(eq(dailyAttendanceSummary.departmentId, filterDeptId));
  //   }
  //   const reportData = await db
  //     .select({
  //       // Display ke liye departmentName use karenge, par filter ID se hoga
  //       department: dailyAttendanceSummary.departmentName,
  //       dateRange: sql<string>`${fromDate} || ' to ' || ${toDate}`,
  //       totalManpower: sql<number>`COUNT(DISTINCT ${dailyAttendanceSummary.employeeCode})`,
  //       totalManHours: sql<string>`SUM(CAST(${dailyAttendanceSummary.totalPresenceHours} AS NUMERIC))`,
  //       productiveHours: sql<string>`SUM(CAST(${dailyAttendanceSummary.productiveHours} AS NUMERIC))`,
  //       avgEfficiency: sql<string>`ROUND(AVG(CAST(${dailyAttendanceSummary.efficiencyPercent} AS NUMERIC)), 2)`,
  //     })
  //     .from(dailyAttendanceSummary)
  //     .where(and(...conditions))
  //     .groupBy(dailyAttendanceSummary.departmentName, dailyAttendanceSummary.departmentId);
  //   return reportData;
  // }
  async getDepartmentEfficiencyReport(
    fromDate: string,
    toDate: string,
    filterDeptId?: number,
    page?: number | string,
    pageSize?: number | string,
  ) {
    // Base Filters
    let conditions = [
      gte(dailyAttendanceSummary.workDate, fromDate),
      lte(dailyAttendanceSummary.workDate, toDate),
    ];

    // Department Filter
    if (filterDeptId && filterDeptId !== 0) {
      conditions.push(eq(dailyAttendanceSummary.departmentId, filterDeptId));
    }

    const reportData = await db
      .select({
        department: dailyAttendanceSummary.departmentName,

        dateRange: sql<string>`
${fromDate} || ' to ' || ${toDate}
`,

        totalManpower: sql<number>`
 COUNT(DISTINCT ${dailyAttendanceSummary.employeeCode})
 `,

        totalManHours: sql<string>`
 SUM(
 CAST(${dailyAttendanceSummary.totalPresenceHours} AS NUMERIC)
)
`,

        productiveHours: sql<string>`
 SUM(
 CAST(${dailyAttendanceSummary.productiveHours} AS NUMERIC)
 )
 `,

        avgEfficiency: sql<string>`
 ROUND(
 AVG(
 CAST(${dailyAttendanceSummary.efficiencyPercent} AS NUMERIC)
 ),
 2
 )
 `,
      })
      .from(dailyAttendanceSummary)
      .where(and(...conditions))
      .groupBy(
        dailyAttendanceSummary.departmentName,
        dailyAttendanceSummary.departmentId,
      );

    return withPagination(
      null,
      null,
      JSON.parse(JSON.stringify(reportData)),
      page,
      pageSize,
    );
  }
  async logAudit(db: any, logData: InsertAuditLog): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: String(logData.userId),
        tableName: logData.tableName,
        recordId: String(logData.recordId),
        action: logData.action,
        oldData: logData.oldData ? logData.oldData : null,
        newData: logData.newData ? logData.newData : null,
        changedColumns: logData.changedColumns ? logData.changedColumns : null,
        ipAddress: logData.ipAddress || null,
        userAgent: logData.userAgent || null,
      });
    } catch (error) {
      console.error("Audit log background me save nahi ho paya:", error);
    }
  }
  async updateUserPassword(
    userId: string | number,
    newPassword: string,
  ): Promise<any | null> {
    try {
      const safeStringId = String(userId);
      const hashedPassword = await bcryptjs.hash(newPassword, 10);

      const [updatedUser] = await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, safeStringId))
        .returning();

      return updatedUser || null;
    } catch (error) {
      throw new Error(
        "Failed to execute password update query on database layer.",
      );
    }
  }
  async getDepartmentWiseManpowerReport(
    filters: {
      dateFrom: string;
      dateTo: string;
      employeeCode?: string;
    },
    page: number = 1,
    pageSize: number = 10,
  ) {
    try {
      // =========================
      // Fetch Attendance Summary
      // =========================

      const rows = await db
        .select()
        .from(dailyAttendanceSummary)
        .where(
          and(
            gte(dailyAttendanceSummary.workDate, filters.dateFrom),

            lte(dailyAttendanceSummary.workDate, filters.dateTo),

            // filters.employeeCode
            //   ? eq(dailyAttendanceSummary.employeeCode, filters.employeeCode)
            //   : undefined,
            filters.employeeCode
              ? or(
                ilike(
                  dailyAttendanceSummary.employeeName,
                  `%${filters.employeeCode}%`,
                ),

                sql`CAST(${dailyAttendanceSummary.employeeCode} AS TEXT)
          ILIKE ${`%${filters.employeeCode}%`}`,
              )
              : undefined,
          ),
        );

      // =========================
      // Employee Map
      // =========================

      const employeeMap = new Map();

      // =========================
      // Footer Vertical Totals
      // =========================

      const footerDepartments: Record<
        string,
        {
          duty: number;
          otHours: number;
          dutyAmount: number;
          otAmount: number;
        }
      > = {};

      let grandTotalDuty = 0;
      let grandTotalOT = 0;

      let grandDutyAmount = 0;
      let grandOTAmount = 0;
      let grandTotalWages = 0;

      // =========================
      // Loop Rows
      // =========================

      for (const row of rows) {
        const empCode = row.employeeCode;

        // =========================
        // Create Employee Object
        // =========================

        if (!employeeMap.has(empCode)) {
          employeeMap.set(empCode, {
            employeeCode: row.employeeCode,

            employeeName: row.employeeName || "",

            contractorName: "-",

            perDayRate: 700,

            departments: {},

            totalWorking: {
              duty: 0,
              otHours: 0,
            },

            amount: {
              dutyAmount: 0,
              otAmount: 0,
              totalWages: 0,
            },
          });
        }

        const emp = employeeMap.get(empCode);

        const dept = row.departmentName?.trim();

        // :fire: Invalid department skip
        if (!dept || dept === "N/A" || dept === "NA" || dept === "-") {
          continue;
        }
        // =========================
        // Create Department
        // =========================

        if (!emp.departments[dept]) {
          emp.departments[dept] = {
            duty: 0,
            otHours: 0,
          };
        }

        // =========================
        // Duty Count
        // =========================

        emp.departments[dept].duty += 1;

        emp.totalWorking.duty += 1;

        // =========================
        // OT Hours
        // =========================

        const otHours = Number(row.otHours || 0);

        emp.departments[dept].otHours += otHours;

        emp.totalWorking.otHours += otHours;
      }

      // =========================
      // Employee Amount Calculation
      // =========================

      for (const emp of employeeMap.values()) {
        const perDayRate = emp.perDayRate;

        // =========================
        // Employee Amount
        // =========================

        emp.amount.dutyAmount = Number(
          (emp.totalWorking.duty * perDayRate).toFixed(2),
        );

        emp.amount.otAmount = Number(
          ((perDayRate / 8) * emp.totalWorking.otHours).toFixed(2),
        );

        emp.amount.totalWages = Number(
          (emp.amount.dutyAmount + emp.amount.otAmount).toFixed(2),
        );

        // =========================
        // Footer Department Totals
        // =========================

        Object.entries(emp.departments).forEach(([deptName, deptData]: any) => {
          if (!footerDepartments[deptName]) {
            footerDepartments[deptName] = {
              duty: 0,
              otHours: 0,
              dutyAmount: 0,
              otAmount: 0,
            };
          }

          // Duty & OT
          footerDepartments[deptName].duty += Number(deptData.duty || 0);

          footerDepartments[deptName].otHours += Number(deptData.otHours || 0);

          // Amount
          footerDepartments[deptName].dutyAmount +=
            Number(deptData.duty || 0) * perDayRate;

          footerDepartments[deptName].otAmount +=
            Number(deptData.otHours || 0) * (perDayRate / 8);
        });

        // =========================
        // Grand Totals
        // =========================

        grandTotalDuty += Number(emp.totalWorking.duty || 0);

        grandTotalOT += Number(emp.totalWorking.otHours || 0);

        grandDutyAmount += Number(emp.amount.dutyAmount || 0);

        grandOTAmount += Number(emp.amount.otAmount || 0);

        grandTotalWages += Number(emp.amount.totalWages || 0);
      }

      // =========================
      // Final Array
      // =========================

      const finalData = Array.from(employeeMap.values());

      // =========================
      // Pagination
      // =========================

      const startIndex = (page - 1) * pageSize;

      const endIndex = startIndex + pageSize;

      const paginatedData = finalData.slice(startIndex, endIndex);

      // =========================
      // Response
      // =========================

      return {
        data: paginatedData,

        // :fire: Footer Vertical Totals
        footerTotals: {
          departments: footerDepartments,

          totalWorking: {
            duty: Number(grandTotalDuty.toFixed(2)),

            otHours: Number(grandTotalOT.toFixed(2)),
          },

          amount: {
            dutyAmount: Number(grandDutyAmount.toFixed(2)),

            otAmount: Number(grandOTAmount.toFixed(2)),

            totalWages: Number(grandTotalWages.toFixed(2)),
          },
        },

        totalCount: finalData.length,

        totalPages: Math.ceil(finalData.length / pageSize),

        currentPage: page,

        pageSize,
      };
    } catch (error) {
      console.log("Department Wise Manpower Report Error =>", error);

      throw error;
    }
  }

  async getEmployeeMovementLogsReport(
    filters?: {
      date?: string;
      employeeCode?: string;
    },
    page?: number | string,
    pageSize?: number | string,
  ) {
    try {
      const conditions = [];
      // =========================
      // Selected Date
      // =========================
      const selectedDate = filters?.date
        ? filters.date
        : new Date().toISOString().split("T")[0];
      // Previous Date
      const previousDateObj = new Date(selectedDate);
      previousDateObj.setDate(previousDateObj.getDate() - 1);
      const previousDateStr = previousDateObj.toISOString().split("T")[0];
      // Next Date
      const nextDateObj = new Date(selectedDate);
      nextDateObj.setDate(nextDateObj.getDate() + 1);
      const nextDateStr = nextDateObj.toISOString().split("T")[0];
      // Fetch previous + selected + next
      // conditions.push(
      //   gte(schema.employeeActivityLogs.onlyDate, previousDateStr),
      // );
      // conditions.push(lte(schema.employeeActivityLogs.onlyDate, nextDateStr));
      // conditions.push(lte(schema.employeeActivityLogs.onlyDate, nextDateStr));
      conditions.push(
        gte(sql`DATE(${schema.employeeActivityLogs.logDate})`, previousDateStr),
      );

      conditions.push(
        lte(sql`DATE(${schema.employeeActivityLogs.logDate})`, nextDateStr),
      );
      // if (filters?.employeeCode) {
      //   conditions.push(
      //     eq(schema.employeeActivityLogs.employeeCode, filters.employeeCode),
      //   );
      // }
      if (filters?.employeeCode) {
        conditions.push(
          or(
            ilike(
              schema.employeeActivityLogs.employeeName,
              `%${filters.employeeCode}%`,
            ),

            sql`CAST(${schema.employeeActivityLogs.employeeCode} AS TEXT)
          ILIKE ${`%${filters.employeeCode}%`}`,
          ),
        );
      }
      const logs = await db
        .select({
          employeeCode: schema.employeeActivityLogs.employeeCode,
          employeeName: schema.employeeActivityLogs.employeeName,
          gender: schema.people.gender,
          shiftName: schema.employeeActivityLogs.shiftName,
          shiftTime: schema.employeeActivityLogs.shiftTime,
          workingHours: schema.shifts.workingHours,
          logDate: schema.employeeActivityLogs.logDate,
          // onlyDate: schema.employeeActivityLogs.onlyDate,
          onlyDate: sql<string>`
          DATE(${schema.employeeActivityLogs.logDate}) `,
          direction: schema.employeeActivityLogs.direction,
          doorId: schema.employeeActivityLogs.doorId,
          doorName: schema.employeeActivityLogs.doorName,
          deviceId: schema.employeeActivityLogs.deviceId,
          doorType: schema.doors.doorType,
        })
        .from(schema.employeeActivityLogs)
        .leftJoin(
          schema.doors,
          eq(schema.employeeActivityLogs.doorId, schema.doors.id),
        )
        .leftJoin(
          schema.people,
          eq(
            schema.employeeActivityLogs.employeeCode,
            schema.people.employeeCode,
          ),
        )
        .leftJoin(
          schema.shifts,
          eq(schema.employeeActivityLogs.shiftName, schema.shifts.name),
        )
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(
          asc(schema.employeeActivityLogs.employeeCode),
          asc(schema.employeeActivityLogs.logDate),
        );
      // =========================
      // GROUP BY EMPLOYEE
      // =========================
      const grouped: Record<string, any[]> = {};
      for (const log of logs) {
        const key = log.employeeCode;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(log);
      }
      const result = [];
      // =========================
      // PROCESS EACH EMPLOYEE
      // =========================
      for (const key of Object.keys(grouped)) {
        const allLogs = grouped[key];
        // =========================
        // Selected date ka FIRST IN
        // =========================
        const todayFirstIn = allLogs.find(
          (l) => l.onlyDate === selectedDate && l.direction === "IN",
        );
        // Agar selected date pe IN hi nahi mila
        if (!todayFirstIn) {
          continue;
        }
        const todayFirstInTime = new Date(todayFirstIn.logDate).getTime();
        // Previous date ke gate logs
        const previousGateLogs = allLogs.filter(
          (l) => l.onlyDate < selectedDate && l.doorType === "gate",
        );
        // Previous session ka last gate log
        const lastPreviousGateLog = previousGateLogs.at(-1);
        // Agar previous session gate OUT pe end hua hai
        const previousSessionClosed = lastPreviousGateLog?.direction === "OUT";
        // Continuation logic
        if (!previousSessionClosed) {
          const previousLogTime = new Date(
            lastPreviousGateLog?.logDate,
          ).getTime();
          const diffHours =
            (todayFirstInTime - previousLogTime) / (1000 * 60 * 60);
          if (diffHours <= 12) {
            continue;
          }
        }
        // =========================
        // FINAL SESSION START
        // =========================
        const shiftStartLog = todayFirstIn;
        // Session cutoff
        const startTime = new Date(shiftStartLog.logDate).getTime();
        const cutoffTime = startTime + 16 * 60 * 60 * 1000;
        // Session logs
        const employeeLogs = allLogs.filter((l) => {
          const logTime = new Date(l.logDate).getTime();
          return logTime >= startTime && logTime <= cutoffTime;
        });
        // =========================
        // Calculations
        // =========================
        let productiveMinutes = 0;
        const movementDetails: any[] = [];
        const stack: Record<string, any> = {};

        let firstTime: number | null = null;
        let lastTime: number | null = null;

        for (const log of employeeLogs) {
          const time = new Date(log.logDate).getTime();

          if (firstTime === null) {
            firstTime = time;
          }

          lastTime = time;

          const isGate = log.doorType === "gate";
          const doorKey = String(log.doorId);

          // IN punch
          if (log.direction === "IN") {
            const row = {
              doorName: log.doorName,
              doorType: log.doorType,
              inDeviceId: log.deviceId,
              inTime: log.logDate,
              outDeviceId: null,
              outTime: null,
              durationMinutes: 0,
              isGateEntry: isGate,
            };

            movementDetails.push(row);

            if (!stack[doorKey]) {
              stack[doorKey] = [];
            }

            stack[doorKey].push(row);
          }

          // OUT punch
          else if (log.direction === "OUT") {
            const openRows = stack[doorKey];

            if (openRows?.length) {
              const row = openRows.shift();

              row.outDeviceId = log.deviceId;
              row.outTime = log.logDate;

              const duration =
                (new Date(log.logDate).getTime() -
                  new Date(row.inTime).getTime()) /
                60000;

              const safeDuration = Math.max(0, duration);

              row.durationMinutes = Math.floor(safeDuration);

              if (!isGate) {
                productiveMinutes += safeDuration;
              }
            } else {
              movementDetails.push({
                doorName: log.doorName,
                doorType: log.doorType,
                inDeviceId: null,
                inTime: null,
                outDeviceId: log.deviceId,
                outTime: log.logDate,
                durationMinutes: 0,
                isGateEntry: isGate,
              });
            }
          }
        }
        // Presence
        const totalPresenceMinutes =
          firstTime && lastTime ? (lastTime - firstTime) / 60000 : 0;
        const productiveHours = productiveMinutes / 60;
        const shiftHours = Number(employeeLogs[0]?.workingHours || 8);
        // OT
        let otHours = 0;
        if (productiveHours >= shiftHours + 2) {
          otHours = Math.floor(productiveHours - shiftHours);
        }
        // FINAL RESULT
        result.push({
          employeeCode: employeeLogs[0]?.employeeCode,
          employeeName: employeeLogs[0]?.employeeName,
          gender: employeeLogs[0]?.gender || "-",
          shift: employeeLogs[0]?.shiftName || "-",
          shiftTime: employeeLogs[0]?.shiftTime || "-",
          workingHours: employeeLogs[0]?.workingHours || "-",
          latestPunchDoor: employeeLogs.at(-1)?.doorName || "-",
          inPunch: employeeLogs[0]?.logDate || null,
          outPunch: employeeLogs.at(-1)?.logDate || null,
          productiveMinutes: Math.floor(productiveMinutes),
          productiveHours: productiveHours.toFixed(2),
          totalPresenceMinutes: Math.floor(totalPresenceMinutes),
          totalPresenceHours: (totalPresenceMinutes / 60).toFixed(2),
          hoursWorked: productiveHours.toFixed(2),
          otHours,
          dutyStatus: "Present",
          date: selectedDate,
          totalSessions: movementDetails.length,
          movementDetails,
        });
      }
      return withPagination(
        null,
        null,
        JSON.parse(JSON.stringify(result)),
        page,
        pageSize,
      );
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  // async getContractors(
  //   page?: number,
  //   pageSize?: number,
  //   search?: string,
  // ): Promise<any> {
  //   try {
  //     const conditions = [];

  //     if (search && search.trim() !== "") {
  //       conditions.push(
  //         or(
  //           ilike(contractors.nameOfAgencyOwner, `%${search}%`),
  //           ilike(contractors.contractorCode, `%${search}%`),
  //           ilike(contractors.nameOfTheAgency, `%${search}%`)
  //         )
  //       );
  //     }

  //     const whereClause = conditions.length ? and(...conditions) : undefined;

  //     const baseQuery = db
  //       .select({
  //         id: contractors.id,
  //         contractorName: contractors.nameOfAgencyOwner,
  //         contractorCode: contractors.contractorCode,
  //         // gender: contractors.gender,
  //         // aadhaarNumber: contractors.aadhaarNumber,
  //         contactNumber: contractors.contactNoOwner,
  //         email: contractors.emailAddress,
  //         address: contractors.address1,
  //         companyName: contractors.nameOfTheAgency,
  //         startDate: contractors.agreementFromDate,
  //         expiryDate: contractors.agreementValidUpto,
  //         // biometricId: contractors.biometricId,
  //         status: contractors.status,
  //         createdAt: contractors.createdAt,
  //       })
  //       .from(contractors)
  //       .where(whereClause)
  //       .orderBy(asc(contractors.id));

  //     if (search && search.trim() !== "") {
  //       const filteredArrayData = await baseQuery;
  //       return await withPagination(db, contractors, filteredArrayData, page, pageSize);
  //     }

  //     return await withPagination(db, contractors, baseQuery, page, pageSize);

  //   } catch (dbError: any) {
  //     console.error("Error in getContractors storage method:", dbError);
  //     throw dbError;
  //   }
  // }

  async getContractors(
    page?: number,
    pageSize?: number,
    search?: string,
  ): Promise<any> {
    try {
      const conditions = [];

      if (search && search.trim() !== "") {
        conditions.push(
          or(
            ilike(contractors.nameOfAgencyOwner, `%${search}%`),
            ilike(contractors.contractorCode, `%${search}%`),
            ilike(contractors.nameOfTheAgency, `%${search}%`)
          )
        );
      }

      const whereClause = conditions.length ? and(...conditions) : undefined;

      // 🌟 db.select() bina kisi argument ke select * ka kaam karega
      const baseQuery = db
        .select()
        .from(contractors)
        .where(whereClause)
        .orderBy(asc(contractors.id));

      // Data fetch karein
      const rawData = await baseQuery;

      // 🌟 Frontend Compatibility Layer:
      // Saare original columns (...c) bhi bhej rahe hain, aur frontend waali keys bhi map kar rahe hain
      const formattedData = rawData.map((c: any) => ({
        ...c, // Isse saare columns (biometricId, aadhaarNumber, bank details, etc.) automatic aa jayenge
        contractorName: c.nameOfAgencyOwner,
        contractorCode: c.contractorCode,
        contactNumber: c.contactNoOwner,
        email: c.emailAddress,
        address: c.address1,
        companyName: c.nameOfTheAgency,
        startDate: c.agreementFromDate,
        expiryDate: c.agreementValidUpto,
      }));

      // Export Extraction Bypass: Agar pagination filters nahi hain toh poora data bhejo
      if (page === undefined && pageSize === undefined) {
        return formattedData;
      }

      if (search && search.trim() !== "") {
        return await withPagination(db, contractors, formattedData, page, pageSize);
      }

      return await withPagination(db, contractors, formattedData, page, pageSize);

    } catch (dbError: any) {
      console.error("Error in getContractors storage method:", dbError);
      throw dbError;
    }
  }


  async getContractor(id: number): Promise<any | null> {
    const [contractor] = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, id));
    return contractor || null;
  }
  // async createContractor(data: InsertContractor): Promise<Contractor> {
  //   const cleanData = {
  //     ...data,
  //     contactNumber: data.contactNumber || undefined,
  //     aadhaarNumber: data.aadhaarNumber || undefined,
  //     email: data.email || undefined,
  //     biometricId: data.biometricId || undefined,
  //   };

  //   if (!cleanData.contractorCode) throw new Error("Contractor code is required.");

  //   if (cleanData.contactNumber && cleanData.contactNumber.length < 10) {
  //     throw new Error("VALIDATION_ERROR: Contact number must be at least 10 digits");
  //   }

  //   if (cleanData.aadhaarNumber && cleanData.aadhaarNumber.length !== 12) {
  //     throw new Error("VALIDATION_ERROR: Aadhaar must be exactly 12 digits");
  //   }

  //   const [existing] = await db
  //     .select()
  //     .from(contractors)
  //     .where(eq(contractors.contractorCode, cleanData.contractorCode));

  //   if (existing) {
  //     throw new Error("DUPLICATE_CODE: Contractor code already exists.");
  //   }

  //   const [created] = await db.insert(contractors).values(cleanData as any).returning();
  //   return created;
  // }

  // async updateContractor(id: number, data: Partial<InsertContractor>): Promise<Contractor> {
  //   const cleanData = {
  //     ...data,
  //     contactNumber: data.contactNumber ?? undefined,
  //     aadhaarNumber: data.aadhaarNumber ?? undefined,
  //     email: data.email ?? undefined,
  //     biometricId: data.biometricId ?? undefined,
  //   };

  //   if (cleanData.contractorCode) {
  //     const [existing] = await db
  //       .select()
  //       .from(contractors)
  //       .where(and(eq(contractors.contractorCode, cleanData.contractorCode), ne(contractors.id, id)));
  //     if (existing) {
  //       throw new Error("DUPLICATE_CODE: Contractor code already exists.");
  //     }
  //   }

  //   const [updated] = await db
  //     .update(contractors)
  //     .set(cleanData as any)
  //     .where(eq(contractors.id, id))
  //     .returning();

  //   if (!updated) throw new Error("Contractor not found");
  //   return updated;
  // }

  async createContractor(data: InsertContractor): Promise<Contractor> {
    // 1. Sabse pehle empty strings ko undefined kijiye taaki sahi validation ho sake
    const cleanData = {
      ...data,
      contractorCode: data.contractorCode ? data.contractorCode.trim() : "",
      nameOfAgencyOwner: data.nameOfAgencyOwner ? data.nameOfAgencyOwner.trim() : "",
      nameOfTheAgency: data.nameOfTheAgency ? data.nameOfTheAgency.trim() : "",
      contactNoOwner: data.contactNoOwner ? data.contactNoOwner.trim() : "",

      // Baaki optional fields ke liye lengths checks bypass karne ke liye safe trimming
      aadhaarNumber: data.aadhaarNumber && data.aadhaarNumber.trim() !== "" ? data.aadhaarNumber.trim() : undefined,
      email: data.email && data.email.trim() !== "" ? data.email.trim() : undefined,
      biometricId: data.biometricId && data.biometricId.trim() !== "" ? data.biometricId.trim() : undefined,
    };

    // 2. MANDATORY FIELDS VALIDATION (Charo fields ka strict check)
    if (!cleanData.contractorCode) {
      throw new Error("VALIDATION_ERROR: Contractor Code is required.");
    }
    if (!cleanData.nameOfAgencyOwner) {
      throw new Error("VALIDATION_ERROR: Contractor Name (Owner Name) is required.");
    }
    if (!cleanData.nameOfTheAgency) {
      throw new Error("VALIDATION_ERROR: Agency Name is required.");
    }
    if (!cleanData.contactNoOwner) {
      throw new Error("VALIDATION_ERROR: Mobile Number is required.");
    }

    // 3. STRICT MOBILE NUMBER VALIDATION (Exactly 10 digits & starts with 6,7,8,9)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(cleanData.contactNoOwner)) {
      throw new Error("VALIDATION_ERROR: Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9.");
    }

    // 4. STRICT EMAIL FORMAT VALIDATION (Optional field - checked only if present)
    if (cleanData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanData.email)) {
        throw new Error("VALIDATION_ERROR: Please provide a valid email address format.");
      }
    }

    // 5. LENGTH & FORMAT VALIDATION FOR OTHER OPTIONAL DETAILS
    if (cleanData.aadhaarNumber && cleanData.aadhaarNumber.length !== 12) {
      throw new Error("VALIDATION_ERROR: Aadhaar must be exactly 12 digits.");
    }

    // 6. DUPLICATE CHECK (Ek code do baar nahi ja sakta)
    const [existing] = await db
      .select()
      .from(contractors)
      .where(eq(contractors.contractorCode, cleanData.contractorCode));

    if (existing) {
      throw new Error("DUPLICATE_CODE: This Contractor Code already exists.");
    }

    // 7. INSERT INTO DATABASE
    const [created] = await db.insert(contractors).values(cleanData as any).returning();
    return created;
  }


  //   async updateContractor(id: number, data: Partial<InsertContractor>): Promise<Contractor> {
  //   const formatDbDate = (dateVal: any) => {
  //     if (dateVal === undefined) return undefined;
  //     if (!dateVal || dateVal === "") return null;
  //     if (typeof dateVal === 'string') {
  //       return dateVal.split('T')[0]; // Extracted explicitly to prevent downstream conversion crashes
  //     }
  //     return null;
  //   };

  //   const cleanData = {
  //     ...data,
  //     contactNumber: data.contactNumber ?? undefined,
  //     aadhaarNumber: data.aadhaarNumber ?? undefined,
  //     email: data.email ?? undefined,
  //     biometricId: data.biometricId ?? undefined,

  //     // ⬇️ FORCING CLEAN STRING FORMATS FOR DRIZZLE TEXT FIELDS ⬇️
  //     commencementDate: formatDbDate(data.commencementDate),
  //     agreementFromDate: formatDbDate(data.agreementFromDate),
  //     agreementValidUpto: formatDbDate(data.agreementValidUpto),
  //     licenseValidity: formatDbDate(data.licenseValidity),
  //   };

  //   if (cleanData.contractorCode) {
  //     const [existing] = await db
  //       .select()
  //       .from(contractors)
  //       .where(and(eq(contractors.contractorCode, cleanData.contractorCode), ne(contractors.id, id)));
  //     if (existing) {
  //       throw new Error("DUPLICATE_CODE: Contractor code already exists.");
  //     }
  //   }

  //   const [updated] = await db
  //     .update(contractors)
  //     .set(cleanData as any)
  //     .where(eq(contractors.id, id))
  //     .returning();

  //   if (!updated) throw new Error("Contractor not found");
  //   return updated;
  // }

  async updateContractor(id: number, data: Partial<InsertContractor>): Promise<Contractor> {
    // Safe helper function to extract clean date string or fallback to null/undefined
    const formatDbDate = (dateVal: any) => {
      if (dateVal === undefined) return undefined;
      if (!dateVal || dateVal === "") return null;
      if (typeof dateVal === 'string') {
        return dateVal.split('T')[0]; // Extracted explicitly to prevent downstream conversion crashes
      }
      return null;
    };

    // 1. Sabse pehle empty strings ko trim karke format normalize kijiye
    const cleanData = {
      ...data,
      contractorCode: typeof data.contractorCode === 'string' ? data.contractorCode.trim() : (data.contractorCode === null ? "" : undefined),
      nameOfAgencyOwner: typeof data.nameOfAgencyOwner === 'string' ? data.nameOfAgencyOwner.trim() : (data.nameOfAgencyOwner === null ? "" : undefined),
      nameOfTheAgency: typeof data.nameOfTheAgency === 'string' ? data.nameOfTheAgency.trim() : (data.nameOfTheAgency === null ? "" : undefined),
      contactNoOwner: typeof data.contactNoOwner === 'string' ? data.contactNoOwner.trim() : (data.contactNoOwner === null ? "" : undefined),

      // Optional fields trimming & clean up
      aadhaarNumber: typeof data.aadhaarNumber === 'string' && data.aadhaarNumber.trim() !== "" ? data.aadhaarNumber.trim() : (data.aadhaarNumber === "" || data.aadhaarNumber === null ? null : data.aadhaarNumber),
      email: typeof data.email === 'string' && data.email.trim() !== "" ? data.email.trim() : (data.email === "" || data.email === null ? null : data.email),
      biometricId: typeof data.biometricId === 'string' && data.biometricId.trim() !== "" ? data.biometricId.trim() : (data.biometricId === "" || data.biometricId === null ? null : data.biometricId),

      // FORCING CLEAN STRING FORMATS FOR DRIZZLE TEXT FIELDS
      commencementDate: formatDbDate(data.commencementDate),
      agreementFromDate: formatDbDate(data.agreementFromDate),
      agreementValidUpto: formatDbDate(data.agreementValidUpto),
      licenseValidity: formatDbDate(data.licenseValidity),
    };

    // 2. MANDATORY FIELDS VALIDATION (Agar ye fields payload mein hain, to khali nahi ho sakti)
    if (cleanData.contractorCode === "") {
      throw new Error("VALIDATION_ERROR: Contractor Code cannot be empty.");
    }
    if (cleanData.nameOfAgencyOwner === "") {
      throw new Error("VALIDATION_ERROR: Contractor Name (Owner Name) cannot be empty.");
    }
    if (cleanData.nameOfTheAgency === "") {
      throw new Error("VALIDATION_ERROR: Agency Name cannot be empty.");
    }
    if (cleanData.contactNoOwner === "") {
      throw new Error("VALIDATION_ERROR: Mobile Number cannot be empty.");
    }

    // 3. STRICT MOBILE NUMBER VALIDATION (Exactly 10 digits & starts with 6,7,8,9)
    if (cleanData.contactNoOwner && cleanData.contactNoOwner !== "") {
      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(cleanData.contactNoOwner)) {
        throw new Error("VALIDATION_ERROR: Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9.");
      }
    }

    // 4. STRICT EMAIL FORMAT VALIDATION (Checked only if present)
    if (cleanData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanData.email)) {
        throw new Error("VALIDATION_ERROR: Please provide a valid email address format.");
      }
    }

    // 5. LENGTH VALIDATION FOR OTHER OPTIONAL DETAILS
    if (cleanData.aadhaarNumber && cleanData.aadhaarNumber.length !== 12) {
      throw new Error("VALIDATION_ERROR: Aadhaar must be exactly 12 digits.");
    }

    // 6. DUPLICATE CHECK
    if (cleanData.contractorCode) {
      const [existing] = await db
        .select()
        .from(contractors)
        .where(and(eq(contractors.contractorCode, cleanData.contractorCode), ne(contractors.id, id)));
      if (existing) {
        throw new Error("DUPLICATE_CODE: This Contractor Code already exists.");
      }
    }

    // 7. UPDATE IN DATABASE
    const [updated] = await db
      .update(contractors)
      .set(cleanData as any)
      .where(eq(contractors.id, id))
      .returning();

    if (!updated) throw new Error("Contractor not found");
    return updated;
  }

  async deleteContractor(id: number): Promise<boolean> {
    const result = await db.delete(contractors).where(eq(contractors.id, id));
    return (result?.rowCount ?? 0) > 0;
  }
  async getAuditLogs(
    page?: number,
    pageSize?: number,
    search?: string,
    performedBy?: string,
    module?: string,
    action?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<any> {
    try {
      const conditions = [];

      if (search && search.trim() !== "") {
        const searchPattern = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(auditLogs.tableName, searchPattern),
            ilike(auditLogs.action, searchPattern),
            ilike(auditLogs.userId, searchPattern),
            ilike(users.username, searchPattern)
          )
        );
      }

      if (performedBy && performedBy.trim() !== "" && performedBy !== "all") {
        conditions.push(
          eq(sql`cast(${auditLogs.userId} as text)`, sql`cast(${performedBy.trim()} as text)`)
        );
      }

      if (module && module.trim() !== "" && module !== "all") {
        conditions.push(ilike(auditLogs.tableName, `%${module.trim()}%`));
      }

      if (action && action.trim() !== "" && action !== "all") {
        conditions.push(eq(auditLogs.action, action.trim()));
      }

      if (fromDate && fromDate.trim() !== "") {
        const start = new Date(fromDate.trim());
        start.setHours(0, 0, 0, 0);
        conditions.push(gte(auditLogs.createdAt, start));
      }

      if (toDate && toDate.trim() !== "") {
        const end = new Date(toDate.trim());
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(auditLogs.createdAt, end));
      }

      const whereClause = conditions.length ? and(...conditions) : undefined;

      const baseQuery = db
        .select({
          id: auditLogs.id,
          tableName: auditLogs.tableName,
          recordId: auditLogs.recordId,
          action: auditLogs.action,
          oldData: auditLogs.oldData,
          newData: auditLogs.newData,
          changedColumns: auditLogs.changedColumns,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
          userId: auditLogs.userId,
          username: users.username,
        })
        .from(auditLogs)
        .leftJoin(
          users,
          eq(sql`cast(${auditLogs.userId} as text)`, sql`cast(${users.id} as text)`)
        )
        .where(whereClause)
        .orderBy(desc(auditLogs.id));

      return await withPagination(db, auditLogs, baseQuery, page, pageSize, whereClause);
    } catch (dbError: any) {
      console.error("Error in getAuditLogs storage method:", dbError);
      throw dbError;
    }
  }
  async getAuditActions(): Promise<string[]> {
    try {
      const uniqueActions = await db
        .select({ action: auditLogs.action })
        .from(auditLogs)
        .groupBy(auditLogs.action);

      return uniqueActions
        .map((item) => item.action)
        .filter((action) => action && action.trim() !== "");
    } catch (error) {
      console.error("Error fetching unique audit actions:", error);
      throw error;
    }
  }

  async getLoginLogs(
    page?: number,
    pageSize?: number,
    search?: string,
    userId?: string,
    status?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<any> {
    try {
      const conditions = [];

      if (search && search.trim() !== "") {
        const searchPattern = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(sessions.username, searchPattern),
            ilike(sessions.ipAddress, searchPattern),
            ilike(sessions.status, searchPattern),
            ilike(sessions.userId, searchPattern),
            ilike(sessions.userAgent, searchPattern)
          )
        );
      }

      if (userId && userId.trim() !== "") {
        conditions.push(
          eq(sql`cast(${sessions.userId} as text)`, sql`cast(${userId.trim()} as text)`)
        );
      }

      if (status && status.trim() !== "") {
        conditions.push(eq(sessions.status, status.trim()));
      }

      if (fromDate && fromDate.trim() !== "") {
        const start = new Date(fromDate.trim());
        start.setHours(0, 0, 0, 0);
        conditions.push(gte(sessions.createdAt, start));
      }

      if (toDate && toDate.trim() !== "") {
        const end = new Date(toDate.trim());
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(sessions.createdAt, end));
      }

      const whereClause = conditions.length ? and(...conditions) : undefined;

      const baseQuery = db
        .select({
          id: sessions.sid,
          sess: sessions.sess,
          expire: sessions.expire,
          userId: sessions.userId,
          username: sessions.username,
          ipAddress: sessions.ipAddress,
          userAgent: sessions.userAgent,
          status: sessions.status,
          createdAt: sessions.createdAt,
          logoutAt: sessions.logoutAt,
        })
        .from(sessions)
        .where(whereClause)
        .orderBy(desc(sessions.createdAt));

      return await withPagination(db, sessions, baseQuery, page, pageSize, whereClause);
    } catch (dbError: any) {
      console.error("Error in getLoginLogs storage method:", dbError);
      throw dbError;
    }
  }
  async getAuditUsersDropdown(): Promise<any[]> {
    try {
      return await db
        .selectDistinct({
          id: users.id,
          username: users.username,
        })
        .from(users)
        .innerJoin(auditLogs, eq(sql`cast(${auditLogs.userId} as text)`, sql`cast(${users.id} as text)`));
    } catch (error) {
      console.error("Error fetching audit users dropdown:", error);
      return [];
    }
  }

  // 2. Audit Logs dropdown ke liye unique Table/Modules ki list
  async getAuditModulesDropdown(): Promise<any[]> {
    try {
      return await db
        .selectDistinct({
          tableName: auditLogs.tableName,
        })
        .from(auditLogs)
        .where(sql`${auditLogs.tableName} IS NOT NULL`);
    } catch (error) {
      console.error("Error fetching audit modules dropdown:", error);
      return [];
    }
  }
  // storage.ts mein AuthStorage class ke andar add karein
  async toggleUserStatus(userId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // 1. Current status check karein
      const [user] = await tx
        .select({ isAccountActive: users.isAccountActive })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) throw new Error("User not found");

      const newStatus = !user.isAccountActive;

      // 2. Users table update karein
      await tx.update(users)
        .set({
          isAccountActive: newStatus,
          failedLoginAttempts: 0 // Account unlock karte hi attempts reset
        })
        .where(eq(users.id, userId));

      // 3. Sync UserProfiles table (Agar wahan bhi status rakha hai)
      await tx.update(userProfiles)
        .set({ isActive: newStatus })
        .where(eq(userProfiles.userId, userId));

      return newStatus;
    });
  }
  async logLoginAttempt(data: InsertLoginAttempt): Promise<void> {
    await db.insert(loginAttempts).values(data);

    if (data.status === "FAILED") {
      const [user] = await db.select().from(users).where(eq(users.username, data.username));
      if (user) {
        await db.update(users)
          .set({ failedLoginAttempts: (user.failedLoginAttempts || 0) + 1 })
          .where(eq(users.id, user.id));
      }
    }
  }
  async getVisitorCards(
    page?: number,
    pageSize?: number,
    search?: string,
  ): Promise<any> {
    try {
      const searchText = search?.toLowerCase().trim();

      // 1. BASE QUERY (Ordering by ID asc)
      const baseQuery = db.select().from(visitorCards).orderBy(asc(visitorCards.id));

      // 2. SEARCH FILTER LOGIC
      const finalQuery = searchText
        ? db
          .select()
          .from(visitorCards)
          .where(
            or(
              ilike(visitorCards.name, `%${searchText}%`),
              ilike(visitorCards.cardNumber, `%${searchText}%`),
            ),
          )
          .orderBy(asc(visitorCards.id))
        : baseQuery;

      // 3. WITH PAGINATION UTILITY HELP
      // Yeh same helper use karega jo shifts page use kar raha hai
      return await withPagination(db, visitorCards, finalQuery, page, pageSize);
    } catch (error) {
      console.error("getVisitorCards error:", error);

      // Error safety structure format
      return {
        data: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        pageSize: 0,
      };
    }
  }
  async getVisitorCardById(id: number) {
    const [card] = await db.select().from(visitorCards).where(eq(visitorCards.id, id));
    return card;
  }
  // async createVisitorCard(card: any) {
  //   // 1. Postgres se 'id' alag karein taaki default identity sequence run ho
  //   const { id, ...cardData } = card;

  //   return await db.transaction(async (tx) => {
  //     // 2. Postgres Insert (Sahi chal raha hai)
  //     const [newCard] = await tx.insert(visitorCards).values(cardData).returning();

  //     try {
  //       // 3. MS SQL adapter se data format karein
  //       const msSqlData = VisitorCardAdapter.toMsSql(cardData);

  //       // 4. Object name 'undefined' error se bachne ke liye direct mssql pool input use karein
  //       const request = mssqlPool.request();

  //       // Request inputs parameters bind karein
  //       request.input('Name', mssql.NVarChar, msSqlData.Name);
  //       request.input('CardNumber', mssql.NVarChar, msSqlData.CardNumber);
  //       request.input('LocationId', mssql.Int, msSqlData.LocationId);
  //       request.input('ExpiryFrom', mssql.DateTime, msSqlData.ExpiryFrom);
  //       request.input('ExpiryTo', mssql.DateTime, msSqlData.ExpiryTo);

  //       // Direct SSMS Table 'VisitorCards' par insert run karein
  //       await request.query(`
  //       INSERT INTO VisitorCards (Name, CardNumber, LocationId, ExpiryFrom, ExpiryTo)
  //       VALUES (@Name, @CardNumber, @LocationId, @ExpiryFrom, @ExpiryTo)
  //     `);

  //     } catch (err) {
  //       console.error("❌ MS SQL Sync Failed Error Details:", err);
  //       tx.rollback(); // Postgres rollback karein agar MS SQL fail ho
  //       throw new Error("MS SQL Sync Failed, Postgres transaction rolled back.");
  //     }

  //     return newCard;
  //   });
  // }
  async createVisitorCard(card: any) {
    // 1. Postgres ke purane 'id' ko hata dein taaki hum naya generate karein
    const { id, ...cardData } = card;

    // 2. DUPLICATE CHECK: Pehle local DB me check karein ki cardNumber already hai ya nahi
    if (cardData.cardNumber) {
      const existingCard = await db
        .select()
        .from(visitorCards)
        .where(eq(visitorCards.cardNumber, cardData.cardNumber))
        .limit(1);

      if (existingCard.length > 0) {
        throw new Error(`Duplicate card number not allowed: '${cardData.cardNumber}' already exists.`);
      }
    }

    // Postgres sequence sync setup
    try {
      await db.execute(sql`
      SELECT setval(pg_get_serial_sequence('visitor_cards', 'id'), COALESCE(MAX(id), 1)) FROM visitor_cards;
    `);
    } catch (seqErr) {
      // Sequence fail safe ignore
    }

    let insertedMsSqlId: number | null = null;

    // ==========================================
    // STEP 1: PEHLE MS SQL ME INSERT KAREIN
    // ==========================================
    try {
      if (mssqlPool) {
        if (!mssqlPool.connected && typeof mssqlPool.connect === 'function') {
          await mssqlPool.connect();
        }

        const msSqlData = VisitorCardAdapter.toMsSql(cardData);
        const request = mssqlPool.request();

        request.input('Name', mssql.NVarChar, msSqlData.Name);
        request.input('CardNumber', mssql.NVarChar, msSqlData.CardNumber);
        request.input('LocationId', mssql.Int, msSqlData.LocationId);
        request.input('ExpiryFrom', mssql.DateTime, msSqlData.ExpiryFrom);
        request.input('ExpiryTo', mssql.DateTime, msSqlData.ExpiryTo);

        const msSqlResult = await request.query(`
        INSERT INTO VisitorCards (Name, CardNumber, LocationId, ExpiryFrom, ExpiryTo)
        VALUES (@Name, @CardNumber, @LocationId, @ExpiryFrom, @ExpiryTo);
        SELECT SCOPE_IDENTITY() AS id;
      `);

        if (msSqlResult.recordset && msSqlResult.recordset.length > 0) {
          insertedMsSqlId = msSqlResult.recordset[0].id;
        }

        if (!insertedMsSqlId) {
          throw new Error("MS SQL Inserted but failed to retrieve generated Identity ID.");
        }
      } else {
        throw new Error("mssqlPool configuration is missing or undefined.");
      }
    } catch (msSqlErr: any) {
      throw new Error(`MS SQL creation failed: ${msSqlErr.message || "Unknown error"}`);
    }

    // ==========================================
    // STEP 2: AB POSTGRES ME MS_ID KE SATH INSERT KAREIN
    // ==========================================
    return await db.transaction(async (tx) => {
      try {
        const postgresPayload = {
          name: cardData.name,
          cardNumber: cardData.cardNumber,
          locationId: cardData.locationId,
          location: cardData.location || null,
          expiryFrom: cardData.expiryFrom ? new Date(cardData.expiryFrom) : null,
          expiryTo: cardData.expiryTo ? new Date(cardData.expiryTo) : null,
          msId: insertedMsSqlId,
        };

        const [newCard] = await tx
          .insert(visitorCards)
          .values(postgresPayload)
          .returning();

        return newCard;
      } catch (pgErr: any) {
        tx.rollback();
        throw new Error(`Postgres transaction failed and rolled back. Error: ${pgErr.message}`);
      }
    });
  }

  // async updateVisitorCard(id: number, card: any) {
  //   const { id: _, ...cardData } = card;

  //   return await db.transaction(async (tx) => {
  //     // 1. Postgres Update
  //     const [updatedCard] = await tx.update(visitorCards)
  //       .set({ ...cardData, updatedAt: new Date() })
  //       .where(eq(visitorCards.id, id))
  //       .returning();

  //     try {
  //       // 2. MS SQL Update
  //       const msSqlData = VisitorCardAdapter.toMsSql(cardData);
  //       const request = mssqlPool.request();

  //       request.input('TargetId', mssql.Int, id); // Assuming Postgres ID and MS SQL ID are kept in sync
  //       request.input('Name', mssql.NVarChar, msSqlData.Name);
  //       request.input('CardNumber', mssql.NVarChar, msSqlData.CardNumber);
  //       request.input('LocationId', mssql.Int, msSqlData.LocationId);
  //       request.input('ExpiryFrom', mssql.DateTime, msSqlData.ExpiryFrom);
  //       request.input('ExpiryTo', mssql.DateTime, msSqlData.ExpiryTo);

  //       await request.query(`
  //       UPDATE VisitorCards 
  //       SET Name = @Name, CardNumber = @CardNumber, LocationId = @LocationId, ExpiryFrom = @ExpiryFrom, ExpiryTo = @ExpiryTo
  //       WHERE Id = @TargetId
  //     `);

  //     } catch (err) {
  //       console.error("❌ MS SQL Update Sync Failed Error Details:", err);
  //       tx.rollback();
  //       throw new Error("MS SQL Update Failed, changes rolled back.");
  //     }

  //     return updatedCard;
  //   });
  // }

  // DELETE function mein change

  async updateVisitorCard(id: number, card: any) {
    // 1. Id ko destructure karo aur safe side check lagao
    const { id: _, ...cardData } = card;

    // 2. Postgres se purana card data nikaalo msId lene ke liye
    const currentCard = await db
      .select()
      .from(visitorCards)
      .where(eq(visitorCards.id, id))
      .limit(1);

    if (currentCard.length === 0) {
      throw new Error(`Card update failed: Record with local ID '${id}' not found.`);
    }

    const targetMsId = currentCard[0].msId;

    if (!targetMsId) {
      throw new Error(`Card update failed: This record doesn't have a valid MS SQL Link ('msId' is missing).`);
    }

    // ==========================================
    // STEP 1: PEHLE MS SQL ME UPDATE KAREIN
    // ==========================================
    try {
      if (mssqlPool) {
        if (!mssqlPool.connected && typeof mssqlPool.connect === 'function') {
          await mssqlPool.connect();
        }

        // Final values ensure karne ke liye fallbacks
        const finalCardNumber = cardData.cardNumber || currentCard[0].cardNumber;
        const finalName = cardData.name || currentCard[0].name;
        const finalLocationId = cardData.locationId !== undefined ? cardData.locationId : currentCard[0].locationId;
        const finalExpiryFrom = cardData.expiryFrom !== undefined ? cardData.expiryFrom : currentCard[0].expiryFrom;
        const finalExpiryTo = cardData.expiryTo !== undefined ? cardData.expiryTo : currentCard[0].expiryTo;

        // Adapter ko full data bhejein taaki mapping accurate ho
        const msSqlData = VisitorCardAdapter.toMsSql({
          name: finalName,
          cardNumber: finalCardNumber,
          locationId: finalLocationId,
          expiryFrom: finalExpiryFrom,
          expiryTo: finalExpiryTo
        });

        const request = mssqlPool.request();

        request.input('TargetMsId', mssql.Int, targetMsId);
        request.input('Name', mssql.NVarChar, msSqlData.Name);
        request.input('CardNumber', mssql.NVarChar, msSqlData.CardNumber);
        request.input('LocationId', mssql.Int, msSqlData.LocationId || 0);
        request.input('ExpiryFrom', mssql.DateTime, msSqlData.ExpiryFrom || null);
        request.input('ExpiryTo', mssql.DateTime, msSqlData.ExpiryTo || null);

        await request.query(`
        UPDATE VisitorCards 
        SET Name = @Name, 
            CardNumber = @CardNumber, 
            LocationId = @LocationId, 
            ExpiryFrom = @ExpiryFrom, 
            ExpiryTo = @ExpiryTo
        WHERE Id = @TargetMsId
      `);
      } else {
        throw new Error("mssqlPool configuration is missing.");
      }
    } catch (msSqlErr: any) {
      throw new Error(`MS SQL Update Failed: ${msSqlErr.message || 'Unknown Sync Error'}`);
    }

    // ==========================================
    // STEP 2: LOCAL POSTGRES ME UPDATE KAREIN
    // ==========================================
    return await db.transaction(async (tx) => {
      try {
        const [updatedCard] = await tx
          .update(visitorCards)
          .set({
            name: cardData.name,
            cardNumber: cardData.cardNumber,
            locationId: cardData.locationId,
            location: cardData.location,
            expiryFrom: cardData.expiryFrom ? new Date(cardData.expiryFrom) : undefined,
            expiryTo: cardData.expiryTo ? new Date(cardData.expiryTo) : undefined,
            updatedAt: new Date()
          })
          .where(eq(visitorCards.id, id))
          .returning();

        return updatedCard;
      } catch (pgErr: any) {
        tx.rollback();
        throw new Error(`Postgres transaction failed and rolled back: ${pgErr.message}`);
      }
    });
  }

  // async deleteVisitorCard(id: number) {
  //   return await db.transaction(async (tx) => {
  //     try {
  //       // 1. Pehle local main database se delete karein (using 'tx' context)
  //       await tx.delete(visitorCards).where(eq(visitorCards.id, id));

  //       // 2. Ab external MS SQL database se delete karne ki koshish karein
  //       try {
  //         await dbMsSql.delete(visitorCards).where(eq(visitorCards.id, id));
  //       } catch (msSqlErr) {
  //         console.error("MS SQL Sync Delete Failed:", msSqlErr);
  //         // Agar MS SQL fail hota hai, toh local transaction ko abort/rollback karne ke liye error throw karein
  //         throw new Error("MS SQL Sync Failed");
  //       }

  //     } catch (err: any) {
  //       // Agar error MS SQL ka hai ya kisi aur cheez ka, transaction automatic rollback ho jayega
  //       console.error("deleteVisitorCard transaction failed, rolling back:", err);

  //       // Drizzle transaction rollback convention
  //       tx.rollback();
  //       throw new Error(err.message || "Delete operation failed and rolled back.");
  //     }
  //   });
  // }

  async deleteVisitorCard(id: number) {
    // 1. Postgres se card record uthao taaki MS SQL ki 'msId' mil sake
    const currentCard = await db
      .select()
      .from(visitorCards)
      .where(eq(visitorCards.id, id))
      .limit(1);

    if (currentCard.length === 0) {
      throw new Error(`Delete failed: Local ID '${id}' not found.`);
    }

    const targetMsId = currentCard[0].msId;

    // 2. MS SQL se record delete karein
    if (targetMsId && mssqlPool) {
      try {
        if (!mssqlPool.connected && typeof mssqlPool.connect === 'function') {
          await mssqlPool.connect();
        }

        const request = mssqlPool.request();
        request.input('TargetMsId', mssql.Int, targetMsId);

        await request.query(`DELETE FROM VisitorCards WHERE Id = @TargetMsId`);
      } catch (msSqlErr) {
        // MS SQL fail hone par process block nahi hogi, local cleanup chalta rahega
        console.error("MS SQL Sync Delete Failed:", msSqlErr);
      }
    }

    // 3. Local Postgres se delete karein
    await db.transaction(async (tx) => {
      try {
        await tx.delete(visitorCards).where(eq(visitorCards.id, id));
      } catch (err: any) {
        tx.rollback();
        throw err;
      }
    });
  }
  async upsertVisitorDoorAssignment(data: {
    visitorId: number;
    visitorCardId: number;
    doorIds: number[];
  }) {
    const uniqueDoorIds = [...new Set(data.doorIds.map(Number))];

    if (uniqueDoorIds.length === 0) {
      throw new Error("Door IDs array cannot be empty.");
    }

    // Check using rfid/rfidCardNo text column with string conversion
    const [existingVisitor] = await db
      .select()
      .from(schema.visitors)
      .where(
        and(
          eq(schema.visitors.id, Number(data.visitorId)),
          eq(schema.visitors.visitorCardId, Number(data.visitorCardId))// Matches your string rfid column
        )
      )
      .limit(1);

    if (!existingVisitor) {
      throw new Error("No matching record found for the provided Visitor ID and Visitor Card ID.");
    }

    const generatedCardCode = `visitor${data.visitorId}`;
    const currentTimestamp = new Date();

    const mappings = await db
      .select({
        inDeviceIds: schema.doorDevices.inDeviceIds,
        outDeviceIds: schema.doorDevices.outDeviceIds
      })
      .from(schema.doorDevices)
      .where(inArray(schema.doorDevices.doorId, uniqueDoorIds));

    if (!mappings || mappings.length === 0) {
      throw new Error("No matching devices found for the provided Door IDs in door_devices.");
    }

    const allDeviceIds = new Set<number>();
    mappings.forEach((row) => {
      if (Array.isArray(row.inDeviceIds)) {
        row.inDeviceIds.forEach((id) => id && allDeviceIds.add(Number(id)));
      }
      if (Array.isArray(row.outDeviceIds)) {
        row.outDeviceIds.forEach((id) => id && allDeviceIds.add(Number(id)));
      }
    });

    const deviceIds = [...allDeviceIds];

    if (deviceIds.length === 0) {
      throw new Error("No valid Device IDs found assigned to the selected doors.");
    }

    const pgResult = await db.transaction(async (tx) => {
      const pgEntries = deviceIds.map((deviceId) => ({
        deviceId: deviceId,
        visitorCardId: Number(data.visitorCardId),
        visitorCardCode: generatedCardCode,
        command: 'ADD',
        status: 'PENDING',
        syncDate: null,
        isDirtyDateTime: currentTimestamp,
      }));

      return await tx
        .insert(schema.visitorCardLogs)
        .values(pgEntries)
        .returning();
    });

    try {
      const msSqlPromises = deviceIds.map((deviceId) =>
        dbMsSql.insert({ dbName: 'DeviceVisitorCards' }).values({
          DeviceId: deviceId,
          VisitorCardId: Number(data.visitorCardId),
          VisitorCardCode: generatedCardCode,
          Command: 'ADD',
          Status: 'PENDING',
          SyncDate: null,
          IsDirtyDateTime: currentTimestamp,
        })
      );

      await Promise.all(msSqlPromises);
    } catch (msSqlError) {
      console.error("MS SQL Sync Failed:", msSqlError);
      throw new Error("Data saved to Postgres but failed to sync with MS SQL.");
    }

    return pgResult;
  }
}
export const storage = new DatabaseStorage();
