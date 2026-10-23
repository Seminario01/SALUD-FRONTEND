import { useSyncExternalStore } from "react";
import { useAuth } from "react-oidc-context";
import { rolesDe } from "../auth";
import { NOMBRE_PUESTO, PUESTOS, ROLES_AUDITORIA, tienePermiso } from "../permisos";
import { leerPuestos, suscribirPuestos } from "../utils/puestosAsignados";

// Qué puede hacer el usuario según sus roles del Login Único y la matriz de
// permisos (src/permisos.js). OJO: esto solo decide qué se MUESTRA. La
// seguridad real está en el backend, que valida cada petición (403).
// A los roles del Login Único se suman los puestos asignados en Salud (utils/puestosAsignados.js).
export default function useRoles() {
  const auth = useAuth();
  const puestos = useSyncExternalStore(suscribirPuestos, leerPuestos);
  const deToken = rolesDe(auth.user);
  const asignados = puestos.sub === auth.user?.profile?.sub ? puestos.asignados : [];
  const roles = [...deToken, ...asignados.filter((r) => !deToken.includes(r))];
  const puede = (...permisos) => tienePermiso(roles, ...permisos);
  const esPersonal = Object.values(PUESTOS).some((r) => roles.includes(r));
  return {
    roles,
    puede,
    puesto: NOMBRE_PUESTO.find(([rol]) => roles.includes(rol))?.[1] ?? null,
    esPersonal,
    asignados,
    esAdmin: roles.includes(PUESTOS.ADMIN),
    esMedico: roles.includes(PUESTOS.MEDICO),
    esCiudadano: roles.includes("ciudadano") && !esPersonal,
    esAuditor: ROLES_AUDITORIA.some((r) => roles.includes(r)),
    puedeRegistrarPacientes: puede("pacientes.registrar"),
    puedeGenerarTurnos: puede("turnos.generar"),
    puedeAtenderTurnos: puede("turnos.atender"),
  };
}
