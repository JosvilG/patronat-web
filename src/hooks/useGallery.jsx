import { useState, useEffect } from 'react'
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase/firebase'

/**
 * Recupera imágenes públicas almacenadas en Firebase Storage y proporciona navegación circular.
 *
 * @returns {{galleryImages: Array, loadingGallery: boolean, currentGalleryIndex: number, handleGalleryNext: function(): void, handleGalleryPrev: function(): void}}
 */
const useGallery = () => {
  const [galleryImages, setGalleryImages] = useState([])
  const [loadingGallery, setLoadingGallery] = useState(true)
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0)

  useEffect(() => {
    /**
     * Fetches images from Firebase, validates them, and sets the gallery data
     * The function retrieves images from the 'uploads' collection, filters for public
     * images, validates each image's URL, and finally sorts by creation date.
     */
    const fetchImages = async () => {
      try {
        // Get all documents from the 'uploads' collection
        const querySnapshot = await getDocs(collection(db, 'uploads'))

        // Map the documents to an array of image objects
        const images = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Filter for public images that appear to be images based on various properties
        const publicImages = images.filter(
          (item) =>
            item.visibility === 'public' &&
            ((item.fullPath && item.fullPath.startsWith('images/')) ||
              (item.type && item.type.startsWith('image/')) ||
              item.isImage === true)
        )

        // Validate each image by checking URL accessibility
        const validatedImages = await Promise.all(
          publicImages.map(async (image) => {
            try {
              // Skip images without URL and delete them from the database
              if (!image.url) {
                await deleteInvalidImage(image.id)
                return null
              }

              // Verify the image URL is valid and accessible
              await getDownloadURL(ref(storage, image.url))
              return image
            } catch (error) {
              // Delete invalid images that fail URL verification
              await deleteInvalidImage(image.id)
              return null
            }
          })
        )

        // Remove null entries (invalid images)
        const filteredImages = validatedImages.filter((img) => img !== null)

        // Sort images by creation date (newest first)
        const sortedImages = filteredImages.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return b.createdAt.seconds - a.createdAt.seconds
          }
          return 0
        })

        setGalleryImages(sortedImages)
      } catch (error) {
        // Silent error in production
      } finally {
        setLoadingGallery(false)
      }
    }

    fetchImages()
  }, [])

  /**
   * Deletes an invalid image from the database
   *
   * @param {string} imageId - ID of the image to delete
   */
  const deleteInvalidImage = async (imageId) => {
    try {
      await deleteDoc(doc(db, 'uploads', imageId))
    } catch (deleteError) {
      // Silent error in production
    }
  }

  /**
   * Advances to the next image in the gallery with circular navigation
   */
  const handleGalleryNext = () => {
    setCurrentGalleryIndex((prevIndex) =>
      prevIndex === galleryImages.length - 1 ? 0 : prevIndex + 1
    )
  }

  /**
   * Goes to the previous image in the gallery with circular navigation
   */
  const handleGalleryPrev = () => {
    setCurrentGalleryIndex((prevIndex) =>
      prevIndex === 0 ? galleryImages.length - 1 : prevIndex - 1
    )
  }

  return {
    galleryImages,
    loadingGallery,
    currentGalleryIndex,
    handleGalleryNext,
    handleGalleryPrev,
  }
}

export default useGallery
