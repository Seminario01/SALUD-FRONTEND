import { useEffect, useState } from "react";
import { vacunacionMock } from "../mocks/vacunacion";

export default function Vacunacion() {
  const [registros, setRegistros] = useState([]);

  useEffect(() => {
    setRegistros(vacunacionMock);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Vacunación</h1>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b bg-gray-100">
            <th className="p-2">Paciente ID</th>
            <th className="p-2">Estudiante</th>
            <th className="p-2">Esquema completo</th>
            <th className="p-2">Pendientes</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((v) => (
            <tr key={v.id} className="border-b hover:bg-gray-50">
              <td className="p-2">{v.paciente_id}</td>
              <td className="p-2">{v.es_estudiante ? "Sí" : "No"}</td>
              <td className="p-2">{v.esquema_completo ? "Sí" : "No"}</td>
              <td className="p-2">{v.vacunas_pendientes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}