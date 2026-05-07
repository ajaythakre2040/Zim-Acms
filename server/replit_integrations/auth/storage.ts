import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import { userProfiles, roles, rolePermissions, menuMaster } from "@shared/schema";
import bcrypt from "bcryptjs";
// TypeScript Interface for Menu Permissions with Details
export interface MenuPermissionWithDetails {
  permissionId: number;
  menuId: number | null;
  view: boolean | null;
  add: boolean | null;
  edit: boolean | null;
  delete: boolean | null;
  export: boolean | null;
  print: boolean | null;
  title: string | null; // Yahan '| null' add karein
  code: string | null;  // Safe side ke liye code ko bhi null allow karein
  icon: string | null;
  parentId: number | null;
  sortOrder: number | null;
  isActiveMenu: boolean | null;
}

export interface IAuthStorage {
  getUser(id: string): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  upsertUser(user: any): Promise<any>;
}

class AuthStorage implements IAuthStorage {
  // 1. Get User with Profile and Granular Permissions
  async getUser(id: string): Promise<any | undefined> {
    const results = await db
      .select({
        user: users,
        profile: userProfiles,
        role: roles,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(roles, eq(userProfiles.roleId, roles.id))
      .where(eq(users.id, id));

    const result = results[0];
    if (!result) return undefined;

    // Fetching role-based granular permissions with Menu details
    let permissions: MenuPermissionWithDetails[] = [];

    if (result.profile?.roleId) {
      permissions = await this.getMenuPermissionsByRoleId(result.profile.roleId);
    }

    const { password, ...safeUser } = result.user;

    return {
      ...safeUser,
      ...result.profile,
      roleName: result.role?.roleName,
      roleCode: result.role?.code,
      menuPermissions: permissions,
    };
  }

  // 2. Login functionality with Joins and Permissions
  async getUserByUsername(username: string) {
    const [result] = await db
      .select({
        user: users,
        profile: userProfiles,
        role: roles,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(roles, eq(userProfiles.roleId, roles.id))
      .where(eq(users.username, username));

    if (!result || !result.user) return undefined;

    let permissionsWithDetails: MenuPermissionWithDetails[] = [];

    if (result.profile?.roleId) {
      permissionsWithDetails = await this.getMenuPermissionsByRoleId(result.profile.roleId);
    }

    return {
      ...result.user,
      employeeCode: result.profile?.employeeCode || null,
      roleId: result.profile?.roleId || null,
      roleName: result.role?.roleName || "User",
      roleCode: result.role?.code || "USER",
      isActive: result.profile?.isActive ?? true,
      menuPermissions: permissionsWithDetails,
    };
  }

  // Helper method to avoid code repetition for fetching permissions
  private async getMenuPermissionsByRoleId(roleId: number): Promise<MenuPermissionWithDetails[]> {
    return await db
      .select({
        permissionId: rolePermissions.id,
        menuId: rolePermissions.menuId,
        view: rolePermissions.view,
        add: rolePermissions.add,
        edit: rolePermissions.edit,
        delete: rolePermissions.delete,
        export: rolePermissions.export,
        print: rolePermissions.print,
        title: menuMaster.title,
        code: menuMaster.code,
        icon: menuMaster.icon,
        parentId: menuMaster.parentId,
        sortOrder: menuMaster.sortOrder,
        isActiveMenu: menuMaster.isActive,
      })
      .from(rolePermissions)
      .leftJoin(menuMaster, eq(rolePermissions.menuId, menuMaster.id))
      .where(
        and(
          eq(rolePermissions.roleId, roleId),
          eq(menuMaster.isActive, true)
        )
      )
      .orderBy(menuMaster.sortOrder);
  }

  async upsertUser(userData: any): Promise<any> {
    let passwordToStore = userData.password;

    if (passwordToStore) {
      const isHashed = passwordToStore.startsWith('$2a$') || passwordToStore.startsWith('$2b$');
      if (!isHashed) {
        passwordToStore = await bcrypt.hash(passwordToStore, 10);
      }
    }

    return await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          id: userData.id || undefined,
          username: userData.username,
          password: passwordToStore,
          email: userData.email,
          fullName: userData.employeeName || userData.fullName,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            username: userData.username,
            ...(passwordToStore ? { password: passwordToStore } : {}),
            email: userData.email,
            fullName: userData.employeeName || userData.fullName,
            updatedAt: new Date(),
          },
        })
        .returning();

      await tx
        .insert(userProfiles)
        .values({
          userId: user.id,
          roleId: userData.roleId,
          employeeCode: userData.employeeCode,
          isActive: userData.isActive ?? true,
        })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: {
            roleId: userData.roleId,
            employeeCode: userData.employeeCode,
            isActive: userData.isActive,
            updatedAt: new Date(),
          },
        });

      return user;
    });
  }
}

export const authStorage = new AuthStorage();