// F:\python\seft project\Zim-Acms\server\replit_integrations\auth\auth.ts

import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import { validateNoHtml } from "@/lib/validation";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl / 1000, // connect-pg-simple seconds mein TTL leta hai
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "zim-acms-local-secret-change-me",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Production mein true hona chahiye
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // LOGIN ROUTE
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Hamara updated storage ab user + profile + permissions fetch karega
      const user = await authStorage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const bcrypt = await import("bcryptjs");
      const valid = await bcrypt.compare(password, user.password || "");
      if (!valid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Security fix: login ke baad session regenerate karna
      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ message: "Login failed" });

        (req.session as any).userId = user.id;
        (req.session as any).authenticated = true;

        const { password: _, ...safeUser } = user;
        res.json(safeUser);
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // REGISTER ROUTE
  // app.post("/api/register", async (req, res) => {
  //   try {
  //     const { username, password, email, firstName, lastName } = req.body;
  //     if (!username || !password) {
  //       return res.status(400).json({ message: "Username and password are required" });
  //     }

  //     const existing = await authStorage.getUserByUsername(username);
  //     if (existing) {
  //       return res.status(409).json({ message: "Username already exists" });
  //     }

  //     const bcrypt = await import("bcryptjs");
  //     const hashedPassword = await bcrypt.hash(password, 10);

  //     // UPDATE: Registration ke waqt default Role ID aur Employee Code (Optional) dena zaroori hai
  //     const user = await authStorage.upsertUser({
  //       username,
  //       password: hashedPassword,
  //       email: email || null,
  //       firstName: firstName || username,
  //       lastName: lastName || null,
  //       roleId: 0, // Maan lijiye 2 = 'Employee' ya 'Staff' role hai
  //       isActive: true,
  //       employeeCode: null, // Self-register ke waqt baad mein link ho sakta hai
  //     });

  //     req.session.regenerate((err) => {
  //       if (err) return res.status(500).json({ message: "Registration failed" });

  //       (req.session as any).userId = user.id;
  //       (req.session as any).authenticated = true;

  //       const { password: _, ...safeUser } = user;
  //       res.status(201).json(safeUser);
  //     });
  //   } catch (error) {
  //     console.error("Register error:", error);
  //     res.status(500).json({ message: "Registration failed" });
  //   }
  // });
  app.post("/api/register", async (req, res) => {
    try {
      const { username, password, email, firstName, lastName } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const validationErrors = validateNoHtml(req.body);
      if (Object.keys(validationErrors).length > 0) {
        // Agar password check fail hua ya kisi ne HTML tag bheja, toh yahan se single/multiple errors return honge
        const firstErrorMessage = Object.values(validationErrors)[0] as string;
        return res.status(400).json({ message: firstErrorMessage, errors: validationErrors });
      }
      const existing = await authStorage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Ab hum plain password bhej rahe hain
      // UpsertUser internally check karega: agar password hashed nahi hai to hash kar dega
      const user = await authStorage.upsertUser({
        username,
        password: password, // Plain text password
        email: email || null,
        employeeName: `${firstName || ""} ${lastName || ""}`.trim() || username,
        roleId: 2, // Default Role ID (e.g., Employee)
        isActive: true,
        employeeCode: null,
      });

      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ message: "Registration failed" });

        (req.session as any).userId = user.id;
        (req.session as any).authenticated = true;

        const { password: _, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });
  // LOGOUT
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid"); // Cookie bhi clear karein
      res.json({ message: "Logged out" });
    });
  });

  // ME ROUTE (Session check ke liye)
  app.get("/api/user", async (req, res) => {
    if (!(req.session as any).userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await authStorage.getUser((req.session as any).userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if ((req.session as any)?.authenticated && (req.session as any)?.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};