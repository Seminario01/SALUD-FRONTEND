import axios from "axios";

const client = axios.create({
  baseURL: "/api/v1/salud",
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Cliente aparte para los endpoints de integración externa (API key, no token de usuario)
// La API key debe coincidir con MODULOS_API_KEY del backend (ver api/.env).
// Configúrala en frontend/.env.local como VITE_API_KEY.
export const clientExterno = axios.create({
  baseURL: "/api/v1/salud",
  headers: {
    "X-API-Key": import.meta.env.VITE_API_KEY || "clave-temporal-cambiar",
  },
});

export default client;