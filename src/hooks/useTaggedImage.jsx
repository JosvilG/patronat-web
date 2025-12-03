import { useState, useEffect } from 'react'
import useGallery from './useGallery'

/**
 * Custom hook to get the most recent image with a specific tag
 * and fade it in gradually when loaded
 * @param {string} tag - The tag to filter images (default: 'login')
 * @param {string} fallbackImage - Fallback image URL if none is found
 * @returns {Object} - Image state and properties
 */
const useTaggedImage = (
  tag = 'login',
  fallbackImage = '/images/default-login.jpg'
) => {
  const { galleryImages } = useGallery()
  const [backgroundImage, setBackgroundImage] = useState(fallbackImage)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isLoadingNewImage, setIsLoadingNewImage] = useState(false)
  const [currentUrl, setCurrentUrl] = useState(null)
  const [opacity, setOpacity] = useState(0) // Estado para controlar la opacidad

  // Efecto para manejar la aparición gradual de la imagen
  useEffect(() => {
    let fadeTimer
    if (imageLoaded) {
      // Pequeño retraso para asegurar que el DOM se ha actualizado
      fadeTimer = setTimeout(() => {
        setOpacity(1) // Establecer opacidad al máximo gradualmente
      }, 50)
    } else {
      setOpacity(0) // Ocultar imagen cuando se está cargando una nueva
    }

    return () => {
      if (fadeTimer) clearTimeout(fadeTimer)
    }
  }, [imageLoaded])

  useEffect(() => {
    // Función que busca la imagen con tag específico
    const findTaggedImage = () => {
      if (galleryImages && galleryImages.length > 0) {
        // Filter images by the specified tag
        const taggedImages = galleryImages.filter((image) => {
          if (!image || !image.tags) return false

          // If it's an array, search for the tag
          if (Array.isArray(image.tags)) {
            return image.tags.some(
              (imageTag) =>
                typeof imageTag === 'string' &&
                imageTag.toLowerCase() === tag.toLowerCase()
            )
          }

          // If it's a string, convert to array and search
          if (typeof image.tags === 'string') {
            return image.tags.toLowerCase().includes(tag.toLowerCase())
          }

          return false
        })

        if (taggedImages.length > 0) {
          // Sort by creation date (most recent first)
          const sortedImages = [...taggedImages].sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              const dateA =
                a.createdAt instanceof Date
                  ? a.createdAt
                  : new Date(a.createdAt)
              const dateB =
                b.createdAt instanceof Date
                  ? b.createdAt
                  : new Date(b.createdAt)
              return dateB - dateA
            }
            return 0
          })

          // Verificar si la URL ha cambiado realmente
          const newUrl = sortedImages[0].url
          if (newUrl !== currentUrl) {
            // Indicamos que estamos cargando una nueva imagen
            setIsLoadingNewImage(true)

            // Mantenemos un registro de la URL actual
            setCurrentUrl(newUrl)

            // Solo reseteamos imageLoaded cuando cambia realmente la URL
            setImageLoaded(false)
            setOpacity(0) // Asegurarnos de que la opacidad es 0 antes de cargar

            // Actualizamos la imagen de fondo
            setBackgroundImage(newUrl)
          }
        } else if (!currentUrl) {
          // Si no hay imágenes etiquetadas y no tenemos URL actual,
          // usamos la imagen predeterminada
          setBackgroundImage(fallbackImage)
          setCurrentUrl(fallbackImage)
        }
      } else if (!currentUrl) {
        // Si no hay imágenes en la galería, usamos el fallback
        setBackgroundImage(fallbackImage)
        setCurrentUrl(fallbackImage)
      }
    }

    // Ejecutar la búsqueda al montar o cuando cambian las dependencias
    findTaggedImage()
  }, [galleryImages, tag, fallbackImage])

  // Handler para cuando la imagen termina de cargar
  const handleImageLoad = () => {
    // Cuando la imagen se ha cargado correctamente
    setIsLoadingNewImage(false)
    setImageLoaded(true)
    // La opacidad se manejará en el efecto separado
  }

  // Handler para errores de carga de imagen
  const handleImageError = (e) => {
    e.target.onerror = null

    // Si hay error, usamos la imagen fallback
    if (e.target.src !== fallbackImage) {
      e.target.src = fallbackImage
      setCurrentUrl(fallbackImage)
      setBackgroundImage(fallbackImage)
    }

    setIsLoadingNewImage(false)
    setImageLoaded(true)
    // La opacidad se manejará en el efecto separado
  }

  return {
    backgroundImage,
    imageLoaded,
    isLoadingNewImage,
    opacity, // Exportamos la opacidad controlada
    handleImageLoad,
    handleImageError,
  }
}

export default useTaggedImage
