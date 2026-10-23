import axios from "axios";
import { obtenerAccessToken } from "../auth";
import { sedeElegida } from "../utils/sede";

const client = axios.create({
  baseURL: "/api/v1/salud",
});

// Adjunta el ACCESS token del Login Único (no el id_token) en cada petición.
client.interceptors.request.use((config) => {
  const token = obtenerAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Sede elegida por Jefatura o Administración (utils/sede.js); el servidor decide si vale
  const sede = sedeElegida();
  if (sede) config.headers["X-Sede"] = sede;
  return config;
});

// Nota: la API key entre módulos (X-API-Key) NO va en el frontend. Todo lo
// que se ve en el navegador (incluidas las variables VITE_*) es público.
// Es solo para comunicación servidor a servidor entre backends.

export default client;

// Mensajes para cuando el servidor no manda uno propio (p. ej. un 502 que
// responde el proxy y no el backend). Así nunca se muestra el texto en inglés
// de axios ("Request failed with status code ...").
const MENSAJES_POR_ESTADO = {
  400: "Los datos enviados no son válidos.",
  404: "No se encontró lo solicitado.",
  409: "La operación no se puede realizar en el estado actual.",
  413: "El archivo o los datos enviados son demasiado grandes.",
  422: "El otro módulo rechazó la solicitud.",
  424: "El otro módulo respondió algo que no se pudo interpretar.",
  429: "Demasiadas solicitudes. Espere un momento e intente de nuevo.",
  500: "Ocurrió un error en el servidor. Intente de nuevo.",
  502: "El servidor no está disponible en este momento. Intente más tarde.",
  503: "El servicio no está disponible en este momento. Intente más tarde.",
  504: "El servidor tardó demasiado en responder. Intente de nuevo.",
};

// Convierte un error de axios en un mensaje en español para mostrar en pantalla.
export function mensajeError(err) {
  const status = err.response?.status;
  const datos = err.response?.data;
  // Solo se usa el mensaje si la respuesta es el JSON del backend (no una página HTML del proxy)
  const delServidor = datos && typeof datos === "object" ? datos.message || datos.mensaje : null;
  if (status === 401) return "Su sesión venció. Vuelva a iniciar sesión.";
  if (status === 403) return delServidor || "No tiene permiso para esta acción.";
  if (delServidor) return delServidor;
  if (!err.response) {
    return err.code === "ECONNABORTED"
      ? "El servidor tardó demasiado en responder. Intente de nuevo."
      : "No se pudo conectar con el servidor. Revise su conexión e intente de nuevo.";
  }
  return MENSAJES_POR_ESTADO[status] || `Ocurrió un error inesperado (código ${status}).`;
}
