import useRoles from "../hooks/useRoles";
import { PERMISOS, PUESTOS, ROLES_AUDITORIA } from "../permisos";

// Matriz de puestos y permisos (solo lectura, para Jefatura y Administración).
// Sale de src/permisos.js, que es la misma tabla que PERMISOS en SALUD-BACKEND/auth.py:
// lo que se ve aquí es exactamente lo que el servidor deja hacer en cada petición.
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
    ["puestos.asignar", "Asignar puestos de Salud a cuentas del Login Único"],
  ]],
];

export default function Permisos() {
  const { roles } = useRoles();
  const mio = (rol) => roles.includes(rol) || (rol === ROLES_AUDITORIA[0] && ROLES_AUDITORIA.some((r) => roles.includes(r)));
  const totales = COLUMNAS.map(([rol]) => Object.values(PERMISOS).filter((lista) => lista.includes(rol)).length);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Puestos y permisos</h1>
        <p className="text-slate-500 mt-1 max-w-3xl text-sm">
          Qué puede hacer cada puesto del Login Único. Es la misma matriz que aplica el servidor en cada petición:
          si alguien intenta algo que no le toca, la respuesta es "sin permiso" aunque lo intente fuera de esta aplicación.
          El ciudadano solo ve lo suyo (su ficha, citas, recetas, resultados y constancias).
        </p>
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
                    const si = (PERMISOS[clave] || []).includes(rol);
                    return (
                      <td key={rol} className={`p-2 text-center ${mio(rol) ? "bg-blue-50/50" : ""}`}>
                        {si
                          ? <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold" aria-label={`${nombre}: sí`}>✓</span>
                          : <span className="text-slate-300" aria-label={`${nombre}: no`}>·</span>}
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
      <p className="text-xs text-slate-500">
        Principio de mínimo privilegio: cada puesto tiene solo lo que su trabajo necesita. Por ejemplo, Caja ve cuentas y recetas pero no
        el expediente clínico; Auditoría ve cifras sin datos personales; solo Médico receta y solo Farmacia despacha.
      </p>
    </div>
  );
}
