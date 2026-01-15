// src/components/Modals/ModalEditarUsuario.jsx
import React, { useEffect, useState } from "react";
import api from "../api/index";

export default function ModalEditarUsuario({
  visible,
  onClose,
  usuario,
  roles,
  onGuardado,
}) {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol_id: "",
    estado: "activo",
    cuotaMb: "",
  });

  const [firma, setFirma] = useState(null);

  useEffect(() => {
    if (!usuario) return;

    setForm({
      nombre: usuario.nombre || "",
      email: usuario.email || "",
      password: "",
      rol_id: usuario.rol_id?.toString?.() || "",
      estado: usuario.estado || "activo",
      // si viene null => ilimitado, lo mostramos como "ilimitado"
      cuotaMb:
        usuario.cuotaMb === null || usuario.cuotaMb === undefined
          ? ""
          : String(usuario.cuotaMb),
    });

    setFirma(null);
  }, [usuario]);

  if (!visible) return null;

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("nombre", form.nombre);
      formData.append("email", form.email);
      formData.append("rol_id", form.rol_id);
      formData.append("estado", form.estado);

      if (form.password?.trim()) {
        formData.append("password", form.password.trim());
      }

      if (firma) {
        formData.append("firma", firma);
      }

      // ✅ Cuota unificada: se envía en el mismo PUT /usuarios/:id
      // Si lo dejan vacío => no cambia
      if (form.cuotaMb !== "") {
        formData.append("cuotaMb", form.cuotaMb);
      }

      await api.put(`/usuarios/${usuario.id}`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      onGuardado?.();
      onClose?.();
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Error al actualizar usuario");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-2xl rounded-2xl bg-[#111827] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Editar Usuario</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-white/80 hover:bg-white/10"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={manejarSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white/80">Nombre</label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={manejarCambio}
                className="w-full rounded-xl bg-[#0B1220] px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-2"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/80">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={manejarCambio}
                className="w-full rounded-xl bg-[#0B1220] px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-2"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/80">
                Nueva contraseña (opcional)
              </label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={manejarCambio}
                className="w-full rounded-xl bg-[#0B1220] px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-2"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/80">Rol</label>
              <select
                name="rol_id"
                value={form.rol_id}
                onChange={manejarCambio}
                className="w-full rounded-xl bg-[#0B1220] px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-2"
                required
              >
                <option value="" disabled>
                  Selecciona un rol
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/80">Estado</label>
              <select
                name="estado"
                value={form.estado}
                onChange={manejarCambio}
                className="w-full rounded-xl bg-[#0B1220] px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-2"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/80">
                Cuota (MB) (opcional)
              </label>
              <input
                name="cuotaMb"
                type="number"
                min="0"
                value={form.cuotaMb}
                onChange={manejarCambio}
                className="w-full rounded-xl bg-[#0B1220] px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-2"
                placeholder="Ej: 50"
              />
              <p className="mt-1 text-xs text-white/50">
                Déjalo vacío para no cambiar. Si el rol queda como Admin, será
                ilimitado.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-white/80">Firma</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFirma(e.target.files?.[0] || null)}
                className="w-full rounded-xl bg-[#0B1220] px-3 py-2 text-white/80 outline-none ring-1 ring-white/10"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 px-4 py-2 text-white hover:bg-white/15"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
