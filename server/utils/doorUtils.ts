import { db } from "../db";
import { doors, doorDevices, devices } from "@shared/schema";
import { eq, inArray, and } from "drizzle-orm";

/**
 * 1. Sirf Active Doors Get Karne Ke Liye
 */
export async function getActiveDoors() {
    return await db
        .select()
        .from(doors)
        .where(eq(doors.isActive, true));
}

/**
 * 2. Active Doors aur Unse Linked Active Devices Get Karne Ke Liye
 * Returns: Active Devices array jo Active Doors se associated hain
 */
export async function getActiveDoorsWithDevices() {
    // Step 1: Sirf Active Doors fetch karein
    const activeDoors = await getActiveDoors();
    const activeDoorIds = activeDoors.map((d) => d.id);

    if (activeDoorIds.length === 0) {
        return { activeDoors: [], activeDevices: [] };
    }

    // Step 2: Active Doors ke doorDevices mapping fetch karein
    const activeMappings = await db
        .select()
        .from(doorDevices)
        .where(
            and(
                inArray(doorDevices.doorId, activeDoorIds),
                eq(doorDevices.isActive, true)
            )
        );

    // Step 3: Saare inDeviceIds aur outDeviceIds ko extract & flatten karein
    const activeDeviceMsIds = new Set<number>();
    activeMappings.forEach((mapping) => {
        (mapping.inDeviceIds || []).forEach((id) => activeDeviceMsIds.add(id));
        (mapping.outDeviceIds || []).forEach((id) => activeDeviceMsIds.add(id));
    });

    if (activeDeviceMsIds.size === 0) {
        return { activeDoors, activeDevices: [] };
    }

    // Step 4: Devices table se matching active devices fetch karein
    const activeDevices = await db
        .select()
        .from(devices)
        .where(
            and(
                inArray(devices.msId, Array.from(activeDeviceMsIds)),
                eq(devices.isActive, true)
            )
        );

    return {
        activeDoors,
        activeDevices,
    };
}

/**
 * 3. Specific Door Code (jaise MAIN_GATE_SYNC.CODE) ke basis par Active Devices fetch karne ke liye
 */
export async function getActiveDevicesByDoorCode(doorCode: string) {
    // Step 1: Specific Door Code and isActive check
    const activeDoorsList = await db
        .select()
        .from(doors)
        .where(and(eq(doors.code, doorCode), eq(doors.isActive, true)));

    const activeDoorIds = activeDoorsList.map((d) => d.id);
    if (activeDoorIds.length === 0) return [];

    // Step 2: doorDevices Mapping
    const Mappings = await db
        .select()
        .from(doorDevices)
        .where(
            and(
                inArray(doorDevices.doorId, activeDoorIds),
                eq(doorDevices.isActive, true)
            )
        );

    const deviceMsIds = new Set<number>();
    Mappings.forEach((mapping) => {
        (mapping.inDeviceIds || []).forEach((id) => deviceMsIds.add(id));
        (mapping.outDeviceIds || []).forEach((id) => deviceMsIds.add(id));
    });

    if (deviceMsIds.size === 0) return [];

    // Step 3: Fetch Active Devices
    return await db
        .select()
        .from(devices)
        .where(
            and(
                inArray(devices.msId, Array.from(deviceMsIds)),
                eq(devices.isActive, true)
            )
        );
}