import React, { useState, useEffect, useContext, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
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
import { AuthContext } from '../../contexts/AuthContext'
import Loader from '../../components/Loader'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import { useTranslation } from 'react-i18next'
import { validateFile } from '../../utils/fileValidator'
import DynamicCard from '../../components/Cards'
import useSlug from '../../hooks/useSlug'

function ParticipantModifyForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { slug } = useParams()
  const location = useLocation()
  const participantId = location.state?.participantId
  const { generateSlug } = useSlug()

  const foundIdRef = useRef(null)

  const { user } = useContext(AuthContext)
  const viewDictionary = 'pages.participants.modifyParticipants'

  const [formState, setFormState] = useState({
    name: '',
    description: '',
    instagram: '',
    facebook: '',
    twitter: '',
    file: null,
    currentUrl: '',
    uploading: false,
    submitting: false,
    newImageUrl: null,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const getStoragePathFromUrl = (url) => {
    try {
      if (!url) return null
      const path = url.split('/o/')[1]?.split('?')[0]
      return path ? decodeURIComponent(path) : null
    } catch (e) {
      return null
    }
  }

  useEffect(() => {
    const fetchParticipant = async () => {
      try {
        if (participantId) {
          const docRef = doc(db, 'participants', participantId)
          const docSnap = await getDoc(docRef)

          if (docSnap.exists()) {
            setFormState({
              name: docSnap.data().name || '',
              description: docSnap.data().description || '',
              instagram: docSnap.data().instagram || '',
              facebook: docSnap.data().facebook || '',
              twitter: docSnap.data().twitter || '',
              currentUrl: docSnap.data().url || '',
              file: null,
              uploading: false,
              submitting: false,
              newImageUrl: null,
            })
            setLoading(false)
          } else {
            showPopup({
              title: t(`${viewDictionary}.notFoundTitle`),
              text: t(`${viewDictionary}.notFoundText`),
              icon: 'error',
              confirmButtonText: t('components.buttons.confirm'),
              confirmButtonColor: '#a3a3a3',
            })
            navigate('/dashboard')
          }
        } else {
          const participantsRef = collection(db, 'participants')
          const querySnapshot = await getDocs(participantsRef)

          let found = false
          for (const docSnapshot of querySnapshot.docs) {
            const data = docSnapshot.data()
            const nameSlug = generateSlug(data.name)

            if (nameSlug === slug) {
              setFormState({
                name: data.name || '',
                description: data.description || '',
                instagram: data.instagram || '',
                facebook: data.facebook || '',
                twitter: data.twitter || '',
                currentUrl: data.url || '',
                file: null,
                uploading: false,
                submitting: false,
                newImageUrl: null,
              })

              foundIdRef.current = docSnapshot.id

              found = true
              setLoading(false)
              break
            }
          }

          if (!found) {
            setError(t(`${viewDictionary}.participantNotFound`))
            showPopup({
              title: t(`${viewDictionary}.notFoundTitle`),
              text: t(`${viewDictionary}.notFoundText`),
              icon: 'error',
              confirmButtonText: t('componentes.buttons.confirm'),
              confirmButtonColor: '#a3a3a3',
            })
            navigate('/dashboard')
          }
        }
      } catch (error) {
        setError(t(`${viewDictionary}.errorLoadingParticipant`))
        setLoading(false)
      }
    }

    fetchParticipant()
  }, [participantId, slug, navigate, t])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const validationError = validateFile(selectedFile, t)

    if (validationError) {
      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: validationError,
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
      return
    }

    setFormState((prev) => ({
      ...prev,
      file: selectedFile,
      newImageUrl: URL.createObjectURL(selectedFile),
    }))
  }

  const handleUpload = async () => {
    if (!formState.file) return { url: formState.currentUrl }

    setFormState((prev) => ({ ...prev, uploading: true }))

    const safeFileName = `${Date.now()}_${(formState.name.trim() || 'participant').replace(/[^a-zA-Z0-9]/g, '_')}`
    const storageRef = ref(storage, `participants/${safeFileName}`)

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, formState.file)

      uploadTask.on(
        'state_changed',
        null,
        (error) => {
          showPopup({
            title: t(`${viewDictionary}.errorPopup.title`),
            text: t(`${viewDictionary}.errorPopup.text`),
            icon: 'error',
            confirmButtonText: t('components.buttons.confirm'),
            confirmButtonColor: '#a3a3a3',
          })
          setFormState((prev) => ({ ...prev, uploading: false }))
          reject(error)
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref)

          if (formState.currentUrl) {
            try {
              const storagePath = getStoragePathFromUrl(formState.currentUrl)
              if (storagePath) {
                const oldImageRef = ref(storage, storagePath)
                await deleteObject(oldImageRef)
              }
            } catch (error) {
              return
            }
          }
          resolve({ url, fileName: safeFileName })
        }
      )
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormState((prev) => ({ ...prev, submitting: true }))

    if (!formState.name.trim()) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorParticipantMandatory`),
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
      setFormState((prev) => ({ ...prev, submitting: false }))
      return
    }

    const idToUse = participantId || foundIdRef.current

    if (!idToUse) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorUpdatingParticipantId`),
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
      setFormState((prev) => ({ ...prev, submitting: false }))
      return
    }

    const validationError = formState.file
      ? validateFile(formState.file, t)
      : null
    if (validationError) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: validationError,
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
      setFormState((prev) => ({ ...prev, submitting: false }))
      return
    }

    if (!user) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.authError`),
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
      setFormState((prev) => ({ ...prev, submitting: false }))
      return
    }

    try {
      let updatedFields = {
        name: formState.name.trim(),
        description: formState.description,
        instagram: formState.instagram,
        facebook: formState.facebook,
        twitter: formState.twitter,
      }

      let newUrl = formState.currentUrl

      if (formState.file) {
        const { url } = await handleUpload()
        newUrl = url
      }

      if (newUrl !== formState.currentUrl) {
        updatedFields.url = newUrl
      }

      updatedFields.lastUpdateDate = serverTimestamp()
      updatedFields.userId = user.uid

      await updateDoc(doc(db, 'participants', idToUse), updatedFields)

      await showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#8be484',
      })

      navigate('/dashboard')
    } catch (error) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.text`),
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
    } finally {
      setFormState((prev) => ({ ...prev, submitting: false }))
    }
  }

  useEffect(() => {
    return () => {
      if (formState.newImageUrl) {
        URL.revokeObjectURL(formState.newImageUrl)
      }
    }
  }, [formState.newImageUrl])

  if (loading) {
    return <Loader loading={true} />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <h1 className="mb-[3vh] text-2xl font-bold text-red-500">Error</h1>
        <p className="text-lg">{error}</p>
        <DynamicButton
          onClick={() => navigate('/list-participant')}
          size="medium"
          state="normal"
          textId={t(`${viewDictionary}.backToParticipantsList`)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center w-[92%] sm:w-full md:w-auto pb-[4vh] mx-auto min-h-dvh h-fit">
      <Loader loading={formState.submitting} />
      <h1 className="mb-[4vh] text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`)}
      </h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center w-full max-w-[90%] sm:max-w-md space-y-[3vh] sm:flex-none"
      >
        <div className="flex flex-col items-center w-full">
          <h1 className="mb-[2vh] t16r">{t(`${viewDictionary}.nameLabel`)}</h1>
          <DynamicInput
            name="name"
            type="text"
            value={formState.name}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, name: e.target.value }))
            }
            disabled={formState.uploading}
            required
          />
        </div>

        <div className="flex flex-col items-center w-full">
          <DynamicInput
            name="description"
            type="textarea"
            textId={t(`${viewDictionary}.descriptionLabel`)}
            value={formState.description}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, description: e.target.value }))
            }
            disabled={formState.uploading}
          />
        </div>

        <h2 className="w-full mt-[4vh] mb-[2vh] text-xl font-semibold text-center sm:text-left">
          {t(`${viewDictionary}.socialMediaTitle`)}
        </h2>

        <div className="flex flex-col items-center w-full">
          <DynamicInput
            name="instagram"
            type="text"
            textId={t(`${viewDictionary}.instagramLabel`)}
            value={formState.instagram}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, instagram: e.target.value }))
            }
            disabled={formState.uploading}
          />
        </div>

        <div className="flex flex-col items-center w-full">
          <DynamicInput
            name="facebook"
            type="text"
            textId={t(`${viewDictionary}.facebookLabel`)}
            value={formState.facebook}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, facebook: e.target.value }))
            }
            disabled={formState.uploading}
          />
        </div>

        <div className="flex flex-col items-center w-full">
          <DynamicInput
            name="twitter"
            type="text"
            textId={t(`${viewDictionary}.twitterLabel`)}
            value={formState.twitter}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, twitter: e.target.value }))
            }
            disabled={formState.uploading}
          />
        </div>

        <div className="flex flex-col items-center w-full">
          <DynamicInput
            name="file"
            type="document"
            onChange={handleFileChange}
            disabled={formState.uploading}
            accept="image/*"
          />
        </div>

        <div className="grid w-full grid-cols-1 gap-[3vh] mt-[3vh] sm:grid-cols-2 sm:gap-[3vw]">
          {formState.currentUrl && (
            <div>
              <h1 className="mb-[2vh] t16r">
                {t(`${viewDictionary}.oldImageTitle`)}
              </h1>
              <DynamicCard
                type="gallery"
                title="Imagen actual"
                imageUrl={formState.currentUrl}
              />
            </div>
          )}

          {formState.newImageUrl && (
            <div>
              <h1 className="mb-[2vh] t16r">
                {t(`${viewDictionary}.newImageTitle`)}
              </h1>
              <DynamicCard
                type="gallery"
                title="Nueva imagen"
                imageUrl={formState.newImageUrl}
              />
            </div>
          )}
        </div>

        <div className="mt-[3vh] w-full flex justify-center sm:justify-end">
          <DynamicButton
            type="submit"
            size="medium"
            state={formState.uploading ? 'disabled' : 'normal'}
            textId={
              formState.uploading
                ? `${viewDictionary}.uploadingText`
                : `${viewDictionary}.uploadButton`
            }
            disabled={formState.uploading}
          />
        </div>
      </form>
    </div>
  )
}

export default ParticipantModifyForm
