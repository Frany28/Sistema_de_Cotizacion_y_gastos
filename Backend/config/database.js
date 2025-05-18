// database.js
import mysql from "mysql2/promise";

// Carga .env localmente; en producción Render usará sus env vars
if (process.env.NODE_ENV !== "production") {
  await import("dotenv").then((d) => d.config());
}

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || "sistemacg",
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default db;

//mysql://root:hmJlPXEeoGOpRaNhsEJrcsAylszzmqNr@switchback.proxy.rlwy.net:59883/railway
