import axios from "axios";
import { obtenerAccessToken } from "../auth";

const client = axios.create({
  baseURL: "/api/v1/salud",
});

// Adjunta el ACCESS token del Login Único (no el id_token) en cada petición.
client.interceptors.request.use((config) => {
  const token = obtenerAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Nota: la API key entre módulos (X-API-Key) NO va en el frontend. Todo lo
// que se ve en el navegador (incluidas las variables VITE_*) es público.
// Es solo para comunicación servidor a servidor entre backends.

export default client;

// Convierte un error de axios en un mensaje para mostrar en pantalla.
export function mensajeError(err) {
  const status = err.response?.status;
  if (status === 401) return "Su sesión venció. Vuelva a iniciar sesión.";
  if (status === 403) return err.response?.data?.message || "No tiene permiso para esta acción.";
  return err.response?.data?.message || err.message;
}
