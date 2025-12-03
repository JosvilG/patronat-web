import React, { useEffect, useState, useMemo } from 'react'
import useGallery from '../../hooks/useGallery'
import useSortItems from '../../hooks/useSortItems'
import useSearchFilter from '../../hooks/useSearchFilter'
import DynamicCard from '../../components/Cards'
import DynamicInput from '../../components/Inputs'
import { useTranslation } from 'react-i18next'
import Loader from '../../components/Loader'
import PaginationControl from '../../components/Pagination'

/**
 * GalleryPage Component
 *
 * Displays a paginated gallery of images with search and sort functionality.
 * Images can be filtered by name, description and tags, and sorted by date or name.
 */
const GalleryPage = () => {
  // Get gallery images and loading state from custom hook
  const { galleryImages, loadingGallery } = useGallery()
  const { t } = useTranslation()
  const [currentSortType, setCurrentSortType] = useState(null)

  // Pagination configuration
  const ITEMS_PER_PAGE = 20
  const [currentPage, setCurrentPage] = useState(1)
  const viewDictionary = 'pages.gallery'

  /**
   * Search filter hook configuration
   * - searchFields: Properties to search in (name, description)
   * - arrayFields: Array properties to search in (tags)
   * - debounceTime: Time in ms to wait before filtering after user input
   */
  const {
    searchQuery,
    filteredItems: searchFilteredItems,
    handleSearchChange,
    updateItems: updateSearchItems,
  } = useSearchFilter([], {
    searchFields: ['name', 'description'],
    arrayFields: ['tags'],
    debounceTime: 300,
  })

  /**
   * Sort hook configuration
   * - dateField: Property to use for date sorting
   * - nameField: Property to use for name sorting
   * - locale: Locale for string comparison
   */
  const {
    items: sortedImages,
    sortItems,
    updateItems: updateSortItems,
  } = useSortItems([], {
    dateField: 'createdAt',
    nameField: 'name',
    locale: 'es',
  })

  // Calculate total pages based on filtered/sorted images
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedImages.length / ITEMS_PER_PAGE))
  }, [sortedImages.length])

  // Get current page items for rendering
  const currentPageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return sortedImages.slice(startIndex, endIndex)
  }, [sortedImages, currentPage])

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Update search items when gallery images change
  useEffect(() => {
    if (galleryImages.length > 0) {
      updateSearchItems(galleryImages)
    }
  }, [galleryImages, updateSearchItems])

  // Apply sorting when search results or sort type changes
  useEffect(() => {
    if (currentSortType) {
      const sorted = sortItems(currentSortType, searchFilteredItems)
      updateSortItems(sorted)
    } else {
      updateSortItems(searchFilteredItems)
    }
  }, [searchFilteredItems, currentSortType, sortItems, updateSortItems])

  /**
   * Handle pagination page change
   * @param {Event} event - The event object
   * @param {number} page - The new page number
   */
  const handlePageChange = (event, page) => {
    setCurrentPage(page)
  }

  return (
    <div className="container flex flex-col items-center px-[4%] pb-[4vh] mx-auto min-h-dvh sm:flex-none">
      <h1 className="mb-[4vh] text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`)}
      </h1>

      {/* Search and sort controls */}
      <div className="flex flex-col items-center gap-[3vh] mb-[5vh] md:flex-row md:gap-[3vw]">
        {/* Search input */}
        <div className="w-full">
          <DynamicInput
            name="search"
            type="text"
            textId={t(`${viewDictionary}.searchLabel`)}
            placeholder={t(`${viewDictionary}.searchGallery`)}
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Loading indicator */}
      <Loader loading={loadingGallery}></Loader>

      {/* Gallery grid with responsive columns */}
      <div className="grid grid-cols-1 gap-[3vh] sm:grid-cols-2 lg:grid-cols-3 w-[92%] sm:max-w-none">
        {currentPageItems.length > 0 ? (
          currentPageItems.map((image) => (
            <div key={image.id} className="cursor-pointer">
              <DynamicCard
                type="gallery"
                title={image.name}
                description={image.description}
                date={
                  image.createdAt?.toDate()?.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  }) || ''
                }
                imageUrl={image.url}
                tags={image.tags}
              />
            </div>
          ))
        ) : (
          // No results message when filtered items are empty
          <div className="col-span-3 py-[3vh] text-center">
            <p className="t16r">{t(`${viewDictionary}.noImagesFound`)}</p>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <PaginationControl
        page={currentPage}
        count={totalPages}
        totalItems={sortedImages.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onChange={handlePageChange}
        itemName="imágenes"
        size="large"
        className="my-[5vh]"
      />
    </div>
  )
}

export default GalleryPage
