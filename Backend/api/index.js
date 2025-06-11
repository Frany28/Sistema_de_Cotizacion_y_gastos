// backend/api/index.js
import serverless from "serverless-http";
import app from "../src/app.js"; // Tu Express “app” con rutas, middleware, CORS, sesiones, etc.

export const handler = serverless(app);
