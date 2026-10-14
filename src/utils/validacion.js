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
