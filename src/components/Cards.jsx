import React, { useState, useRef } from 'react'
import PropTypes from 'prop-types'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import DOMPurify from 'dompurify'

const DynamicCard = ({
  type,
  title,
  description,
  date,
  imageUrl,
  extraClass,
  link,
  clickable = true,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const fullscreenRef = useRef(null)
  const { t } = useTranslation()

  const handleGalleryClick = () => {
    if (clickable) {
      setIsFullscreen(true)
      document.body.style.overflow = 'hidden'
    }
  }

  const handleCloseFullscreen = () => {
    setIsFullscreen(false)
    document.body.style.overflow = 'auto'
  }

  const handleFullscreenBackdropClick = (e) => {
    if (fullscreenRef.current === e.target) {
      handleCloseFullscreen()
    }
  }

  const handleImageLoad = () => {
    setIsLoaded(true)
  }

  const handleImageError = () => {
    setImgError(true)
    setIsLoaded(true)
  }

  const validateAndOpenLink = (url) => {
    const urlPattern =
      /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/

    if (!url || !urlPattern.test(url)) {
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const validateImageUrl = (url) => {
    if (!url) return false

    try {
      const parsedUrl = new URL(url)
      return ['http:', 'https:', 'blob:'].includes(parsedUrl.protocol)
    } catch {
      return false
    }
  }

  const sanitizedTitle = title ? DOMPurify.sanitize(title) : ''
  const sanitizedDescription = description
    ? DOMPurify.sanitize(description)
    : ''
  const sanitizedDate = date ? DOMPurify.sanitize(date) : ''

  return (
    <>
      <div
        className={`relative w-full ${
          type === 'gallery'
            ? `max-sm:h-[400px] h-[530px] ${extraClass}`
            : 'sm:h-auto'
        } overflow-hidden group select-none transition-opacity duration-700 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => {
          if (clickable && type === 'event' && link) {
            validateAndOpenLink(link)
          }
        }}
      >
        <div
          className={`relative ${clickable ? 'cursor-pointer' : 'cursor-default'} ${
            type === 'gallery' ? 'h-full' : 'h-auto sm:h-[400px]'
          } ${!clickable ? 'pointer-events-none' : ''}`}
          onClick={
            clickable && type === 'gallery' ? handleGalleryClick : undefined
          }
        >
          <img
            src={
              imgError || !validateImageUrl(imageUrl)
                ? '/path/to/local/placeholder.jpg'
                : imageUrl
            }
            alt={sanitizedTitle}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="object-cover w-full h-full rounded-[60px]"
          />

          {type === 'gallery' && (
            <div
              className={`absolute inset-0 flex items-end p-4 transition-opacity duration-300 ${
                clickable ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
              }`}
              style={{
                borderRadius: '60px',
                boxShadow: 'inset 0 -228px 17px -102px rgba(0, 0, 0, 0.45)',
              }}
            >
              <div className="flex items-baseline justify-between w-full overflow-hidden text-white">
                <p className="text-white sm:t40b t24b line-clamp-1">
                  {sanitizedTitle}
                </p>
                <button
                  className="p-2 bg-black bg-opacity-50 rounded-full"
                  disabled={!clickable}
                >
                  <OpenInFullIcon fontSize="medium"></OpenInFullIcon>
                </button>
              </div>
            </div>
          )}

          {type === 'event' && (
            <div
              className={`absolute inset-0 flex flex-row justify-end items-end p-4 transition-opacity duration-300 ${
                clickable ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
              } rounded-[60px]`}
              style={{
                borderRadius: '60px',
                boxShadow: 'inset 0 -228px 17px -102px rgba(0, 0, 0, 0.45)',
              }}
            >
              <p className="text-right text-white t16b">
                {t('components.cards.eventDateTitle')} - {sanitizedDate}
              </p>
            </div>
          )}
        </div>

        {type === 'event' && (
          <div className="px-4 py-2">
            <p className="pb-2 flex flex-row items-center line-clamp-1 font-bold text-gray-800 transition-colors t40b group-hover:text-[#696969] leading-10">
              {sanitizedTitle}
            </p>
            <p className="leading-7 text-gray-600 transition-colors t20r group-hover:text-[#696969] line-clamp-3">
              {sanitizedDescription}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isFullscreen && type === 'gallery' && (
          <motion.div
            ref={fullscreenRef}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 cursor-pointer backdrop-blur-md"
            onClick={handleFullscreenBackdropClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="relative max-w-[90%] max-h-[90%] cursor-default"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={
                  imgError
                    ? 'https://dynamoprojects.com/wp-content/uploads/2022/12/no-image.jpg'
                    : imageUrl
                }
                alt={title}
                className="max-w-full max-h-[90dvh] rounded-lg object-contain"
              />
              {title && (
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white bg-black bg-opacity-50 rounded-b-lg">
                  <h3 className="font-bold t12r">{sanitizedTitle}</h3>
                  {description && (
                    <p className="mt-1 text-sm">{sanitizedDescription}</p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

DynamicCard.propTypes = {
  type: PropTypes.oneOf(['gallery', 'event']).isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  extraClass: PropTypes.string,
  date: PropTypes.string,
  imageUrl: PropTypes.string.isRequired,
  link: PropTypes.string,
  clickable: PropTypes.bool,
}

export default DynamicCard
