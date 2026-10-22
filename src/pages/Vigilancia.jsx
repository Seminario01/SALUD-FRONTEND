import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import useUbicaciones from "../hooks/useUbicaciones";
import MapaGuatemala, { LeyendaMapa } from "../components/MapaGuatemala";
import GraficaLinea from "../components/GraficaLinea";
import BotonesExportar from "../components/Exportar";

// Vigilancia epidemiológica: casos por municipio de residencia (atenciones con código CIE-10).
// El backend cuenta, aplica la privacidad (municipios con menos de 3 pacientes ocultos para quien no
// ve pacientes) y marca la alerta de posible brote. Aquí solo se filtra y se dibuja.

const PERIODOS = [[7, "Últimos 7 días"], [28, "Últimas 4 semanas"], [90, "Últimos 3 meses"], [365, "Último año"]];
const EDADES = [["", "Todas las edades"], ["0-4", "0 a 4 años"], ["5-14", "5 a 14 años"], ["15-59", "15 a 59 años"], ["60-130", "60 años o más"]];
const ESCALA = [1, 2, 3, 4, 5].map((i) => `var(--mapa-${i})`);   // index.css: en oscuro, más casos = más brillante
const campo = "border rounded px-2 py-1.5 text-sm w-full";

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const diaCorto = (t) => new Date(`${t}T12:00:00`).toLocaleDateString("es-GT", { day: "numeric", month: "short" });
const fecha = (t) => new Date(t).toLocaleDateString("es-GT", { dateStyle: "medium" });

function Celda({ valor, maximo }) {
  if (!valor) return <td className="p-1.5 text-center text-slate-300 tabular-nums">·</td>;
  const i = Math.min(ESCALA.length - 1, Math.floor(((valor - 1) / Math.max(1, maximo)) * ESCALA.length));
  return (
    <td className="p-1 text-center">
      <span className="block rounded px-2 py-1 tabular-nums font-medium" style={{ background: ESCALA[i], color: `var(--mapa-texto-${i + 1})` }}>{valor}</span>
    </td>
  );
}

function PacientesDelMunicipio({ municipio, params }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    client.get("/vigilancia/pacientes", { params: { ...params, municipio } })
      .then((r) => { setLista(r.data.data); setError(null); })
      .catch((err) => setError(mensajeError(err)));
  }, [municipio, params]);
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!lista) return <p className="text-sm text-slate-400">Cargando...</p>;
  if (!lista.length) return <p className="text-sm text-slate-500">Sin casos con estos filtros.</p>;
  return (
    <ul className="divide-y text-sm max-h-80 overflow-y-auto">
      {lista.map((c, i) => (
        <li key={`${c.paciente_id}-${c.fecha}-${i}`} className="py-1.5">
          <Link to={`/pacientes/${c.paciente_id}`} className="font-medium text-blue-800 hover:underline">{c.nombre}</Link>
          <span className="text-slate-500"> · {c.edad ?? "?"} años{c.genero ? ` · ${c.genero}` : ""}</span>
          <p className="text-xs text-slate-600"><span className="font-mono">{c.codigo}</span> {c.cie10 || c.diagnostico} · {fecha(c.fecha)}</p>
          {c.zona && <p className="text-xs text-slate-500">{c.zona}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function Vigilancia() {
  const { puede } = useRoles();
  const vePacientes = puede("vigilancia.pacientes");
  const ub = useUbicaciones();
  const [grupos, setGrupos] = useState([]);
  const [dias, setDias] = useState(28);
  const [grupo, setGrupo] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [genero, setGenero] = useState("");
  const [edad, setEdad] = useState("");
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [elegido, setElegido] = useState(null);
  const [verPacientes, setVerPacientes] = useState(false);

  useEffect(() => { client.get("/vigilancia/grupos").then((r) => setGrupos(r.data.data)).catch(() => setGrupos([])); }, []);

  const params = useMemo(() => {
    const hoy = new Date();
    const desde = new Date(hoy.getTime() - (dias - 1) * 86400000);
    const [edadMin, edadMax] = edad ? edad.split("-") : [];
    return { desde: iso(desde), hasta: iso(hoy), grupo: grupo || undefined, departamento: departamento || undefined,
      genero: genero || undefined, edad_min: edadMin, edad_max: edadMax };
  }, [dias, grupo, departamento, genero, edad]);

  useEffect(() => {
    client.get("/vigilancia/casos", { params })
      .then((r) => { setDatos(r.data); setError(null); })
      .catch((err) => setError(mensajeError(err)));
  }, [params]);

  const valores = useMemo(() => Object.fromEntries((datos?.municipios ?? []).filter((m) => !m.pocos).map((m) => [m.codigo, m.casos])), [datos]);
  const pocos = useMemo(() => new Set((datos?.municipios ?? []).filter((m) => m.pocos).map((m) => m.codigo)), [datos]);
  // Sin filtro de enfermedad, el backend también revisa cada enfermedad por separado (más preciso)
  const listaAlertas = datos?.alertas_por_enfermedad?.length ? datos.alertas_por_enfermedad : (datos?.alertas ?? []);
  const alertas = useMemo(() => new Set([...(datos?.alertas ?? []), ...(datos?.alertas_por_enfermedad ?? [])].map((a) => a.municipio)), [datos]);
  const maximo = Math.max(0, ...Object.values(valores));
  const detalle = datos?.municipios.find((m) => m.codigo === elegido);
  const nombreElegido = detalle?.nombre ?? ub?.municipios?.find((m) => m.codigo === elegido)?.nombre;
  const columnas = [...grupos.map((g) => [g.grupo, g.nombre]), ["otros", "Otros"]]
    .filter(([g]) => (datos?.matriz ?? []).some((f) => f.grupos[g]));
  const maxCelda = Math.max(1, ...(datos?.matriz ?? []).flatMap((f) => Object.values(f.grupos)));
  const elegir = (codigo) => { setElegido(codigo); setVerPacientes(false); };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Vigilancia epidemiológica</h1>
        {datos && (
          <BotonesExportar nombre="vigilancia_por_municipio" titulo="Vigilancia epidemiológica: casos por municipio"
            filas={datos.municipios.filter((m) => !m.pocos)} columnas={[
              { titulo: "Departamento", valor: (m) => m.departamento_nombre, ancho: 18 },
              { titulo: "Municipio", valor: (m) => m.nombre, ancho: 26 },
              { titulo: "Casos", valor: (m) => m.casos, ancho: 8 },
              { titulo: "Pacientes", valor: (m) => m.pacientes, ancho: 10 },
              { titulo: "Últimos 7 días", valor: (m) => m.ultimos_7_dias, ancho: 14 },
              { titulo: "Promedio semanal previo", valor: (m) => m.promedio_semanal_previo, ancho: 22 },
              { titulo: "Alerta", valor: (m) => (m.alerta ? "Posible brote" : ""), ancho: 14 },
            ]} />
        )}
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Casos por municipio donde vive el paciente (atenciones con código CIE-10). Sirve para ver si una enfermedad se está juntando en una zona y actuar a tiempo.
      </p>

      <div className="bg-white border rounded-lg p-3 shadow-sm mb-4 grid grid-cols-2 md:grid-cols-5 gap-2" role="group" aria-label="Filtros de vigilancia">
        <label className="text-xs text-slate-600">Período
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))} className={campo}>
            {PERIODOS.map(([d, t]) => <option key={d} value={d}>{t}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600">Enfermedad
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className={campo}>
            <option value="">Todas (con código CIE-10)</option>
            {grupos.map((g) => <option key={g.grupo} value={g.grupo}>{g.nombre} ({g.codigos.join(", ")})</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600">Departamento
          <select value={departamento} onChange={(e) => { setDepartamento(e.target.value); setElegido(null); }} className={campo}>
            <option value="">Todo el país</option>
            {(ub?.departamentos ?? []).map((d) => <option key={d.codigo} value={d.codigo}>{d.nombre}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600">Sexo
          <select value={genero} onChange={(e) => setGenero(e.target.value)} className={campo}>
            <option value="">Todos</option><option value="F">Mujeres</option><option value="M">Hombres</option>
          </select>
        </label>
        <label className="text-xs text-slate-600">Edad
          <select value={edad} onChange={(e) => setEdad(e.target.value)} className={campo}>
            {EDADES.map(([v, t]) => <option key={v || "todas"} value={v}>{t}</option>)}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">No se pudo consultar: {error}</p>}

      {listaAlertas.length > 0 && (
        <section role="alert" className="mb-4 rounded-lg border-2 border-red-300 bg-red-50 p-3">
          <p className="font-semibold text-red-900">⚠ {listaAlertas.length === 1 ? "Posible brote" : `${listaAlertas.length} posibles brotes`}: aumento inusual de casos</p>
          <ul className="mt-1 space-y-1 text-sm text-red-900">
            {listaAlertas.map((a) => (
              <li key={`${a.municipio}-${a.grupo ?? ""}`}>
                <button onClick={() => elegir(a.municipio)} className="font-semibold underline">{a.nombre}, {a.departamento_nombre}</button>: {a.texto}.
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-red-800">Es un aviso para investigar (visitar la zona, revisar fuentes de agua o criaderos de zancudos, notificar): no confirma un brote.</p>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <h2 className="font-semibold text-slate-800">Mapa de calor por municipio</h2>
            {datos && <p className="text-sm text-slate-600"><span className="font-semibold tabular-nums">{datos.total_casos}</span> casos · <span className="tabular-nums">{datos.total_pacientes}</span> pacientes</p>}
          </div>
          <MapaGuatemala valores={valores} pocos={pocos} alertas={alertas} departamento={departamento || undefined}
            seleccionado={elegido} onElegir={elegir} />
          <div className="mt-2"><LeyendaMapa maximo={maximo} hayPocos={pocos.size > 0} hayAlertas={alertas.size > 0} /></div>
          <p className="mt-2 text-[11px] text-slate-400">
            Toque un municipio para ver el detalle. Límites municipales: CONRED / OCHA (HDX), licencia CC BY-IGO.
            {datos?.sin_ubicacion > 0 && ` ${datos.sin_ubicacion} atención(es) del período no entran porque el paciente no tiene municipio de residencia registrado.`}
            {datos?.sin_ubicacion > 0 && puede("pacientes.registrar") && <> <Link to="/pacientes/residencia" className="text-blue-700 hover:underline">Completar residencias →</Link></>}
          </p>
        </section>

        <aside className="bg-white border rounded-lg p-3 shadow-sm">
          {!elegido && (
            <>
              <h2 className="font-semibold text-slate-800 mb-2">Municipios con más casos</h2>
              {datos && datos.municipios.filter((m) => !m.pocos).length === 0 && <p className="text-sm text-slate-500">Sin casos con estos filtros.</p>}
              <ol className="space-y-1 text-sm">
                {(datos?.municipios ?? []).filter((m) => !m.pocos).slice(0, 10).map((m) => (
                  <li key={m.codigo}>
                    <button onClick={() => elegir(m.codigo)} className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left hover:bg-slate-50">
                      <span>{m.alerta && <span className="text-red-700" aria-label="posible brote">⚠ </span>}{m.nombre} <span className="text-xs text-slate-400">{m.departamento_nombre}</span></span>
                      <span className="font-semibold tabular-nums text-slate-800">{m.casos}</span>
                    </button>
                  </li>
                ))}
              </ol>
              {datos?.minimo_para_mostrar && pocos.size > 0 && (
                <p className="mt-2 text-xs text-slate-500">{pocos.size} municipio(s) con menos de {datos.minimo_para_mostrar} pacientes no muestran la cifra, para no identificar a nadie.</p>
              )}
            </>
          )}
          {elegido && (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-800">{nombreElegido}</h2>
                  <p className="text-xs text-slate-500">{detalle?.departamento_nombre ?? ""}</p>
                </div>
                <button onClick={() => setElegido(null)} className="text-xs text-blue-700 hover:underline">← Volver</button>
              </div>
              {!detalle && <p className="mt-2 text-sm text-slate-500">Sin casos con estos filtros.</p>}
              {detalle?.pocos && <p className="mt-2 text-sm text-slate-500">Menos de 3 pacientes: la cifra no se muestra para no identificar a nadie.</p>}
              {detalle && !detalle.pocos && (
                <>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded bg-slate-50 p-2"><dt className="text-xs text-slate-500">Casos en el período</dt><dd className="text-xl font-bold tabular-nums">{detalle.casos}</dd></div>
                    <div className="rounded bg-slate-50 p-2"><dt className="text-xs text-slate-500">Pacientes</dt><dd className="text-xl font-bold tabular-nums">{detalle.pacientes}</dd></div>
                    <div className="rounded bg-slate-50 p-2"><dt className="text-xs text-slate-500">Últimos 7 días</dt><dd className="text-xl font-bold tabular-nums">{detalle.ultimos_7_dias}</dd></div>
                    <div className="rounded bg-slate-50 p-2"><dt className="text-xs text-slate-500">Promedio semanal antes</dt><dd className="text-xl font-bold tabular-nums">{detalle.promedio_semanal_previo}</dd></div>
                  </dl>
                  {detalle.alerta && <p className="mt-2 rounded bg-red-50 px-2 py-1 text-sm font-medium text-red-800">⚠ Posible brote: más del doble de lo habitual.</p>}
                  {vePacientes && !verPacientes && (
                    <button onClick={() => setVerPacientes(true)} className="mt-3 w-full rounded bg-blue-700 px-3 py-1.5 text-sm text-white hover:bg-blue-800">Ver quiénes son los casos</button>
                  )}
                  {vePacientes && verPacientes && (
                    <div className="mt-3">
                      <p className="mb-1 text-xs text-slate-500">Esta consulta queda en la bitácora de accesos.</p>
                      <PacientesDelMunicipio municipio={elegido} params={params} />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </aside>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <section className="bg-white border rounded-lg p-3 shadow-sm">
          {datos?.semanas?.length > 1 ? (
            <GraficaLinea titulo="Casos por semana" unidad="casos" series={[{ clave: "casos", nombre: "Casos", color: "#2a78d6" }]}
              puntos={datos.semanas.map((s) => ({ fecha: `${s.hasta}T12:00`, valores: { casos: s.casos }, nota: `${diaCorto(s.desde)} – ${diaCorto(s.hasta)}` }))} />
          ) : <p className="text-sm text-slate-500">Elija un período de 2 semanas o más para ver la tendencia.</p>}
        </section>
        <section className="lg:col-span-2 bg-white border rounded-lg p-3 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-2">Tabla de calor: municipio × enfermedad</h2>
          {!datos?.matriz?.length ? <p className="text-sm text-slate-500">Sin casos con estos filtros.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500">
                    <th className="p-1.5 text-left font-medium">Municipio</th>
                    {columnas.map(([g, n]) => <th key={g} className="p-1.5 font-medium">{n}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {datos.matriz.map((f) => (
                    <tr key={f.municipio} className="border-t">
                      <td className="p-1.5"><button onClick={() => elegir(f.municipio)} className="text-left hover:underline">{alertas.has(f.municipio) && <span className="text-red-700">⚠ </span>}{f.nombre}</button></td>
                      {columnas.map(([g]) => <Celda key={g} valor={f.grupos[g]} maximo={maxCelda} />)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
