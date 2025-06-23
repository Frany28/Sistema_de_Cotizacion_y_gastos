import { verificaPermisoDinamico } from "../Middleware/verificarPermisoDinamico.js";
import { uploadComprobante } from "../utils/s3.js";

const router = express.Router();

router.get("/", autenticarUsuario, getDatosRegistro);

router.post(
  "/",
  uploadComprobante.single("documento"),
  (req, _res, next) => {
    req.combinedData = {
      ...req.body,
      ...(req.file ? { documento: req.file } : {}),
    };
    next();
  },
  autenticarUsuario,
  verificaPermisoDinamico,
  validarRegistro,
  createRegistro
);

router.post(
  "/cotizaciones/vista-previa",
  autenticarUsuario,
  generarVistaPreviaCotizacion
);

router.get("/tipos-gasto", autenticarUsuario, getTiposGasto);

export default router;
