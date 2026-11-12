// Texto base de la política de privacidad (Ley N.° 29733 y su reglamento).
// Cada barbería puede editarlo desde su panel. Es una plantilla de partida:
// se recomienda que un abogado la revise antes de usarla comercialmente.
export function politicaPrivacidadBase(nombreBarberia: string, plataforma: string): string {
  return `POLÍTICA DE PRIVACIDAD Y PROTECCIÓN DE DATOS PERSONALES

1. Responsable del tratamiento
${nombreBarberia} (en adelante, "la Barbería") es titular del banco de datos personales de los clientes de su programa de fidelidad y responsable de su tratamiento, conforme a la Ley N.° 29733, Ley de Protección de Datos Personales, y su Reglamento.

2. Datos que recopilamos
Nombre, número de celular (WhatsApp), día y mes de cumpleaños (opcional) y el historial de visitas, sellos y recompensas dentro del programa de fidelidad.

3. Finalidad
Usamos tus datos para: (a) administrar tu tarjeta de fidelidad digital, registrar tus sellos y entregarte tus recompensas; (b) identificarte cuando visitas la Barbería; y (c) solo si lo autorizas expresamente marcando la casilla correspondiente, enviarte por WhatsApp recordatorios, saludos de cumpleaños y promociones de la Barbería.

4. Consentimiento
Al registrarte y marcar la casilla de aceptación otorgas tu consentimiento libre, previo, expreso e informado para el tratamiento descrito. El envío de mensajes por WhatsApp es opcional y puedes retirarlo en cualquier momento.

5. Encargado del tratamiento
La Barbería utiliza la plataforma ${plataforma} como encargado del tratamiento para alojar y operar el programa de fidelidad. ${plataforma} trata los datos únicamente por encargo de la Barbería y no los usa para fines propios ni los comparte con otras barberías.

6. Conservación
Conservamos tus datos mientras participes en el programa de fidelidad y hasta por dos (2) años desde tu última visita, salvo que solicites antes su eliminación.

7. Transferencias
No vendemos ni cedemos tus datos a terceros. Los datos pueden alojarse en servidores ubicados fuera del Perú (flujo transfronterizo) con medidas de seguridad adecuadas.

8. Seguridad
Aplicamos medidas técnicas y organizativas razonables para proteger tus datos contra acceso no autorizado, pérdida o alteración.

9. Tus derechos (ARCO)
Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición, así como revocar tu consentimiento, solicitándolo directamente en la Barbería o por sus canales de contacto. Atenderemos tu solicitud dentro de los plazos legales. Si consideras que no fuiste atendido, puedes acudir a la Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia y Derechos Humanos.

10. Menores de edad
Si eres menor de edad, el registro debe realizarlo tu padre, madre o tutor.

11. Cambios
La Barbería puede actualizar esta política. La versión vigente estará siempre disponible desde el formulario de registro y desde tu tarjeta digital.`;
}
