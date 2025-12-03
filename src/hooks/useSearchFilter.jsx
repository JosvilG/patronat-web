import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Hook reutilizable para aplicar filtros de búsqueda con debounce sobre una colección.
 *
 * @template T
 * @param {T[]} [initialItems=[]] - Colección inicial.
 * @param {Object} [options={}] - Configuración opcional.
 * @param {string[]} [options.searchFields=['name','description']] - Propiedades a analizar.
 * @param {string[]} [options.arrayFields=[]] - Propiedades tipo array que también se examinan.
 * @param {number} [options.debounceTime=300] - Tiempo en ms antes de comprometer la búsqueda.
 * @param {boolean} [options.caseSensitive=false] - Si la búsqueda distingue mayúsculas.
 * @returns {{searchQuery: string, filteredItems: Array.<T>, handleSearchChange: function(Object): void, setSearchQuery: function(string): void, updateItems: function(Array.<T>): void}}
 */
const useSearchFilter = (initialItems = [], options = {}) => {
  const [items, setItems] = useState(initialItems)
  const [committedQuery, setCommittedQuery] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [filteredItems, setFilteredItems] = useState(initialItems)

  // Usar useRef para el timer para evitar problemas de cierre (closure)
  const timerRef = useRef(null)

  // Default configuration
  const {
    searchFields = ['name', 'description'],
    arrayFields = [],
    debounceTime = 300,
    caseSensitive = false,
  } = options

  // Limpiar el timer cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const trimmedQuery = committedQuery.trim()

    if (!trimmedQuery) {
      setFilteredItems(items)
      return
    }

    const searchTerm = caseSensitive ? trimmedQuery : trimmedQuery.toLowerCase()

    const filtered = items.filter((item) => {
      const matchesText = searchFields.some((field) => {
        if (!item[field]) return false
        const fieldValue = caseSensitive
          ? String(item[field])
          : String(item[field]).toLowerCase()
        return fieldValue.includes(searchTerm)
      })

      if (matchesText) return true

      const matchesArray = arrayFields.some((field) => {
        if (!item[field] || !Array.isArray(item[field])) return false
        return item[field].some((value) => {
          if (value === null || value === undefined) return false
          const arrayValue = caseSensitive
            ? String(value)
            : String(value).toLowerCase()
          return arrayValue.includes(searchTerm)
        })
      })

      return matchesArray
    })

    setFilteredItems(filtered)
  }, [committedQuery, items, searchFields, arrayFields, caseSensitive])

  /**
   * Handles search field changes with debounce
   */
  const handleSearchChange = useCallback(
    (event) => {
      const query = event?.target?.value || ''

      // Actualizar inmediatamente el valor del input
      setInputValue(query)

      // Limpiar el timer anterior si existe
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // Crear un nuevo timer con referencia guardada
      timerRef.current = setTimeout(() => {
        setCommittedQuery(query)
        // Asegurar que la referencia se borra después de usarla
        timerRef.current = null
      }, debounceTime)
    },
    [debounceTime] // Quitar timer de las dependencias y usar timerRef
  )

  /**
   * Updates the collection of items
   */
  const updateItems = useCallback((newItems) => {
    setItems(Array.isArray(newItems) ? newItems : [])
  }, [])

  return {
    searchQuery: inputValue,
    filteredItems,
    handleSearchChange,
    setSearchQuery: (query) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      setInputValue(query)
      setCommittedQuery(query)
    },
    updateItems,
  }
}

export default useSearchFilter
