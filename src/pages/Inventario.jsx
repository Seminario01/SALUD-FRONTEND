import { useCallback, useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import Paginacion from "../components/Paginacion";
import usePaginacion from "../hooks/usePaginacion";
import { DINERO, UNIDADES } from "../utils/validacion";
import { useAvisos } from "../components/Avisos";
import BotonesExportar from "../components/Exportar";

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
const VACIO = { codigo: "", nombre: "", presentacion: "", existencia: "", stock_minimo: "", precio: "", numero_lote: "", fecha_vencimiento: "" };
const hoyISO = () => new Date().toLocaleDateString("en-CA");
const formatoDia = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("es-GT") : "—");

const ESTADO_LOTE = {
  VENCIDO: { texto: "Vencido", clase: "bg-red-100 text-red-800" },
  POR_VENCER: { texto: "Por vencer", clase: "bg-amber-100 text-amber-800" },
  VIGENTE: { texto: "Vigente", clase: "bg-green-100 text-green-800" },
};

// Lote y vencimiento de una entrada (opcionales; si hay número de lote, la fecha es obligatoria)
function CamposLote({ datos, cambiar, ancho = "" }) {
  return (
    <>
      <label className={`text-sm ${ancho}`}>No. de lote
        <input value={datos.numero_lote} onChange={cambiar("numero_lote")} maxLength={50} placeholder="L2026-0815" className={`${campo} bg-white`} />
      </label>
      <label className={`text-sm ${ancho}`}>Vence
        <input type="date" value={datos.fecha_vencimiento} onChange={cambiar("fecha_vencimiento")} min={hoyISO()}
          required={!!datos.numero_lote} className={`${campo} bg-white`} />
      </label>
    </>
  );
}

const datosLote = (d) => (d.fecha_vencimiento ? { numero_lote: d.numero_lote || undefined, fecha_vencimiento: d.fecha_vencimiento } : {});

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
        ...datosLote(datos),
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
        <label className="text-sm">Nombre *<input value={datos.nombre} onChange={cambiar("nombre")} required maxLength={100} className={campo} /></label>
        <label className="text-sm">Presentación<input value={datos.presentacion} onChange={cambiar("presentacion")} maxLength={100} placeholder="Tableta 500 mg" className={campo} /></label>
        <label className="text-sm">Existencia inicial<input type="number" {...UNIDADES} value={datos.existencia} onChange={cambiar("existencia")} className={campo} /></label>
        <label className="text-sm">Stock mínimo<input type="number" {...UNIDADES} value={datos.stock_minimo} onChange={cambiar("stock_minimo")} className={campo} /></label>
        <label className="text-sm">Precio unitario (Q)<input type="number" {...DINERO} value={datos.precio} onChange={cambiar("precio")} className={campo} /></label>
        {Number(datos.existencia) > 0 && <CamposLote datos={datos} cambiar={cambiar} />}
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
  const [lotes, setLotes] = useState(null);
  const [tipo, setTipo] = useState("ENTRADA");
  const [cantidad, setCantidad] = useState("");
  const [observacion, setObservacion] = useState("");
  const [lote, setLote] = useState({ numero_lote: "", fecha_vencimiento: "" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const avisos = useAvisos();
  const cambiarLote = (c) => (e) => setLote((d) => ({ ...d, [c]: e.target.value }));

  const cargar = useCallback(() => {
    client
      .get(`/medicamentos/${medicamento.id}/movimientos`)
      .then((r) => setMovimientos(r.data.data))
      .catch(() => setMovimientos([]));
    client
      .get(`/medicamentos/${medicamento.id}/lotes`)
      .then((r) => setLotes(r.data.data))
      .catch(() => setLotes([]));
  }, [medicamento.id]);

  async function darDeBaja(l) {
    const si = await avisos.confirmar({
      titulo: `¿Dar de baja el lote ${l.numero_lote || l.id}?`,
      mensaje: [`${medicamento.nombre} · ${l.cantidad} unidad(es) · vence el ${formatoDia(l.fecha_vencimiento)}`,
        "Se descuentan del inventario con un ajuste. Esta acción no se puede deshacer."],
      confirmar: "Dar de baja", peligro: true,
    });
    if (!si) return;
    client
      .post(`/medicamentos/${medicamento.id}/lotes/${l.id}/baja`, { motivo: l.estado === "VENCIDO" ? "Vencido" : "Baja del lote" })
      .then((r) => { avisos.exito(r.data.message); cargar(); onActualizado(); })
      .catch((err) => avisos.error(mensajeError(err)));
  }

  useEffect(() => { cargar(); }, [cargar]);

  function registrar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client
      .post(`/medicamentos/${medicamento.id}/movimientos`, { tipo, cantidad: Number(cantidad), observacion, ...(tipo === "ENTRADA" ? datosLote(lote) : {}) })
      .then(() => {
        setCantidad("");
        setObservacion("");
        setLote({ numero_lote: "", fecha_vencimiento: "" });
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
            <input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required min={tipo === "ENTRADA" ? 1 : -UNIDADES.max} max={UNIDADES.max}
              placeholder={tipo === "AJUSTE" ? "-5 ó 5" : ""} className="border rounded px-2 py-1 block w-28 bg-white" />
          </label>
          <label className="text-sm flex-1 min-w-48">Observación
            <input value={observacion} onChange={(e) => setObservacion(e.target.value)} maxLength={255}
              placeholder={tipo === "ENTRADA" ? "Factura o proveedor" : "Motivo del ajuste"} className="border rounded px-2 py-1 block w-full bg-white" />
          </label>
          {tipo === "ENTRADA" && <CamposLote datos={lote} cambiar={cambiarLote} ancho="w-40" />}
          <button type="submit" disabled={enviando} className="bg-blue-700 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50">
            {enviando ? "Registrando..." : "Registrar"}
          </button>
          {error && <span className="text-sm text-red-600 w-full">{error}</span>}
        </form>
      )}
      <h3 className="text-sm font-semibold text-slate-600 mb-1">Lotes</h3>
      {lotes === null && <p className="text-sm text-slate-400">Cargando...</p>}
      {lotes?.length === 0 && (
        <p className="text-sm text-slate-500 mb-3">Sin lotes registrados{medicamento.existencia ? ` (las ${medicamento.existencia} unidades están sin lote)` : ""}.</p>
      )}
      {lotes?.length > 0 && (
        <table className="w-full text-sm mb-3">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1 font-medium">Lote</th><th className="py-1 font-medium">Vence</th>
              <th className="py-1 font-medium text-right">Quedan</th><th className="py-1 font-medium pl-4">Estado</th><th />
            </tr>
          </thead>
          <tbody>
            {lotes.map((l) => (
              <tr key={l.id} className="border-t border-slate-200">
                <td className="py-1 font-mono text-xs">{l.numero_lote || `#${l.id}`}</td>
                <td className="py-1">{formatoDia(l.fecha_vencimiento)}
                  <span className="text-xs text-slate-500"> · {l.dias_para_vencer < 0 ? `hace ${-l.dias_para_vencer} días` : l.dias_para_vencer === 0 ? "hoy" : `en ${l.dias_para_vencer} días`}</span>
                </td>
                <td className="py-1 text-right tabular-nums">{l.cantidad} <span className="text-xs text-slate-400">de {l.cantidad_inicial}</span></td>
                <td className="py-1 pl-4"><span className={`px-2 py-0.5 rounded text-xs ${ESTADO_LOTE[l.estado]?.clase}`}>{ESTADO_LOTE[l.estado]?.texto}</span></td>
                <td className="py-1 text-right">
                  {gestiona && <button onClick={() => darDeBaja(l)} className="text-xs text-red-700 hover:underline">Dar de baja</button>}
                </td>
              </tr>
            ))}
            {medicamento.sin_lote > 0 && (
              <tr className="border-t border-slate-200 text-slate-500">
                <td className="py-1 text-xs" colSpan={2}>Sin lote (inventario anterior)</td>
                <td className="py-1 text-right tabular-nums">{medicamento.sin_lote}</td><td colSpan={2} />
              </tr>
            )}
          </tbody>
        </table>
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
  const [soloVencer, setSoloVencer] = useState(false);
  const [abierto, setAbierto] = useState(null);
  const [agregando, setAgregando] = useState(false);
  const avisos = useAvisos();

  const cargar = useCallback(() => {
    client
      .get("/medicamentos")
      .then((r) => { setMedicamentos(r.data.data); setError(null); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const bajos = medicamentos.filter((m) => m.bajo_minimo);
  const conVencimiento = medicamentos.filter((m) => m.vencidas || m.por_vencer);
  const filtrados = medicamentos.filter((m) => {
    if (soloBajos && !m.bajo_minimo) return false;
    if (soloVencer && !(m.vencidas || m.por_vencer)) return false;
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
          <button onClick={() => { setAgregando(true); }} className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800">
            Agregar medicamento
          </button>
        )}
      </div>

      {agregando && (
        <FormularioMedicamento
          onCerrar={() => setAgregando(false)}
          onCreado={(m) => { setAgregando(false); avisos.exito(`${m.nombre} agregado al inventario.`); cargar(); }}
        />
      )}

      {error && <p className="mb-4 text-red-600 text-sm">No se pudo cargar el inventario: {error}</p>}

      {!error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Medicamentos en catálogo</p>
            <p className="text-3xl font-bold text-blue-700">{medicamentos.length}</p>
          </div>
          <button onClick={() => setSoloBajos(true)} className="bg-white border rounded-lg p-4 shadow-sm text-left hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">Bajo el mínimo</p>
            <p className={`text-3xl font-bold ${bajos.length ? "text-red-700" : "text-green-700"}`}>{bajos.length}</p>
            <p className="text-xs text-gray-400 mt-1">{bajos.length ? "Requieren reabastecimiento" : "Existencias suficientes"}</p>
          </button>
          <button onClick={() => setSoloVencer(true)} className="bg-white border rounded-lg p-4 shadow-sm text-left hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">Vencidos o por vencer</p>
            <p className={`text-3xl font-bold ${conVencimiento.length ? "text-amber-700" : "text-green-700"}`}>{conVencimiento.length}</p>
            <p className="text-xs text-gray-400 mt-1">
              {conVencimiento.length
                ? `${conVencimiento.reduce((s, m) => s + m.vencidas, 0)} unidades vencidas · ${conVencimiento.reduce((s, m) => s + m.por_vencer, 0)} vencen en 60 días`
                : "Ningún lote vence en los próximos 60 días"}
            </p>
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
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={soloVencer} onChange={(e) => setSoloVencer(e.target.checked)} />
            Solo vencidos o por vencer
          </label>
          <span className="text-sm text-slate-500 ml-auto">{filtrados.length} medicamento(s)</span>
          <BotonesExportar nombre={soloBajos ? "medicamentos_por_reabastecer" : "inventario"} titulo={soloBajos ? "Medicamentos por reabastecer" : "Inventario de farmacia"}
            filas={filtrados} columnas={[
              { titulo: "Código", valor: (m) => m.codigo, ancho: 12 },
              { titulo: "Medicamento", valor: (m) => m.nombre, ancho: 30 },
              { titulo: "Presentación", valor: (m) => m.presentacion ?? "", ancho: 22 },
              { titulo: "Existencia", valor: (m) => m.existencia, ancho: 11 },
              { titulo: "Mínimo", valor: (m) => m.stock_minimo, ancho: 9 },
              { titulo: "Faltan para el mínimo", valor: (m) => Math.max(0, (m.stock_minimo ?? 0) - m.existencia), ancho: 20 },
              { titulo: "Vencidas", valor: (m) => m.vencidas, ancho: 10 },
              { titulo: "Por vencer (60 días)", valor: (m) => m.por_vencer, ancho: 18 },
              { titulo: "Próximo vencimiento", valor: (m) => m.proximo_vencimiento ?? "", ancho: 18 },
              { titulo: "Precio (Q)", valor: (m) => m.precio ?? "", ancho: 11 },
              { titulo: "Estado", valor: (m) => (m.existencia === 0 ? "Agotado" : m.bajo_minimo ? "Bajo mínimo" : "Disponible"), ancho: 13 },
            ]} />
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
                <th className="p-2">Vence</th>
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
                  <td className="p-2 text-sm">
                    {m.proximo_vencimiento ? formatoDia(m.proximo_vencimiento) : <span className="text-slate-400">—</span>}
                    {m.vencidas > 0 && <span className="block text-xs text-red-700">{m.vencidas} vencida(s)</span>}
                    {!m.vencidas && m.por_vencer > 0 && <span className="block text-xs text-amber-700">{m.por_vencer} por vencer</span>}
                  </td>
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
                    <td colSpan={8} className="p-0">
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
