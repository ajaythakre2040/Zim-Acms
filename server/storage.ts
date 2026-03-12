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

} from "@shared/schema";
import { db, dbMsSql } from "./db";
import { eq, desc, or, and, ne, count, sql, ilike, notInArray } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";
import { DeviceAdapter, HolidayAdapter, PersonAdapter } from "@shared/mssql_schema";
import { SHIFT_START, SHIFT_END, EXPECTED_WORKING_HRS, ATTENDANCE_STATUS } from './constant';
import { esslService } from "./essl-service";
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

  async getBuildings(locationId?: number): Promise<Building[]> {
    if (locationId) {
      return await db.select().from(buildings).where(eq(buildings.locationId, locationId));
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
  // async getDevices(): Promise<Device[]> {
  //   // 1. Parallel fetch
  //   const [pgData, msDataRaw] = await Promise.all([
  //     db.select().from(devices),
  //     dbMsSql.select().from({ dbName: 'Devices' }).execute()
  //   ]);

  //   // 2. Auto-Sync Loop
  //   for (const msRow of (msDataRaw || [])) {
  //     const mapped = DeviceAdapter.toPostgres(msRow);

  //     // Check karein kya ye DeviceId (msId) pehle se Postgres mein hai?
  //     const exists = pgData.find(p => p.msId === mapped.msId);

  //     if (mapped.msId && !pgData.find(p => p.msId === mapped.msId)) {
  //       try {
  //         const [newRec] = await db.insert(devices).values({
  //           msId: mapped.msId,
  //           name: mapped.name,
  //           deviceDirection: mapped.deviceDirection,
  //           serialNumber: mapped.serialNumber,
  //           opstamp: mapped.opstamp,
  //           lastPing: mapped.lastPing,
  //           lastreset: mapped.lastreset,
  //           activationCode: mapped.activationCode,
  //           isAttendanceDevice: mapped.isAttendanceDevice,
  //           deviceType: mapped.deviceType,
  //           locationId: mapped.locationId,
  //           status: "offline",
  //           isActive: true
  //         }).returning();
  //         pgData.push(newRec);
  //       } catch (e) {
  //         console.error("Sync Error:", e);
  //       }
  //     }
  //   }
  //   // 3. Duplicate handling based on Serial Number or Name
  //   return Array.from(
  //     new Map(pgData.map(d => [`${d.msId || d.serialNumber || d.id}`, d])).values()
  //   );
  // }
  async getDevices(): Promise<any[]> {
    const msDataRaw = await dbMsSql.select().from({ dbName: 'Devices' }).execute();

    if (!msDataRaw) return [];

    const formattedDevices = msDataRaw.map((d: any) => ({
      msId: d.DeviceId || d.DeviceID,
      name: d.DeviceName || "Unnamed Device",
      activationCode: d.ActivationCode || "",
      deviceType: String(d.DeviceType || " ").toLowerCase(),
      serialNumber: d.SerialNumber || d.serialno,
      status: d.Status || "offline",
      lastHeartbeat: d.LastHeartbeat ? new Date(d.LastHeartbeat) : null,
      locationId: d.LocationId || null,
      ipAddress: d.IpAddress || ""
    }));

    try {
      for (const dev of formattedDevices) {
        await db.insert(devices)
          .values({
            msId: dev.msId,
            name: dev.name,
            serialNumber: dev.serialNumber,
            status: dev.status,
            lastHeartbeat: dev.lastHeartbeat,
            activationCode: dev.activationCode,
            deviceType: dev.deviceType,
            locationId: dev.locationId,
            ipAddress: dev.ipAddress,
            isActive: true
          })
          .onConflictDoUpdate({
            target: devices.msId,
            set: {
              name: dev.name,
              status: dev.status,
              lastHeartbeat: dev.lastHeartbeat,
              ipAddress: dev.ipAddress,
              locationId: dev.locationId
            }
          });
      }

      const currentMsIds = formattedDevices.map(d => d.msId);
      if (currentMsIds.length > 0) {
        await db.delete(devices)
          .where(notInArray(devices.msId, currentMsIds));
      } else {
        await db.delete(devices);
      }

    } catch (error) {
      console.error("Device Sync Error:", error);
    }

    return formattedDevices;
  }
 
  async createDevice(data: InsertDevice): Promise<Device> {
    let mssqlId: number | null = null;
    try {
      const msRes = await dbMsSql.insert({ dbName: 'Devices' })
        .values(DeviceAdapter.toMsSql(data));

      // recordset ka use karein indexing ke liye
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
  async deleteDevice(msId: number): Promise < void> {
      const [record] = await db.select()
        .from(devices)
        .where(eq(devices.msId, msId));

      if(record) {
        try {
          await dbMsSql.delete({ dbName: 'Devices', pk: 'DeviceId' })
            .where({ value: msId });
        } catch (e) {
          console.error("MS SQL Sync Delete Error:", e);
        }

        await db.delete(devices).where(eq(devices.msId, msId));
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
  async getPeople(search ?: string): Promise < Person[] > {

      const [pgData, msDataRaw] = await Promise.all([
        db.select().from(people),
        dbMsSql.select().from({ dbName: 'Employees' }).execute()
      ]);

      const msIds = new Set();

      // INSERT new records
      for(const msRow of (msDataRaw || [])) {

      const mapped = PersonAdapter.toPostgres(msRow);
      msIds.add(mapped.msId);

      const exists = pgData.find(p => p.msId === mapped.msId);

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

          pgData.push(newRec);

        } catch (e) {
          console.error("People Sync Insert Error:", e);
        }
      }
    }

    // DELETE records removed from MSSQL
    for (const pgRow of pgData) {

      if (pgRow.msId && !msIds.has(pgRow.msId)) {

        try {

          await db.delete(people)
            .where(eq(people.msId, pgRow.msId));

        } catch (e) {
          console.error("People Sync Delete Error:", e);
        }

      }

    }

    let results = pgData;

    if (search) {
      const term = search.toLowerCase();

      results = pgData.filter(p =>
        p.employeeName.toLowerCase().includes(term) ||
        (p.employeeCode && p.employeeCode.toLowerCase().includes(term))
      );
    }

    return Array.from(
      new Map(results.map(p => [`${p.msId || p.employeeCode || p.id}`, p])).values()
    );

  }
  // async getPeople(search?: string): Promise<Person[]> {
  //   // 1. Parallel fetch from both DBs
  //   const [pgData, msDataRaw] = await Promise.all([
  //     db.select().from(people),
  //     dbMsSql.select().from({ dbName: 'Employees' }).execute()
  //   ]);

  //   // 2. Auto-Sync Loop
  //   for (const msRow of (msDataRaw || [])) {
  //     const mapped = PersonAdapter.toPostgres(msRow);

  //     // Check if record exists in Postgres based on msId
  //     const exists = pgData.find(p => p.msId === mapped.msId);

  //     if (mapped.msId && !exists) {
  //       try {
  //         const [newRec] = await db.insert(people).values({
  //           msId: mapped.msId,
  //           firstName: mapped.firstName,
  //           lastName: mapped.lastName,
  //           employeeId: mapped.employeeId,
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

  //         pgData.push(newRec);
  //       } catch (e) {
  //         console.error("People Sync Error:", e);
  //       }
  //     }
  //   }

  //   // 3. Search and Duplicate Handling
  //   let results = pgData;
  //   if (search) {
  //     const term = search.toLowerCase();
  //     results = pgData.filter(p =>
  //       p.firstName.toLowerCase().includes(term) ||
  //       (p.lastName && p.lastName.toLowerCase().includes(term)) ||
  //       (p.employeeCode && p.employeeCode.toLowerCase().includes(term))
  //     );
  //   }

  //   return Array.from(
  //     new Map(results.map(p => [`${p.msId || p.employeeId || p.id}`, p])).values()
  //   );
  // }
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

  // async getAttendance(date?: string, locationId?: number, personId?: number): Promise<Attendance[]> {
  //   const conditions = [];
  //   if (date) conditions.push(eq(attendance.date, date));
  //   if (locationId) conditions.push(eq(attendance.locationId, locationId));
  //   if (personId) conditions.push(eq(attendance.personId, personId));
  //   if (conditions.length > 0) {
  //     return await db.select().from(attendance).where(and(...conditions));
  //   }
  //   return await db.select().from(attendance);
  // }
  async getAttendance(date?: string, locationId?: number, personId?: number): Promise<any[]> {
    // 1. MS SQL se logs aur employees fetch karein
    const [msLogs, msEmployees] = await Promise.all([
      dbMsSql.select().from({ dbName: 'DeviceLogs' }).execute(),
      dbMsSql.select().from({ dbName: 'Employees' }).execute()
    ]);

    // Frontend date ko handle karein (Expected: "2026-03-02")
    const targetDate = date || new Date().toISOString().split('T')[0];
    console.log("Backend filtering for exact date:", targetDate);

    const dailyLogsMap = new Map<string, Date[]>();

    (msLogs || []).forEach(log => {
      const rawVal = log.LogDate || log.logdate;
      if (!rawVal) return;

      const d = new Date(rawVal);

      // Date comparison fix: Local date string match karna sabse safe hai
      // Format: YYYY-MM-DD
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

      // Status logic: Agar logs mile hain toh 'present', warna 'absent'
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

    // Filters apply karein (Site aur Person)
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
    // 1. Data Fetching
    const rawLogs = await dbMsSql.select().from({ dbName: 'DeviceLogs' }).execute();
    const msSqlEmployees = await dbMsSql.select().from({ dbName: 'Employees' }).execute();
    const msSqlDevices = await dbMsSql.select().from({ dbName: 'devices' }).execute();

    // 2. Logs Grouping (EmpCode_Date)
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

    // 3. Date Range Generation
    const reportDates: string[] = [];
    let startDate = filters.dateFrom ? new Date(filters.dateFrom) : new Date();
    const endDate = filters.dateTo ? new Date(filters.dateTo) : new Date();
    let tempDate = new Date(startDate);
    while (tempDate <= endDate) {
      reportDates.push(tempDate.toISOString().split('T')[0]);
      tempDate.setDate(tempDate.getDate() + 1);
    }

    const finalReport: any[] = [];

    // 4. Processing logic for all conditions
    msSqlEmployees.forEach((emp: any) => {
      const empCode = String(emp.EmployeeCode).trim();

      // Person Filter
      if (filters.personId && filters.personId !== "all" && empCode !== String(filters.personId)) return;

      reportDates.forEach((dateStr) => {
        const key = `${empCode}_${dateStr}`;
        const logs = attendanceMap.get(key) || [];
        const dayOfWeek = new Date(dateStr).getDay(); // 0 = Sunday

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

        // --- CONDITION 1: NO PUNCH (ABSENT OR WEEKLY OFF) ---
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

          // --- CONDITION 2: SINGLE PUNCH ---
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

            // --- STATUS PRIORITY HIERARCHY ---
            if (parseFloat(rowData.workingHours) < (EXPECTED_WORKING_HRS / 2)) {
              rowData.status = ATTENDANCE_STATUS.HALF_DAY; // Condition 3: Half Day
            } else if (rowData.lateByMins > 0 && rowData.earlyByMins > 0) {
              rowData.status = "late_early"; // Condition 4: Late & Early Exit
            } else if (rowData.lateByMins > 0) {
              rowData.status = ATTENDANCE_STATUS.LATE; // Condition 5: Late Only
            } else if (rowData.earlyByMins > 0) {
              rowData.status = "early_going"; // Condition 6: Early Exit Only
            } else {
              rowData.status = ATTENDANCE_STATUS.PRESENT; // Condition 7: Perfect Attendance
            }
          }
        }
        finalReport.push(rowData);
      });
    });

    // 5. Final Filtering
    return finalReport.filter(row => {
      // Status Filter
      const matchesStatus = (!filters.status || filters.status === "all") ? true : row.status === filters.status;

      // Device Filter (Absent rows ignore device filter unless "all" is selected)
      const matchesDevice = (!filters.deviceId || filters.deviceId === "all")
        ? true
        : (row.deviceId === String(filters.deviceId));

      return matchesStatus && matchesDevice;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }
  // working code
  // async getAttendanceReport(filters: {
  //   dateFrom?: string;
  //   dateTo?: string;
  //   status?: string; // e.g., "present", "late", "single_punch"
  //   deviceId?: string | number;
  //   personId?: string | number;
  // }): Promise<any[]> {
  //   const rawLogs = await dbMsSql.select().from({ dbName: 'DeviceLogs' }).execute();
  //   const msSqlEmployees = await dbMsSql.select().from({ dbName: 'Employees' }).execute();
  //   const msSqlDevices = await dbMsSql.select().from({ dbName: 'devices' }).execute();

  //   const reportMap = new Map<string, { empCode: string; date: string; logs: { time: Date, devId: string }[] }>();
  //   console.log("--- BACKEND DEBUG START ---");
  //   console.log("Incoming Filters from Frontend:", filters);
  //   // 1. Grouping Data
  //   rawLogs.forEach((log: any) => {
  //     const logDevId = String(log.deviceid || log.DeviceId || "").trim();
  //     const logEmpCode = String(log.EmployeeCode || log.employeecode || "").trim();
  //     const timestamp = new Date(log.LogDate || log.logdate);
  //     if (isNaN(timestamp.getTime())) return;

  //     const dateStr = timestamp.toISOString().split('T')[0];
  //     const key = `${logEmpCode}_${dateStr}`;

  //     if (!reportMap.has(key)) {
  //       reportMap.set(key, { empCode: logEmpCode, date: dateStr, logs: [] });
  //     }
  //     reportMap.get(key)!.logs.push({ time: timestamp, devId: logDevId });
  //   });

  //   // 2. Processing & Status Calculation
  //   const allRows = Array.from(reportMap.values()).map(item => {
  //     const emp = msSqlEmployees.find(e => String(e.EmployeeCode) === String(item.empCode));
  //     const sortedLogs = item.logs.sort((a, b) => a.time.getTime() - b.time.getTime());

  //     const firstIn = sortedLogs[0];
  //     const lastOut = sortedLogs.length > 1 ? sortedLogs[sortedLogs.length - 1] : null;
  //     const isValidOut = lastOut && (lastOut.time.getTime() - firstIn.time.getTime()) > 60000;

  //     // Calculations
  //     const workMs = isValidOut ? (lastOut!.time.getTime() - firstIn.time.getTime()) : 0;
  //     const workingHours = (workMs / 3600000).toFixed(2);
  //     const shiftStart = new Date(`${item.date}T${SHIFT_START}`);
  //     const lateByMins = firstIn.time > shiftStart ? Math.round((firstIn.time.getTime() - shiftStart.getTime()) / 60000) : 0;

  //     // --- STATUS MATCHING FRONTEND VALUES ---
  //     let currentStatus = "absent"; 
  //     if (firstIn && !isValidOut) {
  //       currentStatus = "single_punch"; 
  //     } else if (isValidOut) {
  //       if (parseFloat(workingHours) < (EXPECTED_WORKING_HRS / 2)) {
  //         currentStatus = "half_day";
  //       } else if (lateByMins > 0) {
  //         currentStatus = "late";
  //       } else {
  //         currentStatus = "present";
  //       }
  //     }

  //     const deviceDetail = msSqlDevices.find(d => String(d.DeviceId || d.DeviceID) === String(firstIn.devId));

  //     return {
  //       id: emp?.EmployeeId || `temp-${item.empCode}-${item.date}`,
  //       employeeCode: item.empCode,
  //       firstName: emp?.EmployeeName || "Unknown",
  //       date: item.date,
  //       clockIn: firstIn.time.toISOString(),
  //       clockOut: isValidOut ? lastOut!.time.toISOString() : null,
  //       workingHours,
  //       lateByMins,
  //       status: currentStatus, // Matches dropdown: present, late, single_punch, half_day
  //       deviceId: String(firstIn.devId), // Device Filter ke liye zaroori field
  //       deviceName: deviceDetail?.DeviceName || `Device ${firstIn.devId}`
  //     };
  //   });

  //   // 3. APPLY FILTERS (The Core Fix)
  //   return allRows.filter(row => {
  //     // A. Date Filters
  //     const matchesDate = (!filters.dateFrom || row.date >= filters.dateFrom) && 
  //                        (!filters.dateTo || row.date <= filters.dateTo);

  //     // B. Device Filter
  //     const matchesDevice = (!filters.deviceId || filters.deviceId === "all") 
  //       ? true 
  //       : row.deviceId === String(filters.deviceId);

  //     // C. Status Filter (MATCHING FRONTEND DROPDOWN)
  //     const matchesStatus = (!filters.status || filters.status === "all") 
  //       ? true 
  //       : row.status === filters.status;

  //     // D. Person Filter
  //     const matchesPerson = (!filters.personId || filters.personId === "all")
  //       ? true
  //       : row.employeeCode === String(filters.personId);

  //     return matchesDate && matchesDevice && matchesStatus && matchesPerson;
  //   }).sort((a, b) => b.date.localeCompare(a.date));
  // }
  // --- ACCESS LOGS & REPORTS ---
  // --- Access Log Report (Reduced Format) ---
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
  // async getAccessLogReport(filters: { dateFrom?: string; dateTo?: string; eventType?: string; personId?: number; locationId?: number; doorId?: number }): Promise<any[]> {
  //   const conditions = [];
  //   if (filters.dateFrom) conditions.push(sql`DATE(${accessLogs.timestamp}) >= ${filters.dateFrom}`);
  //   if (filters.dateTo) conditions.push(sql`DATE(${accessLogs.timestamp}) <= ${filters.dateTo}`);
  //   if (filters.eventType) conditions.push(eq(accessLogs.eventType, filters.eventType as any));
  //   if (filters.personId) conditions.push(eq(accessLogs.personId, filters.personId));
  //   if (filters.locationId) conditions.push(eq(accessLogs.locationId, filters.locationId));
  //   if (filters.doorId) conditions.push(eq(accessLogs.doorId, filters.doorId));

  //   const query = db
  //     .select({
  //       id: accessLogs.id,
  //       personId: accessLogs.personId,
  //       firstName: people.firstName,
  //       lastName: people.lastName,
  //       employeeId: people.employeeId,
  //       eventType: accessLogs.eventType,
  //       accessMethod: accessLogs.accessMethod,
  //       isAuthorized: accessLogs.isAuthorized,
  //       denialReason: accessLogs.denialReason,
  //       doorId: accessLogs.doorId,
  //       locationId: accessLogs.locationId,
  //       timestamp: accessLogs.timestamp,
  //     })
  //     .from(accessLogs)
  //     .leftJoin(people, eq(accessLogs.personId, people.id));

  //   if (conditions.length > 0) {
  //     return await query.where(and(...conditions)).orderBy(desc(accessLogs.timestamp));
  //   }
  //   return await query.orderBy(desc(accessLogs.timestamp)).limit(500);
  // }

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

  // async getEmployeeSummaryReport(filters: { departmentId?: number; status?: string; personType?: string }): Promise<any[]> {
  //   const conditions = [];
  //   if (filters.departmentId) conditions.push(eq(people.departmentId, filters.departmentId));
  //   if (filters.status) conditions.push(eq(people.status, filters.status as any));
  //   if (filters.personType) conditions.push(eq(people.personType, filters.personType as any));

  //   const query = db
  //     .select({
  //       id: people.id,
  //       firstName: people.firstName,
  //       lastName: people.lastName,
  //       email: people.email,
  //       phone: people.phone,
  //       employeeId: people.employeeId,
  //       employeeCode: people.employeeCode,
  //       departmentId: people.departmentId,
  //       designationId: people.designationId,
  //       companyId: people.companyId,
  //       personType: people.personType,
  //       status: people.status,
  //       gender: people.gender,
  //       dateOfJoining: people.dateOfJoining,
  //       locationId: people.locationId,
  //     })
  //     .from(people);

  //   if (conditions.length > 0) {
  //     return await query.where(and(...conditions)).orderBy(people.firstName);
  //   }
  //   return await query.orderBy(people.firstName).limit(500);
  // }
  async getEmployeeSummaryReport(filters: { departmentId?: number; status?: string; personType?: string }): Promise<any[]> {
    // 1. Properly typed conditions array
    const conditions = [
      filters.departmentId ? eq(people.departmentId, filters.departmentId) : undefined,
      filters.status ? eq(people.status, filters.status as any) : undefined,
      filters.personType ? eq(people.personType, filters.personType as any) : undefined
    ].filter(Boolean) as any[]; // 'as any[]' ya 'as SQL[]' casting se error chala jayega

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

    // 2. Fixed logic for conditional WHERE
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

  // async getRoles(): Promise<Role[]> {
  //   return await db.select().from(roles).orderBy(desc(roles.id));
  // }
  async getRoles(): Promise<any[]> {
    const allRoles = await db.select().from(roles).orderBy(desc(roles.id));
    const msDevicesRaw = await dbMsSql.select().from({ dbName: 'Devices' }).execute();

    const deviceLookup = new Map<number, string>();
    if (msDevicesRaw) {
      msDevicesRaw.forEach((d: any) => {
        const id = Number(d.DeviceId || d.DeviceID);
        deviceLookup.set(id, d.DeviceName || "Unnamed");
      });
    }

    return allRoles.map((role) => {
      // Schema ke mutabiq deviceIds ya to array hai ya null
      const rawIds = role.deviceIds || [];

      // Ensure karein ki humare paas hamesha number array ho
      const idsArray = Array.isArray(rawIds) ? rawIds : [];

      // Names nikalne ke liye mapping
      const names = idsArray
        .map(id => deviceLookup.get(Number(id)))
        .filter((name): name is string => Boolean(name));

      return {
        ...role,
        // Frontend checkboxes string values expect karte hain ("3")
        deviceIds: idsArray.map(id => String(id)),
        assignedDeviceNames: names.join(", ")
      };
    });
  }
  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async createRole(data: InsertRole): Promise<Role> {
    const [created] = await db.insert(roles).values(data).returning();
    return created;
  }
  async updateRole(id: number, data: Partial<InsertRole>): Promise<Role> {
    return await db.transaction(async (tx) => {
      // 1. Duplicate Code Check (Unique constraint violation se bachne ke liye)
      if (data.code) {
        const [existing] = await tx
          .select()
          .from(roles)
          .where(
            and(
              eq(roles.code, data.code),
              ne(roles.id, id) // Apne current record ko check se exclude karein
            )
          );

        if (existing) {
          throw new Error(`Role code '${data.code}' already exists.`);
        }
      }

      // 2. Perform Update
      const [updated] = await tx
        .update(roles)
        .set({
          ...data,
          updatedAt: new Date(), // Manual timestamp update
        })
        .where(eq(roles.id, id))
        .returning();

      if (!updated) {
        throw new Error("Role not found");
      }

      // 3. Hardware Sync Trigger
      // Kyunki deviceIds JSONB hai, role badalne par unse jude employees ko sync karna hoga
      const affectedEmployees = await tx
        .select()
        .from(employeeRoles)
        .where(eq(employeeRoles.roleId, id));

      for (const emp of affectedEmployees) {
        // Direct MS SQL devices fetch wala logic trigger karein
        this.executeHardwareSync(emp.employeeCode, id);
      }

      return updated;
    });
  }
  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }
  async getEmployeeRoles(): Promise<EmployeeRole[]> {
    // Saare assignment fetch karein
    return await db.select().from(employeeRoles);
  }

  async getEmployeeRole(id: number): Promise<EmployeeRole | undefined> {
    // Single ID se fetch karein
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
        await tx
          .update(people)
          .set({
            roleId: Number(newMapping.roleId),
            updatedAt: new Date()
          })
          .where(eq(people.employeeCode, newMapping.employeeCode));

        const roleForSync = Number(newMapping.roleId) === 0 ? null : Number(newMapping.roleId);
        this.executeHardwareSync(newMapping.employeeCode, roleForSync, false);
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
  private async executeHardwareSync(employeeCode: string, roleId: number | null, blockAll: boolean = false) {
    try {
      // 1. Fetch Role from Postgres & Devices direct from MS SQL
      const [role, msDevicesRaw] = await Promise.all([
        (roleId && roleId > 0) ? this.getRole(roleId) : Promise.resolve(null),
        dbMsSql.select().from({ dbName: 'Devices' }).execute() // Direct MS SQL call
      ]);

      if (!msDevicesRaw || msDevicesRaw.length === 0) {
        console.warn("⚠️ No devices found in MS SQL.");
        return;
      }

      // 2. Allowed Device IDs (Role se uthaye gaye IDs)
      let allowedDeviceIds: number[] = [];
      if (!blockAll && role) {
        allowedDeviceIds = (role.deviceIds as unknown as number[]) || [];
      } else if (!blockAll && !role) {
        // Agar role nahi hai, toh sab allowed (Default)
        allowedDeviceIds = msDevicesRaw.map((d: any) => Number(d.DeviceId || d.Id));
      }

      // 3. SOAP API calls for each MS SQL device
      const syncPromises = msDevicesRaw.map(async (msDevice: any) => {
        const msDeviceId = Number(msDevice.DeviceId || msDevice.Id);
        const serialNumber = msDevice.SerialNumber || msDevice.serialno;

        // Logic: Kya ye DeviceId allowed list mein hai?
        const isAllowed = allowedDeviceIds.some(id => Number(id) === msDeviceId);

        const shouldBlock = blockAll || !isAllowed;
        const actionType = shouldBlock ? "block" : "unblock";

        if (!serialNumber) {
          console.error(`❌ Device ${msDeviceId} has no Serial Number in MS SQL.`);
          return;
        }

        try {
          // A. SOAP Request (Direct to Hardware)
          const status = await esslService.syncUserBlockStatus(
            employeeCode,
            serialNumber,
            shouldBlock
          );

          // B. Log to Postgres for History (Using MS ID)
          await db.insert(blockUnblockLogs).values({
            employeeCode: employeeCode,
            deviceId: msDeviceId,
            type: actionType,
          }).catch(() => { });

          console.log(`🚀 [SOAP SYNC] Device: ${serialNumber} | Action: ${actionType} | Status: SUCCESS`);
        } catch (err: any) {
          console.error(`❌ [SOAP FAILED] ${serialNumber}: ${err.message}`);
        }
      });

      await Promise.all(syncPromises);

    } catch (error: any) {
      console.error("💀 Hardware Sync Engine Failure:", error.message);
    }
  }
  // private async executeHardwareSync(employeeCode: string, roleId: number | null, blockAll: boolean = false) {
  //   try {
  //     const [role, allDevices] = await Promise.all([
  //       (roleId && roleId > 0) ? this.getRole(roleId) : Promise.resolve(null),
  //       this.getDevices()
  //     ]);

  //     if (!allDevices || allDevices.length === 0) return;

  //     let allowedDeviceIds: number[] = [];

  //     if (blockAll) {
  //       allowedDeviceIds = [];
  //     } else if (role) {
  //       allowedDeviceIds = (role.deviceIds as unknown as number[]) || [];
  //     } else {
  //       allowedDeviceIds = allDevices.map(device => Number(device.id));
  //     }

  //     const syncPromises = allDevices.map(async (device: any) => {
  //       const currentDeviceId = Number(device.id);
  //       const isAllowed = allowedDeviceIds.some(id => Number(id) === currentDeviceId);
  //       const shouldBlock = !isAllowed;
  //       const actionType = shouldBlock ? "block" : "unblock";

  //       try {
  //         await db.insert(blockUnblockLogs).values({
  //           employeeCode: employeeCode,
  //           deviceId: currentDeviceId,
  //           type: actionType,
  //         });

  //         const status = await esslService.syncUserBlockStatus(
  //           employeeCode,
  //           device.serialNumber,
  //           shouldBlock
  //         );

  //         if (status === "SUCCESS") {
  //           console.log(`✅ [SYNC DONE] Device: ${device.serialNumber} | Emp: ${employeeCode} (${actionType})`);
  //         }

  //         return status;
  //       } catch (err: any) {
  //         console.error(`❌ [SYNC FAILED] ${err.message} | Device: ${device.serialNumber}`);
  //       }
  //     });

  //     Promise.all(syncPromises).catch(err =>
  //       console.error("🔥 Critical Error in Batch Sync Processing:", err)
  //     );

  //   } catch (error: any) {
  //     console.error("💀 Hardware Sync Engine Failure:", error.message);
  //   }
  // }
}
export const storage = new DatabaseStorage();
