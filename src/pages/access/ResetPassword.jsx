import React, { useState, useEffect } from 'react'
import { getAuth, confirmPasswordReset } from 'firebase/auth'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import useTaggedImage from '../../hooks/useTaggedImage'
import usePointerAnimation from '../../hooks/usePointerAnimation'

const ResetPassword = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oobCode, setOobCode] = useState(null)
  const viewDictionary = 'pages.resetPassword'
  const popupDictionary = 'components.popup'

  const { moveX, moveY, handleMouseMove } = usePointerAnimation()
  const { backgroundImage, imageLoaded, handleImageLoad, handleImageError } =
    useTaggedImage('login', '/images/default-login.jpg')

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search)
    const code = queryParams.get('oobCode')
    if (code) {
      setOobCode(code)
    } else {
      navigate('/recover-password')
    }
  }, [location.search, navigate])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showPopup({
        title: t(`${popupDictionary}.failTitle`),
        text: t(`${popupDictionary}.passwordMismatch`),
        icon: 'error',
        confirmButtonText: t(`components.buttons.confirm`),
        confirmButtonColor: '#a3a3a3',
      })
      return
    }

    setLoading(true)
    const auth = getAuth()
    try {
      await confirmPasswordReset(auth, oobCode, newPassword)
      showPopup({
        title: t(`${popupDictionary}.successTitle`),
        text: t(`${popupDictionary}.passwordResetSuccess`),
        icon: 'success',
        confirmButtonText: t(`components.buttons.confirm`),
        confirmButtonColor: '#8be484',
        onConfirm: () => navigate('/login'),
      })
    } catch (error) {
      showPopup({
        title: t(`${popupDictionary}.failTitle`),
        text: t(`${popupDictionary}.failDecription`),
        icon: 'error',
        confirmButtonText: t(`components.buttons.confirm`),
        confirmButtonColor: '#a3a3a3',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid items-center h-screen mx-auto bg-center bg-cover max-sm:mt-40 md:grid-cols-3 sm:grid-cols-1 justify-items-center sm:px-6 lg:px-8">
      <div className="relative z-10 rounded-lg md:p-8 sm:p-4 grid-col-3 w-fit h-fit bottom-40">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-black t40b">{t(`${viewDictionary}.title`)}</h1>
          <p className="mt-4 text-black t16r whitespace-break-spaces">
            {t(`${viewDictionary}.description`)}
          </p>
        </div>
        <form
          onSubmit={handleResetPassword}
          className="flex flex-col items-center w-full"
        >
          <DynamicInput
            name="newPassword"
            placeholder={t(`${viewDictionary}.newPassword`)}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <DynamicInput
            name="confirmPassword"
            placeholder={t(`${viewDictionary}.confirmPassword`)}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <DynamicButton
            size="medium"
            state={loading ? 'disabled' : 'normal'}
            textId={t('components.buttons.recover')}
            type="submit"
            disabled={loading}
          />
        </form>
      </div>

      {/* Sección de la imagen con animación */}
      <motion.div
        className="bottom-0 flex justify-end h-full grid-cols-3 col-span-2 overflow-hidden md:absolute md:bottom-4 md:right-2 bg-blend-multiply mix-blend-multiply"
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
              alt="reset password portada"
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

export default ResetPassword
