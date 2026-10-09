import { useCallback, useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import Paginacion from "../components/Paginacion";
import usePaginacion from "../hooks/usePaginacion";

const COLOR_MOVIMIENTO = {
  ENTRADA: "text-green-700",
  SALIDA: "text-blue-700",
  AJUSTE: "text-amber-700",
};

function formatoFecha(texto) {
  if (!texto) return "—";
  const fecha = new Date(String(texto).replace(" ", "T"));
  return isNaN(fecha) ? texto : fecha.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

const campo = "border rounded px-3 py-1.5 w-full";
const VACIO = { codigo: "", nombre: "", presentacion: "", existencia: "", stock_minimo: "", precio: "" };

function FormularioMedicamento({ onCreado, onCerrar }) {
  const [datos, setDatos] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const cambiar = (c) => (e) => setDatos((d) => ({ ...d, [c]: e.target.value }));

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client
      .post("/medicamentos", {
        codigo: datos.codigo,
        nombre: datos.nombre,
        presentacion: datos.presentacion,
        existencia: Number(datos.existencia || 0),
        stock_minimo: Number(datos.stock_minimo || 0),
        precio: datos.precio === "" ? null : Number(datos.precio),
      })
      .then((r) => onCreado(r.data.data))
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  return (
    <form onSubmit={enviar} className="bg-white border rounded-lg p-4 shadow-sm mb-6">
      <h2 className="font-bold text-gray-700 mb-3">Agregar medicamento</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm">Código *<input value={datos.codigo} onChange={cambiar("codigo")} required maxLength={20} placeholder="MED-016" className={campo} /></label>
        <label className="text-sm">Nombre *<input value={datos.nombre} onChange={cambiar("nombre")} required maxLength={150} className={campo} /></label>
        <label className="text-sm">Presentación<input value={datos.presentacion} onChange={cambiar("presentacion")} maxLength={100} placeholder="Tableta 500 mg" className={campo} /></label>
        <label className="text-sm">Existencia inicial<input type="number" min="0" value={datos.existencia} onChange={cambiar("existencia")} className={campo} /></label>
        <label className="text-sm">Stock mínimo<input type="number" min="0" value={datos.stock_minimo} onChange={cambiar("stock_minimo")} className={campo} /></label>
        <label className="text-sm">Precio unitario (Q)<input type="number" min="0" step="0.01" value={datos.precio} onChange={cambiar("precio")} className={campo} /></label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={enviando} className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50">
          {enviando ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" onClick={onCerrar} className="px-4 py-1.5 rounded border hover:bg-gray-100">Cancelar</button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

function DetalleMedicamento({ medicamento, gestiona, onActualizado }) {
  const [movimientos, setMovimientos] = useState(null);
  const [tipo, setTipo] = useState("ENTRADA");
  const [cantidad, setCantidad] = useState("");
  const [observacion, setObservacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    client
      .get(`/medicamentos/${medicamento.id}/movimientos`)
      .then((r) => setMovimientos(r.data.data))
      .catch(() => setMovimientos([]));
  }, [medicamento.id]);

  useEffect(() => { cargar(); }, [cargar]);

  function registrar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client
      .post(`/medicamentos/${medicamento.id}/movimientos`, { tipo, cantidad: Number(cantidad), observacion })
      .then(() => {
        setCantidad("");
        setObservacion("");
        cargar();
        onActualizado();
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  return (
    <div className="bg-slate-50 border-t px-4 py-3">
      {gestiona && (
        <form onSubmit={registrar} className="flex flex-wrap items-end gap-3 mb-3">
          <label className="text-sm">Movimiento
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="border rounded px-2 py-1.5 block bg-white">
              <option value="ENTRADA">Entrada (compra o donación)</option>
              <option value="AJUSTE">Ajuste de inventario</option>
            </select>
          </label>
          <label className="text-sm">Cantidad
            <input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required min={tipo === "ENTRADA" ? 1 : undefined}
              placeholder={tipo === "AJUSTE" ? "-5 ó 5" : ""} className="border rounded px-2 py-1 block w-28 bg-white" />
          </label>
          <label className="text-sm flex-1 min-w-48">Observación
            <input value={observacion} onChange={(e) => setObservacion(e.target.value)} maxLength={255}
              placeholder={tipo === "ENTRADA" ? "Factura, lote o proveedor" : "Motivo del ajuste"} className="border rounded px-2 py-1 block w-full bg-white" />
          </label>
          <button type="submit" disabled={enviando} className="bg-blue-700 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50">
            {enviando ? "Registrando..." : "Registrar"}
          </button>
          {error && <span className="text-sm text-red-600 w-full">{error}</span>}
        </form>
      )}
      <h3 className="text-sm font-semibold text-slate-600 mb-1">Kardex</h3>
      {movimientos === null && <p className="text-sm text-slate-400">Cargando...</p>}
      {movimientos?.length === 0 && <p className="text-sm text-slate-500">Sin movimientos.</p>}
      {movimientos?.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500"><th className="py-1 font-medium">Fecha</th><th className="py-1 font-medium">Tipo</th><th className="py-1 font-medium text-right">Cantidad</th><th className="py-1 font-medium pl-4">Detalle</th><th className="py-1 font-medium">Usuario</th></tr>
          </thead>
          <tbody>
            {movimientos.slice(0, 15).map((mv) => (
              <tr key={mv.id} className="border-t border-slate-200">
                <td className="py-1">{formatoFecha(mv.fecha)}</td>
                <td className={`py-1 font-medium ${COLOR_MOVIMIENTO[mv.tipo] ?? ""}`}>{mv.tipo}</td>
                <td className="py-1 text-right tabular-nums">{mv.cantidad > 0 ? `+${mv.cantidad}` : mv.cantidad}</td>
                <td className="py-1 pl-4 text-slate-600">{mv.observacion || (mv.receta_id ? `Receta No. ${mv.receta_id}` : "—")}</td>
                <td className="py-1 text-slate-500">{mv.usuario || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Inventario() {
  const { puede } = useRoles();
  const gestiona = puede("inventario.gestionar");
  const [medicamentos, setMedicamentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [texto, setTexto] = useState("");
  const [soloBajos, setSoloBajos] = useState(false);
  const [abierto, setAbierto] = useState(null);
  const [agregando, setAgregando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(() => {
    client
      .get("/medicamentos")
      .then((r) => { setMedicamentos(r.data.data); setError(null); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const bajos = medicamentos.filter((m) => m.bajo_minimo);
  const filtrados = medicamentos.filter((m) => {
    if (soloBajos && !m.bajo_minimo) return false;
    if (texto) {
      const t = texto.toLowerCase();
      return m.nombre.toLowerCase().includes(t) || m.codigo.toLowerCase().includes(t);
    }
    return true;
  });
  const pag = usePaginacion(filtrados, 15);

  if (cargando) return <p className="p-6">Cargando...</p>;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Inventario de farmacia</h1>
        {gestiona && !agregando && (
          <button onClick={() => { setAgregando(true); setAviso(null); }} className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800">
            Agregar medicamento
          </button>
        )}
      </div>

      {agregando && (
        <FormularioMedicamento
          onCerrar={() => setAgregando(false)}
          onCreado={(m) => { setAgregando(false); setAviso(`${m.nombre} agregado al inventario.`); cargar(); }}
        />
      )}

      {error && <p className="mb-4 text-red-600 text-sm">No se pudo cargar el inventario: {error}</p>}
      {aviso && <p className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{aviso}</p>}

      {!error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Medicamentos en catálogo</p>
            <p className="text-3xl font-bold text-blue-700">{medicamentos.length}</p>
          </div>
          <button onClick={() => setSoloBajos(true)} className="bg-white border rounded-lg p-4 shadow-sm text-left hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">Bajo el mínimo</p>
            <p className={`text-3xl font-bold ${bajos.length ? "text-red-700" : "text-green-700"}`}>{bajos.length}</p>
            <p className="text-xs text-gray-400 mt-1">{bajos.length ? "Requieren reabastecimiento" : "Existencias suficientes"}</p>
          </button>
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Unidades en existencia</p>
            <p className="text-3xl font-bold text-slate-700">{medicamentos.reduce((s, m) => s + m.existencia, 0).toLocaleString("es-GT")}</p>
          </div>
        </div>
      )}

      {!error && (
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre o código" className="border rounded px-3 py-1.5 text-sm w-64" aria-label="Buscar medicamento" />
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={soloBajos} onChange={(e) => setSoloBajos(e.target.checked)} />
            Solo bajo el mínimo
          </label>
          <span className="text-sm text-slate-500 ml-auto">{filtrados.length} medicamento(s)</span>
        </div>
      )}

      {!error && filtrados.length === 0 && <p className="text-gray-500 text-sm">Ningún medicamento coincide.</p>}

      {!error && filtrados.length > 0 && (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-gray-100 text-sm">
                <th className="p-2">Código</th>
                <th className="p-2">Medicamento</th>
                <th className="p-2 text-right">Existencia</th>
                <th className="p-2 text-right">Mínimo</th>
                <th className="p-2 text-right">Precio</th>
                <th className="p-2">Estado</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            {pag.items.map((m) => (
              <tbody key={m.id} className="border-b last:border-0">
                <tr className="hover:bg-gray-50">
                  <td className="p-2 text-sm text-slate-500 tabular-nums">{m.codigo}</td>
                  <td className="p-2">
                    <span className="font-medium text-slate-800">{m.nombre}</span>
                    {m.presentacion && <span className="block text-xs text-slate-500">{m.presentacion}</span>}
                  </td>
                  <td className={`p-2 text-right tabular-nums ${m.bajo_minimo ? "text-red-700 font-semibold" : ""}`}>{m.existencia}</td>
                  <td className="p-2 text-right tabular-nums text-slate-500">{m.stock_minimo}</td>
                  <td className="p-2 text-right tabular-nums text-slate-600">{m.precio != null ? `Q${m.precio.toFixed(2)}` : "—"}</td>
                  <td className="p-2">
                    {m.existencia === 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">Agotado</span>
                    ) : m.bajo_minimo ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">Bajo mínimo</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">Disponible</span>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    <button onClick={() => setAbierto(abierto === m.id ? null : m.id)} className="text-xs px-2 py-1 rounded border hover:bg-gray-100" aria-expanded={abierto === m.id}>
                      {abierto === m.id ? "Cerrar" : gestiona ? "Movimientos" : "Kardex"}
                    </button>
                  </td>
                </tr>
                {abierto === m.id && (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <DetalleMedicamento medicamento={m} gestiona={gestiona} onActualizado={cargar} />
                    </td>
                  </tr>
                )}
              </tbody>
            ))}
          </table>
        </div>
      )}
      <Paginacion {...pag} />
    </div>
  );
}
