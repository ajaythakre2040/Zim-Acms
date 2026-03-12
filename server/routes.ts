import type { Express } from "express";
import type { Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { storage } from "./storage";
import { z } from "zod";

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

} from "@shared/schema";

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
// function crudRoutes<T>(
//   app: Express,
//   basePath: string,
//   // schema: z.ZodTypeAny,
//   schema: z.AnyZodObject,
//   getAll: (...args: any[]) => Promise<any[]>,
//   create: (data: any) => Promise<any>,
//   update?: (id: number, data: any) => Promise<any>,
//   remove?: (id: number) => Promise<void>,
//   getOne?: (id: number) => Promise<any>
// ) {
//   const handleDbError = (e: any, res: any) => {
//     // Terminal mein check karein asli error kya aa raha hai
//     console.error("FULL DB ERROR:", e);

//     const errorMessage = e.message || "";

//     // Is logic ko update kiya hai taaki raw query failures ko bhi pakad sake
//     const isDuplicate =
//       e.number === 2627 ||
//       e.number === 2601 ||
//       e.code === '23505' || // Postgres code
//       errorMessage.includes("UNIQUE KEY") ||
//       errorMessage.includes("duplicate") ||
//       errorMessage.includes("already exists") ||
//       errorMessage.includes("Failed query"); // Aapke inspect mein ye dikha tha

//     if (isDuplicate) {
//       // Check karein ki "code" duplicate hai ya "name"
//       let field = errorMessage.toLowerCase().includes("code") ? "Role Code" : "Role Name";

//       return res.status(400).json({
//         isDuplicate: true,
//         // Professional Message examples:
//         message: `${field} is already in use. Please provide a unique ${field.toLowerCase()}.`
//       });
//     }

//     // Agar logic yahan pahunchta hai, toh iska matlab isDuplicate match nahi hua
//     res.status(500).json({
//       message: "Server error occurred.",
//       devDetails: errorMessage // Debugging ke liye
//     });
//   };

//   app.get(basePath, async (req, res) => {
//     try {
//       const result = await getAll(req.query);
//       res.json(result);
//     } catch (e: any) { res.status(500).json({ message: e.message }); }
//   });

//   if (getOne) {
//     app.get(`${basePath}/:id`, async (req, res) => {
//       try {
//         const item = await getOne(parseInt(req.params.id));
//         if (!item) return res.status(404).json({ message: "Not found" });
//         res.json(item);
//       } catch (e: any) { res.status(500).json({ message: e.message }); }
//     });
//   }
//   app.post(basePath, requireAuth, async (req, res) => {
//     try {
//       const input = schema.parse(req.body);
//       const item = await create(input);
//       res.status(201).json(item);
//     } catch (e: any) {
//       if (e instanceof z.ZodError) return res.status(400).json(e.errors);
//       handleDbError(e, res); // <--- Ye line check karein
//     }
//   });
//   // app.post(basePath, requireAuth, async (req, res) => {
//   //   try {
//   //     const input = schema.parse(req.body);
//   //     const item = await create(input);
//   //     res.status(201).json(item);
//   //   } catch (e: any) {
//   //     if (e instanceof z.ZodError) return res.status(400).json(e.errors);
//   //     res.status(500).json({ message: e.message });
//   //   }
//   // });
//   // if (update) {
//   //   app.put(`${basePath}/:id`, requireAuth, async (req, res) => {
//   //     try {
//   //       const input = schema.partial().parse(req.body);
//   //       const item = await update(parseInt(req.params.id), input);
//   //       res.json(item);
//   //     } catch (e: any) {
//   //       if (e instanceof z.ZodError) return res.status(400).json(e.errors);
//   //       handleDbError(e, res); // Call our professional error handler
//   //     }
//   //   });
//   if (update) {
//     app.put(`${basePath}/:id`, requireAuth, async (req, res) => {
//       try {
//         const id = parseInt(req.params.id);
//         if (isNaN(id)) {
//           return res.status(400).json({ message: "Invalid ID" });
//         }
//         const input = schema.partial().parse(req.body);
//         const item = await update(id, input);
//         res.json(item);
//       } catch (e: any) {
//         if (e instanceof z.ZodError) {
//           return res.status(400).json(e.errors);
//         }
//         handleDbError(e, res);
//       }
//     });
  
