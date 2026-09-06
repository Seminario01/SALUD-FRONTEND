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
export const clientExterno = axios.create({
  baseURL: "/api/v1/salud",
  headers: {
    "X-API-Key": "clave-temporal-cambiar",
  },
});

export default client;