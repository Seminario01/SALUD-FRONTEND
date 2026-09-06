import { useEffect, useState } from "react";
import { citasMock } from "../mocks/citas";

const colores = {
  pendiente: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
};

export default function Citas() {
  const [citas, setCitas] = useState([]);

  useEffect(() => {
    setCitas(citasMock);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Citas médicas</h1>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b bg-gray-100">
            <th className="p-2">Fecha y hora</th>
            <th className="p-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {citas.map((c) => (
            <tr key={c.id} className="border-b hover:bg-gray-50">
              <td className="p-2">{c.fecha_hora}</td>
              <td className="p-2">
                <span className={`px-2 py-1 rounded text-sm ${colores[c.estado] ?? "bg-gray-100 text-gray-800"}`}>
                  {c.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}