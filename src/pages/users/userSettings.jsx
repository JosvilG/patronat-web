import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18next from 'i18next'
import {
  getAuth,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import Loader from '../../components/Loader'
import useChangeTracker from '../../hooks/useModificationsRegister'

function Settings() {
  const { t } = useTranslation()
  const auth = getAuth()
  const navigate = useNavigate()
  const [selectedLanguage, setSelectedLanguage] = useState(
    localStorage.getItem('language') || 'es'
  )
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [initialUserData, setInitialUserData] = useState(null)
  const viewDictionary = 'pages.settings'

  const { trackDeletion, isTracking } = useChangeTracker({
    tag: 'users',
    entityType: 'user',
  })

  useEffect(() => {
    const loadUserSettings = async () => {
      if (!auth.currentUser) return

      setLoading(true)
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setInitialUserData(userData)

          if ('emailNotifications' in userData) {
            setEmailNotifications(userData.emailNotifications)
          }

          if ('preferredLanguage' in userData) {
            const lang = userData.preferredLanguage
            setSelectedLanguage(lang)
            i18next.changeLanguage(lang)
            localStorage.setItem('language', lang)
          }
        }
      } catch (error) {
        return
      } finally {
        setLoading(false)
      }
    }

    loadUserSettings()
  }, [])
  const handleLanguageChange = (event) => {
    const lang = event.target.value
    setSelectedLanguage(lang)
    i18next.changeLanguage(lang)
    localStorage.setItem('language', lang)
  }

  const handleSaveSettings = async () => {
    if (!auth.currentUser) {
      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.unauthenticated`),
        icon: 'error',
      })
      return
    }

    setSaving(true)
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid)
      const userDoc = await getDoc(userDocRef)
      const userExists = userDoc.exists()
      const userData = userExists ? userDoc.data() : {}

      const updateData = {
        emailNotifications: emailNotifications,
        preferredLanguage: selectedLanguage,
        modifiedAt: new Date(),
      }

      const hasLanguageChange = userData.preferredLanguage !== selectedLanguage
      const hasEmailNotificationsChange =
        userData.emailNotifications !== emailNotifications

      if (!hasLanguageChange && !hasEmailNotificationsChange) {
        showPopup({
          title: t(`${viewDictionary}.infoPopup.title`),
          text: t(`${viewDictionary}.infoPopup.noChangesDetected`),
          icon: 'info',
        })
        setSaving(false)
        return
      }

      if (userExists) {
        await updateDoc(userDocRef, updateData)
      } else {
        await setDoc(userDocRef, {
          ...updateData,
          email: auth.currentUser.email,
          createdAt: new Date(),
        })
      }

      showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.text`),
        icon: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!auth.currentUser || !confirmPassword) {
      return
    }

    setSaving(true)
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        confirmPassword
      )

      await reauthenticateWithCredential(auth.currentUser, credential)
      const userDocRef = doc(db, 'users', auth.currentUser.uid)
      const userDoc = await getDoc(userDocRef)
      const userData = userDoc.exists() ? userDoc.data() : {}
      const userId = auth.currentUser.uid
      const userEmail = auth.currentUser.email
      const tempModifierId = userId
      const entityName =
        userData.firstName && userData.lastName
          ? `${userData.firstName} ${userData.lastName}`
          : userEmail

      await trackDeletion({
        entityId: userId,
        entityData: userData,
        modifierId: tempModifierId,
        entityName,
        sensitiveFields: ['password', 'dni'],
        onSuccess: async () => {
          await deleteUser(auth.currentUser)

          showPopup({
            title: t(`${viewDictionary}.deleteSuccess.title`),
            text: t(`${viewDictionary}.deleteSuccess.text`),
            icon: 'success',
          })

          navigate('/')
        },
        onError: async (error) => {
          await deleteUser(auth.currentUser)
          showPopup({
            title: t(`${viewDictionary}.deleteSuccess.title`),
            text: t(`${viewDictionary}.deleteSuccess.accountDeletedNoLog`),
            icon: 'warning',
          })

          navigate('/')
        },
      })
    } catch (error) {
      let errorMessage = t(`${viewDictionary}.deleteError.defaultText`)
      if (error.code === 'auth/wrong-password') {
        errorMessage = t(`${viewDictionary}.deleteError.wrongPassword`)
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = t(`${viewDictionary}.deleteError.recentLogin`)
      }

      showPopup({
        title: t(`${viewDictionary}.deleteError.title`),
        text: errorMessage,
        icon: 'error',
      })
    } finally {
      setSaving(false)
      setConfirmPassword('')
    }
  }
  return (
    <div className="h-auto pb-6 mx-auto text-center sm:max-w-fit max-w-[340px]">
      <Loader loading={saving || isTracking} />
      <h1 className="mb-4 sm:t64b t40b">{t(`${viewDictionary}.title`)}</h1>
      <form className="flex flex-col items-center space-y-4 ">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4 min-w-max">
          <div className="flex flex-col items-center col-span-2 mb-4">
            <div className="grid items-center w-full grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
              <div className="flex flex-col items-center">
                <DynamicInput
                  name="language"
                  type="select"
                  textId={t(`${viewDictionary}.languageSection.title`)}
                  options={[
                    { value: 'es', label: 'Español' },
                    { value: 'cat', label: 'Català' },
                  ]}
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e)}
                  disabled={saving || isTracking}
                />
              </div>

              <div className="flex flex-col items-center max-w-[340px] sm:max-w-none">
                <div className="flex items-center justify-center space-x-2">
                  <DynamicInput
                    name="emailNotifications"
                    type="checkbox"
                    textId={t(`${viewDictionary}.emailToggle`)}
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    disabled={saving || isTracking}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center w-full mt-8">
          <DynamicButton
            size="medium"
            state={saving || isTracking ? 'disabled' : 'normal'}
            type={saving || isTracking ? 'loading' : 'save'}
            textId={t('components.buttons.save')}
            onClick={handleSaveSettings}
            disabled={saving || isTracking}
          />
        </div>

        {isTracking && (
          <p className="mt-2 text-sm text-center text-gray-600">
            {t(`${viewDictionary}.trackingChanges`)}
          </p>
        )}
      </form>

      <div className="p-8 mt-12 mb-6 bg-white rounded-lg shadow-md">
        <h2 className="mb-4 text-red-600 t24b">
          {t(`${viewDictionary}.deleteSection.title`)}
        </h2>
        <p className="mb-6 text-gray-600">
          {t(`${viewDictionary}.deleteSection.description`)}
        </p>

        {!showDeleteConfirmation ? (
          <div className="flex justify-center">
            <DynamicButton
              size="medium"
              state="normal"
              type="delete"
              textId={t(`${viewDictionary}.deleteSection.showConfirmButton`)}
              onClick={() => setShowDeleteConfirmation(true)}
              disabled={saving || isTracking}
            />
          </div>
        ) : (
          <div className="p-6 border border-red-300 rounded-md bg-red-50">
            <p className="mb-4 text-red-700">
              {t(`${viewDictionary}.deleteSection.confirmationText`)}
            </p>

            <DynamicInput
              name="confirmPassword"
              type="password"
              textId={t(`${viewDictionary}.deleteSection.passwordLabel`)}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={saving || isTracking}
            />

            <div className="flex flex-wrap justify-center gap-4 mt-4">
              <DynamicButton
                size="small"
                state="normal"
                type="cancel"
                textId={t('components.buttons.cancel')}
                onClick={() => {
                  setShowDeleteConfirmation(false)
                  setConfirmPassword('')
                }}
                disabled={saving || isTracking}
              />

              <DynamicButton
                size="small"
                state={
                  saving || isTracking || !confirmPassword
                    ? 'disabled'
                    : 'normal'
                }
                type="delete"
                textId={t('components.buttons.confirm')}
                onClick={handleConfirmDelete}
                disabled={saving || isTracking || !confirmPassword}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Settings
