import { listarEventosArchivos } from "../controllers/eventosArchivos.controller.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";

router.get(
  "/archivos/eventos",
  autenticarUsuario, 
  verificarPermiso("verEventosArchivos"), 
  listarEventosArchivos 
);
