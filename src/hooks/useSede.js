import { useEffect, useState } from "react";
import client from "../api/client";

// Sedes del sistema y la del usuario (GET /sedes), pedidas una sola vez por pestaña.
let pendiente = null;

export function cargarSedes() {
  if (!pendiente) {
    pendiente = client.get("/sedes").then((r) => r.data.data).catch(() => {
      pendiente = null;
      return null;
    });
  }
  return pendiente;
}

// { sedes, mi_sede, actual (null = todas), puede_cambiar, nombre (de la actual) } o null mientras carga
export default function useSede(activo = true) {
  const [datos, setDatos] = useState(null);
  useEffect(() => {
    if (!activo) return undefined;
    let vivo = true;
    cargarSedes().then((d) => {
      if (!vivo || !d) return;
      const actual = d.sedes.find((s) => s.id === d.actual);
      setDatos({ ...d, nombre: actual ? actual.nombre : "Todas las sedes", propia: d.actual === d.mi_sede });
    });
    return () => { vivo = false; };
  }, [activo]);
  return datos;
}
