/**
 * Configuración de estados y sus clases visuales para toda la aplicación
 */

// Define estados para entidades (crews, games, etc.)
export const STATUS = {
  ACTIVE: 'Activo',
  PENDING: 'Pendiente',
  REJECTED: 'Rechazado',
  INACTIVE: 'Baja',
  DEFAULT: 'Desconocido',
}

/**
 * Obtiene la clase CSS para un estado determinado
 * @param {string} status - El estado para el que se necesita el estilo
 * @returns {string} - Clases CSS correspondientes al estado
 */
export const getStatusClass = (status) => {
  switch (status) {
    case STATUS.ACTIVE:
      return 'text-green-800 bg-green-100'
    case STATUS.PENDING:
      return 'text-red-800 bg-red-100'
    case STATUS.REJECTED:
      return 'text-gray-800 bg-gray-200'
    case STATUS.INACTIVE:
      return 'text-orange-800 bg-orange-100'
    default:
      return 'text-gray-800 bg-gray-200'
  }
}

/**
 * Obtiene información completa de un estado
 * @param {string} status - El estado para el que se necesita la información
 * @returns {Object} - Objeto con información sobre el estado
 */
export const getStatusInfo = (status) => {
  return {
    text: status,
    className: getStatusClass(status),
    isActive: status === STATUS.ACTIVE,
    isPending: status === STATUS.PENDING,
    isRejected: status === STATUS.REJECTED,
    isInactive: status === STATUS.INACTIVE,
  }
}
