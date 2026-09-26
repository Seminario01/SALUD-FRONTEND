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

// Cliente aparte para los endpoints de integración externa (API key, no token de usuario)
export const clientExterno = axios.create({
  baseURL: "/api/v1/salud",
  headers: {
    "X-API-Key": import.meta.env.VITE_MODULOS_API_KEY || "clave-temporal-cambiar",
  },
});

export default client;
