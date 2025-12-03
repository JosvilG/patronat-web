// Crea un nuevo archivo: e:\Repos\web-patronat\src\utils\security.js

export async function getCsrfToken() {
  try {
    // Opción 1: Obtener el token desde el servidor
    const response = await fetch('/api/csrf-token')
    const data = await response.json()
    return data.token
  } catch (error) {
    // Opción 2: Generar token local si el servidor no lo proporciona
    return generateLocalCsrfToken()
  }
}

function generateLocalCsrfToken() {
  // Genera un token aleatorio de 32 caracteres
  return Array(32)
    .fill(0)
    .map(() => Math.random().toString(36).charAt(2))
    .join('')
}
