/**
 * Función para ofuscar un IBAN, mostrando sólo los últimos 4 dígitos
 * @param {string} iban - IBAN completo
 * @returns {string} - IBAN ofuscado (ej: ES****2345)
 */
export const maskIban = (iban) => {
  if (!iban || iban.length < 6) return iban

  const prefix = iban.substring(0, 2) // Código de país (ES)
  const suffix = iban.substring(iban.length - 4) // Últimos 4 dígitos
  const maskedPart = '*'.repeat(iban.length - 6) // Asteriscos para el resto

  return `${prefix}${maskedPart}${suffix}`
}

/**
 * Valida si un texto es un IBAN español válido
 * @param {string} iban - IBAN a validar
 * @returns {boolean} - true si es válido, false si no
 */
export const isValidSpanishIban = (iban) => {
  if (!iban) return false
  const ibanRegex = /^ES[0-9]{22}$/
  return ibanRegex.test(iban)
}
