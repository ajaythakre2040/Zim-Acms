import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.get("/api/user/permissions", isAuthenticated, async (req: any, res) => {
    const userId = (req.session as any).userId;
    const user = await authStorage.getUser(userId);
    res.json(user?.menuPermissions || []);
  });
}