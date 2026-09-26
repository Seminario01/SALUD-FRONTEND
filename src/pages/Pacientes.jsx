import { useEffect, useState } from "react";
import client from "../api/client";

function mensajeError(err) {
  if (err.response?.status === 403) return "No tiene permiso para ver el listado de pacientes.";
  return err.response?.data?.message || err.message;
}

export default function Pacientes() {
  // --- Listado real: GET /pacientes (solo personal de Salud) ---
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    client
      .get("/pacientes")
      .then((res) => setPacientes(res.data.data))
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, []);

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
      .catch((err) => setErrorBusqueda(err.response?.data?.message || err.message))
      .finally(() => setBuscando(false));
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Pacientes</h1>

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
              <th className="p-2">Tipo de seguro</th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{p.id}</td>
                <td className="p-2">{p.nombre_completo}</td>
                <td className="p-2">{p.cui}</td>
                <td className="p-2">{p.tipo_seguro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
