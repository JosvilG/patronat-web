import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import log from 'loglevel'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { createUserModel } from '../../models/usersData'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import useTaggedImage from '../../hooks/useTaggedImage'
import usePointerAnimation from '../../hooks/usePointerAnimation'
import useChangeTracker from '../../hooks/useModificationsRegister'

function RegisterPage() {
  const navigate = useNavigate()
  const auth = getAuth()
  const [formData, setFormData] = useState(createUserModel())
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [age, setAge] = useState(null)
  const { t } = useTranslation()
  const viewDictionary = 'pages.userRegister'

  const { trackCreation, isTracking } = useChangeTracker({
    tag: 'users',
    entityType: 'user',
  })

  const { moveX, moveY, handleMouseMove } = usePointerAnimation()
  const { backgroundImage, imageLoaded, handleImageLoad, handleImageError } =
    useTaggedImage('login', '/images/default-login.jpg')

  const calculateAge = (birthDate) => {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--
    }
    return age
  }

  const handleChange = (name, value) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }))

    if (name === 'birthDate') {
      const calculatedAge = calculateAge(value)
      setAge(calculatedAge)
      setFormData((prevData) => ({
        ...prevData,
        age: calculatedAge,
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      )
      const { user } = userCredential

      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        age: formData.age,
        birthDate: formData.birthDate,
        dni: formData.dni,
        email: formData.email,
        createdAt: Timestamp.fromDate(new Date()),
        modifiedAt: Timestamp.fromDate(new Date()),
        role: 'user',
      }

      await setDoc(doc(db, 'users', user.uid), userData)

      await trackCreation({
        entityId: user.uid,
        entityData: userData,
        modifierId: user.uid,
        entityName: `${userData.firstName} ${userData.lastName}`,
        sensitiveFields: ['password', 'dni'],
        onSuccess: () => {
          navigate('/')
        },
        onError: (error) => {
          navigate('/')
        },
      })
    } catch (err) {
      log.error('Error al crear cuenta:', err)
      setError(
        err.code === 'auth/email-already-in-use'
          ? t(`${viewDictionary}.errorMessages.emailInUse`)
          : t(`${viewDictionary}.errorMessages.genericRegistration`)
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid items-center min-h-dvh mx-auto bg-center bg-cover md:grid-cols-3 sm:grid-cols-1 justify-items-center px-[4%] sm:px-[5%] lg:px-[6%]">
      <div className="sm:mb-[50%] relative z-10 rounded-lg md:p-[5%] sm:p-[4%] p-[6%] grid-col-3 w-fit sm:translate-y-[-10vh] md:translate-y-0">
        <div className="mx-auto text-center">
          <h1 className="text-black t40b">{t(`${viewDictionary}.title`)}</h1>
          <p className="mt-[3vh] text-black t16r whitespace-break-spaces">
            {t(`${viewDictionary}.description`)}
          </p>
        </div>
        {error && <p className="mb-[2vh] text-center text-red-500">{error}</p>}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center sm:items-stretch gap-[3vh] mt-[5vh] mb-0"
        >
          <DynamicInput
            name="firstName"
            type="text"
            textId={`${viewDictionary}.name`}
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            required
          />
          <DynamicInput
            name="lastName"
            type="text"
            value={formData.lastName}
            textId={`${viewDictionary}.surname`}
            onChange={(e) => handleChange('lastName', e.target.value)}
            required
          />
          <DynamicInput
            name="phoneNumber"
            type="phone"
            value={formData.phoneNumber}
            textId={`${viewDictionary}.phone`}
            onChange={(e) => handleChange('phoneNumber', e.target.value)}
            required
          />
          <div className="flex flex-col items-center w-full sm:justify-between">
            <DynamicInput
              name="birthDate"
              type="date"
              value={formData.birthDate}
              textId={`${viewDictionary}.birthDate`}
              onChange={(e) => handleChange('birthDate', e.target.value)}
              required
            />
            {age !== null && (
              <span className="relative text-black t24b sm:right-[10%] sm:top-[0.75vh] right-[5%]">
                {age} años
              </span>
            )}
          </div>
          <DynamicInput
            name="dni"
            type="dni"
            value={formData.dni}
            textId={`${viewDictionary}.dni`}
            onChange={(e) => handleChange('dni', e.target.value)}
            required
          />
          <DynamicInput
            name="email"
            type="email"
            value={formData.email}
            textId={`${viewDictionary}.email`}
            onChange={(e) => handleChange('email', e.target.value)}
            required
          />
          <DynamicInput
            name="password"
            type="password"
            value={formData.password}
            textId={`${viewDictionary}.password`}
            onChange={(e) => handleChange('password', e.target.value)}
            required
          />
          <div className="flex flex-row justify-center">
            <DynamicButton
              size="medium"
              state={loading || isTracking ? 'disabled' : 'normal'}
              type="submit"
              textId="components.buttons.register"
              disabled={loading || isTracking}
            />
          </div>

          {isTracking && (
            <p className="mt-[2vh] text-sm text-center text-gray-600">
              {`${viewDictionary}.trackingChanges`}
            </p>
          )}
        </form>
      </div>

      <motion.div
        className="bottom-0 flex justify-end h-full grid-cols-3 col-span-2 overflow-hidden md:absolute md:bottom-[1vh] md:right-[1%] bg-blend-multiply mix-blend-multiply"
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
              alt="register portada"
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

export default RegisterPage
