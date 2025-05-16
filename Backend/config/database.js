/* eslint-env node */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST, // 192.168.0.100
  user: process.env.DB_USER, // sistemac_sistemac_gastos
  password: process.env.DB_PASS, // zUQnj6YxfGRdRL4AA3DJ
  database: process.env.DB_NAME, // sistemac_sistemac_gastos
  waitForConnections: true,
  connectionLimit: 10,
});

export default db;
