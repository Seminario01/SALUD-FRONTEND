import { useAuth } from "react-oidc-context";
import { rolesDe } from "../auth";
import { NOMBRE_PUESTO, PUESTOS, ROLES_AUDITORIA, tienePermiso } from "../permisos";

// Qué puede hacer el usuario según sus roles del Login Único y la matriz de
// permisos (src/permisos.js). OJO: esto solo decide qué se MUESTRA. La
// seguridad real está en el backend, que valida cada petición (403).
export default function useRoles() {
  const auth = useAuth();
  const roles = rolesDe(auth.user);
  const puede = (...permisos) => tienePermiso(roles, ...permisos);
  const esPersonal = Object.values(PUESTOS).some((r) => roles.includes(r));
  return {
    roles,
    puede,
    puesto: NOMBRE_PUESTO.find(([rol]) => roles.includes(rol))?.[1] ?? null,
    esPersonal,
    esAdmin: roles.includes(PUESTOS.ADMIN),
    esMedico: roles.includes(PUESTOS.MEDICO),
    esCiudadano: roles.includes("ciudadano") && !esPersonal,
    esAuditor: ROLES_AUDITORIA.some((r) => roles.includes(r)),
    puedeRegistrarPacientes: puede("pacientes.registrar"),
    puedeGenerarTurnos: puede("turnos.generar"),
    puedeAtenderTurnos: puede("turnos.atender"),
  };
}
