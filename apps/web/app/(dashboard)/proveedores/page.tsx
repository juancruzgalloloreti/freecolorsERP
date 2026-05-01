"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Download,
  Upload,
  Search,
  Edit2,
  Trash2,
  Building2,
} from "lucide-react";
import NuevoProveedorModal from "@/components/proveedores/NuevoProveedorModal";
import ImportCSVModal from "@/components/proveedores/ImportCSVModal";
import type { Proveedor } from "@/types/proveedores";
import { suppliersApi } from "@/lib/api";

export type { Proveedor };

function toProveedor(raw: Record<string, unknown>): Proveedor {
  return {
    id: String(raw.id),
    razonSocial: String(raw.name ?? raw.razonSocial ?? ""),
    cuit: (raw.cuit as string | null) ?? null,
    email: (raw.email as string | null) ?? null,
    telefono: (raw.phone ?? raw.telefono ?? null) as string | null,
    direccion: (raw.address ?? raw.direccion ?? null) as string | null,
    ciudad: (raw.city ?? raw.ciudad ?? null) as string | null,
    provincia: (raw.province ?? raw.provincia ?? null) as string | null,
    condicionIva: (raw.ivaCondition ?? raw.condicionIva ?? null) as string | null,
    condicionPago: (raw.condicionPago as string | null) ?? null,
    notas: (raw.notes ?? raw.notas ?? null) as string | null,
    createdAt: raw.createdAt as string | undefined,
  };
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await suppliersApi.list();
      const rows = Array.isArray(response) ? response : response?.data ?? [];
      setProveedores(rows.map((row: Record<string, unknown>) => toProveedor(row)));
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar los proveedores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void cargar();
    }, 0);
    return () => window.clearTimeout(id);
  }, [cargar]);

  const filtrados = proveedores.filter(
    (p) =>
      p.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.cuit?.replace(/-/g, "").includes(busqueda.replace(/-/g, "")) ||
      p.email?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleEliminar = async (id: string) => {
    try {
      setError("");
      await suppliersApi.remove(id);
      setProveedores((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      setError("No se pudo eliminar o archivar el proveedor.");
    } finally {
      setConfirmDelete(null);
    }
  };

  const exportarCSV = () => {
    const headers = [
      "CUIT",
      "Razón Social",
      "Email",
      "Teléfono",
      "Dirección",
      "Ciudad",
      "Provincia",
      "Condición IVA",
      "Condición Pago",
      "Notas",
    ];
    const rows = proveedores.map((p) => [
      p.cuit ?? "",
      p.razonSocial,
      p.email ?? "",
      p.telefono ?? "",
      p.direccion ?? "",
      p.ciudad ?? "",
      p.provincia ?? "",
      p.condicionIva ?? "",
      p.condicionPago ?? "",
      p.notas ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proveedores_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Proveedores</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading
              ? "Cargando..."
              : `${proveedores.length} proveedor${proveedores.length !== 1 ? "es" : ""} registrado${proveedores.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={exportarCSV}
            disabled={proveedores.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={15} />
            Exportar CSV
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Upload size={15} />
            Importar CSV
          </button>
          <button
            onClick={() => {
              setEditando(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
          >
            <Plus size={15} />
            Nuevo proveedor
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Buscar proveedor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full max-w-sm pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Table */}
      <div className="border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
            Cargando...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Building2 size={36} className="text-gray-600" />
            <p className="text-gray-400 text-sm">
              {busqueda
                ? `Sin resultados para "${busqueda}"`
                : "No hay proveedores registrados"}
            </p>
            {!busqueda && (
              <div className="flex gap-3 mt-1">
                <button
                  onClick={() => setShowModal(true)}
                  className="text-sm text-violet-400 hover:text-violet-300"
                >
                  + Agregar manualmente
                </button>
                <span className="text-gray-600">o</span>
                <button
                  onClick={() => setShowImport(true)}
                  className="text-sm text-violet-400 hover:text-violet-300"
                >
                  Importar desde CSV
                </button>
              </div>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                {["Razón Social", "CUIT", "Teléfono", "Email", "Localidad", "Cond. IVA", "Cond. Pago", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                    i % 2 !== 0 ? "bg-gray-800/20" : ""
                  }`}
                >
                  <td className="py-3 px-4 text-sm font-medium text-white">
                    {p.razonSocial}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300 font-mono">
                    {p.cuit ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300">
                    {p.telefono ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300">
                    {p.email ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300">
                    {[p.ciudad, p.provincia].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300">
                    {p.condicionIva ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300">
                    {p.condicionPago ?? "—"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditando(p);
                          setShowModal(true);
                        }}
                        title="Editar"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p.id)}
                        title="Eliminar"
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <NuevoProveedorModal
          proveedor={editando}
          onClose={() => {
            setShowModal(false);
            setEditando(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditando(null);
            cargar();
          }}
        />
      )}

      {showImport && (
        <ImportCSVModal
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            setShowImport(false);
            cargar();
          }}
        />
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-white font-medium mb-2">Eliminar proveedor</h3>
            <p className="text-gray-400 text-sm mb-5">
              ¿Estás seguro? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(confirmDelete)}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
