import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import Presupuesto from "../components/Presupuesto";
import MiResumen from "./MiResumen";
import EstadoIntegraciones from "../components/EstadoIntegraciones";
import ResumenCitas from "../components/ResumenCitas";
import GraficasGestion from "../components/GraficasGestion";
import ResumenFarmacia from "../components/ResumenFarmacia";
import DiagnosticosFrecuentes from "../components/DiagnosticosFrecuentes";
import AlertasSeguridad from "../components/AlertasSeguridad";
import useRoles from "../hooks/useRoles";
import useSede from "../hooks/useSede";
import { BotonImprimir, EncabezadoImpreso, PieImpreso } from "../components/Impresion";
import BotonesExportar from "../components/Exportar";

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

// Lo que hay que atender ya (GET /panel -> atencion_hoy; cada puesto recibe solo lo suyo)
function AtencionHoy({ datos }) {
  const { triage, laboratorio, lista_espera: espera, vigilancia } = datos;
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  return (
    <>
      <h2 className="text-lg font-bold text-gray-700 mt-8 mb-3">Para atender ahora</h2>
      {vigilancia?.posibles_brotes > 0 && (
        <Link to="/vigilancia" role="alert"
          className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border-2 border-red-300 bg-red-50 p-4 text-red-900 hover:bg-red-100">
          <span className="text-2xl font-bold tabular-nums">⚠ {vigilancia.posibles_brotes}</span>
          <span className="flex-1 min-w-48">
            <span className="block font-semibold">{vigilancia.posibles_brotes === 1 ? "Posible brote" : "Posibles brotes"} en la vigilancia epidemiológica</span>
            <span className="block text-sm">{vigilancia.detalle.join(" · ")}</span>
          </span>
          <span className="text-sm font-medium underline">Ver el mapa →</span>
        </Link>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {triage && (
          <TarjetaResumen titulo="Urgencias en espera" valor={triage.urgentes_en_espera} to="/turnos"
            color={triage.urgentes_en_espera ? "text-red-700" : "text-green-700"}
            detalle={[triage.rojos_en_espera ? plural(triage.rojos_en_espera, "rojo (inmediato)", "rojos (inmediato)") : "Triage rojo y naranja",
              triage.excedidos ? `⚠ ${plural(triage.excedidos, "pasó", "pasaron")} el tiempo recomendado` : null,
              triage.sin_clasificar ? `${triage.sin_clasificar} sin clasificar` : null].filter(Boolean).join(" · ")} />
        )}
        {laboratorio && (
          <TarjetaResumen titulo="Laboratorio por atender" valor={laboratorio.por_atender} to="/laboratorio"
            color={laboratorio.urgentes ? "text-red-700" : "text-blue-700"}
            detalle={`${plural(laboratorio.urgentes, "urgente", "urgentes")} · ${plural(laboratorio.muestras_tomadas, "con muestra tomada", "con muestra tomada")}`} />
        )}
        {laboratorio && (
          <TarjetaResumen titulo="Resultados fuera de rango" valor={laboratorio.con_valores_fuera_de_rango_7_dias} to="/laboratorio"
            color={laboratorio.con_valores_fuera_de_rango_7_dias ? "text-amber-600" : "text-green-700"}
            detalle={`De ${plural(laboratorio.completadas_7_dias, "informe entregado", "informes entregados")} en 7 días`} />
        )}
        {espera && (
          <TarjetaResumen titulo="Lista de espera de citas" valor={espera.esperando} to="/citas/lista-espera" color="text-purple-600"
            detalle={espera.esperando ? `El primero espera desde hace ${plural(espera.dias_el_mas_antiguo, "día", "días")}` : "Nadie esperando cita"} />
        )}
      </div>
    </>
  );
}

export default function Dashboard() {
  const { esPersonal, esAuditor, puede } = useRoles();
  const sede = useSede(esPersonal);
  // Cada tarjeta enlaza a su pantalla solo si el puesto puede usarla.
  const PERMISO_RUTA = { "/pacientes": "pacientes.ver", "/citas": "citas.ver", "/turnos": "turnos.ver_cola", "/vacunacion": "vacunacion.ver" };
  const enlace = (ruta) => (puede(PERMISO_RUTA[ruta]) ? ruta : undefined);
  const [indicadores, setIndicadores] = useState(null);
  const [errorIndicadores, setErrorIndicadores] = useState(false);
  const [sinPermiso, setSinPermiso] = useState(false);

  // GET /panel usa el token del usuario (solo personal de Salud).
  // La API key entre módulos NO se usa desde el navegador.
  const cargarPanel = () => client
    .get("/panel")
    .then((res) => setIndicadores(res.data.data))
    .catch((err) => {
      if (err.response?.status === 403) setSinPermiso(true);
      else setErrorIndicadores(true);
    });
  useEffect(() => { cargarPanel(); }, []);

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

  // Informe de gestión para Excel: un renglón por indicador (Área, Indicador, Valor, Detalle)
  const presupuesto = indicadores?.presupuesto_servicio_social;
  const filasInforme = !indicadores ? [] : [
    ["Pacientes", "Pacientes registrados", indicadores.pacientes_totales, "Total en la base de datos"],
    ["Citas", "Citas pendientes", citas.pendientes ?? 0, ""],
    ["Citas", "Citas atendidas", citas.atendidas ?? 0, ""],
    ["Citas", "Citas canceladas", citas.canceladas ?? 0, ""],
    ["Turnos", "Turnos en espera", turnos.en_espera ?? 0, ""],
    ["Turnos", "Turnos atendidos", turnos.atendidos ?? 0, ""],
    ["Vacunación", "Vacunación pendiente", vacunacion.pendiente ?? 0, ""],
    ["Vacunación", "Estudiantes con esquema completo", vacunacion.estudiantes_vacunados ?? 0, ""],
    ...(hospital?.camas_total > 0 ? [
      ["Hospitalización", "Camas disponibles", hospital.camas_disponibles, `de ${hospital.camas_total} camas`],
      ["Hospitalización", "Ocupación (%)", hospital.ocupacion_porcentaje, ""],
      ["Hospitalización", "Pacientes hospitalizados", hospital.hospitalizados, ""],
      ["Hospitalización", "Egresos (últimos 30 días)", hospital.egresos_ultimos_30_dias, ""],
      ["Hospitalización", "Órdenes pendientes de cama", hospital.ordenes_pendientes, ""],
    ] : []),
    ...recursos.map((rec) => ["Recursos", `${rec.tipo} disponibles`, rec.disponible, `de ${rec.total}`]),
    ...(presupuesto ? [
      ["Presupuesto", "Monto asignado (Q)", presupuesto.monto_asignado, presupuesto.periodo],
      ["Presupuesto", "Ejecutado en servicio social (Q)", presupuesto.monto_ejecutado_servicio_social, presupuesto.periodo],
    ] : []),
    ...(puede("cuentas.ver") && indicadores.cuentas ? [
      ["Caja", "Cuentas abiertas", indicadores.cuentas.cuentas_abiertas, ""],
      ["Caja", "Por cobrar en Tributario (Q)", indicadores.cuentas.monto_por_cobrar, `${indicadores.cuentas.cuentas_por_cobrar} cuenta(s)`],
      ["Caja", "Cobrado en 30 días (Q)", indicadores.cuentas.cobrado_30_dias, "Pagos confirmados por Tributario"],
    ] : []),
  ];

  return (
    <div className="p-6 print:p-0">
      <EncabezadoImpreso titulo="Informe de gestión" detalle="Indicadores del Módulo de Salud" />
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800 mb-1 print:hidden">Módulo de Salud</h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <BotonesExportar nombre="informe_gestion" titulo="Informe de gestión" filas={filasInforme} columnas={[
            { titulo: "Área", valor: (f) => f[0], ancho: 18 },
            { titulo: "Indicador", valor: (f) => f[1], ancho: 36 },
            { titulo: "Valor", valor: (f) => f[2], ancho: 14 },
            { titulo: "Detalle", valor: (f) => f[3], ancho: 36 },
          ]} />
          <BotonImprimir texto="Imprimir informe / PDF" />
        </div>
      </div>
      <p className="text-gray-500 mb-6">
        {esAuditor && !esPersonal
          ? "Indicadores agregados del Módulo de Salud"
          : sede?.nombre ?? "Resumen general del sistema"}
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

      {indicadores?.atencion_hoy && Object.keys(indicadores.atencion_hoy).length > 0 && (
        <AtencionHoy datos={indicadores.atencion_hoy} />
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
          <h2 className="text-lg font-bold text-gray-700 mt-8 mb-3">Presupuesto</h2>
          <Presupuesto presupuesto={indicadores.presupuesto_servicio_social} onActualizado={cargarPanel} />
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
      {puede("citas.ver") && <GraficasGestion verCobros={puede("cuentas.ver")} />}
      {puede("reportes.ver") && <DiagnosticosFrecuentes />}
      {puede("inventario.ver") && <ResumenFarmacia verRecetas={puede("recetas.despachar", "recetas.anular")} />}
      {puede("integraciones.ver") && <EstadoIntegraciones />}
      <PieImpreso />
    </div>
  );
}