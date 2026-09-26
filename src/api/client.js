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
