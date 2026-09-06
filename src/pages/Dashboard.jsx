import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { clientExterno } from "../api/client";
import { pacientesMock } from "../mocks/pacientes";
import { citasMock } from "../mocks/citas";
import { turnosMock } from "../mocks/turnos";
import { vacunacionMock } from "../mocks/vacunacion";

function TarjetaResumen({ titulo, valor, detalle, to, color }) {
  return (
    <Link
      to={to}
      className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow block"
    >
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className={`text-3xl font-bold ${color}`}>{valor}</p>
      <p className="text-xs text-gray-400 mt-1">{detalle}</p>
    </Link>
  );
}

export default function Dashboard() {
  const [establecimientos, setEstablecimientos] = useState(null);
  const [errorRecursos, setErrorRecursos] = useState(false);

  useEffect(() => {
    clientExterno
      .get("/establecimientos/disponibilidad")
      .then((res) => setEstablecimientos(res.data.establecimientos))
      .catch(() => setErrorRecursos(true));
  }, []);

  const citasPendientes = citasMock.filter((c) => c.estado === "pendiente").length;
  const turnosEnEspera = turnosMock.filter((t) => t.estado === "en_espera").length;
  const vacunacionPendiente = vacunacionMock.filter((v) => !v.esquema_completo).length;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Módulo de Salud</h1>
      <p className="text-gray-500 mb-6">Resumen general del sistema</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen
          titulo="Pacientes registrados"
          valor={pacientesMock.length}
          detalle="Datos de prueba (pendiente Cognito)"
          to="/pacientes"
          color="text-blue-700"
        />
        <TarjetaResumen
          titulo="Citas pendientes"
          valor={citasPendientes}
          detalle="Datos de prueba (pendiente Cognito)"
          to="/citas"
          color="text-yellow-600"
        />
        <TarjetaResumen
          titulo="Turnos en espera"
          valor={turnosEnEspera}
          detalle="Datos de prueba (pendiente Cognito)"
          to="/turnos"
          color="text-orange-600"
        />
        <TarjetaResumen
          titulo="Vacunación pendiente"
          valor={vacunacionPendiente}
          detalle="Datos de prueba (pendiente Cognito)"
          to="/vacunacion"
          color="text-purple-600"
        />
      </div>

      <h2 className="text-lg font-bold text-gray-700 mt-8 mb-3">Establecimientos de salud (dato real)</h2>
      {errorRecursos && (
        <p className="text-red-600 text-sm">No se pudo conectar al backend. ¿Está corriendo local?</p>
      )}
      {!errorRecursos && !establecimientos && <p className="text-gray-500 text-sm">Cargando...</p>}
      {establecimientos && establecimientos.length === 0 && (
        <p className="text-gray-500 text-sm">Aún no hay establecimientos cargados en la base de datos.</p>
      )}
      {establecimientos && establecimientos.length > 0 && (
        <div className="bg-white border rounded-lg p-4 shadow-sm inline-block">
          <p className="text-sm text-gray-500">Establecimientos disponibles</p>
          <p className="text-3xl font-bold text-green-700">{establecimientos.length}</p>
        </div>
      )}
      <Link to="/recursos" className="block mt-2 text-sm text-blue-700 hover:underline">
        Ver todos los recursos →
      </Link>
    </div>
  );
}