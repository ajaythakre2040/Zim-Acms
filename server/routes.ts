import type { Express } from "express";
import type { Server } from "http";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";
import { z } from "zod";
import dayjs from "dayjs";
import {
  insertCompanySchema, insertDepartmentSchema, insertDesignationSchema,
  insertCategorySchema, insertVendorSchema, insertSiteSchema, insertBuildingSchema,
  insertFloorSchema, insertZoneSchema, insertDoorSchema, insertDeviceSchema,
  insertPersonSchema, insertCredentialSchema, insertAccessCardSchema,
  insertShiftSchema, insertShiftAssignmentSchema, insertHolidaySchema,
  insertAccessLevelSchema, insertAccessRuleSchema, insertPersonAccessSchema,
  insertVisitorSchema, insertVisitSchema, insertAttendanceSchema,
  insertAccessLogSchema, insertAlertSchema, insertExceptionSchema,
  insertSystemSettingSchema, insertUserProfileSchema,
  insertRoleSchema, insertEmployeeRoleSchema,
  insertCronMasterSchema,
  insertDoorDeviceSchema,
  insertBlockUnblockLogSchema,
} from "@shared/schema";
import { CABIN_LOCKOUT_CONFIG, MAIN_GATE_SYNC } from "./constant";
function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.authenticated || !req.session?.userId) return res.sendStatus(401);
  next();
}
function crudRoutes<T>(
  app: Express,
  basePath: string,
  schema: z.AnyZodObject,
  getAll: (...args: any[]) => Promise<any[]>,
  create: (data: any) => Promise<any>,
  update?: (id: number, data: any) => Promise<any>,
  remove?: (id: number) => Promise<void>,
  getOne?: (id: number) => Promise<any>
) {
  const handleDbError = (e: any, res: any) => {
    console.error(`[DB ERROR] ${basePath}:`, e);
    const errorMessage = e.message || "";
    const isDuplicate =
      e.number === 2627 ||
      e.number === 2601 ||
      e.code === '23505' ||
      errorMessage.includes("UNIQUE KEY") ||
      errorMessage.includes("duplicate") ||
      errorMessage.includes("already exists");
    if (isDuplicate) {
      let fieldName = "Entry";
      const lowerMsg = errorMessage.toLowerCase();
      if (lowerMsg.includes("code")) fieldName = "Code";
      else if (lowerMsg.includes("name")) fieldName = "Name";
      else if (lowerMsg.includes("mac")) fieldName = "MAC Address";
      else if (lowerMsg.includes("serial")) fieldName = "Serial Number";
      else if (lowerMsg.includes("ip")) fieldName = "IP Address";
      return res.status(400).json({
        isDuplicate: true,
        message: `${fieldName} is already in use. Please provide a unique value.`
      });
    }
    res.status(500).json({
      message: "An unexpected database error occurred.",
      devDetails: errorMessage
    });
  };
  app.get(basePath, async (req, res) => {
    try {
      const result = await getAll(req.query);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  if (getOne) {
    app.get(`${basePath}/:id`, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const item = await getOne(id);
        if (!item) return res.status(404).json({ message: "Not found" });
        res.json(item);
      } catch (e: any) { res.status(500).json({ message: e.message }); }
    });
  }
  app.post(basePath, requireAuth, async (req, res) => {
    try {
      const input = schema.parse(req.body);
      const item = await create(input);
      res.status(201).json(item);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      handleDbError(e, res);
    }
  });
  if (update) {
    app.put(`${basePath}/:id`, requireAuth, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
        const input = schema.partial().parse(req.body);
        const item = await update(id, input);
        res.json(item);
      } catch (e: any) {
        if (e instanceof z.ZodError) return res.status(400).json(e.errors);
        handleDbError(e, res);
      }
    });
  }
  if (remove) {
    app.delete(`${basePath}/:id`, requireAuth, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
        await remove(id);
        res.sendStatus(204);
      } catch (e: any) { handleDbError(e, res); }
    });
  }
}
export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/dashboard/attendance/door-wise-stats", async (req, res) => {
    try {

      const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
      const doorStats = await storage.getDoorWiseStats(date);
      res.json(doorStats);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/dashboard/attendance/shift-door-stats", async (req, res) => {
    try {
      
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

      const shiftStats = await storage.getShiftWiseStats(date);
      res.json(shiftStats);
    } catch (e: any) {
      console.error("Shift Stats Error:", e.message);
      res.status(500).json({ message: "Error fetching shift stats" });
    }
  });
  app.get("/api/user-profiles", requireAuth, async (_req, res) => {
    try { res.json(await storage.getUserProfiles()); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/user-profiles/me", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const profile = await storage.getUserProfileByUserId(userId);
      res.json(profile || null);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/user-profiles", requireAuth, async (req, res) => {
    try {
      const input = insertUserProfileSchema.parse(req.body);
      const profile = await storage.createUserProfile(input);
      res.status(201).json(profile);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      res.status(500).json({ message: e.message });
    }
  });
  app.put("/api/user-profiles/:id", requireAuth, async (req, res) => {
    try {
      const input = insertUserProfileSchema.partial().parse(req.body);
      const profile = await storage.updateUserProfile(parseInt(req.params.id), input);
      res.json(profile);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      res.status(500).json({ message: e.message });
    }
  });
  crudRoutes(app, "/api/companies", insertCompanySchema,
    () => storage.getCompanies(), (d) => storage.createCompany(d),
    (id, d) => storage.updateCompany(id, d), (id) => storage.deleteCompany(id));
  crudRoutes(app, "/api/departments", insertDepartmentSchema,
    () => storage.getDepartments(), (d) => storage.createDepartment(d),
    (id, d) => storage.updateDepartment(id, d), (id) => storage.deleteDepartment(id));
  crudRoutes(app, "/api/designations", insertDesignationSchema,
    () => storage.getDesignations(), (d) => storage.createDesignation(d),
    (id, d) => storage.updateDesignation(id, d), (id) => storage.deleteDesignation(id));
  crudRoutes(app, "/api/categories", insertCategorySchema,
    () => storage.getCategories(), (d) => storage.createCategory(d),
    (id, d) => storage.updateCategory(id, d), (id) => storage.deleteCategory(id));
  crudRoutes(app, "/api/vendors", insertVendorSchema,
    () => storage.getVendors(), (d) => storage.createVendor(d),
    (id, d) => storage.updateVendor(id, d), (id) => storage.deleteVendor(id));
  crudRoutes(app, "/api/sites", insertSiteSchema,
    () => storage.getSites(), (d) => storage.createSite(d),
    (id, d) => storage.updateSite(id, d), (id) => storage.deleteSite(id));
  app.get("/api/buildings", async (req, res) => {
    try {
      const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : undefined;
      res.json(await storage.getBuildings(siteId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/buildings", insertBuildingSchema,
    () => storage.getBuildings(), (d) => storage.createBuilding(d),
    (id, d) => storage.updateBuilding(id, d), (id) => storage.deleteBuilding(id));
  app.get("/api/floors", async (req, res) => {
    try {
      const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string) : undefined;
      res.json(await storage.getFloors(buildingId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/floors", insertFloorSchema,
    () => storage.getFloors(), (d) => storage.createFloor(d),
    (id, d) => storage.updateFloor(id, d), (id) => storage.deleteFloor(id));
  app.get("/api/zones", async (req, res) => {
    try {
      const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : undefined;
      res.json(await storage.getZones(siteId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/zones", insertZoneSchema,
    () => storage.getZones(), (d) => storage.createZone(d),
    (id, d) => storage.updateZone(id, d), (id) => storage.deleteZone(id));
  crudRoutes(app, "/api/doors", insertDoorSchema,
    () => storage.getDoors(), (d) => storage.createDoor(d),
    (id, d) => storage.updateDoor(id, d), (id) => storage.deleteDoor(id));
  crudRoutes(app, "/api/devices", insertDeviceSchema,
    () => storage.getDevices(), (d) => storage.createDevice(d),
    (id, d) => storage.updateDevice(id, d), (id) => storage.deleteDevice(id));
  app.get("/api/people", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      res.json(await storage.getPeople(search));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/people/:id", async (req, res) => {
    try {
      const person = await storage.getPerson(parseInt(req.params.id));
      if (!person) return res.status(404).json({ message: "Not found" });
      res.json(person);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/people", requireAuth, async (req, res) => {
    try {
      const input = insertPersonSchema.parse(req.body);
      res.status(201).json(await storage.createPerson(input));
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      res.status(500).json({ message: e.message });
    }
  });
  app.put("/api/people/:id", requireAuth, async (req, res) => {
    try {
      const input = insertPersonSchema.partial().parse(req.body);
      res.json(await storage.updatePerson(parseInt(req.params.id), input));
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      res.status(500).json({ message: e.message });
    }
  });
  app.delete("/api/people/:id", requireAuth, async (req, res) => {
    try { await storage.deletePerson(parseInt(req.params.id)); res.sendStatus(204); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/credentials", async (req, res) => {
    try {
      const personId = req.query.personId ? parseInt(req.query.personId as string) : undefined;
      res.json(await storage.getCredentials(personId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/credentials", insertCredentialSchema,
    () => storage.getCredentials(), (d) => storage.createCredential(d),
    (id, d) => storage.updateCredential(id, d), (id) => storage.deleteCredential(id));
  crudRoutes(app, "/api/access-cards", insertAccessCardSchema,
    () => storage.getAccessCards(), (d) => storage.createAccessCard(d),
    (id, d) => storage.updateAccessCard(id, d), (id) => storage.deleteAccessCard(id));
  crudRoutes(app, "/api/shifts", insertShiftSchema,
    () => storage.getShifts(), (d) => storage.createShift(d),
    (id, d) => storage.updateShift(id, d), (id) => storage.deleteShift(id));
  app.get("/api/shift-assignments", async (req, res) => {
    try {
      const personId = req.query.personId ? parseInt(req.query.personId as string) : undefined;
      res.json(await storage.getShiftAssignments(personId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/shift-assignments", insertShiftAssignmentSchema,
    () => storage.getShiftAssignments(), (d) => storage.createShiftAssignment(d),
    (id, d) => storage.updateShiftAssignment(id, d), (id) => storage.deleteShiftAssignment(id));
  crudRoutes(app, "/api/holidays", insertHolidaySchema,
    () => storage.getHolidays(),
    (d) => storage.createHoliday(d),
    (id, d) => storage.updateHoliday(id, d),
    (id) => storage.deleteHoliday(id));
  crudRoutes(app, "/api/access-levels", insertAccessLevelSchema,
    () => storage.getAccessLevels(), (d) => storage.createAccessLevel(d),
    (id, d) => storage.updateAccessLevel(id, d), (id) => storage.deleteAccessLevel(id));
  crudRoutes(app, "/api/access-rules", insertAccessRuleSchema,
    () => storage.getAccessRules(), (d) => storage.createAccessRule(d),
    (id, d) => storage.updateAccessRule(id, d), (id) => storage.deleteAccessRule(id));
  app.get("/api/person-access", async (req, res) => {
    try {
      const personId = req.query.personId ? parseInt(req.query.personId as string) : undefined;
      res.json(await storage.getPersonAccess(personId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/person-access", requireAuth, async (req, res) => {
    try {
      const input = insertPersonAccessSchema.parse(req.body);
      res.status(201).json(await storage.createPersonAccess(input));
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      res.status(500).json({ message: e.message });
    }
  });
  app.delete("/api/person-access/:id", requireAuth, async (req, res) => {
    try { await storage.deletePersonAccess(parseInt(req.params.id)); res.sendStatus(204); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/visitors", insertVisitorSchema,
    () => storage.getVisitors(), (d) => storage.createVisitor(d),
    (id, d) => storage.updateVisitor(id, d), (id) => storage.deleteVisitor(id),
    (id) => storage.getVisitor(id));
  app.get("/api/visits", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      res.json(await storage.getVisits(status));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/visits", requireAuth, async (req, res) => {
    try {
      const input = insertVisitSchema.parse(req.body);
      res.status(201).json(await storage.createVisit(input));
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      res.status(500).json({ message: e.message });
    }
  });
  app.put("/api/visits/:id", requireAuth, async (req, res) => {
    try {
      const input = insertVisitSchema.partial().parse(req.body);
      res.json(await storage.updateVisit(parseInt(req.params.id), input));
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      res.status(500).json({ message: e.message });
    }
  });
  app.post("/api/visits/:id/check-in", requireAuth, async (req, res) => {
    try {
      const visit = await storage.updateVisit(parseInt(req.params.id), {
        status: "checked_in",
        checkInAt: new Date(),
      } as any);
      res.json(visit);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/visits/:id/check-out", requireAuth, async (req, res) => {
    try {
      const visit = await storage.updateVisit(parseInt(req.params.id), {
        status: "checked_out",
        checkOutAt: new Date(),
      } as any);
      res.json(visit);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/attendance", async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : undefined;
      const personId = req.query.personId ? parseInt(req.query.personId as string) : undefined;
      res.json(await storage.getAttendance(date, siteId, personId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/attendance/summary", async (req, res) => {
    try {
      const date = req.query.date as string || new Date().toISOString().slice(0, 10);
      const records = await storage.getAttendance(date);
      const present = records.filter(r => r.status === "present").length;
      const late = records.filter(r => r.status === "late").length;
      const absent = records.filter(r => r.status === "absent").length;
      const halfDay = records.filter(r => r.status === "half_day").length;
      const onLeave = records.filter(r => r.status === "on_leave").length;
      res.json({ date, total: records.length, present, late, absent, halfDay, onLeave });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/attendance", requireAuth, async (req, res) => {
    try {
      const input = insertAttendanceSchema.parse(req.body);
      res.status(201).json(await storage.createAttendance(input));
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      res.status(500).json({ message: e.message });
    }
  });
  app.put("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const input = insertAttendanceSchema.partial().parse(req.body);
      res.json(await storage.updateAttendance(parseInt(req.params.id), input));
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/access-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : undefined;
      res.json(await storage.getAccessLogs(limit, siteId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/access-logs", requireAuth, async (req, res) => {
    try {
      const input = insertAccessLogSchema.parse(req.body);
      res.status(201).json(await storage.createAccessLog(input));
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/alerts", async (req, res) => {
    try {
      const isResolved = req.query.resolved === "true" ? true : req.query.resolved === "false" ? false : undefined;
      res.json(await storage.getAlerts(isResolved));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/alerts", requireAuth, async (req, res) => {
    try {
      const input = insertAlertSchema.parse(req.body);
      res.status(201).json(await storage.createAlert(input));
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      res.status(500).json({ message: e.message });
    }
  });
  app.put("/api/alerts/:id/acknowledge", requireAuth, async (req, res) => {
    try {
      const alert = await storage.updateAlert(parseInt(req.params.id), { isRead: true });
      res.json(alert);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.put("/api/alerts/:id/resolve", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const alert = await storage.updateAlert(parseInt(req.params.id), {
        isResolved: true,
        resolvedBy: userId,
        resolvedAt: new Date(),
      });
      res.json(alert);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/exceptions", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      res.json(await storage.getExceptions(status));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/exceptions", requireAuth, async (req, res) => {
    try {
      const input = insertExceptionSchema.parse(req.body);
      res.status(201).json(await storage.createException(input));
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      res.status(500).json({ message: e.message });
    }
  });
  app.put("/api/exceptions/:id/approve", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const exc = await storage.updateException(parseInt(req.params.id), {
        approvalStatus: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
      });
      res.json(exc);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.put("/api/exceptions/:id/reject", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const exc = await storage.updateException(parseInt(req.params.id), {
        approvalStatus: "rejected",
        approvedBy: userId,
        rejectionReason: req.body.reason,
      });
      res.json(exc);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/system-settings", requireAuth, async (_req, res) => {
    try { res.json(await storage.getSystemSettings()); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/system-settings", requireAuth, async (req, res) => {
    try {
      const input = insertSystemSettingSchema.parse(req.body);
      const setting = await storage.upsertSystemSetting(input);
      res.json(setting);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/reports/attendance", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        status: req.query.status as string | undefined,
        deviceId: req.query.deviceId ? String(req.query.deviceId) : undefined,
        
        employeeCode: req.query.employeeCode ? String(req.query.employeeCode) : undefined,
      };


      
      const data = await storage.getAttendanceReport(filters);
      res.json(data);
    } catch (e: any) {
      console.error("Attendance Report Error:", e);
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/reports/late-coming", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        status: "late" as const,
        departmentId: req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined,
        personId: req.query.personId ? parseInt(req.query.personId as string) : undefined,
        siteId: req.query.siteId ? parseInt(req.query.siteId as string) : undefined,
      };
      res.json(await storage.getAttendanceReport(filters));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/reports/early-going", requireAuth, async (req, res) => {
    try {
      const allFilters = {
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        departmentId: req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined,
        personId: req.query.personId ? parseInt(req.query.personId as string) : undefined,
        siteId: req.query.siteId ? parseInt(req.query.siteId as string) : undefined,
      };
      const data = await storage.getAttendanceReport(allFilters);
      const earlyGoers = data.filter((r: any) => r.earlyByMins && r.earlyByMins > 0);
      res.json(earlyGoers);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/reports/absentee", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        status: "absent" as const,
        departmentId: req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined,
        personId: req.query.personId ? parseInt(req.query.personId as string) : undefined,
        siteId: req.query.siteId ? parseInt(req.query.siteId as string) : undefined,
      };
      res.json(await storage.getAttendanceReport(filters));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/reports/overtime", requireAuth, async (req, res) => {
    try {
      const allFilters = {
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        departmentId: req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined,
        personId: req.query.personId ? parseInt(req.query.personId as string) : undefined,
        siteId: req.query.siteId ? parseInt(req.query.siteId as string) : undefined,
      };
      const data = await storage.getAttendanceReport(allFilters);
      const otRecords = data.filter((r: any) => r.overtimeHours && r.overtimeHours > 0);
      res.json(otRecords);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/reports/access-log", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        eventType: req.query.eventType as string | undefined,
        personId: req.query.personId ? parseInt(req.query.personId as string) : undefined,
        siteId: req.query.siteId ? parseInt(req.query.siteId as string) : undefined,
        doorId: req.query.doorId ? parseInt(req.query.doorId as string) : undefined,
      };
      res.json(await storage.getAccessLogReport(filters));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/reports/visitor", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        status: req.query.status as string | undefined,
      };
      res.json(await storage.getVisitorReport(filters));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/reports/employee-summary", requireAuth, async (req, res) => {
    try {
      const filters = {
        departmentId: req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined,
        status: req.query.status as string | undefined,
        personType: req.query.personType as string | undefined,
      };
      res.json(await storage.getEmployeeSummaryReport(filters));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  const connectionTestSchema = z.object({
    type: z.enum(["essl", "bios", "zkteco"]),
    config: z.object({
      host: z.string().min(1, "Host is required"),
      port: z.string().min(1, "Port is required"),
      database: z.string().optional(),
      instance: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      serialNumber: z.string().optional(),
      model: z.string().optional(),
    }),
  });
  app.post("/api/external-connections/test", requireAuth, async (req, res) => {
    const parsed = connectionTestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid input: " + parsed.error.issues.map(i => i.message).join(", ") });
    const { type, config } = parsed.data;
    try {
      if (type === "essl" || type === "bios") {
        const net = await import("net");
        const { host, port } = config;
        const result = await new Promise<{ success: boolean; message: string }>((resolve) => {
          const socket = new net.default.Socket();
          socket.setTimeout(5000);
          socket.on("connect", () => {
            socket.destroy();
            resolve({ success: true, message: `Successfully reached ${host}:${port}. SQL Server connection is reachable.` });
          });
          socket.on("timeout", () => {
            socket.destroy();
            resolve({ success: false, message: `Connection timed out to ${host}:${port}. Check if the SQL Server is running and accessible from this network.` });
          });
          socket.on("error", (err: any) => {
            resolve({ success: false, message: `Cannot connect to ${host}:${port}: ${err.message}. Ensure the server is running and firewall allows connections.` });
          });
          socket.connect(parseInt(port) || 1433, host);
        });
        res.json(result);
      } else if (type === "zkteco") {
        const net = await import("net");
        const { host, port } = config;
        const result = await new Promise<{ success: boolean; message: string }>((resolve) => {
          const socket = new net.default.Socket();
          socket.setTimeout(5000);
          socket.on("connect", () => {
            socket.destroy();
            resolve({ success: true, message: `Successfully reached ZKTeco controller at ${host}:${port}. TCP/IP connection is reachable.` });
          });
          socket.on("timeout", () => {
            socket.destroy();
            resolve({ success: false, message: `Connection timed out to ${host}:${port}. Check if the ZKTeco C3-400 is powered on and connected to the network.` });
          });
          socket.on("error", (err: any) => {
            resolve({ success: false, message: `Cannot connect to ${host}:${port}: ${err.message}. Check IP address and ensure the controller is on the same network.` });
          });
          socket.connect(parseInt(port) || 4370, host);
        });
        res.json(result);
      } else {
        res.status(400).json({ success: false, message: "Unknown connection type" });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });
  const connectionSaveSchema = z.object({
    type: z.enum(["essl", "bios", "zkteco"]),
    config: z.record(z.string()),
  });
  app.post("/api/external-connections/save", requireAuth, async (req, res) => {
    try {
      const parsed = connectionSaveSchema.parse(req.body);
      const { type, config } = parsed;
      const key = `external_connection_${type}`;
      const setting = await storage.upsertSystemSetting({
        key,
        value: { ...config, type, savedAt: new Date().toISOString() },
        description: `${type.toUpperCase()} external connection configuration`,
      });
      res.json(setting);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/people/device-status/:empCode", async (req, res) => {
    try {
      const statuses = await storage.getEmployeeDeviceStatuses(req.params.empCode);
      res.json(statuses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/people/emergency-toggle", async (req, res) => {
    try {
      const result = await storage.toggleEmployeeDeviceAccess(req.body);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  crudRoutes(
    app,
    "/api/roles",
    insertRoleSchema,
    () => storage.getRoles(),
    (data) => storage.createRole(data),
    (id, data) => storage.updateRole(id, data),
    (id) => storage.deleteRole(id)
  );
  crudRoutes(
    app,
    "/api/employee-roles",
    insertEmployeeRoleSchema,
    () => storage.getEmployeeRoles(),
    async (data: any) => {
      const existing = await storage.getEmployeeRoles();
      const isDuplicate = existing.some(
        (r) => r.employeeCode === data.employeeCode && Number(r.roleId) === Number(data.roleId)
      );
      if (isDuplicate) {
        const error: any = new Error("This role is already assigned to this employee.");
        error.status = 400;
        throw error;
      }
      return await storage.createEmployeeRole(data);
    },
    async (id, data) => {
      return await storage.updateEmployeeRole(id, data);
    },
    async (id) => {
      return await storage.deleteEmployeeRole(id);
    }
  );
  
  crudRoutes(
    app,
    "/api/cron-lists",
    insertCronMasterSchema,
    () => storage.getCronMasters(),
    async (data: any) => {
      
      const existing = await storage.getCronMasters();
      const isDuplicate = existing.some(
        (c) => c.code.toLowerCase() === data.code.toLowerCase()
      );

      if (isDuplicate) {
        const error: any = new Error("This Cron Key is already defined. Please use a unique key.");
        error.status = 400;
        throw error;
      }

      
      
      const cronData = {
        ...data,
        config: data.config || {},
        isActive: data.isActive ?? false,
        lastRun: null
      };

      return await storage.createCronMaster(cronData);
    },
    async (id, data) => {
      
      return await storage.updateCronMaster(id, data);
    },
    async (id) => {
      return await storage.deleteCronMaster(id);
    }
  );
  
  app.get("/api/cron-jobs/main-gate", async (_req, res) => {
    const allCrons = await storage.getCronMasters();
    
    const gateJob = allCrons.find(c => c.code === MAIN_GATE_SYNC.CODE);
    res.json(gateJob ? [gateJob] : []);
  });

  
  app.get("/api/cron-jobs/cabin-lock", async (_req, res) => {
    const allCrons = await storage.getCronMasters();
    
    const cabinJob = allCrons.find(c => c.code === CABIN_LOCKOUT_CONFIG.CODE);
    res.json(cabinJob ? [cabinJob] : []);
  })
  
  crudRoutes(
    app,
    "/api/door-devices",
    insertDoorDeviceSchema, 
    () => storage.getDoorDevices(),
    async (data: any) => {
      
      const existing = await storage.getDoorDevices();
      const isDuplicate = existing.some((m) => m.doorId === data.doorId);

      if (isDuplicate) {
        const error: any = new Error("Hardware mapping already exists for this door.");
        error.status = 400;
        throw error;
      }

      return await storage.createDoorDevice(data);
    },
    async (id, data) => {
      return await storage.updateDoorDevice(id, data);
    },
    async (id) => {
      return await storage.deleteDoorDevice(id);
    }
  );
  crudRoutes(
    app,
    "/api/block-unblock-logs",
    insertBlockUnblockLogSchema,
    () => storage.getBlockUnblockLogs(),
    async (data: any) => {
      return await storage.createBlockUnblockLog(data);
    },
    async (id, data) => {
      return await storage.updateBlockUnblockLog(id, data);
    },
    async (id) => {
      return await storage.deleteBlockUnblockLog(id);
    }
  );
  app.get("/api/devices/role-eligible", async (_req, res) => {
    try {
      const devices = await storage.getRoleEligibleDevices();
      res.json(devices);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch devices for role assignment" });
    }
  });
  app.get("/api/doors/lockout-eligible", async (req, res) => {
    try {
      const search = req.query.search as string;
      const doors = await storage.getLockoutEligibleDoors(search);
      res.json(doors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch doors" });
    }
  });



  app.patch("/api/doors/bulk-lockout", async (req, res) => {
    try {
      const { enabledIds, disabledIds } = req.body;

      
      if (enabledIds && enabledIds.length > 0) {
        await storage.updateDoorLockoutStatusBulk(enabledIds, true);
      }

      
      if (disabledIds && disabledIds.length > 0) {
        await storage.updateDoorLockoutStatusBulk(disabledIds, false);
      }

      return res.json({ success: true, message: "All doors synced successfully" });
    } catch (error) {
      console.error("Route Error:", error);
      return res.status(500).json({ success: false, message: "Failed to sync doors" });
    }
  });
  app.post("/api/emergency/bulk-unblock", isAuthenticated, async (req, res) => {
    try {
      const session = req.session as any;

      
      const loginId = session.userId;
      if (!loginId) {
        return res.status(401).json({ message: "User session not found. Please re-login." });
      }

      
      
      const user = await storage.getUser(loginId.toString());
      const userName = user?.username || "Admin User";

      
      
      const result = await storage.executeEmergencybulkUnblock(loginId, userName);

      
      res.json({
        success: true,
        
        message: `Emergency unblock initiated for ${result.processedCount} records.`,
        audit: {
          performedBy: userName,
          alertId: result.alertId
        }
      });

    } catch (error: any) {
      console.error("Route Error:", error);
      
      res.status(500).json({
        message: error.message || "Failed to execute emergency unblock"
      });
    }
  });

  app.get("/api/reports/door-count", async (req, res) => {
    try {
      const { dateFrom, dateTo, deviceId } = req.query;
      const data = await storage.getDoorWiseCount({
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        deviceId: deviceId ? Number(deviceId) : undefined,
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch door count" });
    }
  });
  app.get("/api/reports/cabin-lockout", async (req, res) => {
    try {
      const { dateFrom, dateTo, employeeCode, doorId, status } = req.query;

      const data = await storage.getCabinLockoutReport({
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        employeeCode: employeeCode as string,
        doorId: doorId as string,
        status: status as string 
      });

      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lockout report" });
    }
  });
  app.get("/api/employee-door-assignments", async (req, res) => {
    try {
      const data = await storage.getEmployeeDoorAssignments();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch door assignments" });
    }
  });

  
  app.get("/api/employee-door-assignments/:code", async (req, res) => {
    try {
      const data = await storage.getEmployeeDoorAssignmentByCode(req.params.code);
      if (!data) {
        return res.status(404).json({ message: "Assignment not found for this employee" });
      }
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee door assignment" });
    }
  });

  
  app.post("/api/employee-door-assignments", async (req, res) => {
    try {
      const { employeeCode, doorIds } = req.body;

      
      if (!employeeCode || !Array.isArray(doorIds)) {
        return res.status(400).json({
          status: "error",
          message: "Required data missing: employeeCode (string) and doorIds (array) are mandatory."
        });
      }

      const result = await storage.upsertEmployeeDoorAssignment({ employeeCode, doorIds });

      res.status(200).json({
        status: "success",
        message: "Access privileges updated successfully.",
        data: result
      });

    } catch (error: any) {
      
      console.error("Assignment Error Log:", error.message);

      
      res.status(400).json({
        status: "error",
        message: error.message || "An unexpected error occurred during assignment."
      });
    }
  });

  
  app.delete("/api/employee-door-assignments/:id", async (req, res) => {
    try {
      await storage.deleteEmployeeDoorAssignment(Number(req.params.id));
      res.json({ message: "Assignment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });
  return httpServer;
}
