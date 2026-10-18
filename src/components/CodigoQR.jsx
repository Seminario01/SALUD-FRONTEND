import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Código QR como imagen SVG (se ve nítido al imprimir). Se dibuja en el navegador: el texto no sale a ningún servicio.
export default function CodigoQR({ texto, tamano = 112, etiqueta }) {
  const [imagen, setImagen] = useState(null);

  useEffect(() => {
    let vigente = true;
    QRCode.toString(texto, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((svg) => { if (vigente) setImagen(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`); })
      .catch(() => { if (vigente) setImagen(null); });
    return () => { vigente = false; };
  }, [texto]);

  if (!imagen) return <div style={{ width: tamano, height: tamano }} className="bg-slate-100 rounded" aria-hidden="true" />;
  return <img src={imagen} width={tamano} height={tamano} alt={etiqueta || `Código QR: ${texto}`} className="block" />;
}
