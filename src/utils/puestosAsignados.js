import client from "../api/client";

// Puestos que Administración le dio a este usuario DENTRO de Salud (Gestión → Asignar puestos),
// además de los roles de su cuenta del Login Único. Se leen una vez por sesión de GET /mis-permisos;
// el servidor los suma a los roles en cada petición, así que aquí solo deciden qué se MUESTRA.
// También trae la matriz vigente (con los permisos que Administración agregó o quitó a cada puesto).
let estado = { sub: null, asignados: [], matriz: null, cargado: false };
let pendiente = null;
const avisos = new Set();

function cambiar(nuevo) {
  estado = nuevo;
  avisos.forEach((a) => a());
}

export const leerPuestos = () => estado;

export function suscribirPuestos(aviso) {
  avisos.add(aviso);
  return () => avisos.delete(aviso);
}

// Carga los puestos del usuario de esta sesión (una sola vez; otra vez si cambia el usuario)
export function cargarPuestos(sub) {
  if (!sub || (estado.sub === sub && estado.cargado)) return;
  if (pendiente?.sub === sub) return;
  const peticion = client.get("/mis-permisos")
    .then((r) => ({ asignados: r.data.data?.asignados ?? [], matriz: r.data.data?.matriz ?? null }))
    .catch(() => ({ asignados: [], matriz: null }))   // sin respuesta: roles del Login Único y matriz original
    .then(({ asignados, matriz }) => {
      if (pendiente === registro) pendiente = null;
      cambiar({ sub, asignados, matriz, cargado: true });
    });
  const registro = { sub, peticion };
  pendiente = registro;
}
