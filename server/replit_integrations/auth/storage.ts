import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq, and, ne } from "drizzle-orm";
import { userProfiles, roles, rolePermissions, menuMaster, people } from "@shared/schema";
import bcrypt from "bcryptjs";
import { validatePasswordStrength } from "../../utils/validators";
import bcryptjs from "bcryptjs";
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

//  async upsertUser(userData: any): Promise<any> {
//     if (!userData.username || userData.username.trim() === "") {
//       throw new Error("Username is required.");
//     }
//     if (!userData.roleId) {
//       throw new Error("Role selection is required.");
//     }
//     if (!userData.employeeCode || userData.employeeCode.toString().trim() === "") {
//       throw new Error("Employee Code is required.");
//     }

//     let finalUserId = userData.id ? userData.id.toString().trim() : undefined;

//     if (finalUserId && !isNaN(Number(finalUserId))) {
//       const [profileRow] = await db
//         .select()
//         .from(userProfiles)
//         .where(eq(userProfiles.id, parseInt(finalUserId, 10)))
//         .limit(1);
      
//       if (profileRow && profileRow.userId) {
//         finalUserId = profileRow.userId;
//       }
//     }

//     const currentUsername = userData.username.trim();
//     const finalEmployeeCode = userData.employeeCode.toString().trim();
//     const finalRoleId = parseInt(userData.roleId.toString(), 10);
//     const currentEmail = userData.email ? userData.email.trim() : null;

//     const employeeInMaster = await db
//       .select()
//       .from(people)
//       .where(eq(people.employeeCode, finalEmployeeCode)) 
//       .limit(1);

//     if (employeeInMaster.length === 0) {
//       throw new Error(`Employee Code '${finalEmployeeCode}' does not exist in the People master records.`);
//     }

//     if (finalUserId) {
//       const existingUser = await db
//         .select()
//         .from(users)
//         .where(and(eq(users.username, currentUsername), ne(users.id, finalUserId)))
//         .limit(1);
//       if (existingUser.length > 0) {
//         throw new Error(`Username '${currentUsername}' is already taken by another user.`);
//       }

//       if (currentEmail) {
//         const existingEmail = await db
//           .select()
//           .from(users)
//           .where(and(eq(users.email, currentEmail), ne(users.id, finalUserId)))
//           .limit(1);
//         if (existingEmail.length > 0) {
//           throw new Error(`Email '${currentEmail}' is already registered with another user.`);
//         }
//       }
//     } else {
//       const existingUser = await db.select().from(users).where(eq(users.username, currentUsername)).limit(1);
//       if (existingUser.length > 0) {
//         throw new Error(`Username '${currentUsername}' already exists.`);
//       }

//       const existingProfile = await db.select().from(userProfiles).where(eq(userProfiles.employeeCode, finalEmployeeCode)).limit(1);
//       if (existingProfile.length > 0) {
//         throw new Error(`An account has already been created for Employee Code '${finalEmployeeCode}'.`);
//       }

//       if (currentEmail) {
//         const existingEmail = await db.select().from(users).where(eq(users.email, currentEmail)).limit(1);
//         if (existingEmail.length > 0) {
//           throw new Error(`Email '${currentEmail}' is already registered.`);
//         }
//       }
//     }

//     let passwordToStore = userData.password;
//     if (passwordToStore) {
//       const isHashed = passwordToStore.startsWith('$2a$') || passwordToStore.startsWith('$2b$');
//       if (!isHashed) {
//         if (!validatePasswordStrength(passwordToStore)) {
//           throw new Error("Password must be at least 8 characters long and include numbers and special characters.");
//         }
//         passwordToStore = await bcrypt.hash(passwordToStore, 10);
//       }
//     }

//     return await db.transaction(async (tx) => {
//       let user: any;
//       let targetUserId: string;

//       if (finalUserId) {
//         const updateData: any = {
//           username: currentUsername,
//           email: currentEmail,
//           fullName: userData.employeeName || userData.fullName,
//           updatedAt: new Date(),
//         };

//         if (passwordToStore && passwordToStore.trim() !== "") {
//           updateData.password = passwordToStore;
//         }

