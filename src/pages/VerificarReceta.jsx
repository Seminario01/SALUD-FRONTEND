import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

// Página pública (sin iniciar sesión): la abre otra farmacia al escanear el QR de la receta impresa.
// Usa axios sin el cliente de la app para no mandar el token de nadie.

const fecha = (t) => (t ? new Date(t).toLocaleString("es-GT", { dateStyle: "long", timeStyle: "short" }) : "—");

const ESTADO = {
  PENDIENTE: { titulo: "Receta auténtica y vigente", detalle: "Todavía no se ha despachado en la farmacia del hospital.",
               clase: "bg-green-50 border-green-300 text-green-900", icono: "✓" },
  DESPACHADA: { titulo: "Receta auténtica, YA DESPACHADA", detalle: "Esta receta ya se entregó en la farmacia del hospital. No debe volver a despacharse.",
                clase: "bg-amber-50 border-amber-300 text-amber-900", icono: "!" },
  ANULADA: { titulo: "Receta ANULADA", detalle: "El médico o la jefatura anularon esta receta. No debe despacharse.",
             clase: "bg-red-50 border-red-300 text-red-900", icono: "✕" },
};

export default function VerificarReceta() {
  const { codigo } = useParams();
  const [estado, setEstado] = useState({ cargando: true });

  useEffect(() => {
    axios
      .get(`/api/v1/salud/verificar/receta/${encodeURIComponent(codigo)}`)
      .then((r) => setEstado({ receta: r.data.data }))
      .catch((err) => setEstado({
        noExiste: err.response?.status === 404,
        error: err.response?.data?.message || "No se pudo consultar. Revise su conexión e intente de nuevo.",
      }));
  }, [codigo]);

  const r = estado.receta;
  const e = r && (ESTADO[r.estado] ?? ESTADO.PENDIENTE);
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-lg">
        <header className="mb-4 flex items-center gap-2 text-slate-700">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-700 text-lg font-bold text-white" aria-hidden="true">+</span>
          <div>
            <p className="font-semibold leading-tight">Módulo Salud</p>
            <p className="text-xs text-slate-500">Verificación de recetas médicas</p>
          </div>
        </header>

        {estado.cargando && <p className="rounded-xl bg-white p-5 text-slate-500">Verificando la receta...</p>}

        {estado.error && (
          <section role="alert" className={`rounded-xl border-2 p-5 ${estado.noExiste ? "border-red-300 bg-red-50 text-red-900" : "border-slate-300 bg-white text-slate-700"}`}>
            <p className="text-xl font-bold">{estado.noExiste ? "✕ Receta no encontrada" : "No se pudo verificar"}</p>
            <p className="mt-1">{estado.error}</p>
            {estado.noExiste && <p className="mt-3 text-sm">No despache esta receta. Si cree que es un error, comuníquese con el hospital que la emitió.</p>}
          </section>
        )}

        {r && (
          <>
            <section role="status" className={`rounded-xl border-2 p-5 ${e.clase}`}>
              <p className="text-xl font-bold"><span aria-hidden="true">{e.icono} </span>{e.titulo}</p>
              <p className="mt-1">{e.detalle}</p>
              {r.estado === "DESPACHADA" && <p className="mt-1 text-sm">Despachada el {fecha(r.fecha_despacho)}.</p>}
            </section>

            <section className="mt-4 rounded-xl bg-white p-5 shadow-sm">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><dt className="text-slate-500">Receta No.</dt><dd className="font-semibold tabular-nums">{r.numero}</dd></div>
                <div><dt className="text-slate-500">Emitida</dt><dd>{fecha(r.fecha)}</dd></div>
                <div><dt className="text-slate-500">Médico</dt><dd>{r.medico ? `Dr(a). ${r.medico}` : "—"}</dd></div>
                <div><dt className="text-slate-500">Paciente</dt><dd>{r.paciente_iniciales || "—"}{r.paciente_dpi ? ` · DPI ${r.paciente_dpi}` : ""}</dd></div>
              </dl>
              <h2 className="mt-4 mb-1 text-sm font-semibold text-slate-700">Medicamentos</h2>
              <ul className="divide-y text-sm">
                {r.medicamentos.map((m, i) => (
                  <li key={i} className="flex justify-between gap-3 py-2">
                    <span>
                      <span className="font-medium">{m.medicamento}</span>
                      {m.presentacion && <span className="block text-xs text-slate-500">{m.presentacion}</span>}
                      {m.dosis && <span className="block text-xs text-slate-600">{m.dosis}</span>}
                    </span>
                    <span className="tabular-nums whitespace-nowrap">× {m.cantidad}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-slate-500">
                Compare estos datos con la receta en papel: si algo no coincide (medicamento, cantidad o número), la receta fue alterada.
                Por privacidad, del paciente solo se muestran las iniciales y los últimos 4 dígitos del DPI.
              </p>
            </section>
            <p className="mt-3 text-center text-xs text-slate-400">{r.establecimiento}</p>
          </>
        )}
      </div>
    </main>
  );
}
