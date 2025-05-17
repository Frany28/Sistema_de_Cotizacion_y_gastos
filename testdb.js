// testdb.js
import dotenv from "dotenv";
dotenv.config({ path: process.cwd() + "/.env" });

dotenv.config();
import mysql from "mysql2/promise";

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
    console.log("✅ Conexión satisfactoria");
    await conn.end();
  } catch (err) {
    console.error("❌ Error en test de conexión:", err);
  }
})();
