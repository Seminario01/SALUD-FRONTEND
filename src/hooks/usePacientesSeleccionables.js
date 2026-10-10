import { useEffect, useState } from "react";
import client from "../api/client";

// Pacientes que el usuario puede elegir en un formulario:
//  - personal de Salud: todos (GET /pacientes)
//  - ciudadano: solo su propio registro (GET /pacientes/me)
export default function usePacientesSeleccionables(esPersonal) {
  const [pacientes, setPacientes] = useState([]);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    const peticion = esPersonal
      ? client.get("/pacientes").then((res) => res.data.data)
      : client.get("/pacientes/me").then((res) => [res.data.data]);

    peticion
      .then((lista) => {
        setPacientes(lista);
        setAviso(null);
      })
      .catch((err) => {
        setPacientes([]);
        setAviso(
          err.response?.status === 404
            ? "Su usuario todavía no está vinculado a un registro de paciente. Pida en recepción que lo vinculen."
            : "No se pudo cargar la lista de pacientes."
        );
      });
  }, [esPersonal]);

  return { pacientes, aviso };
}
