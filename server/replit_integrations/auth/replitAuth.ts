import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "zim-acms-local-secret-change-me",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await authStorage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const bcrypt = await import("bcryptjs");
      const valid = await bcrypt.compare(password, user.password || "");
      if (!valid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      (req.session as any).userId = user.id;
      (req.session as any).authenticated = true;

      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { username, password, email, firstName, lastName } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const existing = await authStorage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await authStorage.upsertUser({
        id: undefined as any,
        email: email || null,
        firstName: firstName || username,
        lastName: lastName || null,
        profileImageUrl: null,
        username,
        password: hashedPassword,
      });

      (req.session as any).userId = user.id;
      (req.session as any).authenticated = true;

      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if ((req.session as any)?.authenticated && (req.session as any)?.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};
