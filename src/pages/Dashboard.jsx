import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import client from "../api/client";

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
  const auth = useAuth();
  const [indicadores, setIndicadores] = useState(null);
  const [errorIndicadores, setErrorIndicadores] = useState(false);
  const [sinPermiso, setSinPermiso] = useState(false);

  useEffect(() => {
    // GET /panel usa el token del usuario (solo personal de Salud).
    // La API key entre módulos NO se usa desde el navegador.
    client
      .get("/panel")
      .then((res) => setIndicadores(res.data.data))
      .catch((err) => {
        if (err.response?.status === 403) setSinPermiso(true);
        else setErrorIndicadores(true);
      });
  }, []);

  if (sinPermiso) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          Bienvenido, {auth.user?.profile?.given_name || auth.user?.profile?.name}
        </h1>
        <p className="text-gray-500 mb-6">Módulo de Salud</p>
        <p className="text-gray-700">
          El resumen general es solo para el personal de Salud. Puede consultar sus{" "}
          <Link to="/citas" className="text-blue-700 hover:underline">citas</Link>.
        </p>
      </div>
    );
  }

  // Formato de GET /indicadores: { pacientes_totales, citas: {...}, turnos: {...},
  // vacunacion: {...}, recursos_hospitalarios: [...] }
  const citas = indicadores?.citas ?? {};
  const turnos = indicadores?.turnos ?? {};
  const vacunacion = indicadores?.vacunacion ?? {};
  const recursos = indicadores?.recursos_hospitalarios ?? [];
  const camasDisponibles = recursos.find((r) => r.tipo === "cama");

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
            valor={citas.pendientes ?? 0}
            detalle={`${citas.atendidas ?? 0} atendidas, ${citas.canceladas ?? 0} canceladas`}
            to="/citas"
            color="text-yellow-600"
          />
          <TarjetaResumen
            titulo="Turnos en espera"
            valor={turnos.en_espera ?? 0}
            detalle={`${turnos.atendidos ?? 0} atendidos`}
            to="/turnos"
            color="text-orange-600"
          />
          <TarjetaResumen
            titulo="Vacunación pendiente"
            valor={vacunacion.pendiente ?? 0}
            detalle={`${vacunacion.estudiantes_vacunados ?? 0} estudiantes con esquema completo`}
            to="/vacunacion"
            color="text-purple-600"
          />
        </div>
      )}

      <h2 className="text-lg font-bold text-gray-700 mt-8 mb-3">Recursos hospitalarios</h2>
      {indicadores && recursos.length === 0 && (
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

      {indicadores?.presupuesto_servicio_social && (
        <>
          <h2 className="text-lg font-bold text-gray-700 mt-8 mb-3">Presupuesto ({indicadores.presupuesto_servicio_social.periodo})</h2>
          <div className="bg-white border rounded-lg p-4 shadow-sm inline-block">
            <p className="text-sm text-gray-500">Ejecutado / Asignado</p>
            <p className="text-3xl font-bold text-teal-700">
              Q{indicadores.presupuesto_servicio_social.monto_ejecutado_servicio_social.toLocaleString()}{" "}
              <span className="text-sm text-gray-400 font-normal">
                / Q{indicadores.presupuesto_servicio_social.monto_asignado.toLocaleString()}
              </span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}