import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { getAuth } from 'firebase/auth'
import log from 'loglevel'
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  collection,
  getDocs,
} from 'firebase/firestore'
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { db, storage } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import DynamicCard from '../../components/Cards'
import Loader from '../../components/Loader'
import { showPopup } from '../../services/popupService'
import useChangeTracker from '../../hooks/useModificationsRegister'
import { validateFile, processFile } from '../../utils/fileValidator'
import useSlug from '../../hooks/useSlug'

function UserControl() {
  const navigate = useNavigate()
  const auth = getAuth()
  const params = useParams()
  const location = useLocation()
  const { slug } = params
  const { generateSlug } = useSlug()

  const userId = location.state?.userId

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    birthDate: '',
    age: null,
    dni: '',
    email: '',
    isStaff: false,
    position: '',
    startDate: '',
    endDate: '',
    description: '',
    documentUrl: '',
    emailNotifications: false,
  })
  const [originalData, setOriginalData] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [age, setAge] = useState(null)
  const [isOwnProfile, setIsOwnProfile] = useState(true)
  const [documentFile, setDocumentFile] = useState(null)
  const [documentProgress, setDocumentProgress] = useState(0)
  const [previewDocumentUrl, setPreviewDocumentUrl] = useState(null)
  const { t } = useTranslation()
  const viewDictionary = 'pages.users.userModify'

  const { trackChanges, detectChanges, isTracking } = useChangeTracker({
    tag: 'users',
    entityType: 'user',
  })

  useEffect(() => {
    const loadUserData = async () => {
      if (!auth.currentUser && !userId) {
        navigate('/login')
        return
      }

      setLoading(true)
      try {
        let targetUserId = auth.currentUser?.uid || ''

        if (userId) {
          targetUserId = userId
          setIsOwnProfile(userId === auth.currentUser?.uid)
        } else if (slug) {
          const usersSnapshot = await getDocs(collection(db, 'users'))
          let found = false
          for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data()
            const fullName =
              `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
            const currentSlug = generateSlug(fullName) || 'usuario'

            if (currentSlug === slug) {
              targetUserId = userDoc.id
              setIsOwnProfile(targetUserId === auth.currentUser?.uid)
              found = true
              break
            }
          }

          if (!found) {
            setError(t(`${viewDictionary}.errorMessages.userNotFound`))
            setLoading(false)
            return
          }
        }

        const userDoc = await getDoc(doc(db, 'users', targetUserId))
        if (userDoc.exists()) {
          const userData = userDoc.data()

          const userDataToStore = {
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            phoneNumber: userData.phoneNumber || '',
            birthDate: userData.birthDate || '',
            age: userData.age || null,
            dni: userData.dni || '',
            email: userData.email || '',
            id: targetUserId,
            isStaff: userData.isStaff || false,
            position: userData.position || '',
            startDate: userData.startDate || '',
            endDate: userData.endDate || '',
            description: userData.description || '',
            documentUrl: userData.documentUrl || '',
            emailNotifications:
              userData.emailNotifications !== undefined
                ? userData.emailNotifications
                : false,
          }

          setFormData(userDataToStore)
          setOriginalData(userDataToStore)

          if (userData.birthDate) {
            setAge(calculateAge(userData.birthDate))
          }
        } else {
          setError(t(`${viewDictionary}.errorMessages.noInfoUserFound`))
        }
      } catch (err) {
        log.error(t(`${viewDictionary}.errorMessages.userLoadingError`), {
          err: err,
        })
        setError(t(`${viewDictionary}.errorMessages.userInfoCantLoaded`))
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [auth.currentUser, navigate, slug, userId])

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

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const errorMessage = validateFile(file, t)
      if (errorMessage) {
        showPopup({
          title: t(`${viewDictionary}.documentUpload.fileError`),
          text: errorMessage,
          icon: 'error',
        })
        return
      }

      setDocumentFile(file)

      if (file.type.startsWith('image/')) {
        setPreviewDocumentUrl(URL.createObjectURL(file))
      } else if (file.type === 'application/pdf') {
        setPreviewDocumentUrl('pdf')
      } else {
        setPreviewDocumentUrl('document')
      }
    }
  }

  const uploadDocument = async (file) => {
    if (!file) return formData.documentUrl

    try {
      const processedFile = await processFile(file)
      const folderPath = 'staff'
      const timestamp = new Date().getTime()
      const fileName = `${formData.id}_${timestamp}_${processedFile.name}`
      const storageRef = ref(storage, `${folderPath}/${fileName}`)
      const uploadTask = uploadBytesResumable(storageRef, processedFile)

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progressPercent =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            setDocumentProgress(progressPercent)
          },
          (error) => {
            reject(error)
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref)

            if (formData.documentUrl) {
              try {
                const oldDocRef = ref(storage, formData.documentUrl)
                await deleteObject(oldDocRef)
              } catch (deleteError) {
                // Continuamos aunque falle la eliminación
              }
            }

            resolve(url)
          }
        )
      })
    } catch (error) {
      log.error('Error al procesar o subir el documento:', error)
      throw error
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    if (!auth.currentUser) {
      setError(t(`${viewDictionary}.errorMessages.unauthenticated`))
      setSubmitting(false)
      return
    }

    const targetUserId = formData.id || auth.currentUser.uid

    try {
      const fieldsToCheck = [
        'firstName',
        'lastName',
        'phoneNumber',
        'birthDate',
        'dni',
        'isStaff',
        'position',
        'startDate',
        'endDate',
        'description',
        'emailNotifications',
      ]
      const detectedChanges = detectChanges(
        originalData,
        formData,
        fieldsToCheck
      )

      if (detectedChanges['birthDate']) {
        detectedChanges['age'] = {
          oldValue: originalData.age,
          newValue: formData.age,
        }
      }

      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        birthDate: formData.birthDate,
        age: formData.age,
        dni: formData.dni,
        isStaff: formData.isStaff,
        position: formData.position,
        startDate: formData.startDate,
        endDate: formData.endDate,
        description: formData.description,
        emailNotifications: formData.emailNotifications || false,
        modifiedAt: Timestamp.fromDate(new Date()),
      }

      if (documentFile) {
        try {
          const documentUrl = await uploadDocument(documentFile)

          if (documentUrl) {
            updateData.documentUrl = documentUrl
            detectedChanges['documentUrl'] = {
              oldValue: originalData.documentUrl || '',
              newValue: documentUrl,
            }
          }
        } catch (fileError) {
          showPopup({
            title: t(`${viewDictionary}.errorPopup.title`),
            text: t(`${viewDictionary}.documentUpload.errorText`),
            icon: 'error',
          })
        }
      } else {
        updateData.documentUrl = formData.documentUrl || ''
      }

      if (Object.keys(detectedChanges).length > 0) {
        try {
          await updateDoc(doc(db, 'users', targetUserId), updateData)

          const entityName = `${formData.firstName} ${formData.lastName}`.trim()
          await trackChanges({
            entityId: targetUserId,
            changes: detectedChanges,
            modifierId: auth.currentUser.uid,
            entityName,
            onSuccess: () => {
              showPopup({
                title: t(`${viewDictionary}.successPopup.title`),
                text: t(`${viewDictionary}.successPopup.text`),
                icon: 'success',
              })

              setOriginalData({
                ...formData,
                documentUrl: updateData.documentUrl,
              })
              setDocumentFile(null)
              setDocumentProgress(0)
              setPreviewDocumentUrl(null)

              if (!isOwnProfile) {
                setTimeout(() => {
                  navigate('/users-list')
                }, 1500)
              }
            },
            onError: (error) => {
              setError(t(`${viewDictionary}.errorMessages.updateDataError`))
            },
          })
        } catch (updateError) {
          throw new Error(t(`${viewDictionary}.errorMessages.dataBaseError`))
        }
      } else {
        showPopup({
          title: t(`${viewDictionary}.noChangesPopup.title`),
          text: t(`${viewDictionary}.noChangesPopup.text`),
          icon: 'info',
        })
      }
    } catch (err) {
      log.error('Error al actualizar perfil:', err)
      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.text`),
        icon: 'error',
      })
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || isTracking) {
    return (
      <Loader
        loading={true}
        size="50px"
        color="rgb(21, 100, 46)"
        text={
          isTracking
            ? t(`${viewDictionary}.trackingChanges`)
            : t(`${viewDictionary}.loadingUser`)
        }
      />
    )
  }

  return (
    <div className="w-full max-w-4xl px-4 pb-6 mx-auto text-center">
      <Loader loading={submitting} />
      <h1 className="mb-4 sm:t64b t40b">
        {isOwnProfile
          ? t(`${viewDictionary}.title`)
          : t(`${viewDictionary}.editUserTitle`)}
      </h1>

      <p className="mb-6 t16r">
        {isOwnProfile
          ? t(`${viewDictionary}.descriptionTitle`)
          : t(`${viewDictionary}.editUserDescription`, {
              firstName: formData.firstName,
              lastName: formData.lastName,
            })}
      </p>

      {error && <p className="mb-4 text-center text-red-500">{error}</p>}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center w-full space-y-4"
      >
        <div className="flex flex-col items-center w-full gap-6 sm:grid sm:grid-cols-2 sm:gap-4">
          <div className="flex flex-col items-center">
            <h1 className="mb-4 t16r">{t(`${viewDictionary}.name`)}</h1>
            <DynamicInput
              name="firstName"
              type="text"
              placeholder={t(`${viewDictionary}.name`)}
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col items-center">
            <h1 className="mb-4 t16r">{t(`${viewDictionary}.surname`)}</h1>
            <DynamicInput
              name="lastName"
              type="text"
              value={formData.lastName}
              placeholder={t(`${viewDictionary}.surname`)}
              onChange={(e) => handleChange('lastName', e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col items-center">
            <h1 className="mb-4 t16r">{t(`${viewDictionary}.phone`)} </h1>
            <DynamicInput
              name="phoneNumber"
              type="phone"
              value={formData.phoneNumber}
              placeholder={t(`${viewDictionary}.phone`)}
              onChange={(e) => handleChange('phoneNumber', e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col items-center">
            <h1 className="mb-4 t16r">{t(`${viewDictionary}.birthDate`)} </h1>
            <div className="flex flex-col items-center w-full sm:flex-row">
              <DynamicInput
                name="birthDate"
                type="date"
                value={formData.birthDate}
                placeholder={t(`${viewDictionary}.birthDate`)}
                onChange={(e) => handleChange('birthDate', e.target.value)}
                required
                disabled={submitting}
              />
              {age !== null && (
                <span className="mt-2 text-black sm:mt-0 sm:ml-4 t24b">
                  {t(`${viewDictionary}.years`, { years: age })}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <h1 className="mb-4 t16r">{t(`${viewDictionary}.dni`)}</h1>
            <DynamicInput
              name="dni"
              type="dni"
              value={formData.dni}
              placeholder={t(`${viewDictionary}.dni`)}
              onChange={(e) => handleChange('dni', e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col items-center">
            <h1 className="mb-4 t16r">{t(`${viewDictionary}.email`)}</h1>
            <DynamicInput
              name="email"
              type="email"
              value={formData.email}
              placeholder={t(`${viewDictionary}.email`)}
              disabled
            />
          </div>

          <div className="flex flex-col items-center col-span-2 mt-8 mb-4">
            <h2 className="mb-6 t24b">
              {t(`${viewDictionary}.userPreferences`)}
            </h2>

            <div className="grid items-center w-full grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
              <div className="flex flex-col items-center">
                <DynamicInput
                  name="emailNotifications"
                  type="checkbox"
                  textId={`${viewDictionary}.receiveEmails`}
                  checked={formData.emailNotifications}
                  onChange={(e) =>
                    handleChange('emailNotifications', e.target.checked)
                  }
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center col-span-2 mt-4">
            <div className="flex items-center justify-center mb-4 space-x-2">
              <DynamicInput
                type="checkbox"
                id="isStaff"
                name="isStaff"
                textId={`${viewDictionary}.isStaff`}
                checked={formData.isStaff}
                onChange={(e) => handleChange('isStaff', e.target.checked)}
              />
            </div>
          </div>
        </div>

        {formData.isStaff && (
          <div className="flex flex-col items-center">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4 max-w-fit">
              <div className="flex flex-col">
                <h1 className="mb-4 t16r">{t(`${viewDictionary}.position`)}</h1>
                <DynamicInput
                  name="position"
                  type="text"
                  value={formData.position}
                  placeholder={t(`${viewDictionary}.position`)}
                  onChange={(e) => handleChange('position', e.target.value)}
                  required={formData.isStaff}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col max-w-fit">
                <h1 className="mb-4 t16r">
                  {t(`${viewDictionary}.description`)}
                </h1>
                <DynamicInput
                  name="description"
                  type={'textarea'}
                  value={formData.description}
                  placeholder={t(`${viewDictionary}.description`)}
                  onChange={(e) => handleChange('description', e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="flex flex-col items-center ">
                <h1 className="mb-4 t16r">
                  {t(`${viewDictionary}.startDate`)}
                </h1>
                <DynamicInput
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  placeholder={t(`${viewDictionary}.startDate`)}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  required={formData.isStaff}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col items-center ">
                <h1 className="mb-4 t16r">{t(`${viewDictionary}.endDate`)}</h1>
                <DynamicInput
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  placeholder={t(`${viewDictionary}.endDate`)}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="">
              <div className="flex flex-col items-center col-span-2">
                <h1 className="mb-4 t16r">{t(`${viewDictionary}.document`)}</h1>
                <div className="flex flex-col items-center w-full space-y-4">
                  <DynamicInput
                    name="documentFile"
                    type="document"
                    onChange={handleFileChange}
                    disabled={submitting}
                  />

                  <div className="grid w-full grid-cols-1 gap-6 mt-4 sm:grid-cols-2 sm:gap-4">
                    {formData.documentUrl && (
                      <div className="flex flex-col items-center">
                        <h1 className="mb-4 t16r">
                          {t(`${viewDictionary}.oldDocTitle`)}
                        </h1>
                        <div className="w-full">
                          {formData.documentUrl.includes('pdf') ? (
                            <div className="flex flex-col items-center">
                              <div className="p-4 rounded-md">
                                <DynamicCard
                                  type="gallery"
                                  imageUrl={formData.documentUrl}
                                />
                              </div>
                            </div>
                          ) : formData.documentUrl.match(
                              /\.(jpeg|jpg|gif|png|webp)$/i
                            ) ? (
                            <DynamicCard
                              type="gallery"
                              imageUrl={formData.documentUrl}
                            />
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="p-4 rounded-md">
                                <DynamicCard
                                  type="gallery"
                                  imageUrl={formData.documentUrl}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {previewDocumentUrl && (
                      <div>
                        <h1 className="mb-4 t16r">
                          {t(`${viewDictionary}.newDocTitle`)}
                        </h1>
                        {previewDocumentUrl === 'pdf' ? (
                          <div className="flex flex-col items-center">
                            <div className="p-4 rounded-md">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="64"
                                height="64"
                                fill="currentColor"
                                className="text-red-600"
                                viewBox="0 0 16 16"
                              >
                                <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V9H3V2a1 1 0 0 1 1-1h5.5v2z" />
                                <path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.266.266 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.71 12.71 0 0 1 1.01-.193 11.744 11.744 0 0 1-.51-.858 20.801 20.801 0 0 1-.5 1.05zm2.446.45c.15.163.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.876 3.876 0 0 0-.612-.053zM8.078 7.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.09.346z" />
                              </svg>
                            </div>
                            <p className="mt-2 text-gray-700">
                              {documentFile?.name}
                            </p>
                          </div>
                        ) : previewDocumentUrl === 'document' ? (
                          <div className="flex flex-col items-center">
                            <div className="p-4 rounded-md">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="64"
                                height="64"
                                fill="currentColor"
                                className="text-blue-600"
                                viewBox="0 0 16 16"
                              >
                                <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
                                <path d="M8.5 6.5a.5.5 0 0 0-1 0v3.793L6.354 9.146a.5.5 0 1 0-.708.708l2 2a.5.5 0 0 0 .708 0l2-2a.5.5 0 0 0-.708-.708L8.5 10.293V6.5z" />
                              </svg>
                            </div>
                            <p className="mt-2 text-gray-700">
                              {documentFile?.name}
                            </p>
                          </div>
                        ) : (
                          <DynamicCard
                            type="gallery"
                            title="Nueva imagen"
                            imageUrl={previewDocumentUrl}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {documentProgress > 0 && documentProgress < 100 && (
                    <div className="w-full mt-2">
                      <div className="w-full h-2 rounded-md">
                        <div
                          className="h-2 bg-blue-600 rounded-md"
                          style={{ width: `${documentProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {Math.round(documentProgress)}% completado
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>{' '}
          </div>
        )}

        <div className="flex justify-center w-full mt-8 space-x-4">
          <DynamicButton
            size="medium"
            state="normal"
            type="button"
            onClick={(e) => {
              e.preventDefault()
              navigate(isOwnProfile ? `/profile/${slug}` : '/users-list')
            }}
            textId={t('components.buttons.cancel')}
            disabled={submitting}
          />

          <DynamicButton
            size="medium"
            state={submitting ? 'disabled' : 'normal'}
            type="submit"
            textId={
              submitting
                ? t(`${viewDictionary}.processing`)
                : t(`${viewDictionary}.updateDateButton`)
            }
            disabled={submitting}
          />
        </div>
      </form>
    </div>
  )
}

export default UserControl