//         const [userCheck] = await tx.select().from(users).where(eq(users.id, finalUserId)).limit(1);
//         if (!userCheck) {
//           throw new Error("User record not found in database.");
//         }

//         const [updatedUser] = await tx
//           .update(users)
//           .set(updateData)
//           .where(eq(users.id, finalUserId))
//           .returning();
          
//         if (!updatedUser) {
//           throw new Error("Failed to update users record.");
//         }

//         user = updatedUser;
//         targetUserId = finalUserId;

//         const [profileCheck] = await tx.select().from(userProfiles).where(eq(userProfiles.userId, targetUserId)).limit(1);
        
//         if (profileCheck) {
//           await tx
//             .update(userProfiles)
//             .set({
//               roleId: finalRoleId,
//               employeeCode: finalEmployeeCode,
//               isActive: userData.isActive ?? true,
//               updatedAt: new Date(),
//             })
//             .where(eq(userProfiles.userId, targetUserId));
//         } else {
//           await tx
//             .insert(userProfiles)
//             .values({
//               userId: targetUserId,
//               roleId: finalRoleId,
//               employeeCode: finalEmployeeCode,
//               isActive: userData.isActive ?? true,
//             });
//         }

//       } else {
//         if (!passwordToStore) {
//           throw new Error("Password is required for a new user registration.");
//         }

//         const [newUser] = await tx
//           .insert(users)
//           .values({
//             username: currentUsername,
//             password: passwordToStore,
//             email: currentEmail,
//             fullName: userData.employeeName || userData.fullName,
//           })
//           .returning();
          
//         if (!newUser) {
//           throw new Error("Failed to create user record.");
//         }
        
//         user = newUser;
//         targetUserId = user.id;

//         await tx
//           .insert(userProfiles)
//           .values({
//             userId: targetUserId,
//             roleId: finalRoleId,
//             employeeCode: finalEmployeeCode,
//             isActive: userData.isActive ?? true,
//           });
//       }

