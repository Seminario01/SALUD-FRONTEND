import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import { PUESTOS } from "../permisos";
import Paginacion from "../components/Paginacion";
import usePaginacion from "../hooks/usePaginacion";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";

const COLOR_ESTADO = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  DESPACHADA: "bg-green-100 text-green-800",
  ANULADA: "bg-red-100 text-red-800",
};
const NOMBRE_ESTADO = { PENDIENTE: "Pendiente", DESPACHADA: "Despachada", ANULADA: "Anulada" };

function formatoFecha(texto) {
  if (!texto) return "—";
  const fecha = new Date(String(texto).replace(" ", "T"));
  return isNaN(fecha) ? texto : fecha.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

const filaVacia = () => ({ medicamento_id: "", cantidad: "", dosis: "" });

function FormularioReceta({ pacientes, pacienteInicial, onCreada }) {
  const [pacienteId, setPacienteId] = useState(pacienteInicial || "");
  const [atenciones, setAtenciones] = useState([]);
  const [expedienteId, setExpedienteId] = useState("");
  const [medicamentos, setMedicamentos] = useState([]);
  const [filas, setFilas] = useState([filaVacia()]);
  const [indicaciones, setIndicaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  useEffect(() => {
    client.get("/medicamentos").then((r) => setMedicamentos(r.data.data)).catch(() => setMedicamentos([]));
  }, []);

  // Atenciones del expediente del paciente, para ligar la receta al diagnóstico
  useEffect(() => {
    if (!pacienteId) return;
    client
      .get(`/expedientes/${pacienteId}`)
      .then((r) => {
        setAtenciones(r.data.data);
        setExpedienteId(r.data.data[0]?.id ? String(r.data.data[0].id) : "");
      })
      .catch(() => { setAtenciones([]); setExpedienteId(""); });
  }, [pacienteId]);

  const medicamento = (id) => medicamentos.find((m) => String(m.id) === String(id));
  const cambiarFila = (i, campo, valor) => setFilas((f) => f.map((fila, j) => (j === i ? { ...fila, [campo]: valor } : fila)));

  function cambiarPaciente(valor) {
    setPacienteId(valor);
    if (!valor) { setAtenciones([]); setExpedienteId(""); }
  }

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setExito(null);
    client
      .post("/recetas", {
        paciente_id: Number(pacienteId),
        expediente_id: expedienteId ? Number(expedienteId) : undefined,
        indicaciones,
        items: filas.map((f) => ({ medicamento_id: Number(f.medicamento_id), cantidad: Number(f.cantidad), dosis: f.dosis })),
      })
      .then((res) => {
        setExito(`Receta No. ${res.data.data.id} emitida. Farmacia ya puede despacharla.`);
        setFilas([filaVacia()]);
        setIndicaciones("");
        onCreada();
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  const campo = "border rounded px-3 py-1.5 w-full";
  const completas = pacienteId && filas.every((f) => f.medicamento_id && Number(f.cantidad) > 0);
  return (
    <form onSubmit={enviar} className="bg-white border rounded-lg p-4 shadow-sm mb-6">
      <h2 className="font-bold text-gray-700 mb-3">Nueva receta</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm">
          Paciente *
          <select value={pacienteId} onChange={(e) => cambiarPaciente(e.target.value)} required className={campo}>
            <option value="">Seleccione...</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre_completo} (CUI {p.cui})</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Atención / diagnóstico
          <select value={expedienteId} onChange={(e) => setExpedienteId(e.target.value)} disabled={!pacienteId} className={campo}>
            <option value="">Sin asociar</option>
            {atenciones.map((a) => (
              <option key={a.id} value={a.id}>{String(a.fecha_atencion).slice(0, 10)} — {a.diagnostico}</option>
            ))}
          </select>
        </label>
      </div>

      <table className="w-full text-left text-sm mt-4">
        <thead>
          <tr className="text-slate-500">
            <th className="py-1 pr-2 font-medium">Medicamento *</th>
            <th className="py-1 pr-2 font-medium w-24">Cantidad *</th>
            <th className="py-1 pr-2 font-medium">Dosis</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => {
            const m = medicamento(f.medicamento_id);
            const insuficiente = m && Number(f.cantidad) > m.existencia;
            return (
              <tr key={i} className="align-top">
                <td className="py-1 pr-2">
                  <select value={f.medicamento_id} onChange={(e) => cambiarFila(i, "medicamento_id", e.target.value)} required className={campo} aria-label={`Medicamento ${i + 1}`}>
                    <option value="">Seleccione...</option>
                    {medicamentos.map((med) => (
                      <option key={med.id} value={med.id}>
                        {med.nombre}{med.presentacion ? ` — ${med.presentacion}` : ""} (existencia {med.existencia})
                      </option>
                    ))}
                  </select>
                  {insuficiente && <p className="text-xs text-amber-700 mt-0.5">Farmacia solo tiene {m.existencia}; podrá despacharse cuando haya existencia.</p>}
                </td>
                <td className="py-1 pr-2">
                  <input type="number" min="1" value={f.cantidad} onChange={(e) => cambiarFila(i, "cantidad", e.target.value)} required className={campo} aria-label={`Cantidad ${i + 1}`} />
                </td>
                <td className="py-1 pr-2">
                  <input value={f.dosis} onChange={(e) => cambiarFila(i, "dosis", e.target.value)} maxLength={200} placeholder="1 tableta cada 8 horas por 5 días" className={campo} aria-label={`Dosis ${i + 1}`} />
                </td>
                <td className="py-1">
                  {filas.length > 1 && (
                    <button type="button" onClick={() => setFilas((x) => x.filter((_, j) => j !== i))} className="text-red-600 px-2 py-1.5 hover:bg-red-50 rounded" aria-label={`Quitar medicamento ${i + 1}`}>✕</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filas.length < 10 && (
        <button type="button" onClick={() => setFilas((f) => [...f, filaVacia()])} className="text-sm text-blue-700 hover:underline mt-1">
          + Agregar medicamento
        </button>
      )}

      <label className="text-sm block mt-3">
        Indicaciones
        <textarea value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} rows={2} maxLength={1000} className={campo} />
      </label>

      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={enviando || !completas} className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50">
          {enviando ? "Emitiendo..." : "Emitir receta"}
        </button>
        {exito && <span className="text-sm text-green-700">{exito}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

function TarjetaReceta({ receta, mostrarPaciente, puedeDespachar, puedeAnular, onDespachar, onAnular, ocupado }) {
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const pendiente = receta.estado === "PENDIENTE";
  const faltante = receta.items.some((it) => it.existencia !== null && it.cantidad > it.existencia);
  const boton = "text-xs px-3 py-1.5 rounded border hover:bg-gray-100 disabled:opacity-50";

  return (
    <article className="bg-white border rounded-lg p-4 shadow-sm" data-receta={receta.id}>
      <header className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-slate-800">
            Receta No. {receta.id}
            {mostrarPaciente && <span className="font-normal text-slate-600"> · {receta.paciente ?? `Paciente ${receta.paciente_id}`}</span>}
          </p>
          <p className="text-xs text-slate-500">
            {formatoFecha(receta.fecha)}{receta.medico ? ` · Dr(a). ${receta.medico}` : ""}
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${COLOR_ESTADO[receta.estado] ?? "bg-gray-100"}`}>
          {NOMBRE_ESTADO[receta.estado] ?? receta.estado}
        </span>
      </header>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b">
            <th className="py-1 font-medium">Medicamento</th>
            <th className="py-1 font-medium text-right w-20">Cantidad</th>
            <th className="py-1 font-medium pl-4">Dosis</th>
            {pendiente && puedeDespachar && <th className="py-1 font-medium text-right w-24">Existencia</th>}
          </tr>
        </thead>
        <tbody>
          {receta.items.map((it) => {
            const falta = it.existencia !== null && it.cantidad > it.existencia;
            return (
              <tr key={it.medicamento_id} className="border-b last:border-0">
                <td className="py-1">
                  {it.medicamento}
                  {it.presentacion && <span className="text-slate-400"> — {it.presentacion}</span>}
                </td>
                <td className="py-1 text-right tabular-nums">{it.cantidad}</td>
                <td className="py-1 pl-4 text-slate-600">{it.dosis || "—"}</td>
                {pendiente && puedeDespachar && (
                  <td className={`py-1 text-right tabular-nums ${falta ? "text-red-700 font-semibold" : "text-slate-600"}`}>{it.existencia}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {receta.indicaciones && <p className="text-sm text-slate-600 mt-2"><span className="font-medium">Indicaciones:</span> {receta.indicaciones}</p>}
      {receta.estado === "DESPACHADA" && <p className="text-xs text-green-700 mt-2">Despachada el {formatoFecha(receta.fecha_despacho)}</p>}
      {receta.estado === "ANULADA" && <p className="text-xs text-red-700 mt-2">Anulada: {receta.motivo_anulacion}</p>}

      {pendiente && (puedeDespachar || puedeAnular) && (
        <footer className="flex flex-wrap items-center gap-2 mt-3">
          {puedeDespachar && (
            <button onClick={() => onDespachar(receta)} disabled={ocupado || faltante} className="text-sm px-3 py-1.5 rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-50">
              {ocupado ? "Despachando..." : "Despachar"}
            </button>
          )}
          {puedeDespachar && faltante && <span className="text-xs text-red-700">Sin existencia suficiente</span>}
          {puedeAnular && !anulando && <button onClick={() => setAnulando(true)} className={`${boton} text-red-700`}>Anular</button>}
          {puedeAnular && anulando && (
            <form onSubmit={(e) => { e.preventDefault(); onAnular(receta, motivo); }} className="flex flex-wrap items-center gap-2">
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} required maxLength={255} placeholder="Motivo de la anulación" className="border rounded px-2 py-1 text-sm w-64" aria-label="Motivo de la anulación" />
              <button type="submit" disabled={ocupado} className={`${boton} text-red-700`}>Confirmar anulación</button>
              <button type="button" onClick={() => setAnulando(false)} className={boton}>Cancelar</button>
            </form>
          )}
        </footer>
      )}
    </article>
  );
}

export default function Recetas() {
  const auth = useAuth();
  const miSub = auth.user?.profile?.sub;
  const { puede, roles } = useRoles();
  const esPersonal = puede("recetas.ver");
  const puedeCrear = puede("recetas.crear");
  const puedeDespachar = puede("recetas.despachar");
  const esJefatura = roles.includes(PUESTOS.JEFATURA);
  const [params] = useSearchParams();
  const { pacientes } = usePacientesSeleccionables(puedeCrear);

  const [recetas, setRecetas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [estado, setEstado] = useState(puedeDespachar ? "PENDIENTE" : "");
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const cargar = useCallback(() => {
    client
      .get("/recetas")
      .then((r) => { setRecetas(r.data.data); setError(null); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = recetas.filter((r) => {
    if (estado && r.estado !== estado) return false;
    if (texto) {
      const t = texto.toLowerCase();
      const enPaciente = (r.paciente ?? "").toLowerCase().includes(t);
      const enMedicamento = r.items.some((it) => (it.medicamento ?? "").toLowerCase().includes(t));
      if (!enPaciente && !enMedicamento && String(r.id) !== t) return false;
    }
    return true;
  });
  const pag = usePaginacion(filtradas, 10);
  const cuenta = (e) => recetas.filter((r) => r.estado === e).length;

  function despachar(receta) {
    setOcupado(receta.id);
    setAviso(null);
    setErrorAccion(null);
    client
      .post(`/recetas/${receta.id}/despachar`)
      .then(() => { setAviso(`Receta No. ${receta.id} despachada. El inventario se actualizó.`); cargar(); })
      .catch((err) => setErrorAccion(mensajeError(err)))
      .finally(() => setOcupado(null));
  }

  function anular(receta, motivo) {
    setOcupado(receta.id);
    setAviso(null);
    setErrorAccion(null);
    client
      .post(`/recetas/${receta.id}/anular`, { motivo })
      .then(() => { setAviso(`Receta No. ${receta.id} anulada.`); cargar(); })
      .catch((err) => setErrorAccion(mensajeError(err)))
      .finally(() => setOcupado(null));
  }

  if (cargando) return <p className="p-6">Cargando...</p>;

  const pestana = (valor, etiqueta) => (
    <button
      key={valor || "todas"}
      onClick={() => setEstado(valor)}
      className={`px-3 py-1.5 text-sm rounded-full border ${estado === valor ? "bg-blue-700 text-white border-blue-700" : "bg-white hover:bg-slate-100"}`}
    >
      {etiqueta}{valor && <span className="ml-1 opacity-75">({cuenta(valor)})</span>}
    </button>
  );

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">{esPersonal ? "Recetas" : "Mis recetas"}</h1>

      {puedeCrear && <FormularioReceta pacientes={pacientes} pacienteInicial={params.get("paciente") ?? ""} onCreada={cargar} />}

      {error && <p className="mb-4 text-red-600 text-sm">No se pudieron cargar las recetas: {error}</p>}
      {errorAccion && <p className="mb-4 text-red-600 text-sm">{errorAccion}</p>}
      {aviso && <p className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{aviso}</p>}

      {!error && recetas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {pestana("PENDIENTE", "Pendientes")}
          {pestana("DESPACHADA", "Despachadas")}
          {pestana("ANULADA", "Anuladas")}
          {pestana("", "Todas")}
          {esPersonal && (
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar paciente, medicamento o No." className="border rounded px-3 py-1.5 text-sm ml-auto w-72" aria-label="Buscar receta" />
          )}
        </div>
      )}

      {!error && recetas.length === 0 && <p className="text-gray-500 text-sm">{esPersonal ? "No hay recetas registradas." : "No tiene recetas."}</p>}
      {!error && recetas.length > 0 && filtradas.length === 0 && <p className="text-gray-500 text-sm">No hay recetas en esta categoría.</p>}

      <div className="space-y-3">
        {pag.items.map((r) => (
          <TarjetaReceta
            key={r.id}
            receta={r}
            mostrarPaciente={esPersonal}
            puedeDespachar={puedeDespachar}
            puedeAnular={puede("recetas.anular") && (esJefatura || (r.medico_sub && r.medico_sub === miSub))}
            onDespachar={despachar}
            onAnular={anular}
            ocupado={ocupado === r.id}
          />
        ))}
      </div>
      <Paginacion {...pag} />
    </div>
  );
}
