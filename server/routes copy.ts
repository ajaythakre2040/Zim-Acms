import type { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
import type { Server } from "http";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";
import { z } from "zod";
import dayjs from "dayjs";
// import { withAudit } from "../auditWrapper"; // sahi file path de dena
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
  // tableName: TableNames,
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
  // app.post(basePath, requireAuth, async (req, res) => {
  //   try {
  //     const input = schema.parse(req.body);
  //     const item = await create(input);
  //     res.status(201).json(item);
  //   } catch (e: any) {
  //     if (e instanceof z.ZodError) return res.status(400).json(e.errors);
  //     handleDbError(e, res);
  //   }
  // });
  // if (update) {
  //   app.put(`${basePath}/:id`, requireAuth, async (req, res) => {
  //     try {
  //       const id = parseInt(req.params.id);
  //       if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
  //       const input = schema.partial().parse(req.body);
  //       const item = await update(id, input);
  //       res.json(item);
  //     } catch (e: any) {
  //       if (e instanceof z.ZodError) return res.status(400).json(e.errors);
  //       handleDbError(e, res);
  //     }
  //   });
  // }
  // if (remove) {
  //   app.delete(`${basePath}/:id`, requireAuth, async (req, res) => {
  //     try {
  //       const id = parseInt(req.params.id);
  //       if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
  //       await remove(id);
  //       res.sendStatus(204);
  //     } catch (e: any) { handleDbError(e, res); }
  //   });
  // }
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
  app.get("/api/dashboard/attendance/machine-logs", async (req, res) => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const logs = await storage.getMachineAccessLogs(date);
      res.json(logs);
    } catch (e: any) {
      console.error("Machine Logs Error:", e.message);
      res.status(500).json({ message: "Failed to fetch machine logs" });
    }
  });
  // 2. Visitor Machine Logs Route (ONLY Visitors)
  app.get("/api/dashboard/visitor/visitor-machine-logs", async (req, res) => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const logs = await storage.getVisitorMachineAccessLogs(date);
      res.json(logs);
    } catch (e: any) {
      console.error("Visitor Machine Logs Error:", e.message);
      res.status(500).json({ message: "Failed to fetch visitor machine logs" });
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
  app.get("/api/user-profiles", requireAuth, async (req, res) => {
    try {
      const page = req.query.page as string | undefined;
      const pageSize = req.query.pageSize as string | undefined;
      res.json(await storage.getUserProfiles(page, pageSize));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  // app.get("/api/user-profiles", requireAuth, async (_req, res) => {
  //   try { res.json(await storage.getUserProfiles()); }
  //   catch (e: any) { res.status(500).json({ message: e.message }); }
  // });
  app.get("/api/user-profiles/me", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const profile = await storage.getUserProfileByUserId(userId);
      res.json(profile || null);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  // app.delete("/api/user-profiles/:id", requireAuth, async (req, res) => {
  //   try {
  //     const id = parseInt(req.params.id);
  //     await storage.deleteUser(id); // Ye storage function upar wala call hoga
  //     res.sendStatus(204);
  //   } catch (e: any) {
  //     res.status(500).json({ message: e.message || "Failed to delete user" });
  //   }
  // });
  // app.post("/api/user-profiles", requireAuth, async (req, res) => {
  //   try {
  //     const input = insertUserProfileSchema.parse(req.body);
  //     const profile = await storage.createUserProfile(input);
  //     res.status(201).json(profile);
  //   } catch (e: any) {
  //     if (e instanceof z.ZodError) return res.status(400).json(e.errors);
  //     res.status(500).json({ message: e.message });
  //   }
  // });
  // app.post("/api/user-profiles", requireAuth, withAudit(TABLES.USERS, "ADD", async (req) => await storage.upsertUser(req.body), 201));
  // app.delete("/api/user-profiles/:id", requireAuth, withAudit(TABLES.USERS, "DELETE", async (req) => {
  //   const targetUserId = req.params.id;
  //   await storage.deleteUser(targetUserId);
  //   return { id: targetUserId };
  // }, 200));
  // 
  // app.put("/api/user-profiles/:id", requireAuth, async (req, res) => {
  //   try {
  //     const input = insertUserProfileSchema.partial().parse(req.body);
  //     const profile = await storage.updateUserProfile(parseInt(req.params.id), input);
  //     res.json(profile);
  //   } catch (e: any) {
  //     if (e instanceof z.ZodError) return res.status(400).json(e.errors);
  //     res.status(500).json({ message: e.message });
  //   }
  // });
  // app.post("/api/user-profiles", requireAuth, async (req, res) => {
  //   try {
  //     const result = await storage.upsertUser(req.body);
  //     res.status(201).json(result);
  //   } catch (e: any) {
  //     res.status(500).json({ message: e.message || "Failed to save" });
  //   }
  // });
  // app.put("/api/user-profiles/:id", requireAuth, withAudit(TABLES.USERS, "UPDATE", async (req) => await storage.upsertUser({ ...req.body, id: req.params.id }), 200));
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
  // app.put("/api/user-profiles/:id", requireAuth, withAudit(TABLES.USERS, "UPDATE", async (req) => {
  //   const userIdFromParams = req.params.id;
  //   return await storage.upsertUser({
  //     ...req.body,
  //     id: userIdFromParams // Ensure kar rahe hain ki id sahi se string ya type format me backend tak jaye
  //   });
  // }, 200));
  // app.put("/api/user-profiles/:id", requireAuth, async (req, res) => {
  //   try {
  //     const result = await storage.upsertUser({
  //       ...req.body,
  //       id: req.params.id
  //     });
  //     res.json(result);
  //   } catch (e: any) {
  //     res.status(500).json({ message: e.message || "Failed to update" });
  //   }
  // });
  // crudRoutes(
  //   app,
  //   "/api/companies",
  //   insertCompanySchema,
  //   (query: any) => storage.getCompanies(query.page, query.pageSize),
  //   (d) => storage.createCompany(d),
  //   (id, d) => storage.updateCompany(id, d),
  //   (id) => storage.deleteCompany(id),
  //   undefined,
  //   TABLES.COMPANIES
  // );
  crudRoutes(
    app,
    "/api/companies",
    insertCompanySchema,
    (query: any) =>
      storage.getCompanies(
        query.page,
        query.pageSize,
        query.search   // 🔥 ADD THIS
      ),
    (d) => storage.createCompany(d),
    (id, d) => storage.updateCompany(id, d),
    (id) => storage.deleteCompany(id),
    undefined,
    TABLES.COMPANIES
  );
  // crudRoutes(
  //   app,
  //   "/api/departments",
  //   insertDepartmentSchema,
  //   (query: any) => storage.getDepartments(query.page, query.pageSize),
  //   (d) => storage.createDepartment(d),
  //   (id, d) => storage.updateDepartment(id, d),
  //   (id) => storage.deleteDepartment(id),
  //   undefined,
  //   TABLES.DEPARTMENTS
  // );
  crudRoutes(
    app,
    "/api/departments",
    insertDepartmentSchema,
    // 👇 Yahan query.search add karna zaroori hai
    (query: any) => storage.getDepartments(query.page, query.pageSize, query.search),
    (d) => storage.createDepartment(d),
    (id, d) => storage.updateDepartment(id, d),
    (id) => storage.deleteDepartment(id),
    undefined,
    TABLES.DEPARTMENTS
  );
  // crudRoutes(
  //   app,
  //   "/api/designations",
  //   insertDesignationSchema,
  //   (query: any) => storage.getDesignations(query.page, query.pageSize),
  //   (d) => storage.createDesignation(d),
  //   (id, d) => storage.updateDesignation(id, d),
  //   (id) => storage.deleteDesignation(id),
  //   undefined,
  //   TABLES.DESIGNATIONS
  // );
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
  app.get("/api/buildings", async (req, res) => {
    try {
      const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : undefined;
      res.json(await storage.getBuildings(siteId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/buildings", insertBuildingSchema,
    () => storage.getBuildings(), (d) => storage.createBuilding(d),
    (id, d) => storage.updateBuilding(id, d), (id) => storage.deleteBuilding(id), undefined, TABLES.BUILDINGS);
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
    (id, d) => storage.updateZone(id, d), (id) => storage.deleteZone(id), undefined, TABLES.ZONES);
  //   crudRoutes(
  //   app,
  //   "/api/doors",
  //   insertDoorSchema,
  //   (query: any) => storage.getDoors(query.page, query.pageSize),
  //   (d) => storage.createDoor(d),
  //   (id, d) => storage.updateDoor(id, d),
  //   (id) => storage.deleteDoor(id), undefined, TABLES.DOORS
  // );
  // crudRoutes(app, "/api/doors", insertDoorSchema,
  //     () => storage.getDoors(), (d) => storage.createDoor(d),
  //     (id, d) => storage.updateDoor(id, d), (id) => storage.deleteDoor(id));
  // crudRoutes(
  //   app,
  //   "/api/devices",
  //   insertDeviceSchema,
  //   (query: any) => storage.getDevices(query.page, query.pageSize),
  //   (d) => storage.createDevice(d),
  //   (id, d) => storage.updateDevice(id, d),
  //   (id) => storage.deleteDevice(id), undefined, TABLES.DEVICES
  // );
  crudRoutes(
    app,
    "/api/doors",
    insertDoorSchema,
    // GET (page + pageSize + search support)
    async (query: any) => {
      return await storage.getDoors(
        query.page,
        query.pageSize,
        query.search
      );
    },
    // CREATE
    async (data: any) => {
      return await storage.createDoor(data);
    },
    // UPDATE
    async (id, data) => {
      return await storage.updateDoor(id, data);
    },
    // DELETE
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
        query.search   // 🔥 IMPORTANT ADD
      ),
    (d) => storage.createDevice(d),
    (id, d) => storage.updateDevice(id, d),
    (id) => storage.deleteDevice(id),
    undefined,
    TABLES.DEVICES
  );
  // app.get("/api/people", async (req, res) => {
  //   try {
  //     const search = req.query.search as string | undefined;
  //     res.json(await storage.getPeople(search));
  //   } catch (e: any) { res.status(500).json({ message: e.message }); }
  // });
  app.get("/api/people", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const page = req.query.page as string | undefined;
      const pageSize = req.query.pageSize as string | undefined;
      res.json(await storage.getPeople(search, page, pageSize));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/people/:id", async (req, res) => {
    try {
      const person = await storage.getPerson(parseInt(req.params.id));
      if (!person) return res.status(404).json({ message: "Not found" });
      res.json(person);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.get("/api/peoplebycode/:code", async (req, res) => {
    try {
      const person = await storage.getPersonByCode(req.params.code);
      return person ? res.json(person) : res.status(404).json({ message: `Employee Code '${req.params.code}' does not exist.` });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  // app.post("/api/people", requireAuth, async (req, res) => {
  //   try {
  //     const input = insertPersonSchema.parse(req.body);
  //     res.status(201).json(await storage.createPerson(input));
  //   } catch (e: any) {
  //     if (e instanceof z.ZodError) return res.status(400).json(e.errors);
  //     res.status(500).json({ message: e.message });
  //   }
  // });
  app.post("/api/people", requireAuth, withAudit(TABLES.PEOPLE, "ADD/UPDATE", async (req) => await storage.createPerson(insertPersonSchema.parse(req.body)), 201));
  app.patch(
    "/api/people/:id",
    requireAuth,
    withAudit(TABLES.PEOPLE, "UPDATE", async (req) => {
      const personId = parseInt(req.params.id);
      if (isNaN(personId)) {
        throw new Error("Invalid Person ID");
      }

      // Direct pura payload storage layer ko bhej dete hain
      const updatedPerson = await storage.updatePerson(personId, req.body);

      // withAudit wrapper ke liye data return kiya
      return updatedPerson;
    }, 200)
  );
    app.delete("/api/people/:id", requireAuth, withAudit(TABLES.PEOPLE, "DELETE", async (req) => { await storage.deletePerson(parseInt(req.params.id)); return null; }, 204));
  // app.put("/api/people/:id", requireAuth, async (req, res) => {
  //   try {
  //     const input = insertPersonSchema.partial().parse(req.body);
  //     res.json(await storage.updatePerson(parseInt(req.params.id), input));
  //   } catch (e: any) {
  //     if (e instanceof z.ZodError) return res.status(400).json(e.errors);
  //     res.status(500).json({ message: e.message });
  //   }
  // });
  // app.delete("/api/people/:id", requireAuth, async (req, res) => {
  //   try { await storage.deletePerson(parseInt(req.params.id)); res.sendStatus(204); }
  //   catch (e: any) { res.status(500).json({ message: e.message }); }
  // });
  app.get("/api/credentials", async (req, res) => {
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
  // crudRoutes(app, "/api/shifts", insertShiftSchema,
  //   () => storage.getShifts(), (d) => storage.createShift(d),
  //   (id, d) => storage.updateShift(id, d), (id) => storage.deleteShift(id));
  // crudRoutes(app, "/api/shifts", insertShiftSchema,
  //   (query: any) => storage.getShifts(query.page, query.pageSize),
  //   (d) => storage.createShift(d),
  //   (id, d) => storage.updateShift(id, d),
  //   (id) => storage.deleteShift(id), undefined, TABLES.SHIFTS
  // );
  crudRoutes(
    app,
    "/api/shifts",
    insertShiftSchema,
    // GET (page + pageSize + search)
    async (query: any) => {
      return await storage.getShifts(
        query.page,
        query.pageSize,
        query.search
      );
    },
    // CREATE
    (d) => storage.createShift(d),
    // UPDATE
    (id, d) => storage.updateShift(id, d),
    // DELETE
    (id) => storage.deleteShift(id),
    undefined,
    TABLES.SHIFTS
  );
  app.get("/api/shift-assignments", async (req, res) => {
    try {
      const personId = req.query.personId ? parseInt(req.query.personId as string) : undefined;
      res.json(await storage.getShiftAssignments(personId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/shift-assignments", insertShiftAssignmentSchema,
    () => storage.getShiftAssignments(), (d) => storage.createShiftAssignment(d),
    (id, d) => storage.updateShiftAssignment(id, d), (id) => storage.deleteShiftAssignment(id), undefined, TABLES.SHIFT_ASSIGNMENTS);
  // crudRoutes(
  //   app,
  //   "/api/holidays",
  //   insertHolidaySchema,
  //   (query: any) => storage.getHolidays(query.page, query.pageSize),
  //   (d) => storage.createHoliday(d),
  //   (id, d) => storage.updateHoliday(id, d),
  //   (id) => storage.deleteHoliday(id), undefined, TABLES.HOLIDAYS
  // );
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
  app.post("/api/person-access", requireAuth, withAudit(TABLES.PERSON_ACCESS, "ADD", async (req) => await storage.createPersonAccess(insertPersonAccessSchema.parse(req.body)), 201));
  app.delete("/api/person-access/:id", requireAuth, withAudit(TABLES.PERSON_ACCESS, "DELETE", async (req) => { await storage.deletePersonAccess(parseInt(req.params.id)); return null; }, 204));
  // ==========================================
  // 1. ALL VISITORS DROPDOWN ROUTE
  // ==========================================
  app.get("/api/visitors", async (req, res) => {
    try {
      // Frontend se aane wali values ko directly nikalen bina kisi fallback defaults ke
      const page = req.query.page ? Number(req.query.page) : undefined;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      console.log("Fetching visitors with params:", { page, pageSize, search });
      // Direct dynamic values storage layer ko pass karein
      const result = await storage.getVisitors(page, pageSize, search);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || "Failed to fetch paginated visitors"
      });
    }
  });
  // ==========================================
  // 3. GET SINGLE VISITOR
  // ==========================================
  app.get("/api/visitors/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const visitor = await storage.getVisitor(id);
      if (!visitor) return res.status(404).json({ error: "Visitor not found" });
      return res.json(visitor);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // 4. CREATE VISITOR
  // ==========================================
  app.post("/api/visitors", async (req, res) => {
    try {
      const parsed = insertVisitorSchema.parse(req.body);
      const created = await storage.createVisitor(parsed);
      return res.status(201).json(created);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Invalid payload" });
    }
  });

  // ==========================================
  // 5. UPDATE VISITOR
  // ==========================================
  app.put("/api/visitors/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updated = await storage.updateVisitor(id, req.body);
      return res.json(updated);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // 6. DELETE VISITOR
  // ==========================================
  app.delete("/api/visitors/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteVisitor(id);
      return res.json({ success: true, message: "Visitor deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });
  app.post(
    "/api/visitors/:id/checkout",
      
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
  app.post("/api/attendance", requireAuth, withAudit(TABLES.ATTENDANCE, "ADD", async (req) => await storage.createAttendance(insertAttendanceSchema.parse(req.body)), 201));
  app.put("/api/attendance/:id", requireAuth, withAudit(TABLES.ATTENDANCE, "UPDATE", async (req) => await storage.updateAttendance(parseInt(req.params.id), insertAttendanceSchema.partial().parse(req.body)), 200));
  app.get("/api/access-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : undefined;
      res.json(await storage.getAccessLogs(limit, siteId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/access-logs", requireAuth, withAudit(TABLES.ACCESS_LOGS, "ADD/UPDATE", async (req) => await storage.createAccessLog(insertAccessLogSchema.parse(req.body)), 201));
  app.get("/api/alerts", async (req, res) => {
    try {
      const isResolved = req.query.resolved === "true" ? true : req.query.resolved === "false" ? false : undefined;
      res.json(await storage.getAlerts(isResolved));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  app.post("/api/alerts", requireAuth, withAudit(TABLES.ALERTS, "ADD", async (req) => await storage.createAlert(insertAlertSchema.parse(req.body)), 201));
  app.put("/api/alerts/:id/acknowledge", requireAuth, withAudit(TABLES.ALERTS, "UPDATE", async (req) => await storage.updateAlert(parseInt(req.params.id), { isRead: true }), 200));
  app.put("/api/alerts/:id/resolve", requireAuth, withAudit(TABLES.ALERTS, "UPDATE", async (req) => await storage.updateAlert(parseInt(req.params.id), { isResolved: true, resolvedBy: req.session?.userId, resolvedAt: new Date() }), 200));
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
  app.post("/api/system-settings", requireAuth, withAudit(TABLES.SYSTEM_SETTINGS, "ADD/UPDATE", async (req) => await storage.upsertSystemSetting(insertSystemSettingSchema.parse(req.body)), 200));
  app.get("/api/reports/attendance", async (req, res) => {
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
  // app.get("/api/reports/attendance", requireAuth, async (req, res) => {
  //   try {
  //     const filters = {
  //       dateFrom: req.query.dateFrom as string | undefined,
  //       dateTo: req.query.dateTo as string | undefined,
  //       status: req.query.status as string | undefined,
  //       deviceId: req.query.deviceId ? String(req.query.deviceId) : undefined,
  //       employeeCode: req.query.employeeCode ? String(req.query.employeeCode) : undefined,
  //     };
  //     const data = await storage.getAttendanceReport(filters);
  //     res.json(data);
  //   } catch (e: any) {
  //     console.error("Attendance Report Error:", e);
  //     res.status(500).json({ message: e.message });
  //   }
  // });
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
  // app.get("/api/reports/access-log", requireAuth, async (req, res) => {
  //   try {
  //     const filters = {
  //       dateFrom: req.query.dateFrom as string | undefined,
  //       dateTo: req.query.dateTo as string | undefined,
  //       eventType: req.query.eventType as string | undefined,
  //       personId: req.query.personId ? parseInt(req.query.personId as string) : undefined,
  //       siteId: req.query.siteId ? parseInt(req.query.siteId as string) : undefined,
  //       doorId: req.query.doorId ? parseInt(req.query.doorId as string) : undefined,
  //     };
  //     res.json(await storage.getAccessLogReport(filters));
  //   } catch (e: any) { res.status(500).json({ message: e.message }); }
  // });
  app.get("/api/reports/access-log", async (req, res) => {
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
  app.get("/api/people/device-status/:empCode", async (req, res) => {
    try {
      const statuses = await storage.getEmployeeDeviceStatuses(req.params.empCode);
      res.json(statuses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  // app.post("/api/people/emergency-toggle", withAudit(TABLES.PEOPLE, "UPDATE", async (req) => { const result = await storage.toggleEmployeeDeviceAccess(req.body); return { success: true, data: result }; }, 200));
  app.post(
    "/api/people/emergency-toggle",
    withAudit(TABLES.USER_BLOCK_UNBLOCK_LOGS, (req) => {
      // Agar body me action 'block' hai to log me "EMERGENCY_BLOCK" jayega, nahi to "EMERGENCY_UNBLOCK"
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
  // app.post("/api/emergency/bulk-unblock", isAuthenticated, async (req, res) => {
  //   try {
  //     const session = req.session as any;
  //     const loginId = session.userId;
  //     if (!loginId) {
  //       return res.status(401).json({ message: "User session not found. Please re-login." });
  //     }
  //     const user = await storage.getUser(loginId.toString());
  //     const userName = user?.username || "Admin User";
  //     const result = await storage.executeEmergencybulkUnblock(loginId, userName);
  //     res.json({
  //       success: true,
  //       message: `Emergency unblock initiated for ${result.processedCount} records.`,
  //       audit: {
  //         performedBy: userName,
  //         alertId: result.alertId
  //       }
  //     });
  //   } catch (error: any) {
  //     console.error("Route Error:", error);
  //     res.status(500).json({
  //       message: error.message || "Failed to execute emergency unblock"
  //     });
  //   }
  // });
  app.post("/api/emergency/bulk-unblock", isAuthenticated, withAudit(TABLES.USER_BLOCK_UNBLOCK_LOGS, "EMERGENCY_UNBLOCK_ALL", async (req) => {
    const loginId = req.session?.userId;
    if (!loginId) throw new Error("User session not found. Please re-login.");
    const user = await storage.getUser(loginId.toString());
    const result = await storage.executeEmergencybulkUnblock(loginId, user?.username || "Admin User");
    return { success: true, message: `Emergency unblock initiated for ${result.processedCount} records.`, audit: { performedBy: user?.username || "Admin User", alertId: result.alertId } };
  }, 200));
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
  // app.get("/api/reports/cabin-lockout", async (req, res) => {
  //   try {
  //     const { dateFrom, dateTo, employeeCode, doorId, status } = req.query;
  //     const data = await storage.getCabinLockoutReport({
  //       dateFrom: dateFrom as string,
  //       dateTo: dateTo as string,
  //       employeeCode: employeeCode as string,
  //       doorId: doorId as string,
  //       status: status as string
  //     });
  //     res.json(data);
  //   } catch (error) {
  //     res.status(500).json({ message: "Failed to fetch lockout report" });
  //   }
  // });
  app.get("/api/reports/cabin-lockout", async (req, res) => {
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
  // app.post("/api/employee-door-assignments", async (req, res) => {
  //   try {
  //     const { employeeCode, doorIds } = req.body;
  //     if (!employeeCode || !Array.isArray(doorIds)) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "Required data missing: employeeCode (string) and doorIds (array) are mandatory."
  //       });
  //     }
  //     const result = await storage.upsertEmployeeDoorAssignment({ employeeCode, doorIds });
  //     res.status(200).json({
  //       status: "success",
  //       message: "Access privileges updated successfully.",
  //       data: result
  //     });
  //   } catch (error: any) {
  //     res.status(400).json({
  //       status: "error",
  //       message: error.message || "An unexpected error occurred during assignment."
  //     });
  //   }
  // });
  app.post("/api/employee-door-assignments", withAudit(TABLES.EMPLOYEE_DOOR_ASSIGNMENTS, "ADD/UPDATE", async (req) => {
    const { employeeCode, doorIds } = req.body;
    if (!employeeCode || !Array.isArray(doorIds)) throw new Error("Required data missing: employeeCode (string) and doorIds (array) are mandatory.");
    return { status: "success", message: "Access privileges updated successfully.", data: await storage.upsertEmployeeDoorAssignment({ employeeCode, doorIds }) };
  }, 200));
 
  



  // app.post("/api/visitor-door-assignments", withAudit(TABLES.DEVICE_VISITOR_CARDS, "ADD", async (req) => {
  //   const { visitorId, visitorCardId, doorIds } = req.body;

  //   if (!visitorId || !visitorCardId || !Array.isArray(doorIds)) {
  //     throw new Error("Required data missing: visitorId (number), visitorCardId (number), and doorIds (array) are mandatory.");
  //   }

  //   return {
  //     status: "success",
  //     message: "Visitor door privileges updated successfully.",
  //     data: await storage.upsertVisitorDoorAssignment({ visitorId, visitorCardId, doorIds })
  //   };
  // }, 200));;




  // app.delete("/api/employee-door-assignments/:id", async (req, res) => {
  //   try {
  //     await storage.deleteEmployeeDoorAssignment(Number(req.params.id));
  //     res.json({ message: "Assignment deleted successfully" });
  //   } catch (error) {
  //     res.status(500).json({ message: "Failed to delete assignment" });
  //   }
  // });
  app.delete("/api/employee-door-assignments/:id", withAudit(TABLES.EMPLOYEE_DOOR_ASSIGNMENTS, "DELETE", async (req) => { await storage.deleteEmployeeDoorAssignment(Number(req.params.id)); return { message: "Assignment deleted successfully" }; }, 200));
  // 1. Daily Performance Report
  app.get("/api/reports/daily-performance", async (req: Request, res: Response) => {
    try {
      const q = req.query as any;
      const date = q.date || new Date().toISOString().split('T')[0];
      const data = await storage.getDailyReport(date);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.get("/api/reports/muster-roll", async (req: Request, res: Response) => {
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
  app.get("/api/reports/ot-matrix", async (req: Request, res: Response) => {
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
  // // 2. Monthly Muster Roll
  // app.get("/api/reports/muster-roll", async (req: Request, res: Response) => {
  //   try {
  //     const q = req.query as any;
  //     const data = await storage.getRangeReport(q.dateFrom, q.dateTo);
  //     res.json(data);
  //   } catch (e: any) {
  //     res.status(500).json({ message: e.message });
  //   }
  // });
  // // 3. Overtime Matrix
  // app.get("/api/reports/ot-matrix", async (req: Request, res: Response) => {
  //   try {
  //     const q = req.query as any;
  //     const data = await storage.getRangeReport(q.dateFrom, q.dateTo);
  //     res.json(data);
  //   } catch (e: any) {
  //     res.status(500).json({ message: e.message });
  //   }
  // });
  // 4. Dept-wise Summary
  app.get("/api/reports/dept-summary", async (req: Request, res: Response) => {
    try {
      const q = req.query as any;
      const date = q.date || new Date().toISOString().split('T')[0];
      const data = await storage.getDeptSummary(date);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  // 5. Daily Efficiency
  // app.get("/api/reports/daily-efficiency", async (req: Request, res: Response) => {
  //   try {
  //     const q = req.query as any;
  //     const date =
  //       q.date || new Date().toISOString().split("T")[0];
  //     const page = q.page
  //       ? String(q.page)
  //       : undefined;
  //     const pageSize = q.pageSize
  //       ? String(q.pageSize)
  //       : undefined;
  //     const data = await storage.getDailyReport(
  //       date,
  //       page,
  //       pageSize
  //     );
  //     res.json(data);
  //   } catch (e: any) {
  //     res.status(500).json({
  //       message: e.message
  //     });
  //   }
  // });
  app.get("/api/reports/daily-efficiency", async (req: Request, res: Response) => {
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
  // app.get("/api/reports/daily-efficiency", async (req: Request, res: Response) => {
  //   try {
  //     const q = req.query as any;
  //     const date = q.date || new Date().toISOString().split('T')[0];
  //     const data = await storage.getDailyReport(date);
  //     res.json(data);
  //   } catch (e: any) {
  //     res.status(500).json({ message: e.message });
  //   }
  // });
  // 6. Efficiency Analytics
  app.get("/api/reports/efficiency-analytics", async (req: Request, res: Response) => {
    try {
      const q = req.query as any;
      const data = await storage.getEfficiencyAnalytics(q.dateFrom, q.dateTo, q.employeeCode);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  // crudRoutes(app, "/api/menus", insertMenuMasterSchema,
  //   () => storage.getMenus(),
  //   (d) => storage.createMenu(d),
  //   (id, d) => storage.updateMenu(id, d),
  //   (id) => storage.deleteMenu(id)
  // );
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
  app.get("/api/roles", async (_req, res) => {
    const roles = await storage.getRoles();
    res.json(roles);
  });
  app.get("/api/menus/parents", async (_req, res) => {
    try {
      const parents = await storage.getParentMenus();
      res.json(parents);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  // app.post("/api/roles-with-permissions", async (req, res) => {
  //   try {
  //     const { role, permissions } = req.body;
  //     // 1. Mandatory Data Validation
  //     if (!role?.code || !Array.isArray(permissions)) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "Required data missing: code (string) and permissions (array) are mandatory."
  //       });
  //     }
  //     // 2. Duplicate Menu Check
  //     const menuIds = permissions.map((p: any) => p.menuId);
  //     if (new Set(menuIds).size !== menuIds.length) {
  //       return res.status(400).json({
  //         status: "error",
  //         isDuplicate: true,
  //         message: "Duplicate Menu assignments detected. Each menu must have a unique permission set."
  //       });
  //     }app.post
  //     // 3. Existing Role Check
  //     const existingRole = await storage.getRoleByCode(role.code);
  //     if (existingRole) {
  //       return res.status(400).json({
  //         status: "error",
  //         isDuplicate: true,
  //         message: "This Role Code is already registered. Please use a unique code."
  //       });
  //     }
  //     const result = await storage.createRoleWithPermissions(role, permissions);
  //     res.status(201).json(result);
  //   } catch (error: any) {
  //     // Bina handleDbError ke direct error message
  //     res.status(400).json({
  //       status: "error",
  //       message: error.message || "An unexpected error occurred during assignment."
  //     });
  //   }
  // });
  app.post("/api/roles-with-permissions", withAudit(TABLES.ROLES, "ADD/UPDATE", async (req) => {
    const { role, permissions } = req.body;
    if (!role?.code || !Array.isArray(permissions)) throw new Error("Required data missing: code (string) and permissions (array) are mandatory.");
    const menuIds = permissions.map((p: any) => p.menuId);
    if (new Set(menuIds).size !== menuIds.length) throw new Error("Duplicate Menu assignments detected. Each menu must have a unique permission set.");
    const existingRole = await storage.getRoleByCode(role.code);
    if (existingRole) throw new Error("This Role Code is already registered. Please use a unique code.");
    return await storage.createRoleWithPermissions(role, permissions);
  }, 201));
  // UPDATE ROLE + PERMISSIONS
  // app.put("/api/roles-with-permissions/:id", async (req, res) => {
  //   try {
  //     const roleId = parseInt(req.params.id);
  //     const { role, permissions } = req.body;
  //     await storage.updateRoleWithPermissions(roleId, role, permissions);
  //     res.json({ message: "Role and Permissions updated successfully" });
  //   } catch (e: any) {
  //     res.status(500).json({ message: e.message });
  //   }
  // });
  app.put("/api/roles-with-permissions/:id", withAudit(TABLES.ROLES, "UPDATE", async (req) => { await storage.updateRoleWithPermissions(parseInt(req.params.id), req.body.role, req.body.permissions); return { message: "Role and Permissions updated successfully" }; }, 200));
  // Get Role specific permissions
  app.get("/api/roles-with-permissions/:id", async (req, res) => {
    try {
      const roleId = Number(req.params.id);
      // Naya storage function call karein
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
  // Delete Role & its permissions
  // app.delete("/api/roles/:id", async (req, res) => {
  //   await storage.deleteRole(Number(req.params.id));
  //   res.sendStatus(204);
  // });
  app.delete("/api/roles/:id", withAudit(TABLES.ROLES, "DELETE", async (req) => { await storage.deleteRole(Number(req.params.id)); return null; }, 204));
  // app.get("/api/reports_access_logs", async (req, res) => {
  //   const { dateFrom, dateTo } = req.query;
  //   const data = await storage.getDeviceLogsWithEmployee({
  //     dateFrom: dateFrom as string,
  //     dateTo: dateTo as string,
  //   });
  //   res.json(data);
  // });
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
  // app.get("/api/reports/employee-productive-report", async (req, res) => {
  //   try {
  //     const { date, employeeCode } = req.query;
  //     const data = await storage.getEmployeeProductiveReport({
  //       date: date as string,
  //       employeeCode: employeeCode as string,
  //     });
  //     res.json({
  //       success: true,
  //       count: data.length,
  //       data,
  //     });
  //   } catch (error: any) {
  //     console.error("Employee Productive Report Error:", error);
  //     res.status(500).json({
  //       success: false,
  //       message: "Failed to fetch productive report",
  //       error: error.message,
  //     });
  //   }
  // });
  app.get("/api/reports/employee-productive-report", async (req, res) => {
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
  // app.get("/api/reports/employee-efficiency-dateRange", async (req, res) => {
  //   try {
  //     // Frontend query params: ?dateFrom=...&dateTo=...&employeeCode=...
  //     const { dateFrom, dateTo, employeeCode } = req.query;
  //     // ✅ Proper Validation: Check if dates are present
  //     if (!dateFrom || !dateTo) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Date range is required. Please select both Start Date and End Date to proceed."
  //       });
  //     }
  //     // Call storage with validated dates
  //     const data = await storage.getEmplyeeEefficiency(
  //       String(dateFrom),
  //       String(dateTo),
  //       employeeCode ? String(employeeCode) : undefined
  //     );
  //     // ✅ Professional Success Response
  //     res.json({
  //       success: true,
  //       count: data.length,
  //       data: data
  //     });
  //   } catch (error: any) {
  //     console.error("Efficiency Report Error:", error);
  //     // ✅ Professional Error Message
  //     res.status(500).json({
  //       success: false,
  //       message: "An internal server error occurred while generating the efficiency report. Please try again later."
  //     });
  //   }
  // });
  app.get("/api/reports/employee-efficiency-dateRange", async (req, res) => {
    try {
      const {
        dateFrom,
        dateTo,
        employeeCode,
        page,
        pageSize
      } = req.query;
      // Validation
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
  // app.get("/api/reports/department-efficiency", async (req, res) => {
  //   try {
  //     const { dateFrom, dateTo, deptId } = req.query;
  //     if (!dateFrom || !dateTo) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Missing required parameters: fromDate and toDate are mandatory."
  //       });
  //     }
  //     const data = await storage.getDepartmentEfficiencyReport(
  //       String(dateFrom),
  //       String(dateTo),
  //       deptId ? Number(deptId) : undefined
  //     );
  //     res.status(200).json({
  //       success: true,
  //       count: data.length,
  //       data: data
  //     });
  //   } catch (error: any) {
  //     console.error(`[Report API Error] - ${new Date().toISOString()}:`, error.stack);
  //     res.status(500).json({
  //       success: false,
  //       message: "An internal server error occurred while generating the department efficiency report."
  //     });
  //   }
  // });
  app.get("/api/reports/department-efficiency", async (req, res) => {
    try {
      const {
        dateFrom,
        dateTo,
        deptId,
        page,
        pageSize
      } = req.query;
      // Validation
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
  app.get("/api/reports/employee-movement-logs", async (req, res) => {
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
  app.get("/api/reports/department-wise-manpower", async (req, res) => {
    try {
      const {
        dateFrom,
        dateTo,
        employeeCode,
        page = "1",
        pageSize = "10",
      } = req.query;
      // Validation
      if (!dateFrom || !dateTo) {
        return res.status(400).json({
          success: false,
          message: "dateFrom and dateTo are required",
        });
      }
      // Storage Call
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
  // crudRoutes(
  //   app,
  //   "/api/contractors",
  //   insertContractorSchema,
  //   // GET
  //   async (query: any) => {
  //     return await storage.getContractors(
  //       query.page,
  //       query.pageSize,
  //       query.search
  //     );
  //   },
  //   // CREATE
  //   async (d) => {
  //     try {
  //       return await storage.createContractor(d);
  //     } catch (err: any) {
  //       throw { response: { data: { message: err.message } } };
  //     }
  //   },
  //   // UPDATE
  //   (id, d) => storage.updateContractor(id, d),
  //   // DELETE
  //   (id) => storage.deleteContractor(id).then(() => { }),    undefined,
  //   TABLES.CONTRACTORS
  // );
  app.post("/api/contractors", withAudit("contractors", "ADD", async (req: any) => {
    return await storage.createContractor(req.body);
  }, 201));

  app.patch("/api/contractors/:id", withAudit("contractors", "UPDATE", async (req: any) => {
    return await storage.updateContractor(Number(req.params.id), req.body);
  }));
  app.get("/api/contractors", async (req, res) => {
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

  // GET Single Contractor
  app.get("/api/contractors/:id", async (req, res) => {
    try {
      const data = await storage.getContractor(Number(req.params.id));
      if (!data) return res.status(404).json({ message: "Contractor not found" });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: "Error fetching contractor details" });
    }
  });
  // DELETE
  app.delete("/api/contractors/:id", withAudit("contractors", "DELETE", async (req: any) => {
    return await storage.deleteContractor(Number(req.params.id));
  }, 204));
  app.get("/api/audit-logs", requireAuth, async (req, res) => {
    try {
      const page = req.query.page ? Number(req.query.page) : undefined;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      // Naye specific filters query params se extract kiye
      const performedBy = req.query.performedBy ? String(req.query.performedBy) : undefined;
      const module = req.query.module ? String(req.query.module) : undefined;
      const action = req.query.action ? String(req.query.action) : undefined;
      const fromDate = req.query.fromDate ? String(req.query.fromDate) : undefined;
      const toDate = req.query.toDate ? String(req.query.toDate) : undefined;
      // Saare parameters ko getAuditLogs storage method me pass kiya
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
      // Naye login logs ke filters extract kiye
      const userId = req.query.userId ? String(req.query.userId) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const fromDate = req.query.fromDate ? String(req.query.fromDate) : undefined;
      const toDate = req.query.toDate ? String(req.query.toDate) : undefined;
      // Saare parameters ko getLoginLogs storage method me pass kiya
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
  // Modules/Tables list dropdown ke liye API
  app.get("/api/audit-logs/modules", requireAuth, async (req, res) => {
    try {
      const data = await storage.getAuditModulesDropdown();
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });
  app.get("/api/audit-logs/actions", async (req, res, next) => {
    try {
      const actions = await storage.getAuditActions();
      res.status(200).json(actions);
    } catch (error) {
      next(error);
    }
  });
  // --- Employee Bulk Update Route (Authenticated) ---
  app.post("/api/people/bulk-update", requireAuth, withAudit("people", "BULK_EMPOYEE_UPDATE", async (req: any) => {
    return await processEmployeeBulkUpdateOnly(req.body.data);
  }));

  // --- Door Assignment Bulk Update Route (Authenticated) ---
  app.post("/api/doors/bulk-assign", requireAuth, withAudit("employee_door_assignments", "BULK_DOOR_ASIGNMENT", async (req: any) => {
    return await processDoorUpdate(req.body.data);
  }));

  // app.post("/api/contractors/bulk-upload", requireAuth, withAudit("contractors", "BULK_CONTRACTOR_UPLOAD", async (req: any) => {
  //   return await processContractorBulkUploadOnly(req.body.data);
  // }));
  app.post("/api/contractors/bulk-upload", requireAuth, async (req: any, res: any) => {
    const result = await processContractorBulkUploadOnly(req.body.data);

    // Agar function ne success: false bheja hai, to yahan se error status 400 bhej do
    if (result.success === false) {
      return res.status(400).json(result);
    }

    // Agar success hai, to withAudit chalao (jaise pehle tha)
    const auditHandler = withAudit("contractors", "BULK_CONTRACTOR_UPLOAD", async (req: any) => {
      return result;
    });

    await auditHandler(req, res);
  });
  // app.post("/api/contractors/bulk-upload", requireAuth, async (req: any, res: any) => {
  //   // 1. Audit ke sath wrap kiya hua function execute karein
  //   // Hum withAudit ko yahan call kar rahe hain aur res ko control kar rahe hain
  //   const auditWrapper = withAudit("contractors", "BULK_CONTRACTOR_UPLOAD", async (req: any) => {
  //     return await processContractorBulkUploadOnly(req.body.data);
  //   });

  //   // 2. Custom response interceptor
  //   // Hum ek "mock" res object banayenge taaki hum status code catch kar sakein
  //   let capturedStatus = 200;
  //   const mockRes = {
  //     status: (code: number) => {
  //       capturedStatus = code;
  //       return {
  //         json: (data: any) => {
  //           // Agar status 400 hai, to hum error bhejenge
  //           if (capturedStatus === 400) {
  //             return res.status(400).json(data);
  //           }
  //           return res.json(data);
  //         }
  //       };
  //     },
  //     json: (data: any) => res.json(data),
  //     sendStatus: (code: number) => res.sendStatus(code)
  //   };

  //   // 3. Execution
  //   await auditWrapper(req, mockRes);
  // });

  app.get("/api/download/:type/:category/:folder/:filename", requireAuth, (req, res) => {
    const { type, category, folder, filename } = req.params;

    const filePath = path.join(process.cwd(), 'media', type, category, folder, filename);

    if (fs.existsSync(filePath)) {
      // Zaroori Headers: Browser ko force karne ke liye ki file download hi ho
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

    // storage se function call karein
    const newStatus = await storage.toggleUserStatus(id);

    // Return value audit trail mein store hogi
    return {
      success: true,
      newStatus: newStatus,
      message: `User ${id} is now ${newStatus ? 'Active' : 'Blocked'}`
    };
  }));

  // crudRoutes(
  //   app,
  //   "/api/visitor_cards",
  //   insertVisitorCardSchema, // Aapke schema file se imported validation rule
  //   (query: any) =>
  //     storage.getVisitorCards(
  //       query.page ? parseInt(query.page as string) : undefined,
  //       query.pageSize ? parseInt(query.pageSize as string) : undefined,
  //       query.search // 🔥 Yeh query parameters ko storage layer mein forward karega
  //     ),
  //   (d) => storage.createVisitorCard(d),
  //   (id, d) => storage.updateVisitorCard(id, d),
  //   (id) => storage.deleteVisitorCard(id),
  //   undefined,
  //   TABLES.VISITOR_CARDS // Aapke constant se card table mapper reference
  // );
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

  app.post("/api/visitor_cards/sync", async (req: any, res: any) => {
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
  app.get("/api/visitor_card_logs", async (req, res) => {
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
          // Yahan se hum real name utha rahe hain
          visitorName: visitors.nameOfVisitor,
        })
        .from(visitorCardLogs)
        // JOIN logic: logs ka card code = visitors ka rfidCardNo
        .leftJoin(visitors, eq(visitorCardLogs.visitorCardCode, visitors.rfidCardNo))
        .orderBy(desc(visitorCardLogs.syncDate))
        .limit(100);

      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs with name:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });
  // 2. Specific ID ka log fetch karna
  app.get("/api/visitor_card_logs/:id", async (req, res) => {
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

  // 3. (Optional) Latest Log fetch karna
  app.get("/api/visitor_card_logs/latest", async (req, res) => {
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
  app.get("/api/visitor_cards/dropdown", async (req: any, res: any) => {
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
