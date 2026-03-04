import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import mssql from "mssql";
import * as schema from "@shared/schema";
import "dotenv/config";

// 1. PostgreSQL Setup
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzlePg(pool, { schema });

// 2. MS SQL Setup
const mssqlConfig: mssql.config = {
  user: 'bio',
  password: '1234',
  server: '192.168.10.179',
  database: 'bzi_bios',
  options: {
    instanceName: 'ZIM_LAB',
    encrypt: false,
    trustServerCertificate: true,
  }
};

export const mssqlPool = new mssql.ConnectionPool(mssqlConfig);

/**
 * UTILITY: getTableName
 * Yeh function bina kisi external dependency ke table name nikalta hai.
 */
function getTableName(table: any): string {
  let rawName: any;

  // Drizzle ke different versions ke liye checks
  try {
    rawName =
      table?.dbName ||
      table?._?.name ||
      (table as any)[Object.getOwnPropertySymbols(table).find(s => s.description === 'drizzle:Name') as any];
  } catch (e) {
    rawName = null;
  }

  // Agar phir bhi na mile toh hum table object ko string mein convert karke guess karenge
  if (!rawName) {
    console.warn("Table name not found, falling back to manual detection.");
    // Aksar holidays object pass karne par uska internal name 'holidays' hota hai
    rawName = "holidays";
  }

  const nameStr = String(rawName);
  // MS SQL normalization: 'holidays' -> 'Holidays'
  return nameStr.charAt(0).toUpperCase() + nameStr.slice(1);
}

/**
 * dbMsSql Proxy
 */
export const dbMsSql: any = {
  select: () => ({
    from: async (table: any) => {
      const tableName = getTableName(table);
      console.log(`[mssql] Querying table: ${tableName}`);

      const request = mssqlPool.request();
      const result = await request.query(`SELECT * FROM ${tableName}`);
      return result.recordset || [];
    }
  }),
  insert: (table: any) => ({
    values: async (data: any) => {
      const tableName = getTableName(table);
      const keys = Object.keys(data).join(', ');
      const values = Object.values(data).map(v => {
        if (v === null || v === undefined) return 'NULL';
        return typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v;
      }).join(', ');

      console.log(`[mssql] Inserting into: ${tableName}`);
      return await mssqlPool.request().query(`INSERT INTO ${tableName} (${keys}) VALUES (${values})`);
    }
  })
};

export async function initDatabases() {
  try {
    await pool.query('SELECT 1');
    await mssqlPool.connect();
    console.log("✅ All Databases Connected Successfully");
  } catch (err) {
    console.error("❌ Connection Error:", err);
  }
}