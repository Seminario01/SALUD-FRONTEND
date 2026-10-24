// Ayuda de cada pantalla (botón "?" del encabezado). Cada consejo puede llevar `si`: el permiso
// que hace falta para verlo (así cada puesto solo lee lo que puede hacer).
// Se busca por la ruta: la más larga que coincida con el inicio de la dirección actual.

export const AYUDA = {
  "/": {
    titulo: "Inicio",
    consejos: [
      { texto: "El tablero resume la operación: pacientes, citas pendientes, turnos en espera, vacunación, camas, presupuesto y caja (cada puesto ve lo suyo)." },
      { si: "turnos.ver_cola", texto: "«Para atender ahora» resume urgencias en espera (triage rojo y naranja), laboratorio pendiente, resultados fuera de rango y lista de espera; cada tarjeta lleva a su pantalla." },
      { si: "inventario.ver", texto: "Farmacia ve aquí las recetas por despachar, los medicamentos bajo el mínimo y los que vencen en 60 días." },
      { si: "reportes.ver", texto: "En «Diagnósticos más frecuentes» elija el período; se puede bajar en Excel o CSV." },
      { texto: "La lupa del encabezado busca pacientes por nombre o DPI desde cualquier pantalla." },
      { texto: "Bajo el título está su sede. Turnos, camas, hospitalización y recursos son de cada sede; farmacia, caja y expedientes son compartidos." },
      { si: "sedes.cambiar", texto: "En el menú de sus iniciales, «Sede» muestra otra sede o todas. Mientras ve otra, una franja amarilla lo recuerda; «Volver a mi sede» regresa." },
      { texto: "Con el círculo de sus iniciales (arriba a la derecha) cambia a modo oscuro o claro y cierra la sesión. Las hojas para imprimir siempre salen en blanco." },
      { texto: "Por seguridad, después de 15 minutos sin usar el sistema aparece «¿Sigue ahí?»: con «Seguir trabajando» continúa; si nadie responde en 2 minutos, la sesión se cierra sola." },
    ],
  },
  "/pacientes": {
    titulo: "Pacientes",
    consejos: [
      { si: "pacientes.registrar", texto: "Para registrar llene al menos el nombre. Si el sistema encuentra a alguien parecido (mismo DPI, mismo nombre o nombre parecido con la misma fecha de nacimiento), avisa antes de crear un duplicado." },
      { si: "pacientes.registrar", texto: "Anote las alergias desde el registro: el médico verá el aviso al recetar." },
      { si: "pacientes.registrar", texto: "Registre el departamento, municipio y zona donde vive: con eso funciona el mapa de vigilancia epidemiológica. Si escribe el DPI, el sistema sugiere el municipio de inscripción." },
      { texto: "Busque por nombre o CUI y abra la ficha para ver todo lo del paciente en un solo lugar." },
    ],
  },
  "/pacientes/": {
    titulo: "Ficha del paciente",
    consejos: [
      { texto: "La ficha reúne datos, alergias, citas, vacunas, expediente, signos vitales, laboratorio, recetas, constancias y cuentas (cada puesto ve lo que le corresponde)." },
      { si: "pacientes.alergias", texto: "Las alergias se editan en el recuadro rojo de arriba. Escriba nombres o familias (penicilina, sulfas, AINE): el sistema avisa al recetar algo que choque." },
      { si: "constancias.emitir", texto: "En «Constancias e incapacidades» emita una constancia de consulta o una incapacidad con días de reposo. Sale con un código QR que el patrono puede verificar." },
      { si: "crecimiento.registrar", texto: "En niños de 0 a 5 años aparece «Crecimiento (OMS)»: registre peso y talla (acostado antes de los 2 años). El sistema calcula la puntuación z y avisa de desnutrición crónica, aguda, bajo peso o sobrepeso." },
      { si: "expediente.ver", texto: "«Resumen para referencia» arma un documento imprimible para enviar al paciente a otro hospital." },
      { texto: "El botón imprimir del navegador saca la ficha completa, sin botones." },
    ],
  },
  "/pacientes/residencia": {
    titulo: "Completar residencia",
    consejos: [
      { texto: "Aquí están los pacientes sin municipio de residencia: sin él no aparecen en el mapa de vigilancia. Primero los que vinieron en los últimos 90 días." },
      { texto: "Si el DPI sugiere un municipio y el paciente vive ahí, use «Vive ahí: guardar». Si no, elija departamento, municipio y zona y guarde." },
      { texto: "El DPI dice dónde se inscribió la persona, no necesariamente dónde vive: confírmelo por teléfono o en la próxima visita." },
    ],
  },
  "/citas": {
    titulo: "Citas",
    consejos: [
      { si: "citas.gestionar", texto: "Agende eligiendo paciente, fecha y hora (desde ahora hasta un año). El sistema no deja dar dos citas al mismo paciente a la misma hora." },
      { si: "citas.gestionar", texto: "Si no hay espacio, agregue al paciente a la «Lista de espera». Al cancelar una cita, el sistema avisa cuántos están esperando." },
      { texto: "«Agenda semanal» muestra las citas por médico y día; «Recordatorio» lista las de mañana con enlace a WhatsApp." },
      { si: "pagos.verificar", texto: "Cuando el paciente paga en Tributario, use «Verificar pago» para confirmarlo." },
    ],
  },
  "/citas/recordatorios": {
    titulo: "Recordatorios",
    consejos: [
      { texto: "Citas pendientes y confirmadas del día, con el teléfono del paciente para llamarle o escribirle." },
      { texto: "La marca «Avisado» se guarda solo en esta computadora. Al abrir WhatsApp se marca sola." },
    ],
  },
  "/citas/lista-espera": {
    titulo: "Lista de espera",
    consejos: [
      { texto: "Va en orden de llegada: llame primero al número 1." },
      { si: "citas.gestionar", texto: "Use «Marcar como avisado» cuando le llame o escriba, y «Agendar» para darle la cita: sale de la lista solo." },
      { si: "citas.gestionar", texto: "Si ya no necesita la cita, «Sacar de la lista»." },
    ],
  },
  "/turnos": {
    titulo: "Turnos y triage",
    consejos: [
      { si: "turnos.generar", texto: "Genere el turno al llegar el paciente. Cada paciente tiene un solo turno activo por día." },
      { si: "turnos.clasificar", texto: "Clasifique la urgencia (triage): ROJO inmediato, NARANJA hasta 10 min, AMARILLO 60, VERDE 120 y AZUL 240. La cola se ordena sola por urgencia." },
      { si: "turnos.ver_cola", texto: "La espera se pone en rojo con ⚠ cuando el paciente pasó el tiempo recomendado para su nivel." },
      { si: "turnos.atender", texto: "Elija el consultorio arriba y use Llamar → Atender → Finalizar. La pantalla de la sala anuncia cada llamado con voz." },
      { texto: "«Abrir pantalla de sala de espera» es para una TV: muestra solo números y colores, nunca nombres." },
    ],
  },
  "/expedientes": {
    titulo: "Expediente clínico",
    consejos: [
      { si: "expediente.registrar", texto: "Busque el diagnóstico en «Código CIE-10» por código (I10) o por palabras (presión alta, gripe). El código clasifica la atención para los reportes; el texto del diagnóstico lo puede ajustar." },
      { si: "expediente.registrar", texto: "Puede ligar la atención a la cita del paciente; la cita queda a su nombre." },
      { texto: "El historial muestra lo más reciente primero, con el código CIE-10 en azul." },
    ],
  },
  "/hospitalizacion": {
    titulo: "Hospitalización",
    consejos: [
      { si: "hospitalizacion.ordenar", texto: "El médico ordena el ingreso; Enfermería asigna la cama." },
      { si: "hospitalizacion.notas", texto: "En el detalle registre notas con signos vitales. Lo que sale del rango normal se marca en rojo y avisa al guardar." },
      { texto: "«Evolución de los signos durante la estancia» muestra gráficas de presión, temperatura, pulso y oxigenación." },
      { si: "hospitalizacion.camas", texto: "El censo de camas muestra libres, ocupadas, en limpieza y en mantenimiento." },
    ],
  },
  "/recetas": {
    titulo: "Recetas",
    consejos: [
      { si: "recetas.crear", texto: "Al elegir al paciente se ven sus alergias y lo que ya está tomando (últimos 30 días)." },
      { si: "recetas.crear", texto: "Si un medicamento choca con una alergia o interactúa con otro (por ejemplo warfarina con ibuprofeno), el sistema avisa. Usted decide; la receta queda marcada para Farmacia." },
      { si: "recetas.despachar", texto: "Despache las pendientes: se descuenta del inventario el lote que vence primero. Las marcadas con ⚠ fueron recetadas pese a una alergia o interacción." },
      { texto: "La receta impresa trae un QR: cualquier farmacia la verifica sin cuenta y ve si ya se despachó o se anuló." },
    ],
  },
  "/laboratorio": {
    titulo: "Laboratorio",
    consejos: [
      { si: "laboratorio.ordenar", texto: "Elija al paciente, marque los exámenes y la prioridad. Las urgentes salen primero en la cola." },
      { si: "laboratorio.procesar", texto: "Use «Tomar muestra» y luego «Registrar resultados». Al digitar, lo que sale del rango normal se pone en rojo. Puede guardar avances y entregar cuando estén todos." },
      { si: "laboratorio.procesar", texto: "El sistema rechaza valores imposibles (por ejemplo una hemoglobina de 132) para evitar errores de digitación." },
      { texto: "El informe impreso marca ↑ alto, ↓ bajo y * anormal junto a los valores de referencia." },
    ],
  },
  "/vigilancia": {
    titulo: "Vigilancia epidemiológica",
    consejos: [
      { texto: "El mapa pinta cada municipio según los casos de pacientes que viven ahí (más oscuro = más casos). Solo cuentan las atenciones con código CIE-10 y los pacientes con residencia registrada." },
      { texto: "Filtre por período, enfermedad (dengue, diarreas, respiratorias...), departamento, sexo y edad. Al elegir un departamento, el mapa se acerca." },
      { texto: "El borde rojo y el aviso ⚠ marcan un posible brote: 3 o más casos en los últimos 7 días y más del doble del promedio de las 4 semanas anteriores. Es para investigar, no confirma un brote." },
      { si: "vigilancia.pacientes", texto: "Toque un municipio y «Ver quiénes son los casos» para la lista con nombre, edad, zona y diagnóstico. Esa consulta queda en la bitácora." },
      { texto: "Los municipios rayados tienen menos de 3 pacientes: para no identificar a nadie, a su puesto no se le muestra la cifra." },
      { si: "pacientes.registrar", texto: "Para que el mapa sirva, registre el municipio y la zona donde vive cada paciente (el DPI solo dice dónde se inscribió)." },
    ],
  },
  "/vacunacion": {
    titulo: "Vacunación",
    consejos: [
      { si: "vacunacion.registrar", texto: "Registre el esquema del paciente y las vacunas pendientes." },
      { texto: "La constancia de vacunación (PDF) se imprime desde la lista de vacunación o desde la ficha del paciente." },
    ],
  },
  "/caja": {
    titulo: "Caja",
    consejos: [
      { si: "cuentas.gestionar", texto: "Abra la cuenta del paciente y agregue cargos del catálogo (día cama, laboratorio, procedimientos)." },
      { si: "cuentas.gestionar", texto: "Al cerrar la cuenta se genera la referencia de pago en Tributario; luego verifique el pago." },
      { texto: "El estado de cuenta se imprime o se guarda en PDF." },
    ],
  },
  "/inventario": {
    titulo: "Inventario",
    consejos: [
      { si: "inventario.gestionar", texto: "Registre las entradas con lote y fecha de vencimiento: así Farmacia despacha primero lo que vence antes." },
      { texto: "Los medicamentos bajo el mínimo o por vencer se marcan en el resumen." },
    ],
  },
  "/recursos": {
    titulo: "Recursos",
    consejos: [{ texto: "Camas, equipos y personal disponibles por área." }],
  },
  "/integraciones": {
    titulo: "Integraciones",
    consejos: [
      { texto: "Muestra cómo se comunica Salud con Educación, Seguridad, Tributario y Auditoría, y la bitácora de cada llamada (sin datos personales)." },
      { texto: "Cada tarjeta dice si el módulo está conectado. En Auditoría Social, «Servicio operativo» indica que el servicio responde; «Aún no consumido», que Auditoría todavía no lo ha consultado. Si una consulta se rechaza, aparece el motivo." },
    ],
  },
  "/bitacora": {
    titulo: "Bitácora de accesos",
    consejos: [
      { texto: "Registra quién vio o modificó los datos de cada paciente. Nadie la puede editar ni borrar." },
      { texto: "«Accesos inusuales» avisa de patrones a revisar: muchos pacientes en una hora, muchas anulaciones, accesos de noche o muchas IP. «Ver en la bitácora» filtra la tabla." },
    ],
  },
  "/red": {
    titulo: "Red de establecimientos",
    consejos: [
      { texto: "Los 45 hospitales públicos del MSPAS y los establecimientos que agregue Administración. Toque un municipio del mapa para ver los suyos." },
      { si: "establecimientos.gestionar", texto: "«Completar» guarda la dirección, el teléfono, el estado y la atención que da. Un establecimiento inactivo no se ofrece a Seguridad ni se puede elegir para referir." },
      { si: "establecimientos.gestionar", texto: "«Sede de este sistema» convierte al establecimiento en una sede con sus propios turnos, camas y recursos. La sede principal no se puede quitar, ni una sede con personal o camas." },
    ],
  },
  "/referencias": {
    titulo: "Referencias",
    consejos: [
      { texto: "Pacientes referidos a otros establecimientos. Las urgentes y las que faltan por confirmar van primero." },
      { si: "referencias.gestionar", texto: "Cuando confirmen que el paciente llegó (por teléfono o con la hoja firmada), márquela «Recibida». Para cancelar hay que escribir el motivo." },
      { si: "referencias.crear", texto: "Para referir: en la ficha del paciente, sección «Referencias», botón «Referir». Se abre la hoja para imprimir." },
    ],
  },
  "/puestos": {
    titulo: "Asignar puestos",
    consejos: [
      { texto: "Para darle acceso a un compañero: que entre una vez a saludumg.online con su cuenta del Login Único; aparece en «Entraron sin puesto». Presione «Asignar puesto», elija el puesto y «Asignar»." },
      { texto: "También puede pegar el código que la persona ve en «Mi resumen». El puesto vale solo en Salud y la persona lo ve al recargar la página." },
      { texto: "Para cambiar el puesto de alguien (por ejemplo, de Administración a Enfermería y luego regresarlo), elija el nuevo en la lista de su fila." },
      { texto: "Nadie puede cambiar su propio puesto. Cada asignación, cambio y «Quitar» quedan en la bitácora de accesos." },
      { texto: "«Sede del personal»: elija dónde trabaja cada persona. Quien no tiene sede asignada trabaja en la sede principal. La persona ve el cambio al recargar la página." },
    ],
  },
  "/permisos": {
    titulo: "Puestos y permisos",
    consejos: [
      { texto: "Muestra qué puede hacer cada puesto. Es la misma tabla que revisa el servidor en cada petición. Su puesto sale resaltado en azul." },
      { si: "permisos.editar", texto: "Toque una casilla de un puesto de Salud para darle o quitarle ese permiso. Vale para todas las personas con ese puesto al recargar la página. Los cambios llevan borde ámbar; pase el mouse para ver quién lo cambió." },
      { si: "permisos.editar", texto: "«Restablecer original» borra todos los cambios. A Administración no se le puede quitar «Agregar o quitar permisos» ni «Asignar puestos», para no quedar sin acceso." },
      { texto: "Para cambiar el puesto de una persona, use «Asignar puestos»." },
    ],
  },
};

// Para el ciudadano la página de inicio es su resumen
export const AYUDA_CIUDADANO = {
  titulo: "Mi resumen",
  consejos: [
    { texto: "Aquí ve sus próximas citas, su vacunación, su última atención, sus exámenes de laboratorio y sus constancias." },
    { texto: "Los resultados de laboratorio aparecen cuando están completos; su médico se los explicará." },
    { texto: "Sus constancias e incapacidades traen un código QR para que su trabajo o colegio compruebe que son auténticas." },
  ],
};

// "/pacientes" es la lista y "/pacientes/" (con barra) cualquier ficha /pacientes/5
const coincide = (clave, ruta) => (clave === "/" ? ruta === "/"
  : clave.endsWith("/") ? ruta.startsWith(clave) && ruta.length > clave.length
    : ruta === clave || ruta.startsWith(`${clave}/`));

export function ayudaDe(ruta) {
  const clave = Object.keys(AYUDA).filter((k) => coincide(k, ruta)).sort((a, b) => b.length - a.length)[0];
  return clave ? AYUDA[clave] : null;
}