//   }
//   // if (update) {
//   //   app.put(`${basePath}/:id`, requireAuth, async (req, res) => {
//   //     try {
//   //       const input = schema.partial().parse(req.body);
//   //       const item = await update(parseInt(req.params.id), input);
//   //       res.json(item);
//   //     } catch (e: any) {
//   //       if (e instanceof z.ZodError) return res.status(400).json(e.errors);
//   //       res.status(500).json({ message: e.message });
//   //     }
//   //   });
//   // }

// //   if (remove) {
// //     app.delete(`${basePath}/:id`, requireAuth, async (req, res) => {
// //       try {
// //         await remove(parseInt(req.params.id));
// //         res.sendStatus(204);
// //       } catch (e: any) { res.status(500).json({ message: e.message }); }
// //     });
// //   }
// // }
//   // crudRoutes ke andar delete handler aisa hona chahiye
//   if (remove) {
//     app.delete(`${basePath}/:id`, requireAuth, async (req, res) => {
//       try {
//         const id = Number(req.params.id);
//         if (isNaN(id)) {
//           return res.status(400).json({ message: "Invalid ID" });
//         }
//         await remove(id);
//         res.sendStatus(204);
//       } catch (e: any) {
//         handleDbError(e, res);
//       }
//     });
//   }
// }
export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // Dashboard
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // User Profiles
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

  // Master Data CRUD
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

  // Infrastructure
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

  // Devices
  crudRoutes(app, "/api/devices", insertDeviceSchema,
    () => storage.getDevices(), (d) => storage.createDevice(d),
    (id, d) => storage.updateDevice(id, d), (id) => storage.deleteDevice(id));

  // People
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

  // Credentials
  app.get("/api/credentials", async (req, res) => {
    try {
      const personId = req.query.personId ? parseInt(req.query.personId as string) : undefined;
      res.json(await storage.getCredentials(personId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/credentials", insertCredentialSchema,
    () => storage.getCredentials(), (d) => storage.createCredential(d),
    (id, d) => storage.updateCredential(id, d), (id) => storage.deleteCredential(id));

  // Access Cards
  crudRoutes(app, "/api/access-cards", insertAccessCardSchema,
    () => storage.getAccessCards(), (d) => storage.createAccessCard(d),
    (id, d) => storage.updateAccessCard(id, d), (id) => storage.deleteAccessCard(id));

  // Shifts
  crudRoutes(app, "/api/shifts", insertShiftSchema,
    () => storage.getShifts(), (d) => storage.createShift(d),
    (id, d) => storage.updateShift(id, d), (id) => storage.deleteShift(id));

  // Shift Assignments
  app.get("/api/shift-assignments", async (req, res) => {
    try {
      const personId = req.query.personId ? parseInt(req.query.personId as string) : undefined;
      res.json(await storage.getShiftAssignments(personId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  crudRoutes(app, "/api/shift-assignments", insertShiftAssignmentSchema,
    () => storage.getShiftAssignments(), (d) => storage.createShiftAssignment(d),
    (id, d) => storage.updateShiftAssignment(id, d), (id) => storage.deleteShiftAssignment(id));

  // Holidays
  crudRoutes(app, "/api/holidays", insertHolidaySchema,
    () => storage.getHolidays(),
    (d) => storage.createHoliday(d),
    (id, d) => storage.updateHoliday(id, d),
    (id) => storage.deleteHoliday(id));

  // Access Levels
  crudRoutes(app, "/api/access-levels", insertAccessLevelSchema,
    () => storage.getAccessLevels(), (d) => storage.createAccessLevel(d),
    (id, d) => storage.updateAccessLevel(id, d), (id) => storage.deleteAccessLevel(id));

  // Access Rules
  crudRoutes(app, "/api/access-rules", insertAccessRuleSchema,
    () => storage.getAccessRules(), (d) => storage.createAccessRule(d),
    (id, d) => storage.updateAccessRule(id, d), (id) => storage.deleteAccessRule(id));

  // Person Access
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

  // Visitors
  crudRoutes(app, "/api/visitors", insertVisitorSchema,
    () => storage.getVisitors(), (d) => storage.createVisitor(d),
    (id, d) => storage.updateVisitor(id, d), (id) => storage.deleteVisitor(id),
    (id) => storage.getVisitor(id));

  // Visits
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

  // Attendance
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

  // Access Logs
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

  // Alerts
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

  // Exceptions
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

  // System Settings
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

  // ==================== REPORTS ====================
  // app.get("/api/reports/attendance", requireAuth, async (req, res) => {
  //   try {
  //     const filters = {
  //       dateFrom: req.query.dateFrom as string | undefined,
  //       deviceId: req.query.deviceId as string,
  //       dateTo: req.query.dateTo as string | undefined,
  //       status: req.query.status as string | undefined,
  //       departmentId: req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined,
  //       personId: req.query.personId ? parseInt(req.query.personId as string) : undefined,
  //       siteId: req.query.siteId ? parseInt(req.query.siteId as string) : undefined,
  //     };
  //     res.json(await storage.getAttendanceReport(filters));
  //   } catch (e: any) { res.status(500).json({ message: e.message }); }
  // });
  // routes.ts mein
  // app.get("/api/reports/attendance", requireAuth, async (req, res) => {
  //   try {
  //     const filters = {
  //       dateFrom: req.query.dateFrom as string | undefined,
  //       dateTo: req.query.dateTo as string | undefined,
  //       // Query param ka naam wahi hona chahiye jo frontend bhej raha hai
  //       deviceId: req.query.deviceId as string | undefined,
  //       personId: req.query.personId as string | undefined,
  //     };

  //     // DEBUG: Route level par check karein
  //     console.log("Route received deviceId:", req.query.deviceId);

  //     const data = await storage.getAttendanceReport(filters);
  //     res.json(data);
  //   } catch (e: any) {
  //     res.status(500).json({ message: e.message });
  //   }
  // });
  // routes.ts (Attendance Report Section)
  app.get("/api/reports/attendance", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        status: req.query.status as string | undefined,
        // Agar backend Integer expect karta hai toh parseInt use karein:
        deviceId: req.query.deviceId ? String(req.query.deviceId) : undefined,
        personId: req.query.personId ? parseInt(req.query.personId as string) : undefined,
      };

      console.log("Route received filters:", filters); // Full filter check karein

      const data = await storage.getAttendanceReport(filters);
      res.json(data);
    } catch (e: any) {
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

  // External Connection Test
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

  // Save external connection config
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
  // Roles CRUD routes
  crudRoutes(
    app,
    "/api/roles",
    insertRoleSchema,
    () => storage.getRoles(),
    (data) => storage.createRole(data),
    (id, data) => storage.updateRole(id, data),
    (id) => storage.deleteRole(id)
  );
  // Employee Roles CRUD routes
  // crudRoutes(
  //   app,
  //   "/api/employee-roles",
  //   insertEmployeeRoleSchema,
  //   () => storage.getEmployeeRoles(),
  //   async (data) => {
  //     // Optional: Check for duplicates before creating
  //     const existing = await storage.getEmployeeRoles();
  //     const isDuplicate = existing.some(
  //       (r) => r.employeeCode === data.employeeCode && r.roleId === data.roleId
  //     );

  //     if (isDuplicate) {
  //       // Yeh error aapka handleDbError ya useCrud handle kar lega
  //       const error: any = new Error("This role is already assigned to this employee.");
  //       error.isDuplicate = true;
  //       error.status = 400;
  //       throw error;
  //     }

  //     return storage.createEmployeeRole(data);
  //   },
  //   (id, data) => storage.updateEmployeeRole(id, data),
  //   (id) => storage.deleteEmployeeRole(id)
  // );

  // Employee Roles CRUD routes
  // Employee Roles CRUD routes
  crudRoutes(
    app,
    "/api/employee-roles",
    insertEmployeeRoleSchema,
    () => storage.getEmployeeRoles(),
    async (data: any) => {
      // 1. Duplicate Check (Optional but Recommended)
      const existing = await storage.getEmployeeRoles();
      const isDuplicate = existing.some(
        (r) => r.employeeCode === data.employeeCode && Number(r.roleId) === Number(data.roleId)
      );

      if (isDuplicate) {
        const error: any = new Error("This role is already assigned to this employee.");
        error.status = 400;
        throw error;
      }

      // 2. Storage function call (Iske andar hi Postgres + MS SQL + eSSL Sync logic hai)
      return await storage.createEmployeeRole(data);
    },
    // Update: Jab UI se role change hoga, storage function automatically re-sync trigger karega
    async (id, data) => {
      return await storage.updateEmployeeRole(id, data);
    },
    // Delete: Storage function automatically saare devices se block command bhej dega
    async (id) => {
      return await storage.deleteEmployeeRole(id);
    }
  );
  return httpServer;

}

