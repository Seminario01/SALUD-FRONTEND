import { useAuth } from "react-oidc-context";
import { rolesDe, ROLES } from "../auth";

// Qué puede hacer el usuario según sus roles del Login Único.
// OJO: esto solo decide qué se MUESTRA. La seguridad real está en el backend,
// que vuelve a validar el rol en cada petición (403 si no corresponde).
export default function useRoles() {
  const auth = useAuth();
  const roles = rolesDe(auth.user);
  const esAdmin = roles.includes(ROLES.ADMIN);
  const esMedico = roles.includes(ROLES.MEDICO);
  const esRecepcion = roles.includes("salud:recepcion");
  return {
    roles,
    esAdmin,
    esMedico,
    esRecepcion,
    esPersonal: esAdmin || esMedico || esRecepcion,
    esCiudadano: roles.includes(ROLES.CIUDADANO),
    // Auditoría Social: solo lectura de indicadores agregados
    esAuditor: roles.includes("auditoria:analista") || roles.includes("auditoria:admin"),
    // Mismas reglas que el backend (ver docs/AUTENTICACION.md del backend)
    puedeRegistrarPacientes: esAdmin || esRecepcion,
    puedeGenerarTurnos: esAdmin || esRecepcion,
    puedeAtenderTurnos: esAdmin || esMedico,
  };
}
