import {
  userProfiles, companies, departments, designations, categories, vendors,
  sites, buildings, floors, zones, doors, devices, people, credentials,
  accessCards, shifts, shiftAssignments, holidays, accessLevels, accessRules,
  personAccess, visitors, visits, attendance, accessLogs, alerts, exceptions,
  systemSettings,
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
} from "@shared/schema";
import { db, dbMsSql } from "./db";
import { eq, desc, and, count, sql, ilike } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";
import { DeviceAdapter, HolidayAdapter, PersonAdapter } from "@shared/mssql_schema";
import { SHIFT_START, SHIFT_END, EXPECTED_WORKING_HRS } from './constant';

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

  getBuildings(siteId?: number): Promise<Building[]>;
  createBuilding(data: InsertBuilding): Promise<Building>;
  updateBuilding(id: number, data: Partial<InsertBuilding>): Promise<Building>;
  deleteBuilding(id: number): Promise<void>;

  getFloors(buildingId?: number): Promise<Floor[]>;
  createFloor(data: InsertFloor): Promise<Floor>;
  updateFloor(id: number, data: Partial<InsertFloor>): Promise<Floor>;
  deleteFloor(id: number): Promise<void>;

  getZones(siteId?: number, buildingId?: number): Promise<Zone[]>;
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

  getAttendance(date?: string, siteId?: number, personId?: number): Promise<Attendance[]>;
  createAttendance(data: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, data: Partial<InsertAttendance>): Promise<Attendance>;

  getAccessLogs(limit?: number, siteId?: number): Promise<AccessLog[]>;
  createAccessLog(data: InsertAccessLog): Promise<AccessLog>;

  getAlerts(isResolved?: boolean): Promise<Alert[]>;
  createAlert(data: InsertAlert): Promise<Alert>;
  updateAlert(id: number, data: Partial<InsertAlert>): Promise<Alert>;

  getExceptions(status?: string): Promise<Exception[]>;
  createException(data: InsertException): Promise<Exception>;
  updateException(id: number, data: Partial<InsertException>): Promise<Exception>;

  getSystemSettings(): Promise<SystemSetting[]>;
  upsertSystemSetting(data: InsertSystemSetting): Promise<SystemSetting>;

  getAttendanceReport(filters: { dateFrom?: string; dateTo?: string; status?: string; departmentId?: number; personId?: number; siteId?: number }): Promise<any[]>;
  getAccessLogReport(filters: { dateFrom?: string; dateTo?: string; eventType?: string; personId?: number; siteId?: number; doorId?: number }): Promise<any[]>;
  getVisitorReport(filters: { dateFrom?: string; dateTo?: string; status?: string }): Promise<any[]>;
  getEmployeeSummaryReport(filters: { departmentId?: number; status?: string; personType?: string }): Promise<any[]>;

  getDashboardStats(): Promise<object>;
}

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
    return await db.select().from(sites);
  }
  async createSite(data: InsertSite): Promise<Site> {
    const [created] = await db.insert(sites).values(data).returning();
    return created;
  }
  async updateSite(id: number, data: Partial<InsertSite>): Promise<Site> {
    const [updated] = await db.update(sites).set(data).where(eq(sites.id, id)).returning();
    return updated;
  }
  async deleteSite(id: number): Promise<void> {
    await db.delete(sites).where(eq(sites.id, id));
  }

  async getBuildings(siteId?: number): Promise<Building[]> {
    if (siteId) {
      return await db.select().from(buildings).where(eq(buildings.siteId, siteId));
    }
    return await db.select().from(buildings);
  }
  async createBuilding(data: InsertBuilding): Promise<Building> {
    const [created] = await db.insert(buildings).values(data).returning();
    return created;
  }
  async updateBuilding(id: number, data: Partial<InsertBuilding>): Promise<Building> {
    const [updated] = await db.update(buildings).set(data).where(eq(buildings.id, id)).returning();
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

  async getZones(siteId?: number, buildingId?: number): Promise<Zone[]> {
    const conditions = [];
    if (siteId) conditions.push(eq(zones.siteId, siteId));
    if (buildingId) conditions.push(eq(zones.buildingId, buildingId));
    if (conditions.length > 0) {
      return await db.select().from(zones).where(and(...conditions));
    }
    return await db.select().from(zones);
  }
  async createZone(data: InsertZone): Promise<Zone> {
    const [created] = await db.insert(zones).values(data).returning();
    return created;
  }
  async updateZone(id: number, data: Partial<InsertZone>): Promise<Zone> {
    const [updated] = await db.update(zones).set(data).where(eq(zones.id, id)).returning();
    return updated;
  }
  async deleteZone(id: number): Promise<void> {
    await db.delete(zones).where(eq(zones.id, id));
  }

  async getDoors(): Promise<Door[]> {
    return await db.select().from(doors);
  }
  async createDoor(data: InsertDoor): Promise<Door> {
    const [created] = await db.insert(doors).values(data).returning();
    return created;
  }
  async updateDoor(id: number, data: Partial<InsertDoor>): Promise<Door> {
    const [updated] = await db.update(doors).set(data).where(eq(doors.id, id)).returning();
    return updated;
  }
  async deleteDoor(id: number): Promise<void> {
    await db.delete(doors).where(eq(doors.id, id));
  }
  async getDevices(): Promise<Device[]> {
    // 1. Parallel fetch
    const [pgData, msDataRaw] = await Promise.all([
      db.select().from(devices),
      dbMsSql.select().from({ dbName: 'Devices' }).execute()
    ]);

       // 2. Auto-Sync Loop
    for (const msRow of (msDataRaw || [])) {
      const mapped = DeviceAdapter.toPostgres(msRow);

      // Check karein kya ye DeviceId (msId) pehle se Postgres mein hai?
      const exists = pgData.find(p => p.msId === mapped.msId);

      if (mapped.msId && !pgData.find(p => p.msId === mapped.msId)) {
        try {
          const [newRec] = await db.insert(devices).values({
            msId: mapped.msId,
            name: mapped.name,
            deviceDirection: mapped.deviceDirection,
            serialNumber: mapped.serialNumber,
            opstamp: mapped.opstamp,
            lastPing: mapped.lastPing,
            lastreset: mapped.lastreset,
            activationCode: mapped.activationCode,
            isAttendanceDevice: mapped.isAttendanceDevice,
            deviceType: mapped.deviceType,
            siteId: mapped.siteId,
            status: "offline",
            isActive: true
          }).returning();
          pgData.push(newRec);
        } catch (e) {
          console.error("Sync Error:", e);
        }
      }
    }
    // 3. Duplicate handling based on Serial Number or Name
    return Array.from(
      new Map(pgData.map(d => [`${d.msId || d.serialNumber || d.id}`, d])).values()
    );
  }
  async createDevice(data: InsertDevice): Promise<Device> {
    let mssqlId: number | null = null;
    try {
      const msRes = await dbMsSql.insert({ dbName: 'Devices' }).values(DeviceAdapter.toMsSql(data));
      // MS SQL DeviceId capture
      mssqlId = msRes.recordset?.[0]?.DeviceId || msRes.recordset?.[0]?.Id || null;
    } catch (e) {
      console.error("MS SQL Device Sync Error:", e);
    }

    const [created] = await db.insert(devices).values({ ...data, msId: mssqlId }).returning();
    return created;
  }

  async updateDevice(id: number, data: Partial<InsertDevice>): Promise<Device> {
    const [updated] = await db.update(devices).set(data).where(eq(devices.id, id)).returning();

    if (!updated) {
      throw new Error("Device not synced with Postgres. Please refresh.");
    }

    if (updated.msId) {
      try {
        // Device ke liye pk: 'DeviceId' batana zaroori hai
        await dbMsSql.update({ dbName: 'Devices', pk: 'DeviceId' })
          .set(DeviceAdapter.toMsSql(data))
          .where({ value: updated.msId });
      } catch (e) { console.error("MS SQL Device Update Error", e); }
    }
    return updated;
  }

  async deleteDevice(id: number): Promise<void> {
    const [record] = await db.select().from(devices).where(eq(devices.id, id));
    if (record) {
      if (record.msId) {
        await dbMsSql.delete({ dbName: 'Devices', pk: 'DeviceId' }).where({ value: record.msId });
      }
      await db.delete(devices).where(eq(devices.id, id));
    }
  }
  
  // async getDevices(): Promise<Device[]> {
  //   return await db.select().from(devices);
  // }
  // async createDevice(data: InsertDevice): Promise<Device> {
  //   const [created] = await db.insert(devices).values(data).returning();
  //   return created;
  // }
  // async updateDevice(id: number, data: Partial<InsertDevice>): Promise<Device> {
  //   const [updated] = await db.update(devices).set(data).where(eq(devices.id, id)).returning();
  //   return updated;
  // }
  // async deleteDevice(id: number): Promise<void> {
  //   await db.delete(devices).where(eq(devices.id, id));
  // }
  // --- GET ALL PEOPLE WITH AUTO-SYNC ---
  async getPeople(search?: string): Promise<Person[]> {
    // 1. Parallel fetch from both DBs
    const [pgData, msDataRaw] = await Promise.all([
      db.select().from(people),
      dbMsSql.select().from({ dbName: 'Employees' }).execute()
    ]);

    // 2. Auto-Sync Loop
    for (const msRow of (msDataRaw || [])) {
      const mapped = PersonAdapter.toPostgres(msRow);

      // Check if record exists in Postgres based on msId
      const exists = pgData.find(p => p.msId === mapped.msId);

      if (mapped.msId && !exists) {
        try {
          const [newRec] = await db.insert(people).values({
            msId: mapped.msId,
            firstName: mapped.firstName,
            lastName: mapped.lastName,
            employeeId: mapped.employeeId,
            employeeCode: mapped.employeeCode,
            siteId: mapped.siteId,
            address: mapped.address,
            overtimeEligible: mapped.overtimeEligible,
            personType: "employee",
            status: "active",
            sourceSystem: "mssql_bio",
            externalId: mapped.externalId,
            updatedAt: new Date(),
            createdAt: new Date(),
          }).returning();

          pgData.push(newRec);
        } catch (e) {
          console.error("People Sync Error:", e);
        }
      }
    }

    // 3. Search and Duplicate Handling
    let results = pgData;
    if (search) {
      const term = search.toLowerCase();
      results = pgData.filter(p =>
        p.firstName.toLowerCase().includes(term) ||
        (p.lastName && p.lastName.toLowerCase().includes(term)) ||
        (p.employeeCode && p.employeeCode.toLowerCase().includes(term))
      );
    }

    return Array.from(
      new Map(results.map(p => [`${p.msId || p.employeeId || p.id}`, p])).values()
    );
  }
  // --- GET SINGLE PERSON ---
  async getPerson(id: number): Promise<Person | undefined> {
    const [person] = await db.select().from(people).where(eq(people.id, id));
    return person;
  }

  // --- CREATE PERSON ---
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
      // FIX: msId ko number mein cast kiya taaki Drizzle error na de
      msId: mssqlId,
      updatedAt: new Date()
    }).returning();

    return created;
  }

  // --- UPDATE PERSON ---
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

  // --- DELETE PERSON ---
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

  // async getPeople(search?: string): Promise<Person[]> {
  //   if (search) {
  //     return await db.select().from(people).where(ilike(people.firstName, `%${search}%`));
  //   }
  //   return await db.select().from(people);
  // }
  
  // async getPerson(id: number): Promise<Person | undefined> {
  //   const [person] = await db.select().from(people).where(eq(people.id, id));
  //   return person;
  // }
  // async createPerson(data: InsertPerson): Promise<Person> {
  //   const [created] = await db.insert(people).values(data).returning();
  //   return created;
  // }
  // async updatePerson(id: number, data: Partial<InsertPerson>): Promise<Person> {
  //   const [updated] = await db.update(people).set({ ...data, updatedAt: new Date() }).where(eq(people.id, id)).returning();
  //   return updated;
  // }
  // async deletePerson(id: number): Promise<void> {
  //   await db.delete(people).where(eq(people.id, id));
  // }

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
  async createShift(data: InsertShift): Promise<Shift> {
    const [created] = await db.insert(shifts).values(data).returning();
    return created;
  }
  async updateShift(id: number, data: Partial<InsertShift>): Promise<Shift> {
    const [updated] = await db.update(shifts).set(data).where(eq(shifts.id, id)).returning();
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
  // --- Holidays (Simplified Format) ---

  // async getHolidays(): Promise<Holiday[]> {
  //   // Parallel fetch: Dono DBs se data uthao
  //   const [pgData, msData] = await Promise.all([
  //     db.select().from(holidays),
  //     dbMsSql.select().from({ ...holidays, dbName: 'Holidays' }).execute()
  //   ]);

  //   // Simple Merge: Adapter ka use karke merge aur duplicate filter
  //   const combined = [...pgData, ...(msData || []).map(HolidayAdapter.toPostgres)];
  //   return Array.from(new Map(combined.map(h => [`${h.name}-${h.date}`, h])).values());
  // }
  async getHolidays(): Promise<Holiday[]> {
    const [pgData, msDataRaw] = await Promise.all([
      db.select().from(holidays),
      dbMsSql.select().from({ dbName: 'Holidays' }).execute()
    ]);

    // MS SQL ke wo records jo Postgres mein nahi hain, unhe Insert kar do (Auto-Sync)
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

    // Duplicate filter aur return
    return Array.from(new Map(pgData.map(h => [`${h.name}-${h.date}`, h])).values());
  }
  async createHoliday(data: InsertHoliday): Promise<Holiday> {
    // 1. MS SQL mein insert (try-catch taaki Postgres na ruke)
    let mssqlId: number | null = null;
    try {
      const msRes = await dbMsSql.insert({ dbName: 'Holidays' }).values(HolidayAdapter.toMsSql(data));
      mssqlId = msRes.recordset?.[0]?.Id || msRes.recordset?.[0]?.id || null;
    } catch (e) {
      console.error("MS SQL Sync Error:", e);
    }

    // 2. Postgres mein simple insert (baki code jaisa format)
    const [created] = await db.insert(holidays).values({ ...data, msId: mssqlId }).returning();
    return created;
  }
  async updateHoliday(id: number, data: Partial<InsertHoliday>): Promise<Holiday> {
    const [updated] = await db.update(holidays)
      .set(data)
      .where(eq(holidays.id, id))
      .returning();

    // AGAR UPDATED NAHI MILA (Random ID issue)
    if (!updated) {
      // Isse "json" error khatam ho jayega aur clear message dikhega
      throw new Error("This record is not synced with Postgres yet. Please recreate it.");
    }

    if (updated.msId) {
      try {
        await dbMsSql.update({ dbName: 'Holidays' })
          .set(HolidayAdapter.toMsSql(data))
          .where({ value: updated.msId });
      } catch (e) { console.error("MS SQL Sync Error", e); }
    }

    return updated; // Valid JSON hamesha return hoga
  }

  async deleteHoliday(id: number): Promise<void> {
    const [record] = await db.select().from(holidays).where(eq(holidays.id, id));
    if (record) {
      // MS SQL Delete first
      if (record.msId) {
        await dbMsSql.delete({ dbName: 'Holidays' }).where({ value: record.msId });
      }
      // Postgres Delete
      await db.delete(holidays).where(eq(holidays.id, id));
    }
  }

 

  // // async updateHoliday(id: number, data: Partial<InsertHoliday>): Promise<Holiday> {
  // //   const [updated] = await db.update(holidays).set(data).where(eq(holidays.id, id)).returning();
  // //   return updated;
  // // }
  
  //   // 3. Postgres Delete
  //   await db.delete(holidays).where(eq(holidays.id, id));
  // }
  // // async deleteHoliday(id: number): Promise<void> {
  // //   await db.delete(holidays).where(eq(holidays.id, id));
  // // }

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

  async getAttendance(date?: string, siteId?: number, personId?: number): Promise<Attendance[]> {
    const conditions = [];
    if (date) conditions.push(eq(attendance.date, date));
    if (siteId) conditions.push(eq(attendance.siteId, siteId));
    if (personId) conditions.push(eq(attendance.personId, personId));
    if (conditions.length > 0) {
      return await db.select().from(attendance).where(and(...conditions));
    }
    return await db.select().from(attendance);
  }
  async createAttendance(data: InsertAttendance): Promise<Attendance> {
    const [created] = await db.insert(attendance).values(data).returning();
    return created;
  }
  async updateAttendance(id: number, data: Partial<InsertAttendance>): Promise<Attendance> {
    const [updated] = await db.update(attendance).set(data).where(eq(attendance.id, id)).returning();
    return updated;
  }

  async getAccessLogs(limit?: number, siteId?: number): Promise<AccessLog[]> {
    if (siteId) {
      return await db.select().from(accessLogs).where(eq(accessLogs.siteId, siteId)).orderBy(desc(accessLogs.timestamp)).limit(limit || 100);
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
  
  // working code
 
  async getAttendanceReport(filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    departmentId?: number;
    personId?: number;
    siteId?: number;
  }): Promise<any[]> {
    // 1. MS SQL se logs aur Employees fetch karein
    const rawLogs = await dbMsSql.select().from({ dbName: 'DeviceLogs' }).execute();
    const msSqlEmployees = await dbMsSql.select().from({ dbName: 'Employees' }).execute();

    const reportMap = new Map<string, { empCode: string; date: string; logs: Date[] }>();

    // 2. Grouping & Date Filtering
    rawLogs.forEach((log: any) => {
      const logDateRaw = log.LogDate || log.logdate;
      const eventTimestamp = new Date(logDateRaw);
      if (isNaN(eventTimestamp.getTime())) return;

      // Local Date string bina UTC conversion ke (YYYY-MM-DD)
      const year = eventTimestamp.getFullYear();
      const month = String(eventTimestamp.getMonth() + 1).padStart(2, '0');
      const day = String(eventTimestamp.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const empCode = String(log.EmployeeCode || log.employeecode);

      // Frontend filters apply karein
      if (filters.dateFrom && dateStr < filters.dateFrom) return;
      if (filters.dateTo && dateStr > filters.dateTo) return;

      const key = `${empCode}_${dateStr}`;
      if (!reportMap.has(key)) {
        reportMap.set(key, { empCode, date: dateStr, logs: [] });
      }
      reportMap.get(key)!.logs.push(eventTimestamp);
    });

    // 3. Calculation & Mapping
    const results = Array.from(reportMap.values()).map(item => {
      const emp = msSqlEmployees.find(e => String(e.EmployeeCode || e.employeecode) === item.empCode);

      // Person filter check
      if (filters.personId && Number(emp?.EmployeeId || emp?.employeeid) !== Number(filters.personId)) return null;

      // Sorting logs for First-In Last-Out
      const sorted = item.logs.sort((a, b) => a.getTime() - b.getTime());
      const firstIn = sorted[0];
      const lastOut = sorted.length > 1 ? sorted[sorted.length - 1] : null;

      // Shift boundaries (Local)
      const shiftStart = new Date(`${item.date}T${SHIFT_START}`);
      const shiftEnd = new Date(`${item.date}T${SHIFT_END}`);

      let lateByMins = 0;
      let earlyByMins = 0;
      let totalHrs = 0;
      let overtimeHours = 0;

      // LATE CALCULATION: Max 240 mins (4 hrs) threshold
      if (firstIn > shiftStart) {
        const diff = Math.round((firstIn.getTime() - shiftStart.getTime()) / (1000 * 60));
        lateByMins = diff <= 240 ? diff : 0;
      }

      const isValidOut = lastOut && (lastOut.getTime() - firstIn.getTime()) > 60000; // 1 min gap req.

      if (isValidOut && lastOut) {
        totalHrs = (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60);

        // EARLY EXIT: Max 240 mins threshold
        if (lastOut < shiftEnd) {
          const diff = Math.round((shiftEnd.getTime() - lastOut.getTime()) / (1000 * 60));
          earlyByMins = diff <= 240 ? diff : 0;
        }

        // OT CALCULATION
        if (totalHrs > EXPECTED_WORKING_HRS) {
          overtimeHours = totalHrs - EXPECTED_WORKING_HRS;
        }
      }

      return {
        id: emp?.EmployeeId || emp?.employeeid || Math.random(),
        employeeCode: item.empCode,
        firstName: emp?.EmployeeName || "Unknown",
        lastName: "",
        date: item.date,
        // ISO string send karein frontend ko, formatTime handles AM/PM
        clockIn: firstIn.toISOString(),
        clockOut: isValidOut && lastOut ? lastOut.toISOString() : null,
        workingHours: totalHrs.toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
        lateByMins,
        earlyByMins,
        status: isValidOut ? (lateByMins > 0 ? "Late Entry" : "Present") : "Single Punch",
        department: emp?.Department || null
      };
    }).filter(r => r !== null);

    return results.sort((a, b) => b.date.localeCompare(a.date));
  }
 
  async getAccessLogReport(filters: { dateFrom?: string; dateTo?: string; eventType?: string; personId?: number; siteId?: number; doorId?: number }): Promise<any[]> {
    const conditions = [];
    if (filters.dateFrom) conditions.push(sql`DATE(${accessLogs.timestamp}) >= ${filters.dateFrom}`);
    if (filters.dateTo) conditions.push(sql`DATE(${accessLogs.timestamp}) <= ${filters.dateTo}`);
    if (filters.eventType) conditions.push(eq(accessLogs.eventType, filters.eventType as any));
    if (filters.personId) conditions.push(eq(accessLogs.personId, filters.personId));
    if (filters.siteId) conditions.push(eq(accessLogs.siteId, filters.siteId));
    if (filters.doorId) conditions.push(eq(accessLogs.doorId, filters.doorId));

    const query = db
      .select({
        id: accessLogs.id,
        personId: accessLogs.personId,
        firstName: people.firstName,
        lastName: people.lastName,
        employeeId: people.employeeId,
        eventType: accessLogs.eventType,
        accessMethod: accessLogs.accessMethod,
        isAuthorized: accessLogs.isAuthorized,
        denialReason: accessLogs.denialReason,
        doorId: accessLogs.doorId,
        siteId: accessLogs.siteId,
        timestamp: accessLogs.timestamp,
      })
      .from(accessLogs)
      .leftJoin(people, eq(accessLogs.personId, people.id));

    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(accessLogs.timestamp));
    }
    return await query.orderBy(desc(accessLogs.timestamp)).limit(500);
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
        siteId: visits.siteId,
      })
      .from(visits)
      .leftJoin(visitors, eq(visits.visitorId, visitors.id));

    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(visits.createdAt));
    }
    return await query.orderBy(desc(visits.createdAt)).limit(500);
  }

  async getEmployeeSummaryReport(filters: { departmentId?: number; status?: string; personType?: string }): Promise<any[]> {
    const conditions = [];
    if (filters.departmentId) conditions.push(eq(people.departmentId, filters.departmentId));
    if (filters.status) conditions.push(eq(people.status, filters.status as any));
    if (filters.personType) conditions.push(eq(people.personType, filters.personType as any));

    const query = db
      .select({
        id: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        email: people.email,
        phone: people.phone,
        employeeId: people.employeeId,
        employeeCode: people.employeeCode,
        departmentId: people.departmentId,
        designationId: people.designationId,
        companyId: people.companyId,
        personType: people.personType,
        status: people.status,
        gender: people.gender,
        dateOfJoining: people.dateOfJoining,
        siteId: people.siteId,
      })
      .from(people);

    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(people.firstName);
    }
    return await query.orderBy(people.firstName).limit(500);
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
}

export const storage = new DatabaseStorage();
