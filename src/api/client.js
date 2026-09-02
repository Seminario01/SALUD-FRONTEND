import axios from "axios";

const client = axios.create({
  baseURL: "/api/v1/salud",
});

// Cuando tengamos Cognito, aquí se leerá el token guardado
// (por ahora devuelve null y las peticiones reales del backend fallarán con 401,
// así que mientras tanto usamos mocks)
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;