import imageCompression from 'browser-image-compression'

const viewDictionary = 'utils'

/**
 * @param {File} imageFile
 * @returns {Promise<File>}
 */
export const convertToWebP = async (imageFile) => {
  try {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    }

    const compressedFile = await imageCompression(imageFile, options)

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.readAsArrayBuffer(compressedFile)
      reader.onload = () => {
        const blob = new Blob([reader.result], { type: compressedFile.type })
        const blobURL = URL.createObjectURL(blob)

        const img = new Image()
        img.src = blobURL

        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height

          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)

          canvas.toBlob(
            (webpBlob) => {
              // Limpiar URL
              URL.revokeObjectURL(blobURL)

              if (!webpBlob) {
                resolve(imageFile)
                return
              }

              const originalFileName =
                imageFile.name.substring(0, imageFile.name.lastIndexOf('.')) ||
                imageFile.name

              const newFile = new File([webpBlob], `${originalFileName}.webp`, {
                type: 'image/webp',
              })

              resolve(newFile)
            },
            'image/webp',
            0.8 // Calidad 80%
          )
        }

        img.onerror = () => {
          URL.revokeObjectURL(blobURL)
          resolve(imageFile) // Fallback al archivo original
        }
      }

      reader.onerror = () => {
        resolve(imageFile) // Fallback al archivo original
      }
    })
  } catch (error) {
    return imageFile
  }
}

/**
 * @param {File} file
 * @param {Function} t
 * @returns {String|null}
 */
export const validateFile = (file, t) => {
  if (!file) return t(`${viewDictionary}.fileRelated`)

  const allowedImageTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/jpg',
    'image/webp',
  ]
  const allowedPdfTypes = ['application/pdf']
  const allowedTypes = [...allowedImageTypes, ...allowedPdfTypes]

  if (!allowedTypes.includes(file.type)) {
    return t(`${viewDictionary}.fileType`)
  }

  if (allowedImageTypes.includes(file.type)) {
    const maxImageSize = 5 * 1024 * 1024
    if (file.size > maxImageSize) {
      return t(`${viewDictionary}.fileSize`)
    }
  } else if (allowedPdfTypes.includes(file.type)) {
    const maxPdfSize = 25 * 1024 * 1024
    if (file.size > maxPdfSize) {
      return t(`${viewDictionary}.pdfFileSize`)
    }
  }

  return null
}

/**
 * @param {File} file
 * @returns {Promise<File>}
 */
export const processFile = async (file) => {
  if (!file) return null

  const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/jpg']

  if (imageTypes.includes(file.type)) {
    const webpFile = await convertToWebP(file)
    return webpFile
  }

  return file
}
