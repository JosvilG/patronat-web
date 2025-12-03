import { useMemo } from 'react'

/**
 * Hook para generar y trabajar con slugs
 *
 * @returns {Object} Funciones relacionadas con slugs
 */
const useSlug = () => {
  /**
   * Genera un slug a partir de un texto
   *
   * @param {string} text - Texto a convertir en slug
   * @returns {string} Slug generado
   */
  const generateSlug = (text) => {
    if (!text) return ''

    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Elimina caracteres especiales excepto espacios y guiones
      .replace(/\s+/g, '-') // Reemplaza espacios con guiones
      .replace(/-+/g, '-') // Reemplaza múltiples guiones con uno solo
  }

  /**
   * Extrae el título original a partir de un slug
   *
   * @param {string} slug - Slug a convertir
   * @returns {string} Título original aproximado
   */
  const slugToTitle = (slug) => {
    if (!slug) return ''

    return slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Usando useMemo para evitar recreaciones innecesarias
  return useMemo(
    () => ({
      generateSlug,
      slugToTitle,
    }),
    []
  )
}

export default useSlug
