// Fecha "AAAA-MM-DD" -> "23/10/2026" (sin corrimiento por zona horaria)
export const formatoDia = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("es-GT") : "—");
