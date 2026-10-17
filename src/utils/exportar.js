// Exportar listas a Excel desde el navegador, con los datos que ya están en pantalla.
//   descargarExcel(nombre, titulo, columnas, filas)  -> archivo .xlsx (abre igual en cualquier PC)
//   descargarCSV(nombre, columnas, filas)            -> archivo .csv (separado por ";")
// columnas: [{ titulo: "Paciente", valor: (fila) => fila.paciente, ancho: 30 }, ...]
//
// Los textos que empiezan con = + - @ se guardan como texto, nunca como fórmula
// (protección contra inyección de fórmulas en Excel).

const hoy = () => new Date().toLocaleDateString("en-CA"); // AAAA-MM-DD en hora local
const FORMULA = /^[=+\-@\t\r]/;

function bajar(blob, archivo) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------- CSV
function celdaCSV(valor) {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "number") return String(valor);
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  let texto = String(valor).replace(/\r?\n/g, " ");
  if (FORMULA.test(texto)) texto = `'${texto}`;
  return /[";]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function generarCSV(columnas, filas) {
  const lineas = [columnas.map((c) => celdaCSV(c.titulo)), ...filas.map((f) => columnas.map((c) => celdaCSV(c.valor(f))))];
  return "﻿" + lineas.map((l) => l.join(";")).join("\r\n");
}

export function descargarCSV(nombre, columnas, filas) {
  bajar(new Blob([generarCSV(columnas, filas)], { type: "text/csv;charset=utf-8" }), `${nombre}_${hoy()}.csv`);
}

// ---------------------------------------------------------------- Excel (.xlsx)
// Un .xlsx es un ZIP con archivos XML. Se arma aquí mismo (sin librerías), sin comprimir.
const xml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
  // quita caracteres de control que el XML no admite
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

function letra(n) {
  let s = "";
  for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function celdaXlsx(valor, ref, estilo = 0) {
  const s = estilo ? ` s="${estilo}"` : "";
  if (valor === null || valor === undefined || valor === "") return "";
  if (typeof valor === "number" && Number.isFinite(valor)) return `<c r="${ref}"${s}><v>${valor}</v></c>`;
  const texto = typeof valor === "boolean" ? (valor ? "Sí" : "No") : String(valor);
  return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${xml(texto)}</t></is></c>`;
}

function hoja(titulo, columnas, filas) {
  const total = columnas.length;
  const ultima = letra(total - 1);
  const renglones = [];
  renglones.push(`<row r="1">${celdaXlsx(titulo, "A1", 1)}</row>`);
  renglones.push(`<row r="2">${celdaXlsx(`Módulo de Salud · generado el ${new Date().toLocaleString("es-GT")}`, "A2", 3)}</row>`);
  renglones.push(`<row r="4">${columnas.map((c, i) => celdaXlsx(c.titulo, `${letra(i)}4`, 2)).join("")}</row>`);
  filas.forEach((f, j) => {
    const r = j + 5;
    renglones.push(`<row r="${r}">${columnas.map((c, i) => celdaXlsx(c.valor(f), `${letra(i)}${r}`)).join("")}</row>`);
  });
  const anchos = columnas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.ancho ?? 16}" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${anchos}</cols>
<sheetData>${renglones.join("")}</sheetData>
${filas.length ? `<autoFilter ref="A4:${ultima}${filas.length + 4}"/>` : ""}
</worksheet>`;
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FF1E3A8A"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><i/><sz val="9"/><color rgb="FF64748B"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
</styleSheet>`;

function archivosXlsx(titulo, columnas, filas) {
  const nombreHoja = xml(titulo.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
  return {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nombreHoja}" sheetId="1" r:id="rId1"/></sheets>${filas.length ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${nombreHoja.replace(/'/g, "''")}'!$A$4:$${letra(columnas.length - 1)}$${filas.length + 4}</definedName></definedNames>` : ""}</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": ESTILOS,
    "xl/worksheets/sheet1.xml": hoja(titulo, columnas, filas),
  };
}

// ZIP sin compresión (método "store"): cabecera local + datos por archivo, y el directorio central al final
const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(archivos) {
  const codificar = new TextEncoder();
  const partes = [];
  const central = [];
  let desplazamiento = 0;
  const ahora = new Date();
  const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);
  const fecha = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();

  for (const [nombre, contenido] of Object.entries(archivos)) {
    const n = codificar.encode(nombre);
    const datos = codificar.encode(contenido);
    const crc = crc32(datos);
    const local = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, hora, 2], [12, fecha, 2], [14, crc, 4],
      [18, datos.length, 4], [22, datos.length, 4], [26, n.length, 2], [28, 0, 2]]
      .forEach(([pos, v, t]) => (t === 4 ? local.setUint32(pos, v, true) : local.setUint16(pos, v, true)));
    partes.push(new Uint8Array(local.buffer), n, datos);

    const cen = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, hora, 2], [14, fecha, 2], [16, crc, 4],
      [20, datos.length, 4], [24, datos.length, 4], [28, n.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2],
      [38, 0, 4], [42, desplazamiento, 4]]
      .forEach(([pos, v, t]) => (t === 4 ? cen.setUint32(pos, v, true) : cen.setUint16(pos, v, true)));
    central.push(new Uint8Array(cen.buffer), n);
    desplazamiento += 30 + n.length + datos.length;
  }
  const tamCentral = central.reduce((s, p) => s + p.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  const cantidad = Object.keys(archivos).length;
  [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, cantidad, 2], [10, cantidad, 2], [12, tamCentral, 4],
    [16, desplazamiento, 4], [20, 0, 2]]
    .forEach(([pos, v, t]) => (t === 4 ? fin.setUint32(pos, v, true) : fin.setUint16(pos, v, true)));
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)],
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function generarExcel(titulo, columnas, filas) {
  // En Excel, un texto que empieza con "=" dentro de inlineStr ya es texto (no fórmula);
  // igual se antepone ' visible para que quien lo copie a otra hoja no lo convierta en fórmula.
  const seguras = columnas.map((c) => ({ ...c, valor: (f) => {
    const v = c.valor(f);
    return typeof v === "string" && FORMULA.test(v) ? `'${v}` : v;
  } }));
  return zip(archivosXlsx(titulo, seguras, filas));
}

export function descargarExcel(nombre, titulo, columnas, filas) {
  bajar(generarExcel(titulo, columnas, filas), `${nombre}_${hoy()}.xlsx`);
}
