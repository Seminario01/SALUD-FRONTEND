// Mismas reglas que el backend (validacion.py): el navegador avisa antes de enviar.
// El backend sigue validando todo; esto solo evita un viaje con datos que se van a rechazar.

// Hoy como "AAAA-MM-DD" en la hora local (toISOString usaría UTC y podría dar mañana)
export const hoyISO = () => new Date().toLocaleDateString("en-CA");

export const REGLAS = {
  nombre: { minLength: 3, maxLength: 200 },
  cui: { pattern: "\\d{13}", maxLength: 13, inputMode: "numeric", title: "13 dígitos, sin espacios ni guiones" },
  telefono: { pattern: "\\+?[\\d\\s\\-]{8,20}", maxLength: 20, inputMode: "tel", title: "Entre 8 y 15 dígitos" },
  cuidador: { maxLength: 200 },
};

export const reglasNacimiento = () => ({ min: "1900-01-01", max: hoyISO() });

// Al editar, un dato antiguo que no se cambió no se vuelve a validar (igual que el backend)
export const siCambio = (valor, original, reglas) => (valor === (original ?? "") ? {} : reglas);

// Cita: desde ahora hasta un año adelante, en el formato de <input type="datetime-local">
const local = (d) => `${d.toLocaleDateString("en-CA")}T${d.toTimeString().slice(0, 5)}`;
export const reglasCita = () => {
  const ahora = new Date();
  return { min: local(ahora), max: local(new Date(ahora.getTime() + 366 * 24 * 3600 * 1000)) };
};

// Mismos límites que el backend para montos, cantidades y signos vitales
export const DINERO = { min: 0, max: 99999999.99, step: 0.01 };
export const UNIDADES = { min: 0, max: 1000000, step: 1 };
export const TEXTO_LARGO = 4000;
export const SIGNOS = {
  presion: { pattern: "\\d{2,3}/\\d{2,3}", maxLength: 7, title: "Formato 120/80" },
  temperatura: { min: 30, max: 45, step: 0.1, title: "Entre 30 y 45 °C" },
  frecuencia: { min: 20, max: 250, step: 1, title: "Entre 20 y 250 lpm" },
  saturacion: { min: 50, max: 100, step: 1, title: "Entre 50 y 100 %" },
  peso: { min: 0.5, max: 400, step: 0.1, title: "Entre 0.5 y 400 kg" },
};
