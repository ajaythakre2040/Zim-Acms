import { InsertPerson, Person, type Holiday, type InsertHoliday } from "@shared/schema";
import { type Device, type InsertDevice } from "@shared/schema";
export const HolidayAdapter = {
    toPostgres: (row: any): Holiday => ({
        id: Math.floor(Math.random() * 10000), 
        msId: row.Id || row.id || null,        
        name: row.Name || row.name || "Unnamed Holiday",
        date: row.Date ? new Date(row.Date).toISOString().split('T')[0] : (row.date || ""),
        holidayType: "company",
        locationid: row.locationid || row.LocationId || null,
        description: null,
        createdAt: new Date()
    }),
    toMsSql: (pg: InsertHoliday | Partial<Holiday>) => {
        const row: any = {};
        if (pg.name !== undefined) row.Name = pg.name;
        if (pg.date !== undefined) row.Date = pg.date;
        if (pg.locationid !== undefined) row.locationid = pg.locationid;
        return row;
    }
};
export const DeviceAdapter = {
    toPostgres: (row: any): Device => ({
        id: 0,
        msId: row.DeviceId || null,
        name: String(row.DeviceName || "Unnamed Device"),
        deviceDirection: row.DeviceDirection || "in",
        serialNumber: row.SerialNumber || null,
        opstamp: row.OpStamp || row.TransactionStamp || "0",
        lastPing: row.LastPing ? new Date(row.LastPing) : null,
        lastreset: row.LastReset ? new Date(row.LastReset) : null,
        activationCode: row.ActivationCode || null,
        isAttendanceDevice: (row.IsAttendanceDevice === "1" || row.IsAttendanceDevice === 1) ? 1 : 0,
        deviceType: String(row.DeviceType || "reader").toLowerCase(),
        locationId: row.LocationId || 1,
        zoneId: null,
        ipAddress: null,
        lastHeartbeat: row.LastHeartbeat ? new Date(row.LastHeartbeat) : null,
        status: "offline",
        isActive: true,
        createdAt: new Date()
    }),
    toMsSql: (pg: InsertDevice | Partial<Device>) => {
        const row: any = {};
        if (pg.name !== undefined) row.DeviceName = pg.name;
        if (pg.deviceDirection !== undefined) row.DeviceDirection = pg.deviceDirection;
        if (pg.serialNumber !== undefined) row.SerialNumber = pg.serialNumber;
        if (pg.locationId !== undefined) row.LocationId = pg.locationId;
        if (pg.activationCode !== undefined) row.ActivationCode = pg.activationCode;
        if (pg.deviceType !== undefined) row.DeviceType = pg.deviceType;
        if (pg.opstamp !== undefined) row.OpStamp = pg.opstamp;
        if (pg.isAttendanceDevice !== undefined) {
            row.IsAttendanceDevice = pg.isAttendanceDevice ? "1" : "0";
        }
        return row;
    }
};

export const PersonAdapter = {
    toPostgres: (row: any): Partial<Person> => {
        const remoteId = row.EmployeeId ?? row.employeeid ?? row.Id ?? row.id;
        const fullName = (row.EmployeeName || row.employeename || "Unnamed").trim();
        return {
            msId: remoteId ? Number(remoteId) : null,
            employeeName: fullName,
            employeeCode: row.EmployeeCode || row.employeecode || null,
            locationId: row.AttendanceLocationId || row.attendancelocationid || row.locationId || 1,
            address: row.Location || row.location || null,
            overtimeEligible: row.OverTimeApplicable == "1" || row.overtimeapplicable == "1",
            personType: "employee",
            status: "active",
            sourceSystem: "mssql_bio",
            externalId: remoteId ? String(remoteId) : null,
            updatedAt: new Date(),
            createdAt: new Date(),
        };
    },
    toMsSql: (pg: any) => ({
        EmployeeName: pg.employeeName,
        EmployeeCode: pg.employeeCode,
        Location: pg.address,
        AttendanceLocationId: pg.locationId 
    })
};

export const SiteAdapter = {
    toPostgres: (row: any) => {
        const remoteId = row.Id ?? row.id ?? row.ID;

        return {
            msId: remoteId ? Number(remoteId) : null,
            name: (row.Description || row.description || "Unnamed Site").trim(),
            code: row.Code || row.code || null,
            // Postgres specific fields
            address: row.Address || row.address || null,
            city: row.City || row.city || null,
            state: row.State || row.state || null,
            country: row.Country || row.country || "India",
            timezone: "Asia/Kolkata",
            isActive: true,
            createdAt: new Date(),
        };
    },

    toMsSql: (pg: any) => {
        return {
            Id: pg.msId, // Postgres ka msId wapas MS SQL ki Id ban jayega
            Code: pg.code,
            Description: pg.name
        };
    }
};