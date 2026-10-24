import { useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import { useAvisos } from "../components/Avisos";
import useRoles from "../hooks/useRoles";
import { PERMISOS, PUESTOS, ROLES_AUDITORIA } from "../permisos";

// Matriz de puestos y permisos (Jefatura y Administración). Muestra la matriz VIGENTE de GET /permisos
// (la original de auth.PERMISOS con los ajustes); con permisos.editar (Administración) cada casilla de
// un puesto de Salud se toca para dar o quitar el permiso (PUT /permisos). Los cambios llevan borde ámbar.
const COLUMNAS = [
  [PUESTOS.MEDICO, "Médico"], [PUESTOS.ENFERMERIA, "Enfermería"], [PUESTOS.RECEPCION, "Recepción"],
  [PUESTOS.FARMACIA, "Farmacia"], [PUESTOS.CAJA, "Caja"], [PUESTOS.JEFATURA, "Jefatura"],
  [PUESTOS.ADMIN, "Administración"], [ROLES_AUDITORIA[0], "Auditoría"],
];

const AREAS = [
  ["Pacientes", [
    ["pacientes.ver", "Buscar y ver pacientes"], ["pacientes.registrar", "Registrar y editar pacientes"],
    ["pacientes.alergias", "Registrar alergias"], ["pacientes.antecedentes", "Consultar antecedentes en Seguridad"],
  ]],
  ["Citas y turnos", [
    ["citas.ver", "Ver citas"], ["citas.gestionar", "Agendar, reprogramar y cancelar citas"],
    ["turnos.ver_cola", "Ver la cola de turnos"], ["turnos.generar", "Dar turnos"],
    ["turnos.clasificar", "Clasificar el triage"], ["turnos.atender", "Llamar y atender turnos"],
  ]],
  ["Atención clínica", [
    ["expediente.ver", "Ver el expediente clínico"], ["expediente.registrar", "Registrar atenciones (diagnóstico CIE-10)"],
    ["vacunacion.ver", "Ver vacunación"], ["vacunacion.registrar", "Registrar vacunación"], ["vacunacion.anular", "Anular un registro de vacunación"],
    ["crecimiento.registrar", "Registrar peso y talla (curvas OMS)"],
    ["constancias.ver", "Ver constancias"], ["constancias.emitir", "Emitir constancias e incapacidades"], ["constancias.anular", "Anular constancias"],
  ]],
  ["Recetas y farmacia", [
    ["recetas.ver", "Ver recetas"], ["recetas.crear", "Recetar"], ["recetas.anular", "Anular recetas"],
    ["recetas.despachar", "Despachar recetas"], ["inventario.ver", "Ver inventario"], ["inventario.gestionar", "Entradas, salidas y lotes"],
  ]],
  ["Laboratorio", [
    ["laboratorio.ver", "Ver órdenes y resultados"], ["laboratorio.ordenar", "Ordenar exámenes"],
    ["laboratorio.procesar", "Tomar muestra y registrar resultados"], ["laboratorio.anular", "Anular órdenes"],
  ]],
  ["Hospitalización", [
    ["hospitalizacion.ver", "Ver encamamiento"], ["hospitalizacion.ordenar", "Ordenar ingreso y egreso"],
    ["hospitalizacion.camas", "Asignar camas"], ["hospitalizacion.notas", "Notas y signos vitales"],
    ["recursos.ver", "Ver recursos y camas"], ["recursos.camas", "Cambiar el estado de las camas"], ["recursos.gestionar", "Administrar recursos"],
  ]],
  ["Red y referencias", [
    ["referencias.ver", "Ver las referencias a otros establecimientos"], ["referencias.crear", "Referir a un paciente"],
    ["referencias.gestionar", "Marcar una referencia recibida o cancelada"], ["establecimientos.gestionar", "Completar los datos de la red de establecimientos"],
  ]],
  ["Caja y pagos", [
    ["cuentas.ver", "Ver cuentas de pacientes"], ["cuentas.gestionar", "Cargos, descuentos y cierre de cuentas"],
    ["pagos.verificar", "Enviar cobros y verificar pagos en Tributario"],
  ]],
  ["Gestión", [
    ["panel.ver", "Ver el tablero"], ["reportes.ver", "Reportes de diagnósticos"],
    ["vigilancia.ver", "Mapa de vigilancia (solo cifras)"], ["vigilancia.pacientes", "Ver quiénes son los casos del mapa"],
    ["presupuesto.ver", "Ver el presupuesto"], ["presupuesto.editar", "Actualizar el presupuesto"],
    ["integraciones.ver", "Ver integraciones con otros módulos"], ["integraciones.demo", "Demostración de integraciones"],
    ["bitacora.ver", "Bitácora de accesos a datos de pacientes"],
    ["puestos.asignar", "Asignar puestos y sedes al personal"],
    ["sedes.cambiar", "Ver otra sede o todas las sedes"],
    ["permisos.editar", "Agregar o quitar permisos a un puesto"],
  ]],
];

export default function Permisos() {
  const { roles, puede } = useRoles();
  const avisos = useAvisos();
  const edita = puede("permisos.editar");
  const [datos, setDatos] = useState(null);
  const [guardando, setGuardando] = useState(null);
  const cargar = () => client.get("/permisos").then((r) => setDatos(r.data.data)).catch((e) => avisos.error(mensajeError(e)));
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const vigente = datos?.vigente ?? PERMISOS;
  const original = datos?.original ?? PERMISOS;
  const protegido = (clave, rol) => (datos?.protegidos ?? []).some(([p, r]) => p === clave && r === rol);
  const ajuste = (clave, rol) => datos?.ajustes.find((a) => a.permiso === clave && a.rol === rol);
  const mio = (rol) => roles.includes(rol) || (rol === ROLES_AUDITORIA[0] && ROLES_AUDITORIA.some((r) => roles.includes(r)));
  const totales = COLUMNAS.map(([rol]) => Object.values(vigente).filter((lista) => lista.includes(rol)).length);

  function cambiar(clave, rol, concedido) {
    setGuardando(`${clave}|${rol}`);
    client.put("/permisos", { permiso: clave, rol, concedido })
      .then((r) => { avisos.exito(r.data.message); return cargar(); })
      .catch((e) => avisos.error(mensajeError(e)))
      .finally(() => setGuardando(null));
  }

  function restablecer() {
    if (!window.confirm("¿Volver a la matriz original? Se borran todos los cambios hechos aquí.")) return;
    client.delete("/permisos/ajustes")
      .then((r) => { avisos.exito(r.data.message); cargar(); })
      .catch((e) => avisos.error(mensajeError(e)));
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Puestos y permisos</h1>
        {edita && datos?.ajustes.length > 0 && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-amber-800">{datos.ajustes.length} cambio(s) a la matriz original</span>
            <button onClick={restablecer} className="border rounded-lg px-3 py-1.5 hover:bg-slate-50">Restablecer original</button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
        <table className="min-w-full text-sm !ring-0 !shadow-none !rounded-none">
          <thead>
            <tr>
              <th className="text-left p-2 sticky left-0 bg-slate-100 z-10 min-w-56">Permiso</th>
              {COLUMNAS.map(([rol, nombre]) => (
                <th key={rol} className={`p-2 text-center whitespace-nowrap ${mio(rol) ? "text-blue-700" : ""}`}>
                  {nombre}{mio(rol) && <span className="block normal-case font-normal text-[11px]">(su puesto)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AREAS.map(([area, permisos]) => [
              <tr key={area} className="bg-slate-50 hover:!bg-slate-50">
                <td colSpan={COLUMNAS.length + 1} className="px-2 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 sticky left-0">{area}</td>
              </tr>,
              ...permisos.map(([clave, texto]) => (
                <tr key={clave}>
                  <td className="p-2 sticky left-0 bg-white">
                    {texto}
                    <span className="block text-[11px] text-slate-400 font-mono">{clave}</span>
                  </td>
                  {COLUMNAS.map(([rol, nombre]) => {
                    const si = (vigente[clave] || []).includes(rol);
                    const cambiado = ajuste(clave, rol);
                    const editable = edita && datos?.editables.includes(rol) && !protegido(clave, rol);
                    const marca = si
                      ? <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold ${cambiado ? "ring-2 ring-amber-400" : ""}`}>✓</span>
                      : <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-300 ${cambiado ? "ring-2 ring-amber-400" : ""}`}>·</span>;
                    const detalle = cambiado
                      ? ` (cambiado por ${cambiado.cambiado_por || "Administración"}; en la matriz original: ${(original[clave] || []).includes(rol) ? "sí" : "no"})`
                      : "";
                    return (
                      <td key={rol} className={`p-1 text-center ${mio(rol) ? "bg-blue-50/50" : ""}`}>
                        {editable ? (
                          <button onClick={() => cambiar(clave, rol, !si)} disabled={guardando === `${clave}|${rol}`}
                            title={`${si ? "Quitar" : "Dar"} a ${nombre}${detalle}`} aria-label={`${nombre}: ${si ? "sí" : "no"}. ${si ? "Quitar" : "Dar"} permiso`}
                            className="rounded-full p-1 hover:bg-slate-100 disabled:opacity-50">
                            {marca}
                          </button>
                        ) : (
                          <span title={detalle.trim() || undefined} aria-label={`${nombre}: ${si ? "sí" : "no"}`}>{marca}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )),
            ])}
            <tr className="bg-slate-50 font-medium">
              <td className="p-2 sticky left-0 bg-slate-50">Total de permisos</td>
              {totales.map((n, i) => <td key={COLUMNAS[i][0]} className="p-2 text-center tabular-nums">{n}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
