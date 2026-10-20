import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import useRoles from "../hooks/useRoles";
import { ESTADO_ORDEN } from "../utils/laboratorio";

// Órdenes y resultados de laboratorio del paciente, en su ficha
const fecha = (t) => (t ? new Date(t).toLocaleDateString("es-GT", { dateStyle: "medium" }) : "—");

export default function LaboratorioPaciente({ pacienteId }) {
  const { puede } = useRoles();
  const [ordenes, setOrdenes] = useState(null);

  useEffect(() => {
    client.get("/laboratorio/ordenes", { params: { paciente_id: pacienteId } })
      .then((r) => setOrdenes(r.data.data)).catch(() => setOrdenes([]));
  }, [pacienteId]);

  return (
    <section className="bg-white border rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-bold text-slate-700">Laboratorio</h2>
        {puede("laboratorio.ordenar") && (
          <Link to={`/laboratorio?paciente=${pacienteId}`} className="no-imprimir text-sm text-blue-700 hover:underline">Pedir exámenes →</Link>
        )}
      </div>
      {ordenes === null && <p className="text-sm text-slate-400">Cargando...</p>}
      {ordenes?.length === 0 && <p className="text-sm text-slate-500">Sin exámenes de laboratorio.</p>}
      {ordenes?.length > 0 && (
        <ul className="divide-y text-sm">
          {ordenes.slice(0, 8).map((o) => (
            <li key={o.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium tabular-nums">No. {o.id}</span>
              <span className="text-slate-500">{fecha(o.fecha)}</span>
              <span className="flex-1 min-w-48">{o.examenes.map((e) => e.nombre).join(", ")}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${ESTADO_ORDEN[o.estado]?.clase ?? "bg-gray-100"}`}>{ESTADO_ORDEN[o.estado]?.texto ?? o.estado}</span>
              {o.estado === "COMPLETADA" && o.fuera_de_rango > 0 && <span className="text-xs font-medium text-red-700">⚠ {o.fuera_de_rango} fuera de rango</span>}
              {o.estado === "COMPLETADA" && (
                <Link to={`/imprimir/laboratorio/${o.id}`} className="no-imprimir text-xs text-blue-700 hover:underline">Resultados</Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
