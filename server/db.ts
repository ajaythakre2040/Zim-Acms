import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import mssql from "mssql";
import * as schema from "@shared/schema";
import "dotenv/config";

// --- 1. Database Connections Setup ---

// Postgres
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzlePg(pool, { schema });

// MS SQL Config (Hardcoded values moved to env ideally, but kept your structure)
const mssqlConfig: mssql.config = {
  user: process.env.MSSQL_USER || 'bio',
  password: process.env.MSSQL_PASSWORD || '1234',
  server: process.env.MSSQL_SERVER || '192.168.10.179',
  database: process.env.MSSQL_DB || 'bzi_bios',
  options: {
    instanceName: 'ZIM_LAB',
    encrypt: false,
    trustServerCertificate: true
  }
};

export const mssqlPool = new mssql.ConnectionPool(mssqlConfig);

// --- 2. Helper Functions ---

/**
 * MS SQL Row ko Drizzle Schema ke format mein map karta hai
 */
function mapMsSqlToSchema(msRow: any, schemaTable: any): any {
  if (!msRow) return null;
  const mappedRow: any = {};

  // Drizzle schema columns (excluding internal properties)
  const schemaColumns = Object.keys(schemaTable).filter(k =>
    !['_', '$', 'dbName'].some(internal => k.startsWith(internal))
  );

  const msKeys = Object.keys(msRow);

  schemaColumns.forEach(sKey => {
    // 1. Direct msId Mapping (Standard for your project)
    if (sKey === 'msId') {
      mappedRow[sKey] = msRow.DeviceId || msRow.deviceid || msRow.Id || msRow.id;
      return;
    }

    // 2. Smart Generic Matching
    const actualMsKey = msKeys.find(msKey => {
      const msLower = msKey.toLowerCase();
      const sLower = sKey.toLowerCase();

      return (
        msLower === sLower ||                                   // Exact match (name === name)
        msLower === sKey.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`) || // camelCase to snake_case
        msLower.includes(sLower) ||                             // Substring match (DeviceName includes name)
        sLower.includes(msLower)                                // Reverse substring match
      );
    });

    mappedRow[sKey] = actualMsKey !== undefined ? msRow[actualMsKey] : null;
  });

  // Sabse important: Original row ke saare fields retain karo 
  // taaki Adapter agar custom keys dhund raha ho toh use mil jayein.
  return { ...msRow, ...mappedRow };
}

const getTableName = (table: any) => table.dbName || table?._?.name;

// --- 3. Custom MS SQL Query Builder (Drizzle-like) ---

export const dbMsSql = {
  select: () => ({
    from: (table: any) => ({
      where: async (conditions: Record<string, any>) => {
        const request = mssqlPool.request();
        const keys = Object.keys(conditions);
        let query = `SELECT * FROM ${getTableName(table)}`;

        if (keys.length > 0) {
          const whereClause = keys.map(k => `${k} = @${k}`).join(' AND ');
          keys.forEach(k => request.input(k, conditions[k]));
          query += ` WHERE ${whereClause}`;
        }

        const result = await request.query(query);
        return (result.recordset || []).map(row => mapMsSqlToSchema(row, table));
      },
      execute: async () => {
        const result = await mssqlPool.request().query(`SELECT * FROM ${getTableName(table)}`);
        return (result.recordset || []).map(row => mapMsSqlToSchema(row, table));
      }
    })
  }),

  insert: (table: any) => ({
    values: async (data: Record<string, any>) => {
      const request = mssqlPool.request();
      const keys = Object.keys(data);
      keys.forEach(key => request.input(key, data[key]));

      const columns = keys.join(', ');
      const params = keys.map(k => `@${k}`).join(', ');

      return await request.query(`
        INSERT INTO ${getTableName(table)} (${columns}) 
        OUTPUT INSERTED.* VALUES (${params})
      `);
    }
  }),
  update: (table: any) => ({
    set: (data: Record<string, any>) => ({
      where: async (condition: any) => {
        const request = mssqlPool.request();
        const keys = Object.keys(data);
        if (keys.length === 0) return null;

        keys.forEach(k => request.input(k, data[k]));
        const targetId = condition?.value ?? condition;
        request.input('targetId', targetId);

        // Simple: table.pk use karo agar device hai, warna default 'Id'
        const pk = table.pk || 'Id';
        const query = `UPDATE ${getTableName(table)} SET ${keys.map(k => `${k} = @${k}`).join(', ')} WHERE ${pk} = @targetId`;

        return await request.query(query);
      }
    })
  }),
  delete: (table: any) => ({
    where: async (condition: any) => {
      const request = mssqlPool.request();
      const targetId = condition?.value ?? condition;
      request.input('targetId', targetId);
      const pk = table.pk || 'Id';
      return await request.query(`DELETE FROM ${getTableName(table)} WHERE ${pk} = @targetId`);
    }
  })
  // db.ts
  // update: (table: any) => ({
  //   set: (data: Record<string, any>) => ({
  //     where: async (condition: any) => {
  //       const request = mssqlPool.request();
  //       const keys = Object.keys(data);
  //       keys.forEach(key => request.input(key, data[key]));

  //       // Holiday style { value: 123 } ya direct ID dono handle karega
  //       const targetId = condition?.value !== undefined ? condition.value : condition;
  //       request.input('targetId', targetId);

  //       // --- UNIVERSAL LOGIC ---
  //       // Agar table object mein 'pk' hai toh wo use karo, warna default 'Id'
  //       const pkColumn = table.pk || 'Id';

  //       const setClause = keys.map(k => `${k} = @${k}`).join(', ');
  //       return await request.query(`
  //       UPDATE ${getTableName(table)} 
  //       SET ${setClause} 
  //       WHERE ${pkColumn} = @targetId
  //     `);
  //     }
  //   })
  // }),

  // delete: (table: any) => ({
  //   where: async (condition: any) => {
  //     const request = mssqlPool.request();
  //     const targetId = condition?.value !== undefined ? condition.value : condition;
  //     request.input('targetId', targetId);

  //     // --- UNIVERSAL LOGIC ---
  //     const pkColumn = table.pk || 'Id';

  //     return await request.query(`
  //     DELETE FROM ${getTableName(table)} 
  //     WHERE ${pkColumn} = @targetId
  //   `);
  //   }
  // })
//   update: (table: any) => ({
//     set: (data: Record<string, any>) => ({
//       where: async (condition: any) => {
//         const request = mssqlPool.request();
//         const keys = Object.keys(data);
//         keys.forEach(key => request.input(key, data[key]));

//         // Extract ID from Drizzle-style eq() or direct value
//         const targetId = condition?.value !== undefined ? condition.value : condition;
//         request.input('targetId', targetId);

//         const setClause = keys.map(k => `${k} = @${k}`).join(', ');
//         return await request.query(`
//           UPDATE ${getTableName(table)} 
//           SET ${setClause} 
//           WHERE Id = @targetId
//         `);
//       }
//     })
//   }),

//   delete: (table: any) => ({
//     where: async (condition: any) => {
//       const request = mssqlPool.request();
//       const targetId = condition?.value !== undefined ? condition.value : condition;
//       request.input('targetId', targetId);

//       return await request.query(`DELETE FROM ${getTableName(table)} WHERE Id = @targetId`);
//     }
//   })
};

// --- 4. Database Initialization ---

export async function initDatabases() {
  try {
    // Test Postgres
    await pool.query('SELECT 1');

    // Connect MS SQL if not already connected
    if (!mssqlPool.connected) {
      await mssqlPool.connect();
    }

    console.log("✅ All Databases Ready (Postgres & MS SQL)");
  } catch (err) {
    console.error("❌ Database Initialization Failed:", err);
    throw err;
  }
}