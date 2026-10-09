// MATRIZ DE PERMISOS (documento "Matriz de permisos — Módulo Salud").
// Es la MISMA tabla que PERMISOS en SALUD-BACKEND/auth.py: si se cambia una,
// se cambia la otra. Aquí solo decide qué se MUESTRA; la seguridad real está
// en el backend, que valida el permiso en cada petición (403 si no corresponde).
// El ciudadano no aparece: accede solo a lo PROPIO.

export const PUESTOS = {
  MEDICO: "salud:medico",
  ENFERMERIA: "salud:enfermeria",
  RECEPCION: "salud:recepcion",
  FARMACIA: "salud:farmacia",
  CAJA: "salud:caja",
  JEFATURA: "salud:jefatura",
  ADMIN: "salud:admin",
};

const { MEDICO: MED, ENFERMERIA: ENF, RECEPCION: REC, FARMACIA: FAR, CAJA, JEFATURA: JEF, ADMIN: ADM } = PUESTOS;
export const ROLES_AUDITORIA = ["auditoria:analista", "auditoria:admin"];

export const PERMISOS = {
  "pacientes.ver": [MED, ENF, REC, FAR, CAJA, JEF, ADM],
  "pacientes.registrar": [REC, ADM],
  "pacientes.antecedentes": [MED, ENF, REC, JEF],
  "citas.ver": [MED, ENF, REC, CAJA, JEF, ADM],
  "citas.gestionar": [MED, REC],
  "turnos.generar": [ENF, REC],
  "turnos.atender": [MED, ENF],
  "turnos.ver_cola": [MED, ENF, REC, JEF, ADM],
  "expediente.ver": [MED, ENF, JEF, ADM],
  "expediente.registrar": [MED],
  "vacunacion.ver": [MED, ENF, JEF, ADM],
  "vacunacion.registrar": [MED, ENF],
  "vacunacion.anular": [JEF],
  "recursos.ver": [MED, ENF, REC, JEF, ADM],
  "recursos.gestionar": [ADM],
  "recursos.camas": [ENF, ADM],
  "pagos.verificar": [CAJA, REC, ADM],
  "recetas.ver": [MED, ENF, FAR, CAJA, JEF, ADM],
  "recetas.crear": [MED],
  "recetas.anular": [MED, JEF],
  "recetas.despachar": [FAR],
  "inventario.ver": [MED, ENF, FAR, JEF, ADM],
  "inventario.gestionar": [FAR],
  "panel.ver": [MED, ENF, REC, FAR, CAJA, JEF, ADM, ...ROLES_AUDITORIA],
  "presupuesto.ver": [JEF, ADM, ...ROLES_AUDITORIA],
  "presupuesto.editar": [ADM],
  "integraciones.ver": [JEF, ADM],
  "integraciones.demo": [JEF, ADM],
};

// Nombre del puesto para mostrar, en orden de prioridad (el primero que tenga el usuario).
export const NOMBRE_PUESTO = [
  [JEF, "Jefatura médica"],
  [ADM, "Administración"],
  [MED, "Médico"],
  [ENF, "Enfermería"],
  [REC, "Recepción"],
  [FAR, "Farmacia"],
  [CAJA, "Caja"],
  ["auditoria:admin", "Auditoría Social"],
  ["auditoria:analista", "Auditoría Social"],
  ["ciudadano", "Ciudadano"],
];

export function tienePermiso(roles, ...permisos) {
  return permisos.some((p) => (PERMISOS[p] ?? []).some((r) => roles.includes(r)));
}
