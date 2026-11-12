// Generación de códigos QR (en el servidor, como SVG o PNG).
import QRCode from "qrcode";

export async function qrSvg(texto: string, margen = 1): Promise<string> {
  return QRCode.toString(texto, { type: "svg", margin: margen, errorCorrectionLevel: "M" });
}

export async function qrPngDataUrl(texto: string, ancho = 600): Promise<string> {
  return QRCode.toDataURL(texto, { width: ancho, margin: 1, errorCorrectionLevel: "M" });
}
