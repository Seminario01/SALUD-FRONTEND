import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import { useAvisos } from "../components/Avisos";
import NombrePaciente from "../components/NombrePaciente";

// Jornadas de vacunación coordinadas con Educación (routes/jornadas.py). Educación las pide por WS-SALUD-01
// o el personal las coordina aquí; en las dos, Educación devuelve los estudiantes convocados.

const campo = "border rounded px-3 py-1.5 w-full";
const hoy = () => new Date().toLocaleDateString("en-CA");
const fechaLarga = (f) => (f ? new Date(`${f}T12:00:00`).toLocaleDateString("es-GT", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—");
const VACIO = { tipo_jornada: "", lugar: "", fecha: "", hora: "08:00" };

function NuevaJornada({ onCreada }) {
  const [datos, setDatos] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client.post("/jornadas", datos)
      .then((r) => { setDatos(VACIO); onCreada(r.data.data, r.data.message); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  return (
    <form onSubmit={enviar} className="bg-white border rounded-lg p-4 shadow-sm mb-6">
      <h2 className="font-bold text-gray-700 mb-3">Coordinar una jornada con Educación</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm">Tipo de jornada *
          <input name="tipo_jornada" value={datos.tipo_jornada} onChange={cambiar} required minLength={3} maxLength={150}
            placeholder="Ej.: Vacunación Td y VPH" className={campo} />
        </label>
        <label className="text-sm md:col-span-2">Establecimiento educativo *
          <input name="lugar" value={datos.lugar} onChange={cambiar} required minLength={3} maxLength={200}
            placeholder="Ej.: INEB Jornada Matutina, Antigua Guatemala" className={campo} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">Fecha *
            <input type="date" name="fecha" value={datos.fecha} onChange={cambiar} required min={hoy()} className={campo} />
          </label>
          <label className="text-sm">Hora *
            <input type="time" name="hora" value={datos.hora} onChange={cambiar} required className={campo} />
          </label>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enviando} className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50">
          {enviando ? "Consultando a Educación..." : "Coordinar y traer estudiantes"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

function DetalleJornada({ id, registra, onCambio }) {
  const [jornada, setJornada] = useState(null);
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  const avisos = useAvisos();

  const cargar = useCallback(() => client.get(`/jornadas/${id}`)
    .then((r) => { setJornada(r.data.data); setError(null); })
    .catch((err) => setError(mensajeError(err))), [id]);
  useEffect(() => { cargar(); }, [cargar]);

  function marcar(e, vacunado) {
    setOcupado(e.id);
    client.put(`/jornadas/${id}/estudiantes/${e.id}`, { vacunado })
      .then((r) => { avisos.exito(r.data.message); cargar(); onCambio(); })
      .catch((err) => avisos.error(mensajeError(err)))
      .finally(() => setOcupado(null));
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!jornada) return <p className="text-sm text-slate-400">Cargando...</p>;
  return (
    <section className="bg-white border rounded-lg p-4 shadow-sm" aria-label="Estudiantes convocados">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="font-bold text-slate-800">{jornada.tipo_jornada} · {jornada.lugar}</h2>
        <span className="text-sm text-slate-500">{jornada.vacunados} de {jornada.convocados} vacunados</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2">Estudiante</th>
              <th className="p-2">Grado y sección</th>
              <th className="p-2">En Salud</th>
              <th className="p-2">Vacunado en la jornada</th>
            </tr>
          </thead>
          <tbody>
            {jornada.estudiantes.map((e) => (
              <tr key={e.id} className="border-b align-top">
                <td className="p-2">
                  {e.paciente_id ? <NombrePaciente id={e.paciente_id} nombre={e.nombre} /> : <span className="font-medium text-slate-800">{e.nombre}</span>}
                  {e.cui && <span className="block text-xs text-slate-500">DPI {e.cui}</span>}
                </td>
                <td className="p-2 text-slate-700">
                  {e.grado || "—"}{e.seccion ? ` · sección ${e.seccion}` : ""}
                  {e.jornada && <span className="block text-xs text-slate-500">Jornada {e.jornada}</span>}
                </td>
                <td className="p-2">
                  {!e.paciente_id ? <span className="text-xs text-slate-500">No registrado en Salud</span>
                    : e.esquema_completo === null ? <span className="text-xs text-slate-500">Sin registro de vacunación</span>
                      : e.esquema_completo ? <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">Esquema completo</span>
                        : <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">Pendiente: {e.vacunas_pendientes || "—"}</span>}
                </td>
                <td className="p-2">
                  {registra ? (
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={e.vacunado} disabled={ocupado === e.id}
                        onChange={(ev) => marcar(e, ev.target.checked)} aria-label={`Vacunado: ${e.nombre}`} />
                      {e.vacunado ? "Sí" : "No"}
                    </label>
                  ) : (e.vacunado ? "Sí" : "No")}
                  {e.vacunado && e.vacunado_por && <span className="block text-xs text-slate-500">por {e.vacunado_por}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Jornadas() {
  const { puede } = useRoles();
  const registra = puede("vacunacion.registrar");
  const avisos = useAvisos();
  const [jornadas, setJornadas] = useState(null);
  const [error, setError] = useState(null);
  const [abierta, setAbierta] = useState(null);

  const cargar = useCallback(() => client.get("/jornadas")
    .then((r) => { setJornadas(r.data.data); setError(null); })
    .catch((err) => setError(mensajeError(err))), []);
  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Jornadas de vacunación con Educación</h1>
        <Link to="/vacunacion" className="text-sm px-3 py-1.5 rounded border border-blue-700 text-blue-800 hover:bg-blue-50">← Vacunación</Link>
      </div>

      {registra && <NuevaJornada onCreada={(j, mensaje) => { avisos.exito(mensaje); cargar(); setAbierta(j.id); }} />}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {jornadas?.length === 0 && (
        <p className="text-sm text-slate-500">Todavía no hay jornadas. Aparecen cuando Educación coordina una (WS-SALUD-01) o cuando se coordina aquí.</p>
      )}
      {jornadas?.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {jornadas.map((j) => (
            <li key={j.id}>
              <button type="button" onClick={() => setAbierta(j.id)} aria-pressed={abierta === j.id}
                className={`w-full text-left rounded-lg border p-3 ${abierta === j.id ? "border-blue-700 ring-2 ring-blue-200 bg-blue-50" : "bg-white hover:bg-slate-50"}`}>
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">{j.tipo_jornada}</span>
                  <span className={`text-[11px] rounded-full px-2 py-0.5 ${j.origen === "Educación" ? "bg-violet-100 text-violet-800" : "bg-blue-100 text-blue-800"}`}>
                    {j.origen === "Educación" ? "Pedida por Educación" : "Coordinada por Salud"}
                  </span>
                </span>
                <span className="block text-sm text-slate-600">{j.lugar}</span>
                <span className="block text-sm text-slate-500">{fechaLarga(j.fecha)} · {j.hora}</span>
                <span className="block text-sm mt-1">
                  <span className="font-semibold tabular-nums">{j.convocados}</span> estudiante(s) convocado(s) ·{" "}
                  <span className="tabular-nums">{j.vacunados}</span> vacunado(s)
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {abierta && <DetalleJornada key={abierta} id={abierta} registra={registra} onCambio={cargar} />}
    </div>
  );
}
