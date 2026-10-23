import { useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import BotonesExportar from "./Exportar";

// Dashboard: diagnósticos más frecuentes (GET /reportes/diagnosticos). Solo cifras, ningún paciente.
// Barras horizontales de un solo color; "Otros" en gris. Cada barra dice su número, así no hace falta leyenda.

const AZUL = "#2a78d6";
const GRIS = "#cbd5e1";

function periodo(clave) {
  const hoy = new Date();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (clave === "anio") return { desde: `${hoy.getFullYear()}-01-01`, hasta: iso(hoy) };
  const dias = clave === "30" ? 29 : 89;
  return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - dias)), hasta: iso(hoy) };
}

const PERIODOS = [["30", "Últimos 30 días"], ["90", "Últimos 90 días"], ["anio", "Este año"]];
const fechaLarga = (t) => new Date(`${t}T12:00:00`).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" });

export default function DiagnosticosFrecuentes() {
  const [clave, setClave] = useState("90");
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    client
      .get("/reportes/diagnosticos", { params: { ...periodo(clave), limite: 10 } })
      .then((r) => { setReporte(r.data); setError(null); })
      .catch((err) => setError(mensajeError(err)));
  }, [clave]);

  const filas = reporte?.data ?? [];
  const maximo = Math.max(1, ...filas.map((f) => f.atenciones));
  return (
    <section className="bg-white border rounded-lg p-4 mt-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-semibold text-slate-700">Diagnósticos más frecuentes</h2>
          <p className="text-xs text-slate-500">
            {reporte ? `${fechaLarga(reporte.desde)} – ${fechaLarga(reporte.hasta)} · ${reporte.total_atenciones} atenciones de ${reporte.total_pacientes} pacientes` : "Atenciones registradas en el expediente"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={clave} onChange={(e) => setClave(e.target.value)} aria-label="Período" className="border rounded px-2 py-1.5 text-sm">
            {PERIODOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          <BotonesExportar nombre={`diagnosticos-${reporte?.desde ?? ""}-a-${reporte?.hasta ?? ""}`}
            titulo={reporte ? `Diagnósticos más frecuentes del ${reporte.desde} al ${reporte.hasta}` : "Diagnósticos más frecuentes"}
            columnas={[
              { titulo: "Diagnóstico", valor: (f) => f.diagnostico, ancho: 40 },
              { titulo: "Atenciones", valor: (f) => f.atenciones, ancho: 12 },
              { titulo: "Pacientes", valor: (f) => f.pacientes ?? "", ancho: 12 },
              { titulo: "% del total", valor: (f) => f.porcentaje, ancho: 12 },
            ]}
            filas={filas} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && reporte === null && <p className="text-sm text-slate-400">Cargando...</p>}
      {reporte && filas.length === 0 && <p className="text-sm text-slate-500">No hay atenciones registradas en este período.</p>}

      <ol className="space-y-2">
        {filas.map((f, i) => (
          <li key={f.diagnostico} className="grid grid-cols-[minmax(0,14rem)_1fr] items-center gap-3 text-sm max-sm:grid-cols-1 max-sm:gap-1">
            <span className={`truncate ${f.otros ? "text-slate-500" : "text-slate-700"}`} title={f.diagnostico}>
              {!f.otros && <span className="text-slate-400 tabular-nums mr-1">{i + 1}.</span>}{f.diagnostico}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-4 rounded-r" style={{ width: `${Math.max(2, (f.atenciones / maximo) * 100)}%`, background: f.otros ? GRIS : AZUL }} aria-hidden="true" />
              <span className="whitespace-nowrap tabular-nums text-slate-800">
                <span className="font-semibold">{f.atenciones}</span>
                <span className="text-xs text-slate-500"> · {f.porcentaje}%{f.pacientes != null ? ` · ${f.pacientes} pac.` : ""}</span>
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
