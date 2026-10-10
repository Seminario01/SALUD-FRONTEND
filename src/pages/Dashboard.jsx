import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import MiResumen from "./MiResumen";
import EstadoIntegraciones from "../components/EstadoIntegraciones";
import ResumenCitas from "../components/ResumenCitas";
import ResumenFarmacia from "../components/ResumenFarmacia";
import AlertasSeguridad from "../components/AlertasSeguridad";
import useRoles from "../hooks/useRoles";

function TarjetaResumen({ titulo, valor, detalle, to, color }) {
  const contenido = (
    <>
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className={`text-3xl font-bold ${color}`}>{valor}</p>
      <p className="text-xs text-gray-400 mt-1">{detalle}</p>
    </>
  );
  // Sin "to" (vista de Auditoría) la tarjeta no es un enlace
  if (!to) return <div className="bg-white border rounded-lg p-4 shadow-sm block">{contenido}</div>;
  return (
    <Link to={to} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow block">
      {contenido}
    </Link>
  );
}

export default function Dashboard() {
  const { esPersonal, esAuditor, puede } = useRoles();
  // Cada tarjeta enlaza a su pantalla solo si el puesto puede usarla.
  const PERMISO_RUTA = { "/pacientes": "pacientes.ver", "/citas": "citas.ver", "/turnos": "turnos.ver_cola", "/vacunacion": "vacunacion.ver" };
  const enlace = (ruta) => (puede(PERMISO_RUTA[ruta]) ? ruta : undefined);
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

  // Un ciudadano no ve los indicadores generales: ve su propio resumen.
  if (sinPermiso) return <MiResumen />;

  // Formato de GET /indicadores: { pacientes_totales, citas: {...}, turnos: {...},
  // vacunacion: {...}, recursos_hospitalarios: [...] }
  const citas = indicadores?.citas ?? {};
  const turnos = indicadores?.turnos ?? {};
  const vacunacion = indicadores?.vacunacion ?? {};
  const recursos = indicadores?.recursos_hospitalarios ?? [];
  const camasDisponibles = recursos.find((r) => r.tipo === "cama");
  const hospital = indicadores?.hospitalizacion;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Módulo de Salud</h1>
      <p className="text-gray-500 mb-6">
        {esAuditor && !esPersonal
          ? "Indicadores agregados del Módulo de Salud"
          : "Resumen general del sistema"}
      </p>

      {errorIndicadores && (
        <p className="text-red-600 text-sm mb-4">
          No se pudieron cargar los indicadores.
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
            to={enlace("/pacientes")}
            color="text-blue-700"
          />
          <TarjetaResumen
            titulo="Citas pendientes"
            valor={citas.pendientes ?? 0}
            detalle={`${citas.atendidas ?? 0} atendidas, ${citas.canceladas ?? 0} canceladas`}
            to={enlace("/citas")}
            color="text-yellow-600"
          />
          <TarjetaResumen
            titulo="Turnos en espera"
            valor={turnos.en_espera ?? 0}
            detalle={`${turnos.atendidos ?? 0} atendidos`}
            to={enlace("/turnos")}
            color="text-orange-600"
          />
          <TarjetaResumen
            titulo="Vacunación pendiente"
            valor={vacunacion.pendiente ?? 0}
            detalle={`${vacunacion.estudiantes_vacunados ?? 0} estudiantes con esquema completo`}
            to={enlace("/vacunacion")}
            color="text-purple-600"
          />
        </div>
      )}

      <h2 className="text-lg font-bold text-gray-700 mt-8 mb-3">Hospitalización y camas</h2>
      {indicadores && !hospital?.camas_total && recursos.length === 0 && (
        <p className="text-gray-500 text-sm">Aún no hay recursos cargados en la base de datos.</p>
      )}
      {hospital?.camas_total > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TarjetaResumen
            titulo="Camas disponibles"
            valor={<>{hospital.camas_disponibles} <span className="text-sm text-gray-400 font-normal">/ {hospital.camas_total}</span></>}
            detalle={`Ocupación ${hospital.ocupacion_porcentaje} %`}
            to={puede("hospitalizacion.ver") ? "/hospitalizacion" : undefined}
            color="text-green-700"
          />
          <TarjetaResumen
            titulo="Pacientes hospitalizados"
            valor={hospital.hospitalizados}
            detalle={`${hospital.egresos_ultimos_30_dias} egresos en los últimos 30 días`}
            to={puede("hospitalizacion.ver") ? "/hospitalizacion" : undefined}
            color="text-blue-700"
          />
          <TarjetaResumen
            titulo="Órdenes pendientes de cama"
            valor={hospital.ordenes_pendientes}
            detalle={hospital.ordenes_pendientes ? "Esperan asignación de Enfermería" : "Sin pendientes"}
            to={puede("hospitalizacion.ver") ? "/hospitalizacion" : undefined}
            color={hospital.ordenes_pendientes ? "text-yellow-600" : "text-slate-700"}
          />
        </div>
      ) : camasDisponibles && (
        <div className="bg-white border rounded-lg p-4 shadow-sm inline-block">
          <p className="text-sm text-gray-500 capitalize">Camas disponibles</p>
          <p className="text-3xl font-bold text-green-700">
            {camasDisponibles.disponible}{" "}
            <span className="text-sm text-gray-400 font-normal">/ {camasDisponibles.total}</span>
          </p>
        </div>
      )}
      {puede("recursos.ver") && (
        <Link to="/recursos" className="block mt-2 text-sm text-blue-700 hover:underline">
          Ver todos los recursos →
        </Link>
      )}

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
      {puede("cuentas.ver") && indicadores?.cuentas && (
        <>
          <h2 className="text-lg font-bold text-gray-700 mt-8 mb-3">Caja</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TarjetaResumen titulo="Cuentas abiertas" valor={indicadores.cuentas.cuentas_abiertas}
              detalle="Pacientes con cargos en curso" to="/caja" color="text-blue-700" />
            <TarjetaResumen titulo="Por cobrar en Tributario" valor={`Q${indicadores.cuentas.monto_por_cobrar.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`}
              detalle={`${indicadores.cuentas.cuentas_por_cobrar} cuenta(s) con referencia de pago`} to="/caja" color="text-yellow-600" />
            <TarjetaResumen titulo="Cobrado (30 días)" valor={`Q${indicadores.cuentas.cobrado_30_dias.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`}
              detalle="Pagos confirmados por Tributario" to="/caja" color="text-green-700" />
          </div>
        </>
      )}
      {puede("turnos.ver_cola") && <AlertasSeguridad />}
      {puede("citas.ver") && <ResumenCitas />}
      {puede("inventario.ver") && <ResumenFarmacia verRecetas={puede("recetas.despachar", "recetas.anular")} />}
      {puede("integraciones.ver") && <EstadoIntegraciones />}
    </div>
  );
}