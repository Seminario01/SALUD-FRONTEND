import { useCallback, useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";

const TIPOS = {
  cama: "Camas",
  ambulancia: "Ambulancias",
  cupo_consulta: "Cupos de consulta",
};

function TarjetaRecurso({ recurso, editable, onGuardado }) {
  const [disponible, setDisponible] = useState(recurso.disponible);
  const [total, setTotal] = useState(recurso.total);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const cambiado = Number(disponible) !== recurso.disponible || Number(total) !== recurso.total;
  const porcentaje = recurso.total ? Math.round((recurso.disponible / recurso.total) * 100) : 0;
  const color = porcentaje <= 20 ? "text-red-700" : porcentaje <= 50 ? "text-yellow-600" : "text-green-700";

  function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    client
      .put(`/recursos/${recurso.id}`, { disponible: Number(disponible), total: Number(total) })
      .then(() => {
        setMensaje({ ok: true, texto: "Guardado." });
        onGuardado();
      })
      .catch((err) => setMensaje({ ok: false, texto: mensajeError(err) }))
      .finally(() => setGuardando(false));
  }

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <h2 className="font-bold text-gray-700">{TIPOS[recurso.tipo] ?? recurso.tipo}</h2>
      {recurso.descripcion && <p className="text-xs text-gray-400">{recurso.descripcion}</p>}
      <p className={`text-3xl font-bold mt-1 ${color}`}>
        {recurso.disponible} <span className="text-sm text-gray-400 font-normal">/ {recurso.total} disponibles</span>
      </p>

      {editable && (
        <form onSubmit={guardar} className="mt-3 flex items-end gap-2 flex-wrap">
          <label className="text-xs">
            Disponibles
            <input type="number" min="0" value={disponible} onChange={(e) => setDisponible(e.target.value)}
              className="border rounded px-2 py-1 w-20 block" />
          </label>
          <label className="text-xs">
            Total
            <input type="number" min="0" value={total} onChange={(e) => setTotal(e.target.value)}
              className="border rounded px-2 py-1 w-20 block" />
          </label>
          <button type="submit" disabled={guardando || !cambiado}
            className="bg-blue-700 text-white text-sm px-3 py-1 rounded hover:bg-blue-800 disabled:opacity-40">
            Guardar
          </button>
          {mensaje && <span className={`text-xs ${mensaje.ok ? "text-green-700" : "text-red-600"}`}>{mensaje.texto}</span>}
        </form>
      )}
    </div>
  );
}

function FormularioRecurso({ onCreado }) {
  const VACIO = { tipo: "cama", descripcion: "", disponible: 0, total: 0 };
  const [datos, setDatos] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  function cambiar(e) {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  }

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setExito(null);
    client
      .post("/recursos", { ...datos, disponible: Number(datos.disponible), total: Number(datos.total) })
      .then(() => {
        setExito("Recurso agregado.");
        setDatos(VACIO);
        onCreado();
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  const campo = "border rounded px-3 py-1.5 w-full";
  return (
    <form onSubmit={enviar} className="bg-white border rounded-lg p-4 shadow-sm mt-8">
      <h2 className="font-bold text-gray-700 mb-3">Agregar recurso</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm">
          Tipo
          <select name="tipo" value={datos.tipo} onChange={cambiar} className={campo}>
            {Object.entries(TIPOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Descripción
          <input name="descripcion" value={datos.descripcion} onChange={cambiar} placeholder="Ej.: Área de pediatría" className={campo} />
        </label>
        <label className="text-sm">
          Disponibles
          <input type="number" min="0" name="disponible" value={datos.disponible} onChange={cambiar} className={campo} />
        </label>
        <label className="text-sm">
          Total
          <input type="number" min="0" name="total" value={datos.total} onChange={cambiar} className={campo} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={enviando}
          className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50">
          {enviando ? "Guardando..." : "Agregar"}
        </button>
        {exito && <span className="text-sm text-green-700">{exito}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

export default function Recursos() {
  const { esAdmin } = useRoles();
  const [recursos, setRecursos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  const cargar = useCallback(() => {
    // GET /recursos requiere el token del Login Único.
    client
      .get("/recursos")
      .then((res) => {
        setRecursos(res.data.data);
        setError(null);
        setVersion((v) => v + 1); // reinicia las tarjetas con los valores guardados
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <p className="p-6">Cargando...</p>;
  if (error) return <p className="p-6 text-red-600">Error: {error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Recursos hospitalarios</h1>
      <p className="text-sm text-gray-500 mb-4">
        {esAdmin ? "Actualice la disponibilidad y presione Guardar." : "Disponibilidad actual."}
      </p>
      {recursos.length === 0 && <p className="text-gray-500 text-sm">No hay recursos registrados.</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recursos.map((r) => (
          <TarjetaRecurso key={`${r.id}-${version}`} recurso={r} editable={esAdmin} onGuardado={cargar} />
        ))}
      </div>
      {esAdmin && <FormularioRecurso onCreado={cargar} />}
    </div>
  );
}
