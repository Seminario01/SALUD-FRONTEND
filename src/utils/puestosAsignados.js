import client from "../api/client";

// Puestos que Administración le dio a este usuario DENTRO de Salud (Gestión → Asignar puestos),
// además de los roles de su cuenta del Login Único. Se leen una vez por sesión de GET /mis-permisos;
// el servidor los suma a los roles en cada petición, así que aquí solo deciden qué se MUESTRA.
let estado = { sub: null, asignados: [], cargado: false };
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
    .then((r) => r.data.data?.asignados ?? [])
    .catch(() => [])                       // sin respuesta: solo los roles del Login Único
    .then((asignados) => {
      if (pendiente === registro) pendiente = null;
      cambiar({ sub, asignados, cargado: true });
    });
  const registro = { sub, peticion };
  pendiente = registro;
}
