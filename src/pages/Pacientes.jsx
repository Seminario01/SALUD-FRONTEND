import { useEffect, useState } from "react";
import { pacientesMock } from "../mocks/pacientes";
// import client from "../api/client"; // <- descomenta cuando ya haya token real

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([]);

  useEffect(() => {
    // Por ahora usamos el mock. Cuando haya Cognito, reemplaza esto por:
    // client.get("/pacientes").then((res) => setPacientes(res.data.data));
    setPacientes(pacientesMock);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Pacientes</h1>
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