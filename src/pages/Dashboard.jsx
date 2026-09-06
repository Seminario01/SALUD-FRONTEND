import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { clientExterno } from "../api/client";

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
  const [indicadores, setIndicadores] = useState(null);
  const [errorIndicadores, setErrorIndicadores] = useState(false);

  useEffect(() => {
    clientExterno
      .get("/indicadores")
      .then((res) => setIndicadores(res.data.data ?? res.data))
      .catch(() => setErrorIndicadores(true));
  }, []);

  const camasDisponibles = indicadores?.recursos?.find((r) => r.tipo === "cama");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Módulo de Salud</h1>
      <p className="text-gray-500 mb-6">Resumen general del sistema</p>

      {errorIndicadores && (
        <p className="text-red-600 text-sm mb-4">
          No se pudieron cargar los indicadores. ¿Está corriendo el backend local?
        </p>
      )}

      {!errorIndicadores && !indicadores && (
        <p className="text-gray-500 text-sm mb-4">Cargando indicadores...</p>
      )}

      {indicadores && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TarjetaResumen
            titulo="Pacientes registrados"
            valor={indicadores.pacientes_totales}
            detalle="Total en la base de datos"
            to="/pacientes"
            color="text-blue-700"
          />
          <TarjetaResumen
            titulo="Citas pendientes"
            valor={indicadores.citas_pendientes}
            detalle={`${indicadores.citas_atendidas} atendidas, ${indicadores.citas_canceladas} canceladas`}
            to="/citas"
            color="text-yellow-600"
          />
          <TarjetaResumen
            titulo="Turnos en espera"
            valor={indicadores.turnos_en_espera}
            detalle={`${indicadores.turnos_atendidos} atendidos`}
            to="/turnos"
            color="text-orange-600"
          />
          <TarjetaResumen
            titulo="Vacunación pendiente"
            valor={indicadores.vacunacion_pendiente}
            detalle={`${indicadores.estudiantes_vacunados} estudiantes con esquema completo`}
            to="/vacunacion"
            color="text-purple-600"
          />
        </div>
      )}

      <h2 className="text-lg font-bold text-gray-700 mt-8 mb-3">Recursos hospitalarios</h2>
      {indicadores && (!indicadores.recursos || indicadores.recursos.length === 0) && (
        <p className="text-gray-500 text-sm">Aún no hay recursos cargados en la base de datos.</p>
      )}
      {camasDisponibles && (
        <div className="bg-white border rounded-lg p-4 shadow-sm inline-block">
          <p className="text-sm text-gray-500 capitalize">Camas disponibles</p>
          <p className="text-3xl font-bold text-green-700">
            {camasDisponibles.disponible}{" "}
            <span className="text-sm text-gray-400 font-normal">/ {camasDisponibles.total}</span>
          </p>
        </div>
      )}
      <Link to="/recursos" className="block mt-2 text-sm text-blue-700 hover:underline">
        Ver todos los recursos →
      </Link>

      {indicadores?.presupuesto && (
        <>
          <h2 className="text-lg font-bold text-gray-700 mt-8 mb-3">Presupuesto ({indicadores.presupuesto.periodo})</h2>
          <div className="bg-white border rounded-lg p-4 shadow-sm inline-block">
            <p className="text-sm text-gray-500">Ejecutado / Asignado</p>
            <p className="text-3xl font-bold text-teal-700">
              Q{indicadores.presupuesto.monto_ejecutado_servicio_social.toLocaleString()}{" "}
              <span className="text-sm text-gray-400 font-normal">
                / Q{indicadores.presupuesto.monto_asignado.toLocaleString()}
              </span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}