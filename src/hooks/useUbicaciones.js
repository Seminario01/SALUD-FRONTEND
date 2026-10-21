import { useEffect, useState } from "react";
import client from "../api/client";

// Departamentos y municipios de Guatemala (GET /ubicaciones): se piden una sola vez por sesión.
let catalogo = null;
function cargarCatalogo() {
  catalogo ??= client.get("/ubicaciones").then((r) => r.data.data).catch((e) => { catalogo = null; throw e; });
  return catalogo;
}

export default function useUbicaciones() {
  const [datos, setDatos] = useState(null);
  useEffect(() => {
    let vigente = true;
    cargarCatalogo().then((d) => vigente && setDatos(d)).catch(() => vigente && setDatos(false));
    return () => { vigente = false; };
  }, []);
  return datos;                      // null = cargando, false = no se pudo
}
