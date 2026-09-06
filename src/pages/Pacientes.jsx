import { useEffect, useState } from "react";
import client from "../api/client";
import { pacientesMock } from "../mocks/pacientes";

export default function Pacientes() {
  // NOTA: el backend todavía no tiene GET /api/v1/salud/pacientes (listar todos).
  // Solo existe GET /pacientes/<id>. Mientras se agrega el endpoint de listado,
  // seguimos mostrando el mock aquí abajo. Pedir a backend un endpoint tipo:
  //   GET /api/v1/salud/pacientes  -> lista con paginación/filtro
  const [pacientes, setPacientes] = useState([]);

  useEffect(() => {
    setPacientes(pacientesMock);
  }, []);

  // --- Búsqueda por ID: esto SÍ pega al backend real ---
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
        <h2 className="font-bold text-gray-700 mb-2">Buscar paciente por ID (dato real)</h2>
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
        {errorBusqueda && (
          <p className="text-sm text-red-600 mt-2">
            {errorBusqueda} (¿falta el token de Cognito o el usuario no tiene permiso?)
          </p>
        )}
        {pacienteEncontrado && (
          <div className="mt-3 text-sm text-gray-700">
            <p><span className="font-semibold">Nombre:</span> {pacienteEncontrado.nombre_completo}</p>
            <p><span className="font-semibold">CUI:</span> {pacienteEncontrado.cui}</p>
            <p><span className="font-semibold">Tipo de seguro:</span> {pacienteEncontrado.tipo_seguro}</p>
          </div>
        )}
      </div>

      <h2 className="font-bold text-gray-700 mb-2">Listado de pacientes (datos de prueba, pendiente endpoint en backend)</h2>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b bg-gray-100">
            <th className="p-2">Nombre</th>
            <th className="p-2">CUI</th>
            <th className="p-2">Tipo de seguro</th>
          </tr>
        </thead>
        <tbody>
          {pacientes.map((p) => (
            <tr key={p.id} className="border-b hover:bg-gray-50">
              <td className="p-2">{p.nombre_completo}</td>
              <td className="p-2">{p.cui}</td>
              <td className="p-2">{p.tipo_seguro}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}