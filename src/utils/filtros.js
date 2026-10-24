// Ayudas para filtrar listas en el navegador (nombre, DPI, edad).

// Edad en años cumplidos a partir de "AAAA-MM-DD" (sin corrimiento por zona horaria).
export function edadDe(nacimiento) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(nacimiento ?? ""));
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const hoy = new Date();
  let e = hoy.getFullYear() - anio;
  if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) e--;
  return e >= 0 ? e : null;
}

// "José Pérez" -> "jose perez": para comparar sin tildes ni mayúsculas.
export const sinTildes = (texto) =>
  String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ¿El paciente coincide con lo escrito? Por nombre (sin tildes, todas las palabras) o por DPI (3+ dígitos).
export function coincidePaciente(paciente, texto) {
  const t = sinTildes(texto).trim();
  if (!t) return true;
  const digitos = t.replace(/\D/g, "");
  if (digitos.length >= 3 && digitos.length === t.replace(/\s/g, "").length) {
    return String(paciente?.cui ?? "").includes(digitos);
  }
  const nombre = sinTildes(paciente?.nombre_completo);
  return t.split(/\s+/).every((palabra) => nombre.includes(palabra));
}

// Rango de edad con "desde" y "hasta" opcionales (texto de los campos). Sin fecha de nacimiento
// solo pasa si no hay rango.
export function enRangoEdad(nacimiento, desde, hasta) {
  if (desde === "" && hasta === "") return true;
  const e = edadDe(nacimiento);
  if (e === null) return false;
  if (desde !== "" && e < Number(desde)) return false;
  if (hasta !== "" && e > Number(hasta)) return false;
  return true;
}
