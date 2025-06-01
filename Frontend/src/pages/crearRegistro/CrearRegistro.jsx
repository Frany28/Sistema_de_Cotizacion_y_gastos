import React, { useState, useEffect } from "react";
import api from "../../api/index.js";
import AgregarGasto from "../../components/AgregarGasto";
import AgregarCotizacion from "../../components/AgregarCotizacion";
import ModalExito from "../../components/Modals/ModalExito";
import ModalError from "../../components/Modals/ModalError";
import Loader from "../../components/general/Loader";
import { verificarPermisoFront } from "../../../utils/verificarPermisoFront";

const CrearRegistro = () => {
  const [servicios, setServicios] = useState([]);
  const [tipoRegistro, setTipoRegistro] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [itemsAgregados, setItemsAgregados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalExito, setModalExito] = useState(false);
  const [modalError, setModalError] = useState({ visible: false, mensaje: "" });
  const [categoriasGastos, setCategoriasGastos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [usuarioId, setUsuarioId] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(
    "Registro creado exitosamente."
  );

  useEffect(() => {
    try {
      const usuarioGuardado =
        JSON.parse(localStorage.getItem("usuario")) ||
        JSON.parse(sessionStorage.getItem("usuario"));

      if (usuarioGuardado?.id) {
        setUsuarioId(usuarioGuardado.id);
      } else {
        console.warn(" Usuario no encontrado en localStorage.");
      }
    } catch (error) {
      console.error(" No se puede acceder a localStorage:", error);
    }
  }, []);

  useEffect(() => {
    const obtenerCotizaciones = async () => {
      try {
        const { data } = await api.get("/cotizaciones?page=1&limit=1000");
        setCotizaciones(data.cotizaciones);
      } catch (error) {
        console.error("Error al cargar cotizaciones:", error);
      }
    };

    obtenerCotizaciones();
  }, []);

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    observaciones: "",
    operacion: "",
    puerto: "",
    bl: "",
    mercancia: "",
    contenedor: "",
  });
  const [datosGeneralesPreview, setDatosGeneralesPreview] = useState(form);

  useEffect(() => {
    const obtenerProveedores = async () => {
      try {
        const { data } = await api.get("/proveedores?page=1&limit=1000");

        setProveedores(data.proveedores);
      } catch (error) {
        console.error("Error al obtener proveedores:", error);
      }
    };
    obtenerProveedores();
  }, []);

  useEffect(() => {
    const inicializar = async () => {
      try {
        setLoading(true);

        const response = await api.get("/registros", {
          withCredentials: true,
        });
        setServicios(response.data.servicios);
        setClientes(response.data.clientes);
        setCategoriasGastos(response.data.categorias || []);
      } catch (err) {
        console.error("Error al cargar los datos iniciales:", err);
        setModalError({
          visible: true,
          mensaje: "Error al cargar los datos iniciales",
        });
      } finally {
        setLoading(false);
      }
    };

    inicializar();
  }, []);

  useEffect(() => {
    api
      .get("/sucursales/dropdown/list", {
        withCredentials: true,
      })
      .then((res) => {
        // aquí res.data es directamente el Array<{ id, nombre }>
        setSucursales(res.data);
      })
      .catch((err) =>
        console.error("Error cargando sucursales dropdown:", err)
      );
  }, []);
  const crearCotizacion = async (datosGenerales) => {
    try {
      setLoading(true);

      if (!clienteSeleccionado) {
        setModalError({
          visible: true,
          mensaje: "Debe seleccionar un cliente.",
        });
        setLoading(false);
        return;
      }

      if (itemsAgregados.length === 0) {
        setModalError({
          visible: true,
          mensaje: "Debe agregar al menos un servicio o producto.",
        });
        setLoading(false);
        return;
      }

      if (!datosGenerales.fecha) {
        setModalError({
          visible: true,
          mensaje: "Debe seleccionar una fecha.",
        });
        setLoading(false);
        return;
      }

      const subtotalSinIva = itemsAgregados.reduce(
        (sum, item) => sum + (item.precio || 0) * (item.cantidad || 0),
        0
      );
      const totalImpuestos = itemsAgregados.reduce((sum, item) => {
        const porcentaje = item.porcentaje_iva || 0;
        const subtotalItem = (item.precio || 0) * (item.cantidad || 0);
        return sum + (subtotalItem * porcentaje) / 100;
      }, 0);
      const totalCotizacion = subtotalSinIva + totalImpuestos;

      const hayProducto = itemsAgregados.some(
        (item) => item.tipo === "producto"
      );

      const datosCotizacion = {
        tipo: "cotizacion",
        cliente_id: clienteSeleccionado.id,
        usuario_id: usuarioId,
        estado: "pendiente",
        confirmacion_cliente: 0,
        observaciones: datosGenerales.observaciones || "",
        fecha: datosGenerales.fecha,
        total: totalCotizacion,
        operacion: hayProducto ? datosGenerales.operacion || "N/A" : "N/A",
        mercancia: hayProducto ? datosGenerales.mercancia || "N/A" : "N/A",
        puerto: hayProducto ? datosGenerales.puerto || "N/A" : "N/A",
        bl: hayProducto ? datosGenerales.bl || "N/A" : "N/A",
        contenedor: hayProducto ? datosGenerales.contenedor || "N/A" : "N/A",
        detalle: itemsAgregados.map((item) => ({
          servicio_productos_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
          porcentaje_iva: item.porcentaje_iva,
          tipo: item.tipo,
        })),
      };

      await api.post("/registros", datosCotizacion, {
        withCredentials: true,
      });
      setMensajeExito("¡Cotización registrada correctamente!");
      setModalExito(true);
      setItemsAgregados([]);
      setTipoRegistro("");
      setClienteSeleccionado(null);
      setForm({
        fecha: new Date().toISOString().split("T")[0],
        observaciones: "",
        operacion: "",
        puerto: "",
        bl: "",
        mercancia: "",
        contenedor: "",
      });
    } catch (err) {
      console.error("Error al crear cotización:", err);

      if (err.response?.status === 403) {
        setModalError({
          visible: true,
          mensaje:
            err.response?.data?.message ||
            "No tienes permiso para realizar esta acción.",
        });
      } else {
        setModalError({
          visible: true,
          mensaje: "No se pudo crear la cotización. Intenta nuevamente.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const verVistaPrevia = async (datosGenerales) => {
    try {
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
      const nombreDeclarante = usuarioGuardado?.nombre || "Usuario Desconocido";

      const subtotalSinIva = itemsAgregados.reduce(
        (sum, item) => sum + (item.precio || 0) * (item.cantidad || 0),
        0
      );
      const totalImpuestos = itemsAgregados.reduce((sum, item) => {
        const porcentaje = item.porcentaje_iva || 0;
        const subtotalItem = (item.precio || 0) * (item.cantidad || 0);
        return sum + (subtotalItem * porcentaje) / 100;
      }, 0);
      const totalCotizacion = subtotalSinIva + totalImpuestos;

      const servicios = itemsAgregados
        .filter((item) => item.tipo === "servicio")
        .map((servicio) => ({
          nombre: servicio.nombre,
          cantidad: servicio.cantidad,
          precioUnitario: servicio.precio,
          iva:
            (servicio.precio *
              servicio.cantidad *
              (servicio.porcentaje_iva || 0)) /
            100,
          total:
            servicio.precio * servicio.cantidad +
            (servicio.precio *
              servicio.cantidad *
              (servicio.porcentaje_iva || 0)) /
              100,
        }));

      const productos = itemsAgregados
        .filter((item) => item.tipo === "producto")
        .map((producto) => ({
          nombre: producto.nombre,
          cantidad: producto.cantidad,
          precioUnitario: producto.precio,
          iva:
            (producto.precio *
              producto.cantidad *
              (producto.porcentaje_iva || 0)) /
            100,
          total:
            producto.precio * producto.cantidad +
            (producto.precio *
              producto.cantidad *
              (producto.porcentaje_iva || 0)) /
              100,
        }));

      const response = await api.post(
        "/registros/cotizaciones/vista-previa",
        {
          datos: {
            cliente_nombre: clienteSeleccionado?.nombre,
            fecha_emision: datosGenerales.fecha,
            declarante: nombreDeclarante,
            operacion: datosGenerales.operacion || "N/A",
            mercancia: datosGenerales.mercancia || "N/A",
            bl: datosGenerales.bl || "N/A",
            contenedor: datosGenerales.contenedor || "N/A",
            puerto: datosGenerales.puerto || "N/A",
            servicios,
            productos,
            subtotal: subtotalSinIva,
            impuesto: totalImpuestos,
            total: totalCotizacion,
          },
        },
        { responseType: "blob" }
      );

      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
    } catch (error) {
      console.error("Error generando vista previa:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center bg-opacity-50 z-50">
        <Loader />
      </div>
    );
  }
  const crearGasto = async (datosGasto) => {
    try {
      setLoading(true);

      // 1) Obtén el usuario y formatea la fecha
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
      const usuarioId = usuarioGuardado?.id;
      const fechaFormateada = new Date(datosGasto.fecha || Date.now())
        .toISOString()
        .split("T")[0];

      // 2) Crea un FormData en lugar de un objeto JSON
      const formData = new FormData();

      // 2.1) Adjuntar el archivo si existe
      if (datosGasto.comprobante) {
        formData.append("comprobante", datosGasto.comprobante);
      }
      formData.append("tipo", "gasto");

      // 2.2) Adjuntar el resto de campos (todos como strings o números)
      formData.append("tipo_gasto_id", String(datosGasto.tipo_gasto_id));
      formData.append("concepto_pago", datosGasto.concepto_pago || "N/A");
      formData.append("sucursal_id", String(datosGasto.sucursal_id));
      formData.append("descripcion", datosGasto.descripcion || "N/A");
      formData.append("subtotal", String(datosGasto.subtotal));
      formData.append("porcentaje_iva", String(datosGasto.porcentaje_iva || 0));
      formData.append("moneda", datosGasto.moneda || "USD");

      if (datosGasto.moneda === "VES") {
        formData.append("tasa_cambio", String(datosGasto.tasa_cambio));
      }

      if (datosGasto.proveedor_id) {
        formData.append("proveedor_id", String(datosGasto.proveedor_id));
      }

      if (datosGasto.cotizacion_id) {
        formData.append("cotizacion_id", String(datosGasto.cotizacion_id));
      }

      formData.append("fecha", fechaFormateada);
      formData.append("usuario_id", String(usuarioId));
      formData.append("tipo", "gasto");

      // 3) Envía la petición como multipart/form-data
      await api.post("/registros", formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMensajeExito("¡Gasto registrado correctamente!");
      setModalExito(true);
      setTipoRegistro("");
    } catch (error) {
      console.error("Error al registrar gasto:", error);
      setModalError({
        visible: true,
        mensaje: "No se pudo registrar el gasto. Intente nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-800 text-white rounded-lg shadow-md">
      <ModalExito
        visible={modalExito}
        mensaje={mensajeExito}
        onClose={() => setModalExito(false)}
      />
      <ModalError
        visible={modalError.visible}
        mensaje={modalError.mensaje}
        onClose={() => setModalError({ visible: false, mensaje: "" })}
      />

      <h1 className="text-2xl font-bold mb-6">Nuevo Registro</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium text-white mb-2">
          Tipo de registro *
        </label>
        <select
          value={tipoRegistro}
          onChange={async (e) => {
            const tipo = e.target.value;

            if (tipo === "cotizacion") {
              const tienePermiso = await verificarPermisoFront(
                "crear_cotizacion"
              );
              if (!tienePermiso) {
                setModalError({
                  visible: true,
                  mensaje:
                    "No tienes permiso para crear cotizaciones con tu rol actual.",
                });
                return;
              }
            }

            if (tipo === "gasto") {
              const tienePermiso = await verificarPermisoFront("crear_gasto");
              if (!tienePermiso) {
                setModalError({
                  visible: true,
                  mensaje:
                    "No tienes permiso para registrar gastos con tu rol actual.",
                });
                return;
              }
            }

            setTipoRegistro(tipo);
            setItemsAgregados([]);
          }}
          className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          required
        >
          <option value="">Seleccione un tipo de registro</option>
          <option value="cotizacion">Cotización</option>
          <option value="gasto">Gasto</option>
        </select>
      </div>

      {tipoRegistro === "cotizacion" && (
        <>
          <AgregarCotizacion
            servicios={servicios}
            clientes={clientes}
            setClientes={setClientes}
            setClienteSeleccionado={setClienteSeleccionado}
            clienteSeleccionado={clienteSeleccionado}
            loading={loading}
            itemsAgregados={itemsAgregados}
            setItemsAgregados={setItemsAgregados}
            onGenerarCotizacion={(datosGenerales) => {
              setForm(datosGenerales);
              crearCotizacion(datosGenerales);
            }}
            onActualizarDatos={setDatosGeneralesPreview}
          />

          {clienteSeleccionado && itemsAgregados.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => verVistaPrevia(datosGeneralesPreview)}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white"
              >
                Ver Vista Previa (PDF)
              </button>
            </div>
          )}
        </>
      )}

      {tipoRegistro === "gasto" && (
        <AgregarGasto
          categoriasGastos={categoriasGastos}
          proveedores={proveedores}
          setProveedores={setProveedores}
          sucursales={sucursales}
          cotizaciones={cotizaciones}
          crearGasto={crearGasto}
          onAgregarGasto={(nuevoGasto) => {
            setItemsAgregados((prevItems) => [...prevItems, nuevoGasto]);
            setModalExito(true);
          }}
          loading={loading}
        />
      )}
    </div>
  );
};

export default CrearRegistro;
