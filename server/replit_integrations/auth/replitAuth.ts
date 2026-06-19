import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import { validateNoHtml } from "@/lib/validation";
import { db } from "../../db";
import { sessions, users } from "@shared/models/auth";
import { eq, sql } from "drizzle-orm";
import { loginAttempts, userProfiles } from "@shared/schema";
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl / 1000,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "zim-acms-local-secret-change-me",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/login", async (req, res) => {
    // 1. IP aur User-Agent pehle extract karein (Scope fix)
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const cleanIp = typeof ip === "string" ? ip : (Array.isArray(ip) ? ip[0] : "0.0.0.0");
    const agent = req.headers["user-agent"] || "unknown";

    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await authStorage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      if (user.isActive === false) {
        return res.status(403).json({
          message: "Account is locked due to multiple failed attempts. Please contact the Administrator."
        });
      }

      const bcrypt = await import("bcryptjs");
      const valid = await bcrypt.compare(password, user.password || "");

      if (!valid) {
        const newAttempts = (user.failedLoginAttempts || 0) + 1;
        const shouldLock = newAttempts >= 3;

        await db.transaction(async (tx) => {
          // Update Users table
          await tx.update(users)
            .set({
              failedLoginAttempts: newAttempts,
              isAccountActive: !shouldLock
            })
            .where(eq(users.id, user.id));

          // Update UserProfiles table
          await tx.update(userProfiles)
            .set({ isActive: !shouldLock })
            .where(eq(userProfiles.userId, user.id));

          // Insert FAILED log
          await tx.insert(loginAttempts).values({
            username: username,
            ipAddress: cleanIp,
            userAgent: agent,
            status: 'FAILED'
          });
        });

        if (shouldLock) {
          return res.status(403).json({ message: "Account locked after 3 failed attempts." });
        }
        return res.status(401).json({ message: `Invalid password. ${3 - newAttempts} attempts remaining.` });
      }

      // Success: Reset attempts
      await db.update(users)
        .set({ failedLoginAttempts: 0, isAccountActive: true })
        .where(eq(users.id, user.id));

      // Insert SUCCESS log
      await db.insert(loginAttempts).values({
        username: user.username as string, // Ensure username is string
        ipAddress: (cleanIp ?? "0.0.0.0") as string, // Fallback to string
        userAgent: (agent ?? "unknown") as string,   // Fallback to string
        status: 'SUCCESS'
      });

      req.session.regenerate(async (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });

        (req.session as any).userId = user.id;
        (req.session as any).authenticated = true;

        req.session.save(async (saveErr) => {
          if (saveErr) return res.status(500).json({ message: "Login failed" });

          try {
            await db.execute(sql`
              UPDATE sessions 
              SET user_id = ${user.id}::text, 
                  username = ${user.username}::text, 
                  ip_address = ${cleanIp}::text, 
                  user_agent = ${agent}::text, 
                  status = 'LOGIN', 
                  created_at = NOW() 
              WHERE sid = ${req.sessionID}
            `);
          } catch (dbErr) {
            console.error("Session update failed:", dbErr);
          }

          const { password: _, ...safeUser } = user;
          return res.json(safeUser);
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  // app.post("/api/login", async (req, res) => {
  //   try {
  //     const { username, password } = req.body;
  //     if (!username || !password) {
  //       return res.status(400).json({ message: "Username and password are required" });
  //     }
  //     const user = await authStorage.getUserByUsername(username);
  //     if (!user) {
  //       return res.status(401).json({ message: "Invalid username or password" });
  //     }
  //     const bcrypt = await import("bcryptjs");
  //     const valid = await bcrypt.compare(password, user.password || "");
  //     if (!valid) {
  //       return res.status(401).json({ message: "Invalid username or password" });
  //     }
  //     req.session.regenerate(async (err) => {
  //       if (err) return res.status(500).json({ message: "Login failed" });
  //       (req.session as any).userId = user.id;
  //       (req.session as any).authenticated = true;
  //       req.session.save(async (saveErr) => {
  //         if (saveErr) {
  //           console.error("Session save error:", saveErr);
  //           return res.status(500).json({ message: "Login failed" });
  //         }
  //         try {
  //           const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  //           const agent = req.headers["user-agent"];
  //           const cleanIp = typeof ip === "string" ? ip : ip?.[0] || null;
  //           await db.execute(sql`
  //             UPDATE sessions 
  //             SET user_id = ${user.id}::text, 
  //                 username = ${user.username}::text, 
  //                 ip_address = ${cleanIp}::text, 
  //                 user_agent = ${agent}::text, 
  //                 status = 'LOGIN', 
  //                 created_at = NOW() 
  //             WHERE sid = ${req.sessionID}
  //           `);
  //         } catch (dbErr) {
  //           console.error("Session columns tracking update failed:", dbErr);
  //         }
  //         const { password: _, ...safeUser } = user;
  //         return res.json(safeUser);
  //       });
  //     });
  //   } catch (error) {
  //     console.error("Login error:", error);
  //     res.status(500).json({ message: "Login failed" });
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
        const firstErrorMessage = Object.values(validationErrors)[0] as string;
        return res.status(400).json({ message: firstErrorMessage, errors: validationErrors });
      }
      const existing = await authStorage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Username already exists" });
      }
      const user = await authStorage.upsertUser({
        username,
        password: password,
        email: email || null,
        employeeName: `${firstName || ""} ${lastName || ""}`.trim() || username,
        roleId: 2,
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
  app.post("/api/logout", async (req, res) => {
    const currentSessionId = req.sessionID;
    if (currentSessionId) {
      try {
        await db
          .update(sessions)
          .set({
            status: "LOGOUT",
            logoutAt: sql`NOW()`
          })
          .where(eq(sessions.sid, currentSessionId));
        if (req.session) {
          await new Promise((resolve) => req.session.save(resolve));
        }
      } catch (e) {
        console.error("Error setting session state to LOGOUT:", e);
      }
    }
    res.clearCookie("connect.sid", { path: "/" });
    return res.json({ message: "Logged out successfully" });
  });
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