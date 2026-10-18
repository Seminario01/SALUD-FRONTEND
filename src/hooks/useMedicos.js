import { useEffect, useState } from "react";
import client from "../api/client";

// Médicos para asignar a una cita (GET /medicos). Lista vacía si no hay permiso o falla.
export default function useMedicos(activo = true) {
  const [medicos, setMedicos] = useState([]);
  useEffect(() => {
    if (!activo) return;
    client.get("/medicos").then((r) => setMedicos(r.data.data)).catch(() => setMedicos([]));
  }, [activo]);
  return medicos;
}
