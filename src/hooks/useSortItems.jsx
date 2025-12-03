import { useState, useCallback } from 'react'

/**
 * Custom hook for sorting collections of items
 * @param {Array} initialItems - Initial collection of items
 * @param {Object} options - Optional configuration options
 * @returns {Object} - State and methods for sorting items
 */
const useSortItems = (initialItems = [], options = {}) => {
  const [items, setItems] = useState(initialItems)
  const [currentSortType, setCurrentSortType] = useState(null)

  // Default configuration for date sorting
  const {
    dateField = 'createdAt', // Default date field
    nameField = 'name', // Default name field
    locale = 'es', // Regional configuration for text sorting
    sensitivity = 'base', // Sensitivity for string comparison (ignores accents)
  } = options

  /**
   * Sorts items according to the specified criteria
   * @param {string} sortType - Type of sorting (dateAsc, dateDesc, nameAsc, nameDesc)
   * @param {Array} itemsToSort - Items to sort (optional, uses internal state if not provided)
   * @returns {Array} - Sorted items
   */
  const sortItems = useCallback(
    (sortType, itemsToSort = null) => {
      // If there's no valid sort type, return items without changes
      if (!sortType) return itemsToSort || items

      // Use provided items or items from state
      const elementsToSort = itemsToSort ? [...itemsToSort] : [...items]

      let sorted = []
      switch (sortType) {
        case 'dateAsc':
          sorted = elementsToSort.sort((a, b) => {
            if (!a[dateField] || !b[dateField]) return 0
            // If date is a Firestore object, use toDate()
            const dateA =
              typeof a[dateField].toDate === 'function'
                ? a[dateField].toDate()
                : a[dateField]
            const dateB =
              typeof b[dateField].toDate === 'function'
                ? b[dateField].toDate()
                : b[dateField]
            return dateA - dateB
          })
          break

        case 'dateDesc':
          sorted = elementsToSort.sort((a, b) => {
            if (!a[dateField] || !b[dateField]) return 0
            // If date is a Firestore object, use toDate()
            const dateA =
              typeof a[dateField].toDate === 'function'
                ? a[dateField].toDate()
                : a[dateField]
            const dateB =
              typeof b[dateField].toDate === 'function'
                ? b[dateField].toDate()
                : b[dateField]
            return dateB - dateA
          })
          break

        case 'nameAsc':
          sorted = elementsToSort.sort((a, b) =>
            (a[nameField] || '').localeCompare(b[nameField] || '', locale, {
              sensitivity,
            })
          )
          break

        case 'nameDesc':
          sorted = elementsToSort.sort((a, b) =>
            (b[nameField] || '').localeCompare(a[nameField] || '', locale, {
              sensitivity,
            })
          )
          break

        default:
          sorted = elementsToSort
      }

      // If external items were provided, just return the result
      // If not, update the internal state
      if (itemsToSort) {
        return sorted
      } else {
        setItems(sorted)
        setCurrentSortType(sortType)
        return sorted
      }
    },
    [items, dateField, nameField, locale, sensitivity]
  )

  /**
   * Updates items and maintains current sorting if it exists
   * @param {Array} newItems - New items to set
   */
  const updateItems = useCallback(
    (newItems) => {
      if (currentSortType) {
        // If there's a current sort type, maintain the sorting
        const sorted = sortItems(currentSortType, newItems)
        setItems(sorted)
      } else {
        // If there's no current sorting, simply update the items
        setItems(newItems)
      }
    },
    [currentSortType, sortItems]
  )

  return {
    items, // Current sorted items
    sortItems, // Function to sort manually
    handleSortChange: (event) => {
      const sortType = event?.target?.value || event?.value
      if (sortType) sortItems(sortType)
    },
    currentSortType, // Current sort type
    updateItems, // We correctly export this function
  }
}

export default useSortItems
