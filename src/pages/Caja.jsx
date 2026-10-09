import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";
import Paginacion from "../components/Paginacion";
import usePaginacion from "../hooks/usePaginacion";
import DetalleCuenta from "../components/DetalleCuenta";
import { CATEGORIA, ESTADO_CUENTA, quetzales } from "../utils/caja";
import { fechaHora } from "../utils/hospitalizacion";

function AbrirAmbulatoria({ onAbierta, onCerrar }) {
  const { pacientes } = usePacientesSeleccionables(true);
  const [pacienteId, setPacienteId] = useState("");
  const [error, setError] = useState(null);

  function enviar(e) {
    e.preventDefault();
    setError(null);
    client
      .post("/cuentas", { paciente_id: Number(pacienteId) })
      .then((r) => onAbierta(r.data.data))
      .catch((err) => setError(mensajeError(err)));
  }

  return (
    <form onSubmit={enviar} className="bg-white border rounded-lg p-4 shadow-sm mb-6 flex flex-wrap items-end gap-3">
      <label className="text-sm flex-1 min-w-64">Paciente
        <select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} required className="border rounded px-3 py-1.5 w-full" aria-label="Paciente de la cuenta">
          <option value="">Seleccione...</option>
          {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo} (CUI {p.cui})</option>)}
        </select>
      </label>
      <button type="submit" className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800">Abrir cuenta</button>
      <button type="button" onClick={onCerrar} className="px-4 py-1.5 rounded border hover:bg-gray-100">Cancelar</button>
      {error && <span className="text-sm text-red-600 w-full">{error}</span>}
    </form>
  );
}

function FilaServicio({ s, edita, onGuardado }) {
  const [costo, setCosto] = useState(s.costo);
  const [error, setError] = useState(null);

  function guardar(cambios) {
    setError(null);
    client.put(`/servicios/${s.id}`, cambios).then(() => onGuardado(`${s.nombre} actualizado.`)).catch((err) => setError(mensajeError(err)));
  }

  return (
    <tr className={`border-b last:border-0 ${s.estado === "INACTIVO" ? "text-slate-400" : ""}`}>
      <td className="p-2 text-sm tabular-nums text-slate-500">{s.codigo}</td>
      <td className="p-2">{s.nombre}</td>
      <td className="p-2 text-sm">{CATEGORIA[s.categoria] ?? s.categoria}</td>
      <td className="p-2 text-right tabular-nums">
        {edita ? (
          <span className="inline-flex items-center gap-1">
            Q<input type="number" min="0" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)}
              className="border rounded px-2 py-0.5 w-24 text-right" aria-label={`Tarifa de ${s.nombre}`} />
            {Number(costo) !== s.costo && (
              <button onClick={() => guardar({ costo: Number(costo) })} className="text-xs px-2 py-1 rounded bg-blue-700 text-white">Guardar</button>
            )}
          </span>
        ) : quetzales(s.costo)}
        {error && <span className="block text-xs text-red-600">{error}</span>}
      </td>
      {edita && (
        <td className="p-2 text-right">
          <button onClick={() => guardar({ estado: s.estado === "INACTIVO" ? "ACTIVO" : "INACTIVO" })} className="text-xs px-2 py-1 rounded border hover:bg-gray-100">
            {s.estado === "INACTIVO" ? "Activar" : "Desactivar"}
          </button>
        </td>
      )}
    </tr>
  );
}

function NuevoServicio({ onCreado }) {
  const VACIO = { codigo: "", nombre: "", categoria: "LABORATORIO", costo: "" };
  const [datos, setDatos] = useState(VACIO);
  const [error, setError] = useState(null);
  const cambiar = (c) => (e) => setDatos((d) => ({ ...d, [c]: e.target.value }));

  function enviar(e) {
    e.preventDefault();
    setError(null);
    client
      .post("/servicios", { ...datos, costo: Number(datos.costo) })
      .then((r) => { setDatos(VACIO); onCreado(`${r.data.data.nombre} agregado al catálogo.`); })
      .catch((err) => setError(mensajeError(err)));
  }

  const campo = "border rounded px-2 py-1.5 w-full";
  return (
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-2 mt-4">
      <label className="text-sm w-28">Código<input value={datos.codigo} onChange={cambiar("codigo")} required maxLength={20} placeholder="LAB-010" className={campo} /></label>
      <label className="text-sm flex-1 min-w-56">Nombre<input value={datos.nombre} onChange={cambiar("nombre")} required maxLength={100} className={campo} /></label>
      <label className="text-sm w-40">Categoría
        <select value={datos.categoria} onChange={cambiar("categoria")} className={campo}>
          {["LABORATORIO", "IMAGEN", "PROCEDIMIENTO"].map((c) => <option key={c} value={c}>{CATEGORIA[c]}</option>)}
        </select>
      </label>
      <label className="text-sm w-28">Tarifa (Q)<input type="number" min="0" step="0.01" value={datos.costo} onChange={cambiar("costo")} required className={campo} /></label>
      <button type="submit" className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800">Agregar servicio</button>
      {error && <span className="text-sm text-red-600 w-full">{error}</span>}
    </form>
  );
}

