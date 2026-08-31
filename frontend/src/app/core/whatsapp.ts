/**
 * Utilidades para armar links de WhatsApp (wa.me).
 * Nota: el envío automático llegará con el backend (WhatsApp Business API);
 * mientras tanto, estos links abren el chat con el mensaje ya escrito.
 */

/**
 * Normaliza un teléfono argentino a formato internacional para wa.me.
 * Ej.: "11 2345-6789" → "5491123456789". Si ya empieza con 54, se respeta.
 */
export function normalizarTelefonoWhatsapp(telefono: string): string {
  let digitos = (telefono || '').replace(/\D/g, '');
  if (!digitos) return '';
  if (digitos.startsWith('0')) digitos = digitos.slice(1);
  if (digitos.startsWith('54')) return digitos;
  if (digitos.startsWith('9')) return '54' + digitos;
  return '549' + digitos;
}

/** Arma el link wa.me hacia un teléfono con un mensaje pre-escrito. */
export function linkWhatsapp(telefono: string, mensaje: string): string {
  const numero = normalizarTelefonoWhatsapp(telefono);
  const texto = encodeURIComponent(mensaje);
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`;
}
