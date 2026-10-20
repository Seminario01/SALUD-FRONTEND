import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

// Página pública (sin iniciar sesión): la abre el patrono, el colegio o quien reciba una constancia
// médica al escanear su QR. Usa axios sin el cliente de la app para no mandar el token de nadie.
// No muestra el diagnóstico (el backend tampoco lo envía).

const fecha = (t) => (t ? new Date(t).toLocaleString("es-GT", { dateStyle: "long", timeStyle: "short" }) : "—");
const dia = (t) => (t ? new Date(`${t}T12:00:00`).toLocaleDateString("es-GT", { dateStyle: "long" }) : "—");

export default function VerificarConstancia() {
  const { codigo } = useParams();
  const [estado, setEstado] = useState({ cargando: true });

  useEffect(() => {
    axios
      .get(`/api/v1/salud/verificar/constancia/${encodeURIComponent(codigo)}`)
      .then((r) => setEstado({ constancia: r.data.data }))
      .catch((err) => setEstado({
        noExiste: err.response?.status === 404,
        error: err.response?.data?.message || "No se pudo consultar. Revise su conexión e intente de nuevo.",
      }));
  }, [codigo]);

  const c = estado.constancia;
  const incapacidad = c?.tipo === "INCAPACIDAD";
  const anulada = c?.estado === "ANULADA";
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-lg">
        <header className="mb-4 flex items-center gap-2 text-slate-700">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-700 text-lg font-bold text-white" aria-hidden="true">+</span>
          <div>
            <h1 className="font-semibold leading-tight">Módulo Salud</h1>
            <p className="text-xs text-slate-500">Verificación de constancias médicas</p>
          </div>
        </header>

        {estado.cargando && <p className="rounded-xl bg-white p-5 text-slate-500">Verificando la constancia...</p>}

        {estado.error && (
          <section role="alert" className={`rounded-xl border-2 p-5 ${estado.noExiste ? "border-red-300 bg-red-50 text-red-900" : "border-slate-300 bg-white text-slate-700"}`}>
            <p className="text-xl font-bold">{estado.noExiste ? "✕ Constancia no encontrada" : "No se pudo verificar"}</p>
            <p className="mt-1">{estado.error}</p>
            {estado.noExiste && <p className="mt-3 text-sm">No acepte esta constancia. Si cree que es un error, comuníquese con el hospital que la emitió.</p>}
          </section>
        )}

        {c && (
          <>
            <section role="status" className={`rounded-xl border-2 p-5 ${anulada ? "bg-red-50 border-red-300 text-red-900" : "bg-green-50 border-green-300 text-green-900"}`}>
              <p className="text-xl font-bold">
                <span aria-hidden="true">{anulada ? "✕ " : "✓ "}</span>
                {anulada ? "Constancia ANULADA" : `${incapacidad ? "Incapacidad" : "Constancia de consulta"} auténtica`}
              </p>
              <p className="mt-1">
                {anulada ? "El médico o la jefatura anularon esta constancia. No tiene validez."
                  : incapacidad ? `Reposo de ${c.dias_reposo} día(s): del ${dia(c.desde)} al ${dia(c.hasta)}, inclusive.`
                    : `El paciente fue atendido en consulta el ${dia(c.fecha_atencion)}.`}
              </p>
            </section>

            <section className="mt-4 rounded-xl bg-white p-5 shadow-sm">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><dt className="text-slate-500">Constancia No.</dt><dd className="font-semibold tabular-nums">{c.numero}</dd></div>
                <div><dt className="text-slate-500">Emitida</dt><dd>{fecha(c.fecha)}</dd></div>
                <div><dt className="text-slate-500">Médico</dt><dd>{c.medico ? `Dr(a). ${c.medico}` : "—"}</dd></div>
                <div><dt className="text-slate-500">Paciente</dt><dd>{c.paciente_iniciales || "—"}{c.paciente_dpi ? ` · DPI ${c.paciente_dpi}` : ""}</dd></div>
                <div><dt className="text-slate-500">Fecha de atención</dt><dd>{dia(c.fecha_atencion)}</dd></div>
                {incapacidad && <div><dt className="text-slate-500">Días de reposo</dt><dd className="tabular-nums">{c.dias_reposo}</dd></div>}
              </dl>
              <p className="mt-4 text-xs text-slate-500">
                Compare estos datos con la constancia en papel: si algo no coincide (fechas, días o número), fue alterada.
                Por privacidad no se muestra el diagnóstico, y del paciente solo las iniciales y los últimos 4 dígitos del DPI.
              </p>
            </section>
            <p className="mt-3 text-center text-xs text-slate-400">{c.establecimiento}</p>
          </>
        )}
      </div>
    </main>
  );
}
