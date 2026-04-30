"use client";

import { useState, useRef, useCallback } from "react";
import {
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type RowData = Record<string, string>;

type Step = "upload" | "map" | "preview" | "importing" | "done";

interface ProveedorField {
  key: string;
  label: string;
  required?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CAMPOS: ProveedorField[] = [
  { key: "razonSocial", label: "Razón Social / Nombre", required: true },
  { key: "cuit",        label: "CUIT" },
  { key: "email",       label: "Email" },
  { key: "telefono",    label: "Teléfono" },
  { key: "direccion",   label: "Dirección" },
  { key: "ciudad",      label: "Ciudad" },
  { key: "provincia",   label: "Provincia" },
  { key: "condicionIva", label: "Condición IVA" },
  { key: "condicionPago", label: "Condición Pago" },
  { key: "notas",       label: "Notas" },
  { key: "-",           label: "— No importar —" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Robust CSV parser: handles quoted fields with commas, CRLF, and BOM.
 */
function parseCSV(raw: string): { headers: string[]; rows: string[][] } {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n").filter((l) => l.trim());

  const parseLine = (line: string): string[] => {
    const cols: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        cols.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  };

  // Try comma first, then semicolon (some Spanish locale Excel exports)
  const firstLine = lines[0];
  const sep = (firstLine.split(";").length > firstLine.split(",").length) ? ";" : ",";

  const parseLineSep = sep === ";"
    ? (l: string) => l.split(";").map((c) => c.replace(/^"|"$/g, "").trim())
    : parseLine;

  const headers = parseLineSep(lines[0]);
  const rows = lines.slice(1).map(parseLineSep).filter((r) => r.some(Boolean));
  return { headers, rows };
}

/**
 * Normalises CUIT to XX-XXXXXXXX-X.
 * Handles: "20-14642776-7", "20146427767", "20576890" (old format without check digit)
 */
function normalizeCuit(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  }
  // Return as-is if we can't normalise (maybe it's just the raw number from legacy)
  return raw.trim();
}

/**
 * Auto-detect column → field mapping based on header name heuristics.
 */
function autoMap(headers: string[]): Record<string, string> {
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

  const rules: [string[], string][] = [
    [["razonsocial","razon","nombre","empresa","proveedor","descripcion","razonsocialounombre"], "razonSocial"],
    [["cuit","cuil","nrodoc","nit","cut","cuitcuil","rut"],                                    "cuit"],
    [["email","correo","mail","emailaddress"],                                                  "email"],
    [["telefono","tel","phone","celular","movil","fax","contacto"],                             "telefono"],
    [["direccion","domicilio","calle","address","dir"],                                         "direccion"],
    [["ciudad","localidad","poblacion","loc"],                                                  "ciudad"],
    [["provincia","prov","estado","region"],                                                   "provincia"],
    [["condicioniva","condiva","iva","situacioniva"],                                          "condicionIva"],
    [["condicionpago","condpago","formapago","plazo","pagos"],                                 "condicionPago"],
    [["notas","nota","observaciones","obs","comentarios"],                                     "notas"],
  ];

  const used = new Set<string>();
  const mapping: Record<string, string> = {};

  for (const h of headers) {
    const n = norm(h);
    mapping[h] = "-";
    for (const [patterns, field] of rules) {
      if (!used.has(field) && patterns.some((p) => n === p || n.includes(p) || p.includes(n))) {
        mapping[h] = field;
        used.add(field);
        break;
      }
    }
  }
  return mapping;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const PREVIEW_COUNT = 5;

export default function ImportCSVModal({ onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep]       = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows]       = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [errors, setErrors]   = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult]   = useState({ ok: 0, skipped: 0 });
  const [progress, setProgress] = useState(0);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      setHeaders(h);
      setRows(r);
      setMapping(autoMap(h));
      setErrors([]);
      setStep("map");
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.toLowerCase().endsWith(".csv")) handleFile(file);
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const mappedFields = Object.entries(mapping)
    .filter(([, v]) => v !== "-")
    .map(([, v]) => v);

  const buildPayload = (): RowData[] =>
    rows
      .map((row) => {
        const obj: RowData = {};
        headers.forEach((h, i) => {
          const field = mapping[h];
          if (!field || field === "-") return;
          let val = (row[i] ?? "").trim();
          if (field === "cuit" && val) val = normalizeCuit(val);
          obj[field] = val;
        });
        return obj;
      })
      .filter((o) => o.razonSocial?.trim());

  const previewRows = (): RowData[] => buildPayload().slice(0, PREVIEW_COUNT);

  // ── Validation ────────────────────────────────────────────────────────────

  const validateMap = (): boolean => {
    if (!mappedFields.includes("razonSocial")) {
      setErrors(["Debés mapear al menos la columna 'Razón Social / Nombre'."]);
      return false;
    }
    setErrors([]);
    return true;
  };

  // ── Import ────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    const payload = buildPayload();
    setStep("importing");
    const BATCH = 50;
    let ok = 0, skipped = 0;

    for (let i = 0; i < payload.length; i += BATCH) {
      const batch = payload.slice(i, i + BATCH);
      try {
        const res = await fetch("/api/proveedores/importar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proveedores: batch }),
        });
        if (res.ok) {
          const data = await res.json();
          ok      += data.creados     ?? batch.length;
          skipped += data.duplicados  ?? 0;
        } else {
          skipped += batch.length;
        }
      } catch {
        skipped += batch.length;
      }
      setProgress(Math.round(((i + BATCH) / payload.length) * 100));
    }

    setResult({ ok, skipped });
    setStep("done");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const payload = step === "preview" || step === "importing" || step === "done"
    ? buildPayload()
    : [];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-white font-medium">Importar proveedores desde CSV</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === "upload"    && "Compatible con exportaciones del sistema legacy"}
              {step === "map"       && `${rows.length} filas detectadas en "${fileName}" — mapeá las columnas`}
              {step === "preview"   && `Vista previa · se importarán ${payload.length} registros`}
              {step === "importing" && "Procesando..."}
              {step === "done"      && "Importación finalizada"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* ── Step indicator ── */}
        {(step === "map" || step === "preview") && (
          <div className="flex items-center gap-0 px-5 py-2.5 border-b border-gray-700 bg-gray-800/40">
            {(["map", "preview"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px bg-gray-600 mx-1" />}
                <div className={`flex items-center gap-1.5 text-xs font-medium ${
                  step === s ? "text-violet-400" : step === "preview" && s === "map" ? "text-gray-500" : "text-gray-500"
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                    step === s
                      ? "bg-violet-600 border-violet-500 text-white"
                      : step === "preview" && s === "map"
                      ? "bg-gray-700 border-gray-600 text-gray-400"
                      : "border-gray-600 text-gray-500"
                  }`}>
                    {step === "preview" && s === "map" ? "✓" : i + 1}
                  </div>
                  {s === "map" ? "Mapear columnas" : "Vista previa"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Step: upload */}
          {step === "upload" && (
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-violet-500 hover:bg-violet-500/5 transition-all"
            >
              <Upload size={36} className="mx-auto text-gray-500 mb-4" />
              <p className="text-white font-medium mb-1">
                Arrastrá tu CSV o hacé clic para seleccionarlo
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Exportá desde el legacy con CUIT y Razón Social — se detectan automáticamente
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-gray-600 bg-gray-800 px-3 py-1.5 rounded-full">
                <FileText size={12} />
                Solo archivos .csv
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          )}

          {/* Step: map */}
          {step === "map" && (
            <div>
              {errors.map((e) => (
                <div
                  key={e}
                  className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-lg mb-4"
                >
                  <AlertCircle size={14} />
                  {e}
                </div>
              ))}
              <p className="text-sm text-gray-400 mb-3">
                Asociá cada columna del archivo con el campo del sistema:
              </p>
              <div className="space-y-2">
                {headers.map((h) => (
                  <div
                    key={h}
                    className="flex items-center gap-3 py-2.5 px-3 bg-gray-800 rounded-lg"
                  >
                    {/* Column from file */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-mono text-gray-200 truncate block">
                        {h}
                      </span>
                      {/* Show first non-empty value as hint */}
                      <span className="text-xs text-gray-500 truncate block">
                        {rows.slice(0, 3).map((r) => r[headers.indexOf(h)]).filter(Boolean)[0] ?? ""}
                      </span>
                    </div>
                    <ArrowRight size={14} className="text-gray-600 flex-shrink-0" />
                    {/* Target field */}
                    <select
                      value={mapping[h] ?? "-"}
                      onChange={(e) =>
                        setMapping((prev) => ({ ...prev, [h]: e.target.value }))
                      }
                      className="w-56 px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500"
                    >
                      {CAMPOS.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                          {c.required ? " *" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3">
                * Campo obligatorio. Los demás son opcionales.
              </p>
            </div>
          )}

          {/* Step: preview */}
          {step === "preview" && (
            <div>
              <p className="text-sm text-gray-400 mb-3">
                Primeras {Math.min(PREVIEW_COUNT, payload.length)} filas de{" "}
                <span className="text-white font-medium">{payload.length}</span> a importar:
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 border-b border-gray-700">
                      {mappedFields.map((f) => (
                        <th
                          key={f}
                          className="py-2.5 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                        >
                          {CAMPOS.find((c) => c.key === f)?.label ?? f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows().map((row, i) => (
                      <tr key={i} className="border-b border-gray-700/40">
                        {mappedFields.map((f) => (
                          <td
                            key={f}
                            className="py-2.5 px-3 text-gray-300 whitespace-nowrap max-w-[180px] truncate"
                          >
                            {row[f] || (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {payload.length > PREVIEW_COUNT && (
                <p className="text-xs text-gray-500 mt-2">
                  + {payload.length - PREVIEW_COUNT} registros más...
                </p>
              )}
              <div className="mt-3 p-3 bg-amber-400/10 border border-amber-400/20 rounded-lg text-xs text-amber-400">
                Los proveedores con CUIT duplicado serán omitidos automáticamente.
              </div>
            </div>
          )}

          {/* Step: importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-14 gap-5">
              <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-gray-300 text-sm font-medium">
                  Importando proveedores...
                </p>
                <p className="text-gray-500 text-xs mt-1">{progress}%</p>
              </div>
              <div className="w-48 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Step: done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <CheckCircle2 size={44} className="text-green-400" />
              <div className="text-center">
                <p className="text-white font-medium text-lg">
                  {result.ok} proveedor{result.ok !== 1 ? "es" : ""} importado
                  {result.ok !== 1 ? "s" : ""}
                </p>
                {result.skipped > 0 && (
                  <p className="text-gray-400 text-sm mt-1">
                    {result.skipped} omitido{result.skipped !== 1 ? "s" : ""} (CUIT duplicado o sin razón social)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-700">
          {/* Back button */}
          <div>
            {step === "map" && (
              <button
                onClick={() => setStep("upload")}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700"
              >
                <ArrowLeft size={14} /> Volver
              </button>
            )}
            {step === "preview" && (
              <button
                onClick={() => setStep("map")}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700"
              >
                <ArrowLeft size={14} /> Volver
              </button>
            )}
          </div>

          {/* Right actions */}
          <div className="flex gap-3">
            {step !== "importing" && step !== "done" && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700"
              >
                Cancelar
              </button>
            )}
            {step === "map" && (
              <button
                onClick={() => {
                  if (validateMap()) setStep("preview");
                }}
                className="flex items-center gap-1.5 px-5 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
              >
                Vista previa <ArrowRight size={14} />
              </button>
            )}
            {step === "preview" && (
              <button
                onClick={handleImport}
                className="px-5 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
              >
                Importar {payload.length} proveedores
              </button>
            )}
            {step === "done" && (
              <button
                onClick={onSuccess}
                className="px-5 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
              >
                Listo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
