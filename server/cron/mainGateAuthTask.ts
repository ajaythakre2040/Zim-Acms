import { db, mssqlPool } from "../db";
import {
    devices,
    doorDevices,
    people,
    roles,
    cronMaster,
    doors,
    cabinLockouts,
} from "@shared/schema";
import { eq, and, gt, lt, sql, desc } from "drizzle-orm";
import {
    ACCESS_RULES,
    ZONES,
    MAIN_GATE_SYNC,
    CABIN_LOCKOUT_CONFIG,
} from "../constant";
import * as helpers from "./cronHelpers";

export async function runMasterAuthSync() {
    const CRON_CODE = MAIN_GATE_SYNC.CODE;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const startTime = Date.now();

    console.log(`\n[${new Date().toLocaleString("en-IN")}] >>> [START] CRON INITIATED: ${CRON_CODE} <<<`);

    try {
        // --- STEP 1: CRON STATE & STUCK LOCK CHECK ---
        const [cronState] = await db.select().from(cronMaster).where(eq(cronMaster.code, CRON_CODE)).limit(1);

        if (!cronState || !cronState.isActive) {
            console.log("⚠️ Skip: Cron is inactive or not found.");
            return;
        }

        // Stuck Lock Prevention (Smart Timeout)
        const now = new Date();
        const lastRunTime = cronState.lastRun ? new Date(cronState.lastRun) : new Date(0);
        const timeoutThreshold = (cronState.timeoutMinutes || 10) * 60000;

        if (cronState.isRunning && (now.getTime() - lastRunTime.getTime()) < timeoutThreshold) {
            console.log(`[-] Skip: Already running. (Started at: ${lastRunTime.toLocaleTimeString()})`);
            return;
        }

        // Lock the cron
        await db.update(cronMaster)
            .set({ isRunning: true, lastRun: sql`NOW()`, lastStatus: 'processing' })
            .where(eq(cronMaster.code, CRON_CODE));
        console.log("✅ [1/5] Cron Locked.");

        // --- STEP 2: FETCH PUNCHES ---
        const lastProcessedId = Number(cronState.lastProcessedId || 0);
        const punchResult = await mssqlPool.request().query(`
            SELECT EmployeeCode, DeviceId, DeviceLogId, LogDate 
            FROM DeviceLogs WHERE DeviceLogId > ${lastProcessedId} ORDER BY DeviceLogId ASC
        `);
        const punches = punchResult.recordset || [];

        if (punches.length === 0) {
            console.log("😴 [2/5] No new punches. Releasing lock.");
            await db.update(cronMaster).set({ isRunning: false, lastStatus: "success" }).where(eq(cronMaster.code, CRON_CODE));
            return;
        }
        console.log(`📡 [2/5] Found ${punches.length} new punches.`);

        // --- STEP 3: MASTER DATA FETCH ---
        const uniqueEmpCodes = [...new Set(punches.map(p => (p.EmployeeCode || "").toString().trim()))].filter(Boolean);
        const [allDoorDevices, allDevices, allDoors, allRoles, punchingPeople] = await Promise.all([
            db.select().from(doorDevices),
            db.select().from(devices).where(gt(devices.msId, 0)),
            db.select().from(doors),
            db.select().from(roles),
            db.select().from(people).where(sql`${people.employeeCode} IN ${uniqueEmpCodes.length > 0 ? uniqueEmpCodes : ['-1']}`)
        ]);

        const mainGateDoor = allDoors.find((d) => d.code === CRON_CODE);
        if (!mainGateDoor) throw new Error("Main Gate configuration missing.");

        // --- STEP 4: PROCESSING LOOP ---
        console.log(`🔄 [3/5] Processing Punches...`);
        for (const punch of punches) {
            const currentLogId = Number(punch.DeviceLogId);
            const empCode = (punch.EmployeeCode || "").toString().trim();
            const punchDeviceId = Number(punch.DeviceId);

            // Pointer update hamesha sabse pehle (taaki fasa na rahe)
            const updatePointer = async () => {
                await db.update(cronMaster).set({ lastProcessedId: currentLogId }).where(eq(cronMaster.code, CRON_CODE));
            };

            const doorMapping = allDoorDevices.find((d) => [...(d.inDeviceIds || []), ...(d.outDeviceIds || [])].includes(punchDeviceId));
            const doorDetails = allDoors.find((d) => d.id === doorMapping?.doorId);
            const emp = punchingPeople.find((p) => p.employeeCode?.toString().trim() === empCode);

            if (!emp || !doorDetails) {
                console.log(`   ⚠️ Skip LogID ${currentLogId}: Emp(${empCode}) or Device(${punchDeviceId}) mapping missing.`);
                await updatePointer(); // Pointer aage badhao taaki loop break ho
                continue;
            }

            // --- RULE ENGINE ---
            const isMainGatePunch = doorDetails.code === CRON_CODE;
            const isEntryPunch = (doorMapping!.inDeviceIds || []).includes(punchDeviceId);
            const hasMainEntryToday = helpers.hasEnteredToday(emp, todayStart);

            let ruleToApply = emp.ruleid;
            let currentZone = emp.currentZone;
            let blockAllInternal = true;

            if (isMainGatePunch) {
                if (isEntryPunch) {
                    // 🔥 LATEST LOCKOUT CHECK (Real-time)
                    // const [latestLockout] = await db.select()
                    //     .from(cabinLockouts)
                    //     .where(and(eq(cabinLockouts.employeeCode, empCode), eq(cabinLockouts.status, "active")))
                    //     .orderBy(desc(cabinLockouts.createdAt))
                    //     .limit(1);

                    // let isStillLocked = false;
                    // if (latestLockout) {
                    //     if (new Date() < new Date(latestLockout.lockoutExpiry)) {
                    //         isStillLocked = true;
                    //     } else {
                    //         // Expire all active lockouts for this user
                    //         await db.update(cabinLockouts).set({ status: 'expired' })
                    //             .where(and(eq(cabinLockouts.employeeCode, empCode), eq(cabinLockouts.status, "active")));
                    //     }
                    // }
                    // 1. Latest record fetch karein (Status ignore karke)
                    const [latestLockout] = await db.select()
                        .from(cabinLockouts)
                        .where(eq(cabinLockouts.employeeCode, empCode))
                        .orderBy(desc(cabinLockouts.lockoutExpiry)) // Sabse naya expiry upar
                        .limit(1);

                    let isStillLocked = false;

                    if (latestLockout) {
                        const now = new Date();
                        const expiry = new Date(latestLockout.lockoutExpiry);

                        // 🔥 Direct Time Comparison
                        if (now < expiry) {
                            isStillLocked = true;
                            console.log(`🚫 Access Denied: Locked until ${expiry.toLocaleString('en-IN')}`);
                        } else {
                            isStillLocked = false;
                            console.log(`✅ Access Granted: Expiry time (${expiry.toLocaleTimeString()}) passed.`);

                            // Optional: Background mein status update kardo audit ke liye
                            if (latestLockout.status === 'active') {
                                await db.update(cabinLockouts)
                                    .set({ status: 'expired' })
                                    .where(eq(cabinLockouts.id, latestLockout.id));
                            }
                        }
                    }
                    if (!helpers.hasValidRole(emp)) { ruleToApply = ACCESS_RULES.NO_ROLE; blockAllInternal = true; }
                    else if (isStillLocked) { ruleToApply = ACCESS_RULES.LOCKOUT_ACTIVE; blockAllInternal = true; }
                    else { ruleToApply = ACCESS_RULES.MAIN_GATE_IN; currentZone = ZONES.IN; blockAllInternal = false; }
                } else {
                    ruleToApply = ACCESS_RULES.MAIN_GATE_OUT; currentZone = ZONES.OUT; blockAllInternal = true;
                }
            } else {
                // Agar punch Main Gate ka nahi hai (Internal/Cabin door hai)
                if (!hasMainEntryToday) {
                    ruleToApply = ACCESS_RULES.MAIN_GATE_OUT;
                    currentZone = ZONES.OUT;
                    blockAllInternal = true;
                } else {
                    if (isEntryPunch) {
                        // Banda Cabin ke andar ja raha hai
                        ruleToApply = ACCESS_RULES.CABIN_IN;
                        currentZone = ZONES.CABIN;
                        blockAllInternal = true;
                    }
                    else if (doorDetails.is_lockout_enabled) {
                        // 1. Rule aur Zone set karein
                        ruleToApply = ACCESS_RULES.LOCKOUT_ACTIVE;
                        currentZone = ZONES.IN;
                        blockAllInternal = true;

                        // 2. Cron Master se Lockout Config fetch karein
                        const [lockoutConfig] = await db
                            .select()
                            .from(cronMaster)
                            .where(eq(cronMaster.code, CABIN_LOCKOUT_CONFIG.CODE))
                            .limit(1);

                       
                        // --- 4. STEP: Purani entry expire karo (SQL Native Fix) ---
                        const cleanupResult = await db.update(cabinLockouts)
                            .set({
                                status: 'expired',
                                updatedAt: sql`NOW()`
                            })
                            .where(and(
                                eq(cabinLockouts.employeeCode, empCode),
                                eq(cabinLockouts.status, "active"),
                                // Database se hi pucho: "Kya Expiry ka time nikal gaya?"
                                sql`"lockoutExpiry" <= NOW()`
                            ));

                        const rowsAffected = cleanupResult?.rowCount ?? 0;
                        if (rowsAffected > 0) {
                            console.log(`🧹 [CLEANUP] Success! Expired ${rowsAffected} entries for ${empCode}`);
                        } else {
                            // Ye log tab aayega jab koi record expiry time tak nahi pahuncha hai
                            console.log(`ℹ️ [CLEANUP] No lockouts reached expiry yet for ${empCode}`);
                        }

                        // --- 5. STEP: Check karo kya abhi bhi koi ACTIVE entry hai ---
                        const [stillActive] = await db.select()
                            .from(cabinLockouts)
                            .where(and(
                                eq(cabinLockouts.employeeCode, empCode),
                                eq(cabinLockouts.status, "active")
                            ))
                            .limit(1);
                      
                        
                        // 6. STEP: Agar koi active entry nahi hai, tabhi Nayi Row insert hogi
                        if (!stillActive) {
                            // 1. Config fetch karna
                            const [lockoutConfig] = await db
                                .select()
                                .from(cronMaster)
                                .where(eq(cronMaster.code, CABIN_LOCKOUT_CONFIG.CODE))
                                .limit(1);

                            // 2. Default values
                            const hours = lockoutConfig?.lockoutHours || 0;
                            const minutes = lockoutConfig?.lockoutMinutes || 30;
                            const totalLockoutMs = (hours * 3600000) + (minutes * 60000);

                            // 2. Date Objects (System Local Time)
                            const punchTime = new Date(punch.LogDate);
                            const expiryTime = new Date(punchTime.getTime() + totalLockoutMs);

                            // 🔥 PRECISION DEBUGGING LOGS
                            console.log("------------------ LOCKOUT SYSTEM DEBUG ------------------");
                            console.log(`👤 Employee Code    : ${empCode}`);
                            console.log(`🕒 DB Raw LogDate   : ${punch.LogDate}`);
                            console.log(`📅 Parsed Punch     : ${punchTime.toLocaleString('en-IN')}`);
                            console.log(`⏳ Lockout Duration : ${hours}h ${minutes}m`);
                            console.log(`🏁 Calculated Expiry: ${expiryTime.toLocaleString('en-IN')}`);
                            console.log(`🔢 Duration (Int)   : ${Math.ceil(hours + (minutes / 60))}`);
                            console.log("----------------------------------------------------------");

                            try {
                                // 3. Simple Insert (Postgres will treat these as raw timestamps)
                                await db.insert(cabinLockouts).values({
                                    employeeCode: empCode,
                                    doorId: doorDetails.id,
                                    outPunchTime: punchTime,
                                    lockoutExpiry: expiryTime, // Ab ye exact 3 min aage jayega bina offset ke
                                    status: "active",
                                    // durationHours: lockoutConfig.lockoutMinutes // Integer crash fix
                                });

                                console.log(`✅ [DATABASE] Lockout record saved for ${empCode}`);
                            } catch (error) {
                                console.error(`❌ [DB ERROR] Insert failed for ${empCode}:`, error);
                            }
                        } else {
                            console.log(`⏳ [SKIP] Emp ${empCode} has an existing active lockout. No new row created.`);
                        }
                    } else {
                        // Normal Cabin Exit (agar lockout enabled nahi hai)
                        ruleToApply = ACCESS_RULES.CABIN_OUT;
                        currentZone = ZONES.IN;
                        blockAllInternal = false;
                    }
                }
            }


            // --- HARDWARE SYNC ---
            const role = allRoles.find((r) => r.id === emp.roleId);
            let allowedIds = role?.doorIds ? (Array.isArray(role.doorIds) ? role.doorIds.map(Number) : JSON.parse(role.doorIds as string).map(Number)) : [];

            for (const machine of allDevices) {
                const mDM = allDoorDevices.find((dd) => [...(dd.inDeviceIds || []), ...(dd.outDeviceIds || [])].includes(machine.msId!));
                const mDoorId = mDM?.doorId;
                const isMainMachine = mDoorId === mainGateDoor.id;
                let shouldBlock = true;

                if (currentZone === ZONES.CABIN) shouldBlock = mDoorId !== doorDetails.id;
                else if (currentZone === ZONES.IN && !blockAllInternal) shouldBlock = !isMainMachine && !allowedIds.includes(Number(mDoorId));
                else if (ruleToApply === ACCESS_RULES.LOCKOUT_ACTIVE && isMainMachine) shouldBlock = false;
                else shouldBlock = true;

                if (isMainGatePunch && isMainMachine) shouldBlock = false;
                await helpers.updateDeviceStatus(empCode, machine, shouldBlock);
            }

            // Update Emp and Pointer
            await db.update(people).set({
                lastSeenTime: new Date(punch.LogDate),
                ruleid: ruleToApply,
                currentZone,
                lastPunchDoorId: doorDetails.id,
                updatedAt: sql`NOW()`
            }).where(eq(people.employeeCode, empCode));

            await updatePointer();
            console.log(`   ✅ LogID ${currentLogId} processed for Emp ${empCode}`);
        }
        // --- STEP 4.5: BACKGROUND CLEANUP (Auto-Unlock) ---
        console.log("🧹 [4/5] Background Cleanup: Checking for expired lockouts...");

        // Database se directly un logo ko uthao jinka time khatam ho gaya hai
        // sql`NOW()` database ke server ka current time use karega
        const expiredLockouts = await db.select()
            .from(cabinLockouts)
            .where(and(
                eq(cabinLockouts.status, "active"),
                sql`${cabinLockouts.lockoutExpiry}::timestamp <= (NOW() AT TIME ZONE 'Asia/Kolkata')::timestamp`
            ));

        if (expiredLockouts.length > 0) {
            console.log(`🔍 Found ${expiredLockouts.length} lockouts to expire.`);

            for (const lockout of expiredLockouts) {
                const empCode = lockout.employeeCode;

                // 1. Employee fetch karo
                const [emp] = await db.select().from(people).where(eq(people.employeeCode, empCode)).limit(1);
                if (!emp) continue;

                // 2. Original Role Fetch for Access Restoration
                const role = allRoles.find((r) => r.id === emp.roleId);
                let allowedDoorIds: number[] = [];
                try {
                    allowedDoorIds = role?.doorIds ? (Array.isArray(role.doorIds) ? role.doorIds.map(Number) : JSON.parse(role.doorIds as string).map(Number)) : [];
                } catch (e) { console.log("JSON Parse Error for Emp Role"); }

                // 3. HARDWARE SYNC: Restore access to all machines
                for (const machine of allDevices) {
                    const mDM = allDoorDevices.find((dd) => [...(dd.inDeviceIds || []), ...(dd.outDeviceIds || [])].includes(machine.msId!));
                    const mDoorId = Number(mDM?.doorId);
                    if (!mDoorId) continue;

                    const isMainMachine = mDoorId === mainGateDoor.id;

                    // Lockout expire hone ke baad: Main Gate Open + Allowed Doors Open
                    let shouldBlock = !isMainMachine && !allowedDoorIds.includes(mDoorId);

                    await helpers.updateDeviceStatus(empCode, machine, shouldBlock);
                }

                // 4. DATABASE UPDATE: Reset status and rule
                await db.update(people)
                    .set({ ruleid: ACCESS_RULES.MAIN_GATE_IN, updatedAt: sql`NOW()` })
                    .where(eq(people.employeeCode, empCode));

                await db.update(cabinLockouts)
                    .set({ status: 'expired', updatedAt: sql`NOW()` })
                    .where(eq(cabinLockouts.id, lockout.id));

                console.log(`✅ Access Restored for Emp ${empCode}`);
            }
        } else {
            console.log("      ✅ No pending lockouts to expire.");
        }
        // --- STEP 5: WRAP UP ---
        const duration = Math.floor((Date.now() - startTime) / 1000);
        await db.update(cronMaster).set({
            isRunning: false,
            lastStatus: "success",
            lastRunDuration: duration
        }).where(eq(cronMaster.code, CRON_CODE));

        console.log(`✅ [4/5] CRON COMPLETED in ${duration}s`);

    } catch (e: any) {
        console.error("❌ CRON FATAL ERROR:", e);
        await db.update(cronMaster).set({ isRunning: false, lastStatus: "failed", lastMessage: e.message }).where(eq(cronMaster.code, CRON_CODE));
    }
}