import { useCallback, useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import { useAvisos } from "./Avisos";

// Curvas de crecimiento de la OMS (0 a 5 años) en la ficha del paciente. El backend calcula la
// puntuación z y la clasificación (crecimiento.py); aquí se registran mediciones y se dibuja.
// Líneas de referencia en gris (0, ±2 y ±3 DE) y las mediciones del niño en azul.

const SERIE = "#2a78d6";
const NIVEL = {
  normal: { clase: "border-green-200 bg-green-50 text-green-900", icono: "✓" },
  vigilar: { clase: "border-amber-200 bg-amber-50 text-amber-900", icono: "!" },
  alerta: { clase: "border-orange-300 bg-orange-50 text-orange-900", icono: "⚠" },
  grave: { clase: "border-red-300 bg-red-50 text-red-900", icono: "⚠" },
};
const LINEAS = [
  { z: "3", texto: "+3", trazo: "#cbd5e1", guion: "2 3" }, { z: "2", texto: "+2", trazo: "#94a3b8", guion: "6 4" },
  { z: "0", texto: "0", trazo: "#475569", guion: "" },
  { z: "-2", texto: "−2", trazo: "#94a3b8", guion: "6 4" }, { z: "-3", texto: "−3", trazo: "#cbd5e1", guion: "2 3" },
];
const ANCHO = 640;
const ALTO = 300;
const M = { arriba: 12, abajo: 30, izquierda: 44, derecha: 30 };
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fechaCorta = (t) => new Date(`${t}T12:00:00`).toLocaleDateString("es-GT", { dateStyle: "medium" });
const edadTexto = (meses) => (meses < 24 ? `${meses.toFixed(1).replace(".0", "")} meses` : `${Math.floor(meses / 12)} años ${Math.round(meses % 12)} meses`);

function Grafica({ curva, puntos, eje, unidad }) {
  const [activo, setActivo] = useState(null);
  const todas = Object.values(curva.lineas).flat();
  if (!todas.length) return null;
  const enDias = eje === "dias";
  const xs = todas.map((p) => p.x);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const ys = [...todas.map((p) => p.y), ...puntos.map((p) => p.y)];
  const y0 = Math.floor(Math.min(...ys));
  const y1 = Math.ceil(Math.max(...ys));
  const W = ANCHO - M.izquierda - M.derecha;
  const H = ALTO - M.arriba - M.abajo;
  const x = (v) => M.izquierda + ((v - x0) / (x1 - x0)) * W;
  const y = (v) => M.arriba + H - ((v - y0) / (y1 - y0)) * H;
  const ruta = (ps) => ps.map((p, i) => `${i ? "L" : "M"}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join("");
  const marcasX = enDias ? Array.from({ length: 11 }, (_, i) => i * 6).map((m) => ({ v: m * 30.4375, t: `${m}` }))
    : Array.from({ length: 30 }, (_, i) => x0 + i * 5).filter((v) => v <= x1).map((v) => ({ v, t: `${v}` }));
  const pasoY = (y1 - y0) > 40 ? 10 : (y1 - y0) > 16 ? 5 : 2;
  const marcasY = [];
  for (let v = Math.ceil(y0 / pasoY) * pasoY; v <= y1; v += pasoY) marcasY.push(v);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full h-auto" role="img" aria-label={`${curva.nombre}: mediciones del paciente sobre las curvas de la OMS`}>
        {marcasY.map((v) => (
          <g key={v}>
            <line x1={M.izquierda} x2={ANCHO - M.derecha} y1={y(v)} y2={y(v)} stroke="#f1f5f9" />
            <text x={M.izquierda - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#64748b">{v}</text>
          </g>
        ))}
        {marcasX.map((m) => (
          <text key={m.v} x={x(m.v)} y={ALTO - 12} textAnchor="middle" fontSize="11" fill="#64748b">{m.t}</text>
        ))}
        <text x={ANCHO - M.derecha} y={ALTO - 1} textAnchor="end" fontSize="10" fill="#94a3b8">{enDias ? "edad (meses)" : "longitud/talla (cm)"}</text>
        <text x={4} y={M.arriba + 2} fontSize="10" fill="#94a3b8">{unidad}</text>
        {LINEAS.map((l) => {
          const ps = curva.lineas[l.z] || [];
          const ultimo = ps[ps.length - 1];
          return (
            <g key={l.z}>
              <path d={ruta(ps)} fill="none" stroke={l.trazo} strokeWidth={l.z === "0" ? 1.5 : 1.2} strokeDasharray={l.guion} />
              {ultimo && <text x={x(ultimo.x) + 4} y={y(ultimo.y) + 4} fontSize="10" fill="#64748b">{l.texto}</text>}
            </g>
          );
        })}
        {puntos.length > 1 && <path d={ruta(puntos)} fill="none" stroke={SERIE} strokeWidth="2" />}
        {puntos.map((p, i) => (
          <g key={i} onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)}>
            <circle cx={x(p.x)} cy={y(p.y)} r="14" fill="transparent" />
            <circle cx={x(p.x)} cy={y(p.y)} r="5" fill={SERIE} stroke="#ffffff" strokeWidth="2" />
            {(p.nivel === "alerta" || p.nivel === "grave") && <circle cx={x(p.x)} cy={y(p.y)} r="8" fill="none" stroke="#d03b3b" strokeWidth="2" />}
          </g>
        ))}
      </svg>
      {activo !== null && (
        <div className="pointer-events-none absolute z-10 rounded-lg border bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: `${(x(puntos[activo].x) / ANCHO) * 100}%`, top: `${(y(puntos[activo].y) / ALTO) * 100}%`, transform: "translate(-50%, -115%)" }}>
          <p className="font-semibold text-slate-800">{puntos[activo].etiqueta}</p>
          <p className="text-slate-600">{puntos[activo].y} {unidad} · z {puntos[activo].z > 0 ? "+" : ""}{puntos[activo].z}</p>
          <p className="text-slate-600">{puntos[activo].texto}</p>
        </div>
      )}
    </div>
  );
}

function Formulario({ pacienteId, onGuardado }) {
  const avisos = useAvisos();
  const [datos, setDatos] = useState({ fecha: hoyISO(), peso_kg: "", talla_cm: "", nota: "" });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const cambiar = (e) => setDatos((d) => ({ ...d, [e.target.name]: e.target.value }));
  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client.post(`/pacientes/${pacienteId}/crecimiento`, {
      fecha: datos.fecha, peso_kg: datos.peso_kg || undefined, talla_cm: datos.talla_cm || undefined, nota: datos.nota || undefined,
    })
      .then((r) => {
        (r.data.message.includes("⚠") ? avisos.error : avisos.exito)(r.data.message);
        setDatos({ fecha: hoyISO(), peso_kg: "", talla_cm: "", nota: "" });
        onGuardado();
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }
  const campo = "border rounded px-2 py-1.5 w-full text-sm";
  return (
    <form onSubmit={enviar} className="rounded-lg border bg-slate-50 p-3 grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
      <label className="text-xs text-slate-600">Fecha
        <input type="date" name="fecha" value={datos.fecha} max={hoyISO()} onChange={cambiar} required className={campo} />
      </label>
      <label className="text-xs text-slate-600">Peso (kg)
        <input name="peso_kg" inputMode="decimal" value={datos.peso_kg} onChange={cambiar} placeholder="11.4" className={campo} />
      </label>
      <label className="text-xs text-slate-600">Talla (cm)
        <input name="talla_cm" inputMode="decimal" value={datos.talla_cm} onChange={cambiar} placeholder="84.5" className={campo} />
      </label>
      <label className="text-xs text-slate-600 col-span-2 md:col-span-1">Nota
        <input name="nota" value={datos.nota} onChange={cambiar} maxLength={255} placeholder="Opcional" className={campo} />
      </label>
      <button type="submit" disabled={enviando || (!datos.peso_kg && !datos.talla_cm)}
        className="bg-blue-700 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-800 disabled:opacity-50">
        {enviando ? "Guardando..." : "Registrar medición"}
      </button>
      <p className="col-span-2 md:col-span-5 text-[11px] text-slate-500">Antes de los 2 años se mide acostado (longitud); desde los 2 años, de pie (talla).</p>
      {error && <p className="col-span-2 md:col-span-5 text-sm text-red-600">{error}</p>}
    </form>
  );
}

export default function CrecimientoInfantil({ pacienteId }) {
  const { puede } = useRoles();
  const avisos = useAvisos();
  const [datos, setDatos] = useState(null);
  const [vista, setVista] = useState("talla_edad");
  const [verDatos, setVerDatos] = useState(false);

  const cargar = useCallback(() => {
    client.get(`/pacientes/${pacienteId}/crecimiento`).then((r) => setDatos(r.data)).catch(() => setDatos(false));
  }, [pacienteId]);
  useEffect(() => { cargar(); }, [cargar]);

  if (!datos) return null;
  const { paciente, mediciones, ultima, curvas } = datos;
  if (!paciente.aplica && !mediciones.length) return null;     // adultos y mayores de 5 años: no se muestra

  const pesoTalla = ultima && ultima.edad_dias >= 731 ? "peso_talla" : "peso_longitud";
  const vistas = [["talla_edad", "Talla para la edad", "cm"], ["peso_edad", "Peso para la edad", "kg"], [pesoTalla, "Peso para la talla", "kg"]];
  const unidadVista = vistas.find(([v]) => v === vista)?.[2] ?? "kg";
  const puntos = mediciones.filter((m) => m.indicadores[vista]).map((m) => {
    const enDias = curvas?.[vista]?.eje === "dias";
    const valor = vista === "talla_edad" ? m.talla_cm : m.peso_kg;
    return { x: enDias ? m.edad_dias : m.talla_cm, y: valor, z: m.indicadores[vista].z, nivel: m.indicadores[vista].nivel,
      texto: m.indicadores[vista].texto, etiqueta: `${fechaCorta(m.fecha)} · ${edadTexto(m.edad_meses)}` };
  });

  function anular(m) {
    client.delete(`/pacientes/${pacienteId}/crecimiento/${m.id}`)
      .then(() => { avisos.exito("Medición anulada."); cargar(); })
      .catch((err) => avisos.error(mensajeError(err)));
  }

  return (
    <section className="bg-white border rounded-lg p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="font-bold text-slate-700">Crecimiento (OMS, 0 a 5 años)</h2>
        {ultima && <span className="text-xs text-slate-500">Última medición: {fechaCorta(ultima.fecha)} · {edadTexto(ultima.edad_meses)}</span>}
      </div>
      {paciente.motivo && <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">{paciente.motivo} para usar las curvas.</p>}
      {ultima && (
        <ul className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {Object.entries(ultima.indicadores).map(([k, i]) => (
            <li key={k} className={`rounded-lg border px-3 py-2 text-sm ${NIVEL[i.nivel]?.clase ?? ""}`}>
              <p className="text-xs opacity-80">{i.nombre}</p>
              <p className="font-semibold"><span aria-hidden="true">{NIVEL[i.nivel]?.icono} </span>{i.texto}</p>
              <p className="text-xs tabular-nums opacity-80">z {i.z > 0 ? "+" : ""}{i.z}</p>
            </li>
          ))}
        </ul>
      )}
      {paciente.aplica && puede("crecimiento.registrar") && <div className="mb-3 no-imprimir"><Formulario pacienteId={pacienteId} onGuardado={cargar} /></div>}
      {curvas && mediciones.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 mb-2" role="group" aria-label="Elegir la curva">
            {vistas.map(([v, t]) => (
              <button key={v} onClick={() => setVista(v)} aria-pressed={vista === v}
                className={`px-3 py-1 text-sm rounded-full border ${vista === v ? "bg-blue-700 text-white border-blue-700" : "bg-white hover:bg-slate-100"}`}>{t}</button>
            ))}
          </div>
          {curvas[vista] && <Grafica curva={curvas[vista]} puntos={puntos} eje={curvas[vista].eje} unidad={unidadVista} />}
          <p className="text-[11px] text-slate-500">
            Líneas grises: mediana (0) y ±2 y ±3 desviaciones estándar de la OMS. Punto con anillo rojo: fuera de lo normal (menos de −2 o más de +2).
          </p>
          <button onClick={() => setVerDatos((v) => !v)} className="mt-2 text-xs text-blue-700 hover:underline no-imprimir">{verDatos ? "Ocultar datos" : "Ver datos"}</button>
          {verDatos && (
            <div className="overflow-x-auto mt-1">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-500"><th className="p-1">Fecha</th><th className="p-1">Edad</th><th className="p-1">Peso</th><th className="p-1">Talla</th><th className="p-1">z peso/edad</th><th className="p-1">z talla/edad</th><th className="p-1">z peso/talla</th><th className="p-1"></th></tr></thead>
                <tbody>
                  {[...mediciones].reverse().map((m) => {
                    const pt = m.indicadores.peso_talla ?? m.indicadores.peso_longitud;
                    return (
                      <tr key={m.id} className="border-t">
                        <td className="p-1">{fechaCorta(m.fecha)}</td><td className="p-1">{edadTexto(m.edad_meses)}</td>
                        <td className="p-1 tabular-nums">{m.peso_kg ?? "—"}</td><td className="p-1 tabular-nums">{m.talla_cm ?? "—"}</td>
                        <td className="p-1 tabular-nums">{m.indicadores.peso_edad?.z ?? "—"}</td>
                        <td className="p-1 tabular-nums">{m.indicadores.talla_edad?.z ?? "—"}</td>
                        <td className="p-1 tabular-nums">{pt?.z ?? "—"}</td>
                        <td className="p-1">{puede("crecimiento.registrar") && <button onClick={() => anular(m)} className="text-xs text-red-700 hover:underline">Anular</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[11px] text-slate-400">Fuente: OMS, Patrones de Crecimiento Infantil (2006), tablas ampliadas de puntuación z.</p>
        </>
      )}
    </section>
  );
}
