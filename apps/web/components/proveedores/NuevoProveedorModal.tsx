"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Proveedor } from "@/app/proveedores/page";

const CONDICIONES_IVA = [
  "Responsable Inscripto",
  "Monotributo",
  "Exento",
  "No Responsable",
  "Sujeto No Categorizado",
];

const CONDICIONES_PAGO = [
  "Contado",
  "7 días",
  "15 días",
  "30 días",
  "60 días",
  "90 días",
  "Cheque",
  "A convenir",
];

interface Props {
  proveedor?: Proveedor | null;
  onClose: () => void;
  onSuccess: () => void;
}

const empty = {
  razonSocial: "",
  cuit: "",
  email: "",
  telefono: "",
  direccion: "",
  ciudad: "",
  provincia: "Buenos Aires",
  condicionIva: "Responsable Inscripto",
  condicionPago: "Contado",
  notas: "",
};

export default function NuevoProveedorModal({ proveedor, onClose, onSuccess }: Props) {
  const isEdit = !!proveedor;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (proveedor) {
      setForm({
        razonSocial: proveedor.razonSocial ?? "",
        cuit: proveedor.cuit ?? "",
        email: proveedor.email ?? "",
        telefono: proveedor.telefono ?? "",
        direccion: proveedor.direccion ?? "",
        ciudad: proveedor.ciudad ?? "",
        provincia: proveedor.provincia ?? "Buenos Aires",
        condicionIva: proveedor.condicionIva ?? "Responsable Inscripto",
        condicionPago: proveedor.condicionPago ?? "Contado",
        notas: proveedor.notas ?? "",
      });
    } else {
      setForm(empty);
    }
  }, [proveedor]);

  const set = (field: keyof typeof form, val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const handleSubmit = async () => {
    if (!form.razonSocial.trim()) {
      setError("La razón social es obligatoria.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const url = isEdit
        ? `/api/proveedores/${proveedor!.id}`
        : "/api/proveedores";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? "Error al guardar");
      }
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-white font-medium">
            {isEdit ? "Editar proveedor" : "Nuevo proveedor"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Row 1: Razón Social + CUIT */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                Razón Social / Nombre *
              </label>
              <input
                value={form.razonSocial}
                onChange={(e) => set("razonSocial", e.target.value)}
                placeholder="Nombre del proveedor"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                CUIT
              </label>
              <input
                value={form.cuit}
                onChange={(e) => set("cuit", e.target.value)}
                placeholder="20-12345678-9"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Row 2: Email + Teléfono */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                Teléfono
              </label>
              <input
                value={form.telefono}
                onChange={(e) => set("telefono", e.target.value)}
                placeholder="+54 11 1234-5678"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Row 3: Dirección */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
              Dirección
            </label>
            <input
              value={form.direccion}
              onChange={(e) => set("direccion", e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Row 4: Ciudad + Provincia */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                Ciudad
              </label>
              <input
                value={form.ciudad}
                onChange={(e) => set("ciudad", e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                Provincia
              </label>
              <input
                value={form.provincia}
                onChange={(e) => set("provincia", e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Row 5: Condición IVA + Condición Pago */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                Condición IVA
              </label>
              <select
                value={form.condicionIva}
                onChange={(e) => set("condicionIva", e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {CONDICIONES_IVA.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                Condición de Pago
              </label>
              <select
                value={form.condicionPago}
                onChange={(e) => set("condicionPago", e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {CONDICIONES_PAGO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
              Notas
            </label>
            <textarea
              value={form.notas}
              onChange={(e) => set("notas", e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-sm bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {saving
              ? "Guardando..."
              : isEdit
              ? "Guardar cambios"
              : "Crear proveedor"}
          </button>
        </div>
      </div>
    </div>
  );
}
