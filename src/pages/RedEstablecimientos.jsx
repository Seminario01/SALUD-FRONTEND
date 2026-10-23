import { useEffect, useMemo, useState } from "react";
import { mensajeError } from "../api/client";
import client from "../api/client";
import MapaGuatemala from "../components/MapaGuatemala";
import { useAvisos } from "../components/Avisos";
import useRoles from "../hooks/useRoles";
import { ATENCION, ESTADO_SERVICIO, cargarRed, recargarRed } from "../utils/red";

// Red de establecimientos: los 45 hospitales públicos del MSPAS y los que agregue Administración.
// Mapa por municipio (cuántos establecimientos hay), filtros y tabla; Administración completa
// dirección, teléfono, estado y tipo de atención (lo mismo ve Seguridad en WS-SALUD-02).
const campo = "border rounded px-2 py-1.5 text-sm w-full";
const ORDEN_NIVEL = ["Referencia nacional", "Especializado", "Regional", "Nacional", "Departamental", "Distrital"];

function Editor({ e, opciones, onGuardado, onCerrar }) {
  const avisos = useAvisos();
  const [form, setForm] = useState({ direccion: e.direccion || "", telefono: e.telefono || "", estado_servicio: e.estado_servicio, tipo_atencion: e.tipo_atencion });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  function guardar(ev) {
    ev.preventDefault();
    setEnviando(true);
    setError(null);
    client.put(`/establecimientos/${e.id}`, { ...form, telefono: form.telefono.trim() || null, direccion: form.direccion.trim() || null })
      .then(() => { avisos.exito(`${e.nombre} actualizado.`); onGuardado(); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }
  const marcar = (t) => setForm({ ...form, tipo_atencion: form.tipo_atencion.includes(t) ? form.tipo_atencion.filter((x) => x !== t) : [...form.tipo_atencion, t] });
  return (
    <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-2 bg-slate-50 border rounded-lg p-3 mt-2">
      <label className="text-sm">Dirección<input value={form.direccion} onChange={(x) => setForm({ ...form, direccion: x.target.value })} maxLength={250} className={campo} /></label>
      <label className="text-sm">Teléfono<input value={form.telefono} onChange={(x) => setForm({ ...form, telefono: x.target.value })} inputMode="tel" className={campo} /></label>
      <label className="text-sm">Estado
        <select value={form.estado_servicio} onChange={(x) => setForm({ ...form, estado_servicio: x.target.value })} className={campo}>
          {opciones.estados.map((s) => <option key={s} value={s}>{ESTADO_SERVICIO[s] ?? s}</option>)}
        </select>
      </label>
      <fieldset className="text-sm">
        <legend className="text-slate-600">Atención que da</legend>
        <div className="flex flex-wrap gap-3 mt-1">
          {opciones.tipos_atencion.map((t) => (
            <label key={t} className="flex items-center gap-1"><input type="checkbox" checked={form.tipo_atencion.includes(t)} onChange={() => marcar(t)} />{ATENCION[t] ?? t}</label>
          ))}
        </div>
      </fieldset>
      {error && <p className="sm:col-span-2 text-sm text-red-700" role="alert">{error}</p>}
      <div className="sm:col-span-2 flex gap-2">
        <button disabled={enviando} className="bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-800 disabled:opacity-60">{enviando ? "Guardando..." : "Guardar"}</button>
        <button type="button" onClick={onCerrar} className="px-4 py-1.5 rounded-lg border text-sm hover:bg-slate-50">Cancelar</button>
      </div>
    </form>
  );
}

export default function RedEstablecimientos() {
  const { puede } = useRoles();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [depto, setDepto] = useState("");
  const [nivel, setNivel] = useState("");
  const [buscar, setBuscar] = useState("");
  const [municipio, setMunicipio] = useState(null);
  const [editando, setEditando] = useState(null);

  useEffect(() => { cargarRed().then(setDatos).catch((e) => setError(mensajeError(e))); }, []);
  const recargar = () => recargarRed().then((d) => { setDatos(d); setEditando(null); }).catch((e) => setError(mensajeError(e)));

  const lista = useMemo(() => {
    const t = buscar.trim().toLowerCase();
    return (datos?.establecimientos ?? []).filter((e) => (!depto || e.codigo_municipio?.startsWith(depto)) && (!nivel || e.nivel === nivel)
      && (!municipio || e.codigo_municipio === municipio)
      && (!t || e.nombre.toLowerCase().includes(t) || (e.municipio || "").toLowerCase().includes(t)));
  }, [datos, depto, nivel, buscar, municipio]);
  const valores = useMemo(() => {
    const v = {};
    for (const e of datos?.establecimientos ?? []) if (e.codigo_municipio && (!nivel || e.nivel === nivel)) v[e.codigo_municipio] = (v[e.codigo_municipio] || 0) + 1;
    return v;
  }, [datos, nivel]);
  const departamentos = useMemo(() => {
    const m = new Map();
    for (const e of datos?.establecimientos ?? []) if (e.codigo_municipio) m.set(e.codigo_municipio.slice(0, 2), e.departamento);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [datos]);
  const niveles = useMemo(() => [...new Set((datos?.establecimientos ?? []).map((e) => e.nivel).filter(Boolean))]
    .sort((a, b) => (ORDEN_NIVEL.indexOf(a) + 99) % 99 - (ORDEN_NIVEL.indexOf(b) + 99) % 99 || a.localeCompare(b)), [datos]);

  if (error) return <p className="p-6 text-red-600">No se pudo cargar la red: {error}</p>;
  if (!datos) return <p className="p-6 text-slate-500">Cargando...</p>;
  const hospitales = datos.establecimientos.filter((e) => e.tipo === "HOSPITAL").length;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Red de establecimientos</h1>
        <p className="text-slate-500 mt-1 text-sm max-w-3xl">
          {hospitales} hospitales públicos y {datos.establecimientos.length - hospitales} establecimientos más en {departamentos.length} departamentos.
          Se usa para referir pacientes y es la misma lista que consulta Seguridad para ubicar atención de emergencia.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 bg-white border rounded-lg p-3">
        <label className="text-sm">Departamento
          <select value={depto} onChange={(e) => { setDepto(e.target.value); setMunicipio(null); }} className={campo}>
            <option value="">Todo el país</option>
            {departamentos.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </label>
        <label className="text-sm">Nivel
          <select value={nivel} onChange={(e) => setNivel(e.target.value)} className={campo}>
            <option value="">Todos</option>
            {niveles.map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <label className="text-sm">Buscar
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre o municipio" className={campo} />
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <section className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Establecimientos por municipio</h2>
            {municipio && <button onClick={() => setMunicipio(null)} className="text-sm text-blue-700 hover:underline">Ver todos</button>}
          </div>
          <MapaGuatemala valores={valores} departamento={depto || undefined} seleccionado={municipio} onElegir={(c) => setMunicipio(c === municipio ? null : c)} />
          <p className="text-xs text-slate-500 mt-2">Toque un municipio para ver sus establecimientos. Más oscuro = más establecimientos.</p>
        </section>
        <section className="bg-white border rounded-lg p-3">
          <h2 className="font-semibold mb-2">Por nivel</h2>
          <ul className="text-sm space-y-1">
            {niveles.map((n) => {
              const total = datos.establecimientos.filter((e) => e.nivel === n).length;
              return (
                <li key={n} className="flex items-center gap-2">
                  <span className="w-40 shrink-0">{n}</span>
                  <span className="h-2.5 rounded-full bg-blue-600" style={{ width: `${(total / hospitales) * 100}%` }} aria-hidden="true" />
                  <span className="tabular-nums text-slate-600">{total}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-slate-500 mt-4">
            Fuente: <a href={datos.fuente.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{datos.fuente.texto}</a>. {datos.fuente.nota}
          </p>
        </section>
      </div>

      <section>
        <h2 className="font-semibold mb-2">{lista.length} establecimiento(s)</h2>
        <table className="w-full">
          <thead><tr className="text-left"><th className="p-2">Establecimiento</th><th className="p-2">Ubicación</th><th className="p-2">Atención</th><th className="p-2">Contacto</th><th className="p-2" /></tr></thead>
          <tbody>
            {lista.map((e) => (
              <tr key={e.id} className="align-top">
                <td className="p-2">
                  <span className="font-medium">{e.nombre}</span>
                  <span className="block text-xs text-slate-500">{e.nivel || e.tipo}{e.referencias_90_dias > 0 && ` · ${e.referencias_90_dias} referencia(s) en 90 días`}</span>
                  {e.estado_servicio !== "ACTIVO" && <span className="text-[11px] bg-amber-100 text-amber-800 rounded px-1.5">{ESTADO_SERVICIO[e.estado_servicio] ?? e.estado_servicio}</span>}
                  {editando === e.id && <Editor e={e} opciones={datos} onGuardado={recargar} onCerrar={() => setEditando(null)} />}
                </td>
                <td className="p-2 text-sm">{e.municipio}<span className="block text-xs text-slate-500">{e.departamento}</span></td>
                <td className="p-2 text-xs">{e.tipo_atencion.map((t) => ATENCION[t] ?? t).join(", ") || "—"}</td>
                <td className="p-2 text-sm">{e.telefono || <span className="text-slate-400">Sin teléfono</span>}<span className="block text-xs text-slate-500">{e.direccion}</span></td>
                <td className="p-2 text-right">
                  {puede("establecimientos.gestionar") && editando !== e.id && (
                    <button onClick={() => setEditando(e.id)} className="text-sm text-blue-700 hover:underline">Completar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
