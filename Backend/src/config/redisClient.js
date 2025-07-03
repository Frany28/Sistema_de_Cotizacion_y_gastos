// ─────────────────────────────────────────────────────────────
// src/config/redisClient.js
// ─────────────────────────────────────────────────────────────
import { createClient } from "redis";

/** ①  Crea el cliente apuntando a Upstash (TLS por defecto) */
const redisClient = createClient({
  url: process.env.REDIS_URL, // rediss://default:token@host:6379
  socket: { tls: true },
});

/** ②  Conexión “lazy”: no hacemos await aquí para no bloquear la lambda */
redisClient.connect().catch(console.error);

/** ③  Manejo mínimo de eventos */
redisClient.on("ready", () => console.log("Redis client ready"));
redisClient.on("error", (e) => console.error("Redis error:", e));

export default redisClient;
