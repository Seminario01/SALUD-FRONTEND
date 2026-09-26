import { useCallback, useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";

const PACIENTE_VACIO = {
  nombre_completo: "",
  cui: "",
  fecha_nacimiento: "",
  genero: "",
  telefono: "",
  tipo_seguro: "",
  cuidador: "",
};

function FormularioPaciente({ onCreado }) {
  const [datos, setDatos] = useState(PACIENTE_VACIO);
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

    // Solo se envían los campos con valor
    const cuerpo = Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== ""));
    client
      .post("/pacientes", cuerpo)
      .then((res) => {
        setExito(`Paciente registrado con ID ${res.data.data.id}.`);
        setDatos(PACIENTE_VACIO);
        onCreado();
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  const campo = "border rounded px-3 py-1.5 w-full";
  return (
    <form onSubmit={enviar} className="bg-white border rounded-lg p-4 shadow-sm mb-6">
      <h2 className="font-bold text-gray-700 mb-3">Registrar paciente</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm md:col-span-2">
          Nombre completo *
          <input name="nombre_completo" value={datos.nombre_completo} onChange={cambiar} required className={campo} />
        </label>
        <label className="text-sm">
          CUI / DPI
          <input name="cui" value={datos.cui} onChange={cambiar} inputMode="numeric" maxLength={13} className={campo} />
        </label>
        <label className="text-sm">
          Fecha de nacimiento
          <input type="date" name="fecha_nacimiento" value={datos.fecha_nacimiento} onChange={cambiar} className={campo} />
        </label>
        <label className="text-sm">
          Género
          <select name="genero" value={datos.genero} onChange={cambiar} className={campo}>
            <option value="">—</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="Otro">Otro</option>
          </select>
        </label>
        <label className="text-sm">
          Teléfono
          <input name="telefono" value={datos.telefono} onChange={cambiar} inputMode="tel" maxLength={20} className={campo} />
        </label>
        <label className="text-sm">
          Tipo de seguro
          <select name="tipo_seguro" value={datos.tipo_seguro} onChange={cambiar} className={campo}>
            <option value="">—</option>
            <option value="IGSS">IGSS</option>
            <option value="Privado">Privado</option>
            <option value="Ninguno">Ninguno</option>
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          Cuidador / responsable
          <input name="cuidador" value={datos.cuidador} onChange={cambiar} className={campo} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Registrar"}
        </button>
        {exito && <span className="text-sm text-green-700">{exito}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

export default function Pacientes() {
  const { puedeRegistrarPacientes } = useRoles();

  // --- Listado real: GET /pacientes (solo personal de Salud) ---
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    client
      .get("/pacientes")
      .then((res) => {
        setPacientes(res.data.data);
        setError(null);
      })
      .catch((err) =>
        setError(err.response?.status === 403 ? "No tiene permiso para ver el listado de pacientes." : mensajeError(err))
      )
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // --- Búsqueda por ID ---
  const [idBuscado, setIdBuscado] = useState("");
  const [pacienteEncontrado, setPacienteEncontrado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState(null);

  function buscarPaciente(e) {
    e.preventDefault();
    if (!idBuscado) return;

    setBuscando(true);
    setErrorBusqueda(null);
    setPacienteEncontrado(null);

    client
      .get(`/pacientes/${idBuscado}`)
      .then((res) => setPacienteEncontrado(res.data.data))
      .catch((err) => setErrorBusqueda(mensajeError(err)))
      .finally(() => setBuscando(false));
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Pacientes</h1>

      {puedeRegistrarPacientes && <FormularioPaciente onCreado={cargar} />}

      <div className="bg-white border rounded-lg p-4 shadow-sm mb-6">
        <h2 className="font-bold text-gray-700 mb-2">Buscar paciente por ID</h2>
        <form onSubmit={buscarPaciente} className="flex gap-2 items-center">
          <input
            type="number"
            value={idBuscado}
            onChange={(e) => setIdBuscado(e.target.value)}
            placeholder="ID del paciente"
            className="border rounded px-3 py-1 w-40"
          />
          <button
            type="submit"
            className="bg-blue-700 text-white px-4 py-1 rounded hover:bg-blue-800"
          >
            Buscar
          </button>
        </form>

        {buscando && <p className="text-sm text-gray-500 mt-2">Buscando...</p>}
        {errorBusqueda && <p className="text-sm text-red-600 mt-2">{errorBusqueda}</p>}
        {pacienteEncontrado && (
          <div className="mt-3 text-sm text-gray-700">
            <p><span className="font-semibold">Nombre:</span> {pacienteEncontrado.nombre_completo}</p>
            <p><span className="font-semibold">CUI:</span> {pacienteEncontrado.cui}</p>
            <p><span className="font-semibold">Tipo de seguro:</span> {pacienteEncontrado.tipo_seguro}</p>
          </div>
        )}
      </div>

      <h2 className="font-bold text-gray-700 mb-2">Listado de pacientes</h2>
      {cargando && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!cargando && !error && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2">ID</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">CUI</th>
              <th className="p-2">Teléfono</th>
              <th className="p-2">Tipo de seguro</th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{p.id}</td>
                <td className="p-2">{p.nombre_completo}</td>
                <td className="p-2">{p.cui}</td>
                <td className="p-2">{p.telefono}</td>
                <td className="p-2">{p.tipo_seguro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