export default function Caja() {
  const { puede } = useRoles();
  const gestiona = puede("cuentas.gestionar");
  const editaTarifas = puede("recursos.gestionar");
  const [params, setParams] = useSearchParams();
  const [cuentas, setCuentas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [pestana, setPestana] = useState("ABIERTA");
  const [texto, setTexto] = useState("");
  const [abriendo, setAbriendo] = useState(false);
  const [version, setVersion] = useState(0);
  const detalle = params.get("cuenta");

  const cargar = useCallback(() => {
    Promise.all([client.get("/cuentas"), client.get("/servicios", { params: { todos: 1 } })])
      .then(([c, s]) => { setCuentas(c.data.data); setServicios(s.data.data); setError(null); setVersion((v) => v + 1); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrir = (id) => setParams(id ? { cuenta: String(id) } : {});

  const filtradas = cuentas.filter((c) => {
    if (pestana === "CERRADAS" ? !["PAGADA", "EXONERADA"].includes(c.estado) : pestana !== "TODAS" && c.estado !== pestana) return false;
    if (texto) {
      const t = texto.toLowerCase();
      return (c.paciente ?? "").toLowerCase().includes(t) || (c.numero_referencia ?? "").toLowerCase().includes(t) || String(c.id) === t;
    }
    return true;
  });
  const pag = usePaginacion(filtradas, 15);

  if (cargando) return <p className="p-6">Cargando...</p>;
  if (error) return <p className="p-6 text-red-600">No se pudo cargar Caja: {error}</p>;

  const abiertas = cuentas.filter((c) => c.estado === "ABIERTA");
  const porCobrar = cuentas.filter((c) => c.estado === "POR_COBRAR");
  const cobrado = cuentas.reduce((s, c) => s + c.pagos, 0);
  const cuenta = (estado) => cuentas.filter((c) => estado === "CERRADAS" ? ["PAGADA", "EXONERADA"].includes(c.estado) : c.estado === estado).length;

  const tab = (valor, etiqueta, n) => (
    <button key={valor} onClick={() => setPestana(valor)} role="tab" aria-selected={pestana === valor}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${pestana === valor ? "border-blue-700 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
      {etiqueta}{n !== undefined && <span className="ml-1 opacity-70">({n})</span>}
    </button>
  );

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Caja y cuentas</h1>
        {gestiona && !abriendo && (
          <button onClick={() => { setAbriendo(true); setAviso(null); }} className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800">Abrir cuenta ambulatoria</button>
        )}
      </div>

      {abriendo && (
        <AbrirAmbulatoria onCerrar={() => setAbriendo(false)}
          onAbierta={(c) => { setAbriendo(false); setAviso(`Cuenta No. ${c.id} abierta para ${c.paciente}.`); cargar(); abrir(c.id); }} />
      )}
      {aviso && <p className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{aviso}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">Cuentas abiertas</p>
          <p className="text-3xl font-bold text-blue-700">{abiertas.length}</p>
          <p className="text-xs text-gray-400 mt-1">Saldo acumulado {quetzales(abiertas.reduce((s, c) => s + c.saldo, 0))}</p>
        </div>
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">Por cobrar en Tributario</p>
          <p className="text-3xl font-bold text-yellow-600">{quetzales(porCobrar.reduce((s, c) => s + c.saldo, 0))}</p>
          <p className="text-xs text-gray-400 mt-1">{porCobrar.length} cuenta(s) con referencia de pago</p>
        </div>
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">Cobrado</p>
          <p className="text-3xl font-bold text-green-700">{quetzales(cobrado)}</p>
          <p className="text-xs text-gray-400 mt-1">{cuenta("CERRADAS")} cuenta(s) pagadas o exoneradas</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b mb-4">
        <div className="flex overflow-x-auto" role="tablist">
          {tab("ABIERTA", "Abiertas", cuenta("ABIERTA"))}
          {tab("POR_COBRAR", "Por cobrar", cuenta("POR_COBRAR"))}
          {tab("CERRADAS", "Pagadas y exoneradas", cuenta("CERRADAS"))}
          {tab("TODAS", "Todas", cuentas.length)}
          {tab("TARIFAS", "Tarifas")}
        </div>
        {pestana !== "TARIFAS" && (
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Paciente, referencia o No." aria-label="Buscar cuenta"
            className="border rounded px-3 py-1.5 text-sm w-64 mb-2" />
        )}
      </div>

      {pestana === "TARIFAS" ? (
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-gray-100 text-sm">
                <th className="p-2">Código</th><th className="p-2">Servicio</th><th className="p-2">Categoría</th>
                <th className="p-2 text-right">Tarifa</th>{editaTarifas && <th className="p-2"></th>}
              </tr>
            </thead>
            <tbody>
              {servicios.map((s) => <FilaServicio key={`${s.id}-${version}`} s={s} edita={editaTarifas} onGuardado={(m) => { setAviso(m); cargar(); }} />)}
            </tbody>
          </table>
          {editaTarifas && <NuevoServicio onCreado={(m) => { setAviso(m); cargar(); }} />}
        </div>
      ) : (
        <>
          {filtradas.length === 0 ? <p className="text-sm text-slate-500">No hay cuentas en esta categoría.</p> : (
            <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-gray-100 text-sm">
                    <th className="p-2">No.</th><th className="p-2">Paciente</th><th className="p-2">Cuenta</th>
                    <th className="p-2">Apertura</th><th className="p-2">Estado</th>
                    <th className="p-2 text-right">Saldo</th><th className="p-2">Referencia</th><th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {pag.items.map((c) => {
                    const e = ESTADO_CUENTA[c.estado] ?? { texto: c.estado, clase: "bg-gray-100" };
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50" data-cuenta={c.id}>
                        <td className="p-2 tabular-nums text-slate-500">{c.id}</td>
                        <td className="p-2 text-slate-800">{c.paciente}</td>
                        <td className="p-2 text-sm text-slate-600">
                          <span className="block text-slate-700">{c.tipo === "AMBULATORIA" ? "Ambulatoria" : "Hospitalización"}</span>
                          {c.tipo === "HOSPITALIZACION" && (
                            <span className="text-xs text-slate-500 whitespace-nowrap">{c.area}{c.estado_hospitalizacion === "ACTIVO" && c.cama ? ` · ${c.cama}` : ""}</span>
                          )}
                          {c.estado_hospitalizacion === "ACTIVO" && <span className="ml-2 text-xs bg-blue-50 text-blue-800 rounded px-1.5 py-0.5">Ingresado</span>}
                          {c.tipo === "HOSPITALIZACION" && c.estado === "ABIERTA" && c.estado_hospitalizacion === "EGRESADO" && (
                            <span className="ml-2 text-xs bg-amber-50 text-amber-800 rounded px-1.5 py-0.5 whitespace-nowrap">Egresado, por cerrar</span>
                          )}
                        </td>
                        <td className="p-2 text-sm text-slate-600 whitespace-nowrap">{fechaHora(c.fecha_apertura)}</td>
                        <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${e.clase}`}>{e.texto}</span></td>
                        <td className="p-2 text-right tabular-nums whitespace-nowrap">
                          {quetzales(c.saldo)}
                          {c.estancia_en_curso && <span className="block text-xs text-slate-500">estimado {quetzales(c.total_estimado)}</span>}
                        </td>
                        <td className="p-2 font-mono text-xs">{c.numero_referencia ?? "—"}</td>
                        <td className="p-2 text-right">
                          <button onClick={() => abrir(c.id)} className="text-xs px-2 py-1 rounded border hover:bg-gray-100 whitespace-nowrap">Ver cuenta</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Paginacion {...pag} />
        </>
      )}

      {detalle && (
        <DetalleCuenta id={detalle} servicios={servicios.filter((s) => s.estado !== "INACTIVO")} gestiona={gestiona}
          verPaciente={puede("pacientes.ver")} onCerrar={() => abrir(null)} onCambio={cargar} />
      )}
    </div>
  );
}