//       return user;
//     });
//   }

  async upsertUser(userData: any): Promise<any> {
    if (!userData.username || userData.username.trim() === "") {
      throw new Error("Username is required.");
    }
    if (!userData.roleId) {
      throw new Error("Role selection is required.");
    }
    if (!userData.employeeCode || userData.employeeCode.toString().trim() === "") {
      throw new Error("Employee Code is required.");
    }

    const finalUserId = userData.id ? userData.id.toString().trim() : undefined;
    const currentUsername = userData.username.trim();
    const finalEmployeeCode = userData.employeeCode.toString().trim();
    const finalRoleId = parseInt(userData.roleId.toString(), 10);
    const currentEmail = userData.email ? userData.email.trim() : null;

    const employeeInMaster = await db
      .select()
      .from(people)
      .where(eq(people.employeeCode, finalEmployeeCode))
      .limit(1);

    if (employeeInMaster.length === 0) {
      throw new Error(`Employee Code '${finalEmployeeCode}' does not exist in the People master records.`);
    }

    if (finalUserId) {
      const existingUser = await db
        .select()
        .from(users)
        .where(and(eq(users.username, currentUsername), ne(users.id, finalUserId)))
        .limit(1);
      if (existingUser.length > 0) {
        throw new Error(`Username '${currentUsername}' is already taken by another user.`);
      }

      if (currentEmail) {
        const existingEmail = await db
          .select()
          .from(users)
          .where(and(eq(users.email, currentEmail), ne(users.id, finalUserId)))
          .limit(1);
        if (existingEmail.length > 0) {
          throw new Error(`Email '${currentEmail}' is already registered with another user.`);
        }
      }
    } else {
      const existingUser = await db.select().from(users).where(eq(users.username, currentUsername)).limit(1);
      if (existingUser.length > 0) {
        throw new Error(`Username '${currentUsername}' already exists.`);
      }

      const existingProfile = await db.select().from(userProfiles).where(eq(userProfiles.employeeCode, finalEmployeeCode)).limit(1);
      if (existingProfile.length > 0) {
        throw new Error(`An account has already been created for Employee Code '${finalEmployeeCode}'.`);
      }

      if (currentEmail) {
        const existingEmail = await db.select().from(users).where(eq(users.email, currentEmail)).limit(1);
        if (existingEmail.length > 0) {
          throw new Error(`Email '${currentEmail}' is already registered.`);
        }
      }
    }

    let passwordToStore = userData.password;
    if (passwordToStore) {
      const isHashed = passwordToStore.startsWith('$2a$');      if (!isHashed) {
        if (!validatePasswordStrength(passwordToStore)) {
          throw new Error("Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.");        }
        passwordToStore = await bcryptjs.hash(passwordToStore, 10);      }
    }

    return await db.transaction(async (tx) => {
      let user: any;
      let targetUserId: string;

      if (finalUserId) {
        const updateData: any = {
          username: currentUsername,
          email: currentEmail,
          fullName: userData.employeeName || userData.fullName,
          updatedAt: new Date(),
        };

        if (passwordToStore && passwordToStore.trim() !== "") {
          updateData.password = passwordToStore;
        }

        const [userCheck] = await tx.select().from(users).where(eq(users.id, finalUserId)).limit(1);
        if (!userCheck) {
          throw new Error("User record not found in database.");
        }

        const [updatedUser] = await tx
          .update(users)
          .set(updateData)
          .where(eq(users.id, finalUserId))
          .returning();

        if (!updatedUser) {
          throw new Error("Failed to update users record.");
        }

        user = updatedUser;
        targetUserId = finalUserId;

        // Dono tables direct main target UUID string se sync ho rahi hain
        await tx
          .update(userProfiles)
          .set({
            roleId: finalRoleId,
            employeeCode: finalEmployeeCode,
            // isActive: userData.isActive ?? true,
            updatedAt: new Date(),
          })
          .where(eq(userProfiles.userId, targetUserId));

      } else {
        if (!passwordToStore) {
          throw new Error("Password is required for a new user registration.");
        }

        const [newUser] = await tx
          .insert(users)
          .values({
            username: currentUsername,
            password: passwordToStore,
            email: currentEmail,
            fullName: userData.employeeName || userData.fullName,
          })
          .returning();

        if (!newUser) {
          throw new Error("Failed to create user record.");
        }

        user = newUser;
        targetUserId = user.id;

        await tx
          .insert(userProfiles)
          .values({
            userId: targetUserId,
            roleId: finalRoleId,
            employeeCode: finalEmployeeCode,
            isActive: userData.isActive ?? true,
          });
      }

      return user;
    });
  }

  // async upsertUser(userData: any): Promise<any> {
  //   let passwordToStore = userData.password;

  //   if (passwordToStore) {
  //     const isHashed = passwordToStore.startsWith('$2a$') || passwordToStore.startsWith('$2b$');
  //     if (!isHashed) {
  //       passwordToStore = await bcrypt.hash(passwordToStore, 10);
  //     }
  //   }

  //   return await db.transaction(async (tx) => {
  //     const [user] = await tx
  //       .insert(users)
  //       .values({
  //         id: userData.id || undefined,
  //         username: userData.username,
  //         password: passwordToStore,
  //         email: userData.email,
  //         fullName: userData.employeeName || userData.fullName,
  //       })
  //       .onConflictDoUpdate({
  //         target: users.id,
  //         set: {
  //           username: userData.username,
  //           ...(passwordToStore ? { password: passwordToStore } : {}),
  //           email: userData.email,
  //           fullName: userData.employeeName || userData.fullName,
  //           updatedAt: new Date(),
  //         },
  //       })
  //       .returning();

  //     await tx
  //       .insert(userProfiles)
  //       .values({
  //         userId: user.id,
  //         roleId: userData.roleId,
  //         employeeCode: userData.employeeCode,
  //         isActive: userData.isActive ?? true,
  //       })
  //       .onConflictDoUpdate({
  //         target: userProfiles.userId,
  //         set: {
  //           roleId: userData.roleId,
  //           employeeCode: userData.employeeCode,
  //           isActive: userData.isActive,
  //           updatedAt: new Date(),
  //         },
  //       });

  //     return user;
  //   });
  // }
  
}

export const authStorage = new AuthStorage();