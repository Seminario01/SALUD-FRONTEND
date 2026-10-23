import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import { useAvisos } from "../components/Avisos";
import useRoles from "../hooks/useRoles";
import { ESTADO_REFERENCIA, PRIORIDAD } from "../utils/red";

// Referencias de pacientes a otros establecimientos: las enviadas primero (urgentes arriba).
// Recepción coordina el traslado; Enfermería, Médico o Jefatura la marcan recibida o cancelada.
const fecha = (t) => new Date(t).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });

export default function Referencias() {
  const { puede } = useRoles();
  const avisos = useAvisos();
  const [estado, setEstado] = useState("ENVIADA");
  const [lista, setLista] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => client.get("/referencias", { params: estado ? { estado } : {} })
    .then((r) => { setLista(r.data.data); setError(null); })
    .catch((e) => setError(mensajeError(e))), [estado]);
  useEffect(() => { cargar(); }, [cargar]);

  function cerrar(r, nuevo) {
    const nota = window.prompt(nuevo === "RECIBIDA" ? "Nota (opcional): por ejemplo, confirmado por teléfono con emergencia"
      : "Motivo de la cancelación:", "");
    if (nota === null || (nuevo === "CANCELADA" && !nota.trim())) return;
    client.put(`/referencias/${r.id}`, { estado: nuevo, nota: nota.trim() || null })
      .then((res) => { avisos.exito(res.data.message); cargar(); })
      .catch((e) => avisos.error(mensajeError(e)));
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Referencias</h1>
          <p className="text-slate-500 text-sm">Pacientes referidos a otros establecimientos de la red. Las urgentes van primero.</p>
        </div>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
          <option value="ENVIADA">Por confirmar</option>
          <option value="RECIBIDA">Recibidas</option>
          <option value="CANCELADA">Canceladas</option>
          <option value="">Todas</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {lista && lista.length === 0 && <p className="text-sm text-slate-500">No hay referencias {estado === "ENVIADA" ? "por confirmar" : "con ese estado"}.</p>}
      {lista?.length > 0 && (
        <table className="w-full">
          <thead><tr className="text-left"><th className="p-2">Paciente</th><th className="p-2">Destino</th><th className="p-2">Motivo</th><th className="p-2">Estado</th><th className="p-2" /></tr></thead>
          <tbody>
            {lista.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="p-2"><Link to={`/pacientes/${r.paciente_id}`} className="font-medium text-blue-700 hover:underline">{r.paciente}</Link>
                  <span className="block text-xs text-slate-500">{fecha(r.fecha)} · {r.medico_nombre || "—"}</span></td>
                <td className="p-2 text-sm">{r.establecimiento}<span className="block text-xs text-slate-500">{r.establecimiento_municipio}{r.establecimiento_telefono && ` · Tel. ${r.establecimiento_telefono}`}</span></td>
                <td className="p-2 text-sm">{r.motivo}{r.diagnostico && <span className="block text-xs text-slate-500">{r.codigo_cie10} {r.diagnostico}</span>}</td>
                <td className="p-2">
                  <span className={`text-[11px] rounded-full px-2 py-0.5 ${ESTADO_REFERENCIA[r.estado].clase}`}>{ESTADO_REFERENCIA[r.estado].texto}</span>
                  {r.prioridad === "URGENTE" && <span className={`ml-1 text-[11px] rounded-full px-2 py-0.5 ${PRIORIDAD.URGENTE.clase}`}>Urgente</span>}
                  {r.nota_cierre && <span className="block text-xs text-slate-500 mt-1">{r.nota_cierre}</span>}
                </td>
                <td className="p-2 text-right whitespace-nowrap space-x-2">
                  <Link to={`/imprimir/referencia/${r.id}`} className="text-sm text-blue-700 hover:underline">Hoja</Link>
                  {r.estado === "ENVIADA" && puede("referencias.gestionar") && (
                    <>
                      <button onClick={() => cerrar(r, "RECIBIDA")} className="text-sm text-emerald-700 hover:underline">Recibida</button>
                      <button onClick={() => cerrar(r, "CANCELADA")} className="text-sm text-red-700 hover:underline">Cancelar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
