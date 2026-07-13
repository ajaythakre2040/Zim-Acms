import type { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
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
  insertRoleSchema,
  insertCronMasterSchema,
  insertDoorDeviceSchema,
  insertBlockUnblockLogSchema,
  insertMenuMasterSchema,
  userProfiles,
  insertContractorSchema,
  visitorCards,
  insertVisitorCardSchema,
  visitorCardLogs,
  visitors,
} from "@shared/schema";
import { CABIN_LOCKOUT_CONFIG, MAIN_GATE_SYNC, TableNames, TABLES } from "./constant";
import { logProfileAudit, withAudit } from "./utils/auditWrapper";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { validateNoHtml } from "@/lib/validation";
import { validatePasswordStrength } from "./utils/validators";
import bcrypt from "bcryptjs";
import { appendErrors } from "react-hook-form";
import { processDoorUpdate, processEmployeeBulkUpdateOnly } from "./services/uploadService";
import { processContractorBulkUploadOnly } from "./services/contractors_bulk_upload";
import { syncVisitorCardsFromMsSql } from "./services/syncVisitorCardsFromMsSql";
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
  getOne?: (id: number) => Promise<any>,
  tableNameParam?: TableNames
) {
  const tableName = tableNameParam || (basePath.split("/").pop() as TableNames);
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
      else if (lowerMsg.includes("role_menu_unique")) fieldName = "Permission Mapping";
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
  app.post(basePath, requireAuth, (req: any, res: any) => {
    return withAudit(tableName, "ADD", async (innerReq) => {
      const input = schema.parse(innerReq.body);
      return await create(input);
    }, 201)(req, res).catch((e) => {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      handleDbError(e, res);
    });
  });
  if (update) {
    app.put(`${basePath}/:id`, requireAuth, (req: any, res: any) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      return withAudit(tableName, "UPDATE", async (innerReq) => {
        const input = schema.partial().parse(innerReq.body);
        return await update(id, input);
      }, 200)(req, res).catch((e) => {
        if (e instanceof z.ZodError) return res.status(400).json(e.errors);
        handleDbError(e, res);
      });
    });
  }
  if (remove) {
    app.delete(`${basePath}/:id`, requireAuth, (req: any, res: any) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      return withAudit(tableName, "DELETE", async () => {
        await remove(id);
        return null;
      }, 204)(req, res).catch((e) => handleDbError(e, res));
    });
  }
}
export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  app.get("/api/dashboard/stats", requireAuth, async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/dashboard/attendance/door-wise-stats", requireAuth, async (req, res) => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
      const doorStats = await storage.getDoorWiseStats(date);
      res.json(doorStats);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/dashboard/attendance/machine-logs", requireAuth, async (req, res) => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const logs = await storage.getMachineAccessLogs(date);
      res.json(logs);
    } catch (e: any) {
      console.error("Machine Logs Error:", e.message);
      res.status(500).json({ message: "Failed to fetch machine logs" });
    }
  });
  app.get("/api/dashboard/visitor/visitor-machine-logs", requireAuth, async (req, res) => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const logs = await storage.getVisitorMachineAccessLogs(date);
      res.json(logs);
    } catch (e: any) {
      console.error("Visitor Machine Logs Error:", e.message);
      res.status(500).json({ message: "Failed to fetch visitor machine logs" });
    }
  });
  app.get("/api/dashboard/attendance/shift-door-stats", requireAuth, async (req, res) => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const shiftStats = await storage.getShiftWiseStats(date);
      res.json(shiftStats);
    } catch (e: any) {
      console.error("Shift Stats Error:", e.message);
      res.status(500).json({ message: "Error fetching shift stats" });
    }
  });
  app.get("/api/user-profiles", requireAuth, async (req, res) => {
    try {
      const page = req.query.page as string | undefined;
      const pageSize = req.query.pageSize as string | undefined;
      res.json(await storage.getUserProfiles(page, pageSize));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/user-profiles/me", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const profile = await storage.getUserProfileByUserId(userId);
      res.json(profile || null);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/user-profiles", requireAuth, withAudit(TABLES.USERS, "ADD", async (req) => {
    const newUser = await storage.upsertUser(req.body);
    await logProfileAudit(req, "ADD", newUser.id);
    return newUser;
  }, 201));
  app.put("/api/user-profiles/:id", requireAuth, withAudit(TABLES.USERS, "UPDATE", async (req) => {
    const userIdFromParams = req.params.id;
    const [oldProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userIdFromParams)).limit(1);
    const updatedUser = await storage.upsertUser({ ...req.body, id: userIdFromParams });
    const [newProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userIdFromParams)).limit(1);
    await logProfileAudit(req, "UPDATE", userIdFromParams, oldProfile, newProfile);
    return updatedUser;
  }, 200));
  app.delete("/api/user-profiles/:id", requireAuth, withAudit(TABLES.USERS, "DELETE", async (req) => {
    const targetUserId = req.params.id;
    await logProfileAudit(req, "DELETE", targetUserId);
    await storage.deleteUser(targetUserId);
    return { id: targetUserId };
  }, 200));
  crudRoutes(
    app,
    "/api/companies",
    insertCompanySchema,
    (query: any) =>
      storage.getCompanies(
        query.page,
        query.pageSize,
        query.search   
      ),
    (d) => storage.createCompany(d),
    (id, d) => storage.updateCompany(id, d),
    (id) => storage.deleteCompany(id),
    undefined,
    TABLES.COMPANIES
  );
  crudRoutes(
    app,
    "/api/departments",
    insertDepartmentSchema,
    (query: any) => storage.getDepartments(query.page, query.pageSize, query.search),
    (d) => storage.createDepartment(d),
    (id, d) => storage.updateDepartment(id, d),
    (id) => storage.deleteDepartment(id),
    undefined,
    TABLES.DEPARTMENTS
  );
  crudRoutes(
    app,
    "/api/designations",
    insertDesignationSchema,
    (query: any) =>
      storage.getDesignations(
        Number(query.page),
        Number(query.pageSize),
        query.search
      ),
    (d) => storage.createDesignation(d),
    (id, d) => storage.updateDesignation(id, d),
    (id) => storage.deleteDesignation(id),
    undefined,
    TABLES.DESIGNATIONS
  );
  crudRoutes(
    app,
    "/api/categories",
    insertCategorySchema,
    (query: any) => storage.getCategories(query.page, query.pageSize),
    (d) => storage.createCategory(d),
    (id, d) => storage.updateCategory(id, d),
    (id) => storage.deleteCategory(id),
    undefined,
    TABLES.CATEGORIES
  );
  crudRoutes(
    app,
    "/api/categories",
    insertCategorySchema,
    (query: any) =>
      storage.getCategories(
        Number(query.page),
        Number(query.pageSize),
        query.search
      ),
    (d) => storage.createCategory(d),
    (id, d) => storage.updateCategory(id, d),
    (id) => storage.deleteCategory(id),
    undefined,
    TABLES.CATEGORIES
  );
  crudRoutes(app, "/api/vendors", insertVendorSchema,
    () => storage.getVendors(), (d) => storage.createVendor(d),
    (id, d) => storage.updateVendor(id, d), (id) => storage.deleteVendor(id), undefined, TABLES.VENDORS);
  crudRoutes(app, "/api/sites", insertSiteSchema,
    () => storage.getSites(), (d) => storage.createSite(d),
    (id, d) => storage.updateSite(id, d), (id) => storage.deleteSite(id), undefined, TABLES.SITES);
  app.get("/api/buildings", requireAuth, async (req, res) => {
    try {
      const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : undefined;
      res.json(await storage.getBuildings(siteId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/buildings", insertBuildingSchema,
    () => storage.getBuildings(), (d) => storage.createBuilding(d),
    (id, d) => storage.updateBuilding(id, d), (id) => storage.deleteBuilding(id), undefined, TABLES.BUILDINGS);
  app.get("/api/floors", requireAuth, async (req, res) => {
    try {
      const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string) : undefined;
      res.json(await storage.getFloors(buildingId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/floors", insertFloorSchema,
    () => storage.getFloors(), (d) => storage.createFloor(d),
    (id, d) => storage.updateFloor(id, d), (id) => storage.deleteFloor(id));
  app.get("/api/zones", requireAuth, async (req, res) => {
    try {
      const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : undefined;
      res.json(await storage.getZones(siteId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/zones", insertZoneSchema,
    () => storage.getZones(), (d) => storage.createZone(d),
    (id, d) => storage.updateZone(id, d), (id) => storage.deleteZone(id), undefined, TABLES.ZONES);
  crudRoutes(
    app,
    "/api/doors",
    insertDoorSchema,
    async (query: any) => {
      return await storage.getDoors(
        query.page,
        query.pageSize,
        query.search
      );
    },
    async (data: any) => {
      return await storage.createDoor(data);
    },
    async (id, data) => {
      return await storage.updateDoor(id, data);
    },
    async (id) => {
      return await storage.deleteDoor(id);
    },
    undefined,
    TABLES.DOORS
  );
  crudRoutes(
    app,
    "/api/devices",
    insertDeviceSchema,
    (query: any) =>
      storage.getDevices(
        query.page,
        query.pageSize,
        query.search   
      ),
    (d) => storage.createDevice(d),
    (id, d) => storage.updateDevice(id, d),
    (id) => storage.deleteDevice(id),
    undefined,
    TABLES.DEVICES
  );
  app.get("/api/people", requireAuth, async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const page = req.query.page as string | undefined;
      const pageSize = req.query.pageSize as string | undefined;
      res.json(await storage.getPeople(search, page, pageSize));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/people/:id", requireAuth, async (req, res) => {
    try {
      const person = await storage.getPerson(parseInt(req.params.id));
      if (!person) return res.status(404).json({ message: "Not found" });
      res.json(person);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/peoplebycode/:code", requireAuth, async (req, res) => {
    try {
      const person = await storage.getPersonByCode(req.params.code);
      return person ? res.json(person) : res.status(404).json({ message: `Employee Code '${req.params.code}' does not exist.` });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.post("/api/people", requireAuth, withAudit(TABLES.PEOPLE, "ADD/UPDATE", async (req) => await storage.createPerson(insertPersonSchema.parse(req.body)), 201));
  app.patch(
    "/api/people/:id",
    requireAuth,
    withAudit(TABLES.PEOPLE, "UPDATE", async (req) => {
      const personId = parseInt(req.params.id);
      if (isNaN(personId)) {
        throw new Error("Invalid Person ID");
      }
      const updatedPerson = await storage.updatePerson(personId, req.body);
      return updatedPerson;
    }, 200)
  );
    app.delete("/api/people/:id", requireAuth, withAudit(TABLES.PEOPLE, "DELETE", async (req) => { await storage.deletePerson(parseInt(req.params.id)); return null; }, 204));
  app.get("/api/credentials", requireAuth, async (req, res) => {
    try {
      const personId = req.query.personId ? parseInt(req.query.personId as string) : undefined;
      res.json(await storage.getCredentials(personId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/credentials", insertCredentialSchema,
    () => storage.getCredentials(), (d) => storage.createCredential(d),
    (id, d) => storage.updateCredential(id, d), (id) => storage.deleteCredential(id), undefined, TABLES.CREDENTIALS);
  crudRoutes(app, "/api/access-cards", insertAccessCardSchema,
    () => storage.getAccessCards(), (d) => storage.createAccessCard(d),
    (id, d) => storage.updateAccessCard(id, d), (id) => storage.deleteAccessCard(id), undefined, TABLES.ACCESS_CARDS);
  crudRoutes(
    app,
    "/api/shifts",
    insertShiftSchema,
    async (query: any) => {
      return await storage.getShifts(
        query.page,
        query.pageSize,
        query.search
      );
    },
    (d) => storage.createShift(d),
    (id, d) => storage.updateShift(id, d),
    (id) => storage.deleteShift(id),
    undefined,
    TABLES.SHIFTS
  );
  app.get("/api/shift-assignments", requireAuth, async (req, res) => {
    try {
      const personId = req.query.personId ? parseInt(req.query.personId as string) : undefined;
      res.json(await storage.getShiftAssignments(personId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/shift-assignments", insertShiftAssignmentSchema,
    () => storage.getShiftAssignments(), (d) => storage.createShiftAssignment(d),
    (id, d) => storage.updateShiftAssignment(id, d), (id) => storage.deleteShiftAssignment(id), undefined, TABLES.SHIFT_ASSIGNMENTS);
  crudRoutes(
    app,
    "/api/holidays",
    insertHolidaySchema,
    (query: any) =>
      storage.getHolidays(
        query.page,
        query.pageSize,
        query.search,
      ),
    (d) => storage.createHoliday(d),
    (id, d) => storage.updateHoliday(id, d),
    (id) => storage.deleteHoliday(id),
    undefined,
    TABLES.HOLIDAYS
  );
  crudRoutes(app, "/api/access-levels", insertAccessLevelSchema,
    () => storage.getAccessLevels(), (d) => storage.createAccessLevel(d),
    (id, d) => storage.updateAccessLevel(id, d), (id) => storage.deleteAccessLevel(id), undefined, TABLES.ACCESS_LEVELS);
  crudRoutes(app, "/api/access-rules", insertAccessRuleSchema,
    () => storage.getAccessRules(), (d) => storage.createAccessRule(d),
    (id, d) => storage.updateAccessRule(id, d), (id) => storage.deleteAccessRule(id), undefined, TABLES.ACCESS_RULES);
  app.get("/api/person-access", requireAuth, async (req, res) => {
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
  app.post("/api/person-access", requireAuth, withAudit(TABLES.PERSON_ACCESS, "ADD", async (req) => await storage.createPersonAccess(insertPersonAccessSchema.parse(req.body)), 201));
  app.delete("/api/person-access/:id", requireAuth, withAudit(TABLES.PERSON_ACCESS, "DELETE", async (req) => { await storage.deletePersonAccess(parseInt(req.params.id)); return null; }, 204));
  app.get("/api/visitors", requireAuth, async (req, res) => {
    try {
      const page = req.query.page ? Number(req.query.page) : undefined;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      console.log("Fetching visitors with params:", { page, pageSize, search });
      const result = await storage.getVisitors(page, pageSize, search);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || "Failed to fetch paginated visitors"
      });
    }
  });
  app.get("/api/visitors/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const visitor = await storage.getVisitor(id);
      if (!visitor) return res.status(404).json({ error: "Visitor not found" });
      return res.json(visitor);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });
  app.post(
    "/api/visitors",
    requireAuth,
    withAudit(
      TABLES.VISITORS,
      "ADD",
      async (req) => await storage.createVisitor(insertVisitorSchema.parse(req.body)),
      201
    )
  );

  app.put(
    "/api/visitors/:id",
    requireAuth,
    withAudit(
      TABLES.VISITORS, // Ya direct "visitors" string agar constant defined na ho
      "UPDATE",
      async (req: any) => {
        const id = Number(req.params.id);

        // Agar aapke paas update karne se pehle zod schema schema validate karna ho:
        // const parsed = insertVisitorSchema.partial().parse(req.body);

        const updated = await storage.updateVisitor(id, req.body);
        return updated;
      },
      200 // Success status code
    )
  );
  
  app.delete(
    "/api/visitors/:id",
    requireAuth,
    withAudit(
      TABLES.VISITORS, // Ya direct "visitors" string agar constant defined na ho
      "DELETE",
      async (req: any) => {
        const id = Number(req.params.id);

        // 1. Database se record delete karein
        await storage.deleteVisitor(id);

        // 2. Response object return karein jo frontend ko receive hoga
        return { success: true, message: "Visitor deleted successfully" };
      },
      200 // Success status code (Aapka middleware ise .json() me convert kar dega)
    )
  );
  app.post(
    "/api/visitors/:id/checkout", requireAuth,
    withAudit(
      "visitors",
      "UPDATE",
      async (req) => {
        const visitorId = Number(req.params.id);
        if (isNaN(visitorId)) {
          throw new Error("Invalid or missing visitor ID for checkout.");
        }
        return await storage.outVisitor(visitorId);
      },
      200
    )
  );
  app.get("/api/visits", requireAuth, async (req, res) => {
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

  app.put(
    "/api/visits/:id",
    requireAuth,
    withAudit(
      TABLES.VISITS, // Ya direct "visits" string agar constant defined na ho
      "UPDATE",
      async (req: any) => {
        try {
          // 1. Zod standard validation checking
          const input = insertVisitSchema.partial().parse(req.body);

          // 2. Storage operation triggering
          const updated = await storage.updateVisit(parseInt(req.params.id), input);
          return updated;
        } catch (e: any) {
          // Agar Zod validation fail hoti hai, toh use middleware-compatible custom error banayein
          if (e instanceof z.ZodError) {
            throw {
              isCustom: true,
              status: 400,
              errors: e.errors
            };
          }
          // Baki internal errors ko upar default bubble hone dein
          throw e;
        }
      },
      200 // Success status code
    )
  );
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
  app.get("/api/attendance", requireAuth, async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : undefined;
      const personId = req.query.personId ? parseInt(req.query.personId as string) : undefined;
      res.json(await storage.getAttendance(date, siteId, personId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/attendance/summary", requireAuth, async (req, res) => {
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
  app.post("/api/attendance", requireAuth, withAudit(TABLES.ATTENDANCE, "ADD", async (req) => await storage.createAttendance(insertAttendanceSchema.parse(req.body)), 201));
  app.put("/api/attendance/:id", requireAuth, withAudit(TABLES.ATTENDANCE, "UPDATE", async (req) => await storage.updateAttendance(parseInt(req.params.id), insertAttendanceSchema.partial().parse(req.body)), 200));
  app.get("/api/access-logs", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : undefined;
      res.json(await storage.getAccessLogs(limit, siteId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/access-logs", requireAuth, withAudit(TABLES.ACCESS_LOGS, "ADD/UPDATE", async (req) => await storage.createAccessLog(insertAccessLogSchema.parse(req.body)), 201));
  app.get("/api/alerts", requireAuth, async (req, res) => {
    try {
      const isResolved = req.query.resolved === "true" ? true : req.query.resolved === "false" ? false : undefined;
      res.json(await storage.getAlerts(isResolved));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/alerts", requireAuth, withAudit(TABLES.ALERTS, "ADD", async (req) => await storage.createAlert(insertAlertSchema.parse(req.body)), 201));
  app.put("/api/alerts/:id/acknowledge", requireAuth, withAudit(TABLES.ALERTS, "UPDATE", async (req) => await storage.updateAlert(parseInt(req.params.id), { isRead: true }), 200));
  app.put("/api/alerts/:id/resolve", requireAuth, withAudit(TABLES.ALERTS, "UPDATE", async (req) => await storage.updateAlert(parseInt(req.params.id), { isResolved: true, resolvedBy: req.session?.userId, resolvedAt: new Date() }), 200));
  app.get("/api/exceptions", requireAuth, async (req, res) => {
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
  app.post("/api/system-settings", requireAuth, withAudit(TABLES.SYSTEM_SETTINGS, "ADD/UPDATE", async (req) => await storage.upsertSystemSetting(insertSystemSettingSchema.parse(req.body)), 200));
  app.get("/api/reports/attendance", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        status: req.query.status as string | undefined,
        deviceId: req.query.deviceId ? String(req.query.deviceId) : undefined,
        employeeCode: req.query.employeeCode ? String(req.query.employeeCode) : undefined,
      };
      const page = req.query.page ? String(req.query.page) : undefined;
      const pageSize = req.query.pageSize ? String(req.query.pageSize) : undefined;
      const data = await storage.getAttendanceReport(filters, page, pageSize);
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
        personId: req.query.personId
          ? parseInt(req.query.personId as string)
          : undefined,
        locationId: req.query.locationId
          ? parseInt(req.query.locationId as string)
          : undefined,
        doorId: req.query.doorId
          ? parseInt(req.query.doorId as string)
          : undefined,
      };
      const page = req.query.page
        ? String(req.query.page)
        : undefined;
      const pageSize = req.query.pageSize
        ? String(req.query.pageSize)
        : undefined;
      const data = await storage.getAccessLogReport(
        filters,
        page,
        pageSize
      );
      res.json(data);
    } catch (e: any) {
      res.status(500).json({
        message: e.message,
      });
    }
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
  app.get("/api/people/device-status/:empCode", requireAuth, async (req, res) => {
    try {
      const statuses = await storage.getEmployeeDeviceStatuses(req.params.empCode);
      res.json(statuses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  app.post(
    "/api/people/emergency-toggle", requireAuth,
    withAudit(TABLES.USER_BLOCK_UNBLOCK_LOGS, (req) => {
      return req.body.action === "block" ? "EMERGENCY_BLOCK" : "EMERGENCY_UNBLOCK";
    }, async (req) => {
      const result = await storage.toggleEmployeeDeviceAccess(req.body);
      return { success: true, data: result };
    }, 200)
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
    }, undefined, TABLES.CRON_MASTER
  );
  app.get("/api/cron-jobs/main-gate", requireAuth, async (_req, res) => {
    const allCrons = await storage.getCronMasters();
    const gateJob = allCrons.find(c => c.code === MAIN_GATE_SYNC.CODE);
    res.json(gateJob ? [gateJob] : []);
  });
  app.get("/api/cron-jobs/cabin-lock", requireAuth, async (_req, res) => {
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
    }, undefined, TABLES.DOOR_DEVICES
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
  app.get("/api/devices/role-eligible", requireAuth, async (_req, res) => {
    try {
      const devices = await storage.getRoleEligibleDevices();
      res.json(devices);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch devices for role assignment" });
    }
  });
  app.get("/api/doors/lockout-eligible", requireAuth, async (req, res) => {
    try {
      const search = req.query.search as string;
      const doors = await storage.getLockoutEligibleDoors(search);
      res.json(doors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch doors" });
    }
  });
  app.patch("/api/doors/bulk-lockout", requireAuth, async (req, res) => {
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
  app.post("/api/emergency/bulk-unblock", isAuthenticated, withAudit(TABLES.USER_BLOCK_UNBLOCK_LOGS, "EMERGENCY_UNBLOCK_ALL", async (req) => {
    const loginId = req.session?.userId;
    if (!loginId) throw new Error("User session not found. Please re-login.");
    const user = await storage.getUser(loginId.toString());
    const result = await storage.executeEmergencybulkUnblock(loginId, user?.username || "Admin User");
    return { success: true, message: `Emergency unblock initiated for ${result.processedCount} records.`, audit: { performedBy: user?.username || "Admin User", alertId: result.alertId } };
  }, 200));
  app.get("/api/reports/door-count", requireAuth, async (req, res) => {
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
  app.get("/api/reports/cabin-lockout", requireAuth, async (req, res) => {
    try {
      const { dateFrom, dateTo, employeeCode, doorId, status } = req.query;
      const page = req.query.page
        ? String(req.query.page)
        : undefined;
      const pageSize = req.query.pageSize
        ? String(req.query.pageSize)
        : undefined;
      const data = await storage.getCabinLockoutReport(
        {
          dateFrom: dateFrom as string,
          dateTo: dateTo as string,
          employeeCode: employeeCode as string,
          doorId: doorId as string,
          status: status as string,
        },
        page,
        pageSize
      );
      res.json(data);
    } catch (error) {
      res.status(500).json({
        message: "Failed to fetch lockout report",
      });
    }
  });
  app.get("/api/employee-door-assignments", requireAuth, async (req, res) => {
    try {
      const data = await storage.getEmployeeDoorAssignments();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch door assignments" });
    }
  });
  app.get("/api/employee-door-assignments/:code", requireAuth, async (req, res) => {
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
  app.post("/api/employee-door-assignments", requireAuth, withAudit(TABLES.EMPLOYEE_DOOR_ASSIGNMENTS, "ADD/UPDATE", async (req) => {
    const { employeeCode, doorIds } = req.body;
    if (!employeeCode || !Array.isArray(doorIds)) throw new Error("Required data missing: employeeCode (string) and doorIds (array) are mandatory.");
    return { status: "success", message: "Access privileges updated successfully.", data: await storage.upsertEmployeeDoorAssignment({ employeeCode, doorIds }) };
  }, 200));
  app.delete("/api/employee-door-assignments/:id", requireAuth, withAudit(TABLES.EMPLOYEE_DOOR_ASSIGNMENTS, "DELETE", async (req) => { await storage.deleteEmployeeDoorAssignment(Number(req.params.id)); return { message: "Assignment deleted successfully" }; }, 200));
  app.get("/api/reports/daily-performance", requireAuth, async (req: Request, res: Response) => {
    try {
      const q = req.query as any;
      const date = q.date || new Date().toISOString().split('T')[0];
      const data = await storage.getDailyReport(date);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/reports/muster-roll", requireAuth, async (req: Request, res: Response) => {
    try {
      const q = req.query as any;
      const page = q.page ? String(q.page) : undefined;
      const pageSize = q.pageSize ? String(q.pageSize) : undefined;
      const employeeCode = q.employeeCode ? String(q.employeeCode) : undefined;
      const data = await storage.getRangeReport(
        q.dateFrom,
        q.dateTo,
        employeeCode,
        page,
        pageSize
      );
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/reports/ot-matrix", requireAuth, async (req: Request, res: Response) => {
    try {
      const q = req.query as any;
      const page = q.page ? String(q.page) : undefined;
      const pageSize = q.pageSize ? String(q.pageSize) : undefined;
      const employeeCode = q.employeeCode ? String(q.employeeCode) : undefined;
      const data = await storage.getRangeReport(
        q.dateFrom,
        q.dateTo,
        employeeCode,
        page,
        pageSize
      );
      res.json(data);
    } catch (e: any) {
      res.status(500).json({
        message: e.message,
      });
    }
  });
  app.get("/api/reports/dept-summary", requireAuth, async (req: Request, res: Response) => {
    try {
      const q = req.query as any;
      const date = q.date || new Date().toISOString().split('T')[0];
      const data = await storage.getDeptSummary(date);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/reports/daily-efficiency", requireAuth, async (req: Request, res: Response) => {
    try {
      const q = req.query as any;
      const date = q.date || new Date().toISOString().split("T")[0];
      const employeeCode = q.employeeCode || undefined;
      const page = q.page ? String(q.page) : undefined;
      const pageSize = q.pageSize ? String(q.pageSize) : undefined;
      const data = await storage.getDailyReport(
        date,
        employeeCode,
        page,
        pageSize
      );
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/reports/efficiency-analytics", requireAuth, async (req: Request, res: Response) => {
    try {
      const q = req.query as any;
      const data = await storage.getEfficiencyAnalytics(q.dateFrom, q.dateTo, q.employeeCode);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  crudRoutes(
    app,
    "/api/menus",
    insertMenuMasterSchema,
    () => storage.getMenus(),
    async (data: any) => {
      try {
        return await storage.createMenu(data);
      } catch (error: any) {
        const customError: any = new Error(error.message);
        customError.status = 400;
        customError.errors = { code: error.message };
        throw customError;
      }
    },
    async (id: number, data: any) => {
      try {
        return await storage.updateMenu(id, data);
      } catch (error: any) {
        const customError: any = new Error(error.message);
        customError.status = 400;
        customError.errors = { code: error.message };
        throw customError;
      }
    },
    (id) => storage.deleteMenu(id), undefined, TABLES.MENU_MASTER
  );
  app.get("/api/roles", requireAuth, async (_req, res) => {
    const roles = await storage.getRoles();
    res.json(roles);
  });
  app.get("/api/menus/parents", requireAuth, async (_req, res) => {
    try {
      const parents = await storage.getParentMenus();
      res.json(parents);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.post("/api/roles-with-permissions", requireAuth, withAudit(TABLES.ROLES, "ADD/UPDATE", async (req) => {
    const { role, permissions } = req.body;
    if (!role?.code || !Array.isArray(permissions)) throw new Error("Required data missing: code (string) and permissions (array) are mandatory.");
    const menuIds = permissions.map((p: any) => p.menuId);
    if (new Set(menuIds).size !== menuIds.length) throw new Error("Duplicate Menu assignments detected. Each menu must have a unique permission set.");
    const existingRole = await storage.getRoleByCode(role.code);
    if (existingRole) throw new Error("This Role Code is already registered. Please use a unique code.");
    return await storage.createRoleWithPermissions(role, permissions);
  }, 201));
  app.put("/api/roles-with-permissions/:id", requireAuth, withAudit(TABLES.ROLES, "UPDATE", async (req) => { await storage.updateRoleWithPermissions(parseInt(req.params.id), req.body.role, req.body.permissions); return { message: "Role and Permissions updated successfully" }; }, 200));
  app.get("/api/roles-with-permissions/:id", requireAuth, async (req, res) => {
    try {
      const roleId = Number(req.params.id);
      const roleData = await storage.getRolePermissions(roleId);
      if (!roleData) {
        return res.status(404).json({ message: "Role not found" });
      }
      res.json(roleData);
    } catch (error: any) {
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to fetch role data"
      });
    }
  });
  app.delete("/api/roles/:id", requireAuth, withAudit(TABLES.ROLES, "DELETE", async (req) => { await storage.deleteRole(Number(req.params.id)); return null; }, 204));
  app.get("/api/reports_access_logs", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        employeeCode: req.query.employeeCode as string,
        doorId: req.query.doorId as string,
        doorName: req.query.doorName as string,
      };
      const page = req.query.page ? String(req.query.page) : undefined;
      const pageSize = req.query.pageSize ? String(req.query.pageSize) : undefined;
      const data = await storage.getDeviceLogsWithEmployee(filters, page, pageSize);
      res.json(data);
    } catch (e: any) {
      console.error(e); res.status(500).json({ message: e.message, });
    }
  });
  app.get("/api/reports/employee-productive-report", requireAuth, async (req, res) => {
    try {
      const { date, employeeCode } = req.query;
      const page = req.query.page
        ? String(req.query.page)
        : undefined;
      const pageSize = req.query.pageSize
        ? String(req.query.pageSize)
        : undefined;
      const data = await storage.getEmployeeProductiveReport(
        {
          date: date as string,
          employeeCode: employeeCode as string,
        },
        page,
        pageSize
      );
      res.json(data);
    } catch (error: any) {
      console.error("Employee Productive Report Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch productive report",
        error: error.message,
      });
    }
  });
  app.get("/api/reports/employee-efficiency-dateRange", requireAuth, async (req, res) => {
    try {
      const {
        dateFrom,
        dateTo,
        employeeCode,
        page,
        pageSize
      } = req.query;
      if (!dateFrom || !dateTo) {
        return res.status(400).json({
          success: false,
          message:
            "Date range is required. Please select both Start Date and End Date to proceed."
        });
      }
      const result = await storage.getEmplyeeEefficiency(
        String(dateFrom),
        String(dateTo),
        employeeCode
          ? String(employeeCode)
          : undefined,
        page
          ? String(page)
          : undefined,
        pageSize
          ? String(pageSize)
          : undefined
      );
      res.json({
        success: true,
        count: result.totalCount,
        ...result
      });
    } catch (error: any) {
      console.error("Efficiency Report Error:", error);
      res.status(500).json({
        success: false,
        message:
          "An internal server error occurred while generating the efficiency report. Please try again later."
      });
    }
  });
  app.get("/api/reports/department-efficiency", requireAuth, async (req, res) => {
    try {
      const {
        dateFrom,
        dateTo,
        deptId,
        page,
        pageSize
      } = req.query;
      if (!dateFrom || !dateTo) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required parameters: fromDate and toDate are mandatory."
        });
      }
      const result = await storage.getDepartmentEfficiencyReport(
        String(dateFrom),
        String(dateTo),
        deptId
          ? Number(deptId)
          : undefined,
        page
          ? String(page)
          : undefined,
        pageSize
          ? String(pageSize)
          : undefined
      );
      res.status(200).json({
        success: true,
        count: result.totalCount,
        ...result
      });
    } catch (error: any) {
      console.error(
        `[Report API Error] - ${new Date().toISOString()}:`,
        error.stack
      );
      res.status(500).json({
        success: false,
        message:
          "An internal server error occurred while generating the department efficiency report."
      });
    }
  });
  app.put("/api/users/:id/change-password", requireAuth, withAudit(TABLES.USERS, "UPDATE", async (req: any) => {
    const targetUserId = req.params.id;
    const { newPassword, confirmPassword } = req.body;
    const validationErrors = validateNoHtml(req.body);
    if (Object.keys(validationErrors).length > 0) {
      throw new Error(Object.values(validationErrors).join(", "));
    }
    if (!newPassword || !confirmPassword) {
      throw new Error("Both New Password and Confirm Password are required.");
    }
    if (newPassword !== confirmPassword) {
      throw new Error("Validation Failed: New password and Confirm password do not match.");
    }
    if (!validatePasswordStrength(newPassword)) {
      throw new Error("Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.");
    }
    const updatedUser = await storage.updateUserPassword(targetUserId, newPassword);
    if (!updatedUser) {
      throw new Error("User record not found in the database.");
    }
    return updatedUser;
  }, 200));
  app.get("/api/reports/employee-movement-logs", requireAuth, async (req, res) => {
    try {
      const { date, employeeCode } = req.query;
      const page = req.query.page
        ? String(req.query.page)
        : undefined;
      const pageSize = req.query.pageSize
        ? String(req.query.pageSize)
        : undefined;
      const data = await storage.getEmployeeMovementLogsReport(
        {
          date: date as string,
          employeeCode: employeeCode as string,
        },
        page,
        pageSize,
      );
      res.json(data);
    } catch (error: any) {
      console.error("Employee Movement Logs Report Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch employee movement logs report",
        error: error.message,
      });
    }
  });
  app.get("/api/reports/department-wise-manpower", requireAuth, async (req, res) => {
    try {
      const {
        dateFrom,
        dateTo,
        employeeCode,
        page = "1",
        pageSize = "10",
      } = req.query;
      if (!dateFrom || !dateTo) {
        return res.status(400).json({
          success: false,
          message: "dateFrom and dateTo are required",
        });
      }
      const data = await storage.getDepartmentWiseManpowerReport(
        {
          dateFrom: String(dateFrom),
          dateTo: String(dateTo),
          employeeCode: employeeCode
            ? String(employeeCode)
            : undefined,
        },
        Number(page),
        Number(pageSize)
      );
      return res.status(200).json({
        success: true,
        ...data,
      });
    } catch (error: any) {
      console.error(
        "Department Wise Manpower Report Error =>",
        error
      );
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  });
  app.post("/api/contractors", requireAuth, withAudit("contractors", "ADD", async (req: any) => {
    return await storage.createContractor(req.body);
  }, 201));
  app.patch("/api/contractors/:id", requireAuth, withAudit("contractors", "UPDATE", async (req: any) => {
    return await storage.updateContractor(Number(req.params.id), req.body);
  }));
  app.get("/api/contractors", requireAuth, async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 5;
      const search = String(req.query.search || "");
      const result = await storage.getContractors(page, pageSize, search);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch contractors" });
    }
  });
  app.get("/api/contractors/:id", requireAuth, async (req, res) => {
    try {
      const data = await storage.getContractor(Number(req.params.id));
      if (!data) return res.status(404).json({ message: "Contractor not found" });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: "Error fetching contractor details" });
    }
  });
  app.delete("/api/contractors/:id", requireAuth, withAudit("contractors", "DELETE", async (req: any) => {
    return await storage.deleteContractor(Number(req.params.id));
  }, 204));
  app.get("/api/audit-logs", requireAuth, async (req, res) => {
    try {
      const page = req.query.page ? Number(req.query.page) : undefined;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      const performedBy = req.query.performedBy ? String(req.query.performedBy) : undefined;
      const module = req.query.module ? String(req.query.module) : undefined;
      const action = req.query.action ? String(req.query.action) : undefined;
      const fromDate = req.query.fromDate ? String(req.query.fromDate) : undefined;
      const toDate = req.query.toDate ? String(req.query.toDate) : undefined;
      const result = await storage.getAuditLogs(
        page,
        pageSize,
        search,
        performedBy,
        module,
        action,
        fromDate,
        toDate
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });
  app.get("/api/login-logs", requireAuth, async (req, res) => {
    try {
      const page = req.query.page ? Number(req.query.page) : undefined;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      const userId = req.query.userId ? String(req.query.userId) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const fromDate = req.query.fromDate ? String(req.query.fromDate) : undefined;
      const toDate = req.query.toDate ? String(req.query.toDate) : undefined;
      const result = await storage.getLoginLogs(
        page,
        pageSize,
        search,
        userId,
        status,
        fromDate,
        toDate
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });
  app.get("/api/audit-logs/users", requireAuth, async (req, res) => {
    try {
      const data = await storage.getAuditUsersDropdown();
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });
  app.get("/api/audit-logs/modules", requireAuth, async (req, res) => {
    try {
      const data = await storage.getAuditModulesDropdown();
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });
  app.get("/api/audit-logs/actions", requireAuth, async (req, res, next) => {
    try {
      const actions = await storage.getAuditActions();
      res.status(200).json(actions);
    } catch (error) {
      next(error);
    }
  });
  app.post("/api/people/bulk-update", requireAuth, withAudit("people", "BULK_EMPOYEE_UPDATE", async (req: any) => {
    return await processEmployeeBulkUpdateOnly(req.body.data);
  }));
  app.post("/api/doors/bulk-assign", requireAuth, withAudit("employee_door_assignments", "BULK_DOOR_ASIGNMENT", async (req: any) => {
    return await processDoorUpdate(req.body.data);
  }));
 
  app.post(
    "/api/contractors/bulk-upload",
    requireAuth,
    withAudit(
      "contractors", // Ya TABLES.CONTRACTORS agar constant file me defined hai
      "BULK_CONTRACTOR_UPLOAD",
      async (req: any) => {
        // 1. Bulk upload process run karein
        const result = await processContractorBulkUploadOnly(req.body.data);

        // 2. Agar success false hai, toh custom error throw karein jo withAudit ke catch block me throw ho sake
        if (result.success === false) {
          throw {
            isCustom: true,
            status: 400,
            errors: result
          };
        }

        // 3. Success hone par data direct return karein jo audit log me 'newData' banega
        return result;
      },
      200 // Success status code
    )
  );
  app.get("/api/download/:type/:category/:folder/:filename", requireAuth, (req, res) => {
    const { type, category, folder, filename } = req.params;
    const filePath = path.join(process.cwd(), 'media', type, category, folder, filename);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.download(filePath, filename, (err) => {
        if (err) {
          console.error("Download Error:", err);
          res.status(500).send("File download failed.");
        }
      });
    } else {
      res.status(404).send("File not found");
    }
  });
  app.patch("/api/users/:id/toggle-status", withAudit("users", "UPDATE", async (req: any) => {
    const { id } = req.params;
    if (!id) {
      throw new Error("User ID is required");
    }
    const newStatus = await storage.toggleUserStatus(id);
    return {
      success: true,
      newStatus: newStatus,
      message: `User ${id} is now ${newStatus ? 'Active' : 'Blocked'}`
    };
  }));
  crudRoutes(
    app,
    "/api/visitor_cards",
    insertVisitorCardSchema,
    (query: any) =>
      storage.getVisitorCards(
        query.page ? parseInt(query.page as string) : undefined,
        query.pageSize ? parseInt(query.pageSize as string) : undefined,
        query.search ? String(query.search) : undefined
      ),
    async (d: any) => {
      await syncVisitorCardsFromMsSql();
      return {
        success: true,
        message: "Sync completed"
      };
    },
    (id: number, d: any) => storage.updateVisitorCard(id, d),
    (id: number) => storage.deleteVisitorCard(id),
    undefined,
    TABLES.VISITOR_CARDS
  );
  app.post("/api/visitor_cards/sync", requireAuth, async (req: any, res: any) => {
    try {
      await syncVisitorCardsFromMsSql();
      res.status(200).json({
        success: true,
        message: "Sync completed"
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Sync failed"
      });
    }
  });
  app.get("/api/visitor_card_logs", requireAuth, async (req, res) => {
    try {
      const logs = await db
        .select({
          id: visitorCardLogs.id,
          msId: visitorCardLogs.msId,
          deviceId: visitorCardLogs.deviceId,
          command: visitorCardLogs.command,
          status: visitorCardLogs.status,
          syncDate: visitorCardLogs.syncDate,
          visitorCardCode: visitorCardLogs.visitorCardCode,
          visitorName: visitors.nameOfVisitor,
        })
        .from(visitorCardLogs)
        .leftJoin(visitors, eq(visitorCardLogs.visitorCardCode, visitors.rfidCardNo))
        .orderBy(desc(visitorCardLogs.syncDate))
        .limit(100);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs with name:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });
  app.get("/api/visitor_card_logs/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const log = await db
        .select()
        .from(visitorCardLogs)
        .where(eq(visitorCardLogs.id, id));
      if (log.length === 0) {
        return res.status(404).json({ message: "Log not found" });
      }
      res.json(log[0]);
    } catch (error) {
      console.error("Error fetching single visitor log:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.get("/api/visitor_card_logs/latest", requireAuth, async (req, res) => {
    try {
      const latest = await db
        .select()
        .from(visitorCardLogs)
        .orderBy(desc(visitorCardLogs.syncDate))
        .limit(1);
      res.json(latest[0] || {});
    } catch (error) {
      res.status(500).json({ message: "Error fetching latest log" });
    }
  });
  app.get("/api/visitor_cards/dropdown", requireAuth, async (req: any, res: any) => {
    try {
      const data = await storage.getAllCardsForDropdown();
      res.status(200).json({
        success: true,
        data
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
  return httpServer;
}
