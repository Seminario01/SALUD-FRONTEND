import { useEffect, useState } from "react";
import { turnosMock } from "../mocks/turnos";

export default function Turnos() {
  const [turnos, setTurnos] = useState([]);

  useEffect(() => {
    setTurnos(turnosMock);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Turnos activos</h1>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b bg-gray-100">
            <th className="p-2">N° turno</th>
            <th className="p-2">Tipo de atención</th>
            <th className="p-2">Prioridad</th>
            <th className="p-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {turnos.map((t) => (
            <tr key={t.id} className="border-b hover:bg-gray-50">
              <td className="p-2 font-bold">{t.numero_turno}</td>
              <td className="p-2">{t.tipo_atencion}</td>
              <td className="p-2 capitalize">{t.prioridad}</td>
              <td className="p-2 capitalize">{t.estado.replace("_", " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}