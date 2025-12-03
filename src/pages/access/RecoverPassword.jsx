import React, { useState } from 'react'
import { getAuth, sendPasswordResetEmail } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import useTaggedImage from '../../hooks/useTaggedImage'
import usePointerAnimation from '../../hooks/usePointerAnimation'

const RecoverPassword = () => {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const viewDictionary = 'pages.recoverPage'

  const { moveX, moveY, handleMouseMove } = usePointerAnimation()
  const { backgroundImage, imageLoaded, handleImageLoad, handleImageError } =
    useTaggedImage('login', '/images/default-login.jpg')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const auth = getAuth()
    const actionCodeSettings = {
      url: `${process.env.REACT_APP_PASSWORD_RESET_URL || window.location.origin}/reset-password`,
      handleCodeInApp: true,
    }

    try {
      await sendPasswordResetEmail(auth, email, actionCodeSettings)
      showPopup({
        title: t('components.popup.successTitle'),
        text: t(`${viewDictionary}.recoverSuccess`),
        icon: 'success',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#8be484',
        onConfirm: () => navigate('/login'),
      })
    } catch (error) {
      showPopup({
        title: t('components.popup.failTitle'),
        text: t('components.popup.failDecription'),
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid items-center min-h-dvh mx-auto bg-center bg-cover md:grid-cols-3 sm:grid-cols-1 justify-items-center px-[4%] sm:px-[5%] lg:px-[6%]">
      <div className="sm:mb-[50%] relative z-10 rounded-lg md:p-[5%] sm:p-[4%] p-[6%] grid-col-3 w-fit sm:translate-y-[-10vh] md:translate-y-0">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-black t40b">{t(`${viewDictionary}.title`)}</h1>
          <p className="mt-[3vh] text-black t16r whitespace-break-spaces">
            {t(`${viewDictionary}.description`)}
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="max-w-md mx-auto mt-[5vh] mb-0 space-y-[3vh] flex flex-col items-center sm:items-stretch"
        >
          <DynamicInput
            name="email"
            textId={t(`${viewDictionary}.email`)}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="flex flex-row items-center justify-center">
            <DynamicButton
              size="medium"
              state={loading ? 'disabled' : 'normal'}
              textId={t('components.buttons.recover')}
              type="submit"
              disabled={loading}
            />
          </div>
        </form>
      </div>

      {/* Sección de la imagen con animación */}
      <motion.div
        className="bottom-0 flex justify-end h-full grid-cols-3 col-span-2 overflow-hidden md:absolute md:bottom-[2%] md:right-[2%] bg-blend-multiply mix-blend-multiply"
        onMouseMove={handleMouseMove}
      >
        {backgroundImage && (
          <motion.div
            className="relative w-full h-full overflow-hidden"
            style={{
              x: moveX,
              y: moveY,
            }}
          >
            <motion.img
              src={backgroundImage}
              alt="recover password portada"
              className={`
                object-cover max-sm:absolute -z-10 max-sm:top-0 max-sm:right-0 max-sm:opacity-10 
                lg:w-[80%] mg:w-[90%] sm:w-full h-full
                transition-opacity duration-1000 ease-in-out
                ${imageLoaded ? 'opacity-50' : 'opacity-0'}
              `}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                width: '105%',
                height: '105%',
                objectFit: 'cover',
                objectPosition: 'center',
              }}
              initial={{ scale: 1.02 }}
              animate={{
                scale: 1.02,
                opacity: imageLoaded ? 0.5 : 0,
              }}
              transition={{
                opacity: { duration: 0.8, ease: 'easeInOut' },
                scale: { duration: 1.2, ease: 'easeOut' },
              }}
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default RecoverPassword
