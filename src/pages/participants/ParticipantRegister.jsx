import React, { useState, useContext, useCallback } from 'react'
import log from 'loglevel'
import { useNavigate } from 'react-router-dom'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, storage } from '../../firebase/firebase'
import { AuthContext } from '../../contexts/AuthContext'
import Loader from '../../components/Loader'
import DynamicInput from '../../components/Inputs'
import { showPopup } from '../../services/popupService'
import { useTranslation } from 'react-i18next'
import { validateFile } from '../../utils/fileValidator'
import DynamicButton from '../../components/Buttons'
import DynamicCard from '../../components/Cards'

function ParticipantRegisterForm() {
  const { t } = useTranslation()
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const viewDictionary = 'pages.participants.registerParticipants'

  const [formState, setFormState] = useState({
    file: null,
    name: '',
    description: '',
    instagram: '',
    facebook: '',
    twitter: '',
    uploading: false,
    submitting: false,
    newImageUrl: null,
  })

  log.setLevel('info')

  const resetForm = () => {
    setFormState({
      file: null,
      name: '',
      description: '',
      instagram: '',
      facebook: '',
      twitter: '',
      uploading: false,
      submitting: false,
      newImageUrl: null,
    })
  }

  const handleFileChange = useCallback(
    (e) => {
      const selectedFile = e.target.files[0]

      const validationError = validateFile(selectedFile, t)
      if (validationError) {
        showPopup({
          title: t(`${viewDictionary}.errorPopup.title`),
          text: validationError,
          icon: 'error',
          confirmButtonText: t('components.buttons.confirm'),
          confirmButtonColor: '#a3a3a3',
        })
        setFormState((prev) => ({ ...prev, file: null, newImageUrl: null }))
        return
      }

      setFormState((prev) => ({
        ...prev,
        file: selectedFile,
        newImageUrl: URL.createObjectURL(selectedFile),
      }))
    },
    [t]
  )

  const handleUpload = async () => {
    setFormState((prev) => ({ ...prev, uploading: true }))
    const fileName =
      formState.name.trim() ||
      formState.file.name.replace(/[^a-zA-Z0-9.]/g, '_')
    const storageRef = ref(storage, `participants/${fileName}`)

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, formState.file)

      uploadTask.on(
        'state_changed',
        null,
        async (error) => {
          log.error('Error al subir el archivo:', error)
          await showPopup({
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
          resolve({ url, fileName })
        }
      )
    })
  }

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      setFormState((prev) => ({ ...prev, submitting: true }))

      const validationError = validateFile(formState.file, t)
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
        const { url, fileName } = await handleUpload()
        await addDoc(collection(db, 'participants'), {
          name: fileName,
          description: formState.description,
          instagram: formState.instagram,
          facebook: formState.facebook,
          twitter: formState.twitter,
          url,
          createdAt: serverTimestamp(),
          userId: user.uid,
        })

        await showPopup({
          title: t(`${viewDictionary}.successPopup.title`),
          text: t(`${viewDictionary}.successPopup.text`),
          icon: 'success',
          confirmButtonText: t('components.buttons.confirm'),
          confirmButtonColor: '#8be484',
        })

        navigate('/dashboard')
        resetForm()
      } catch (error) {
        log.error('Error en el proceso de subida:', error)
      } finally {
        setFormState((prev) => ({ ...prev, submitting: false }))
      }
    },
    [
      formState.file,
      formState.name,
      formState.description,
      formState.instagram,
      formState.facebook,
      formState.twitter,
      user,
      navigate,
      t,
    ]
  )

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
        <DynamicInput
          name="file"
          textId={`${viewDictionary}.fileLabel`}
          type="document"
          onChange={handleFileChange}
          disabled={formState.uploading}
          required
          accept="image/*"
        />
        {formState.newImageUrl && (
          <div className="mt-[3vh] w-full">
            <DynamicCard
              type="gallery"
              title={t(`${viewDictionary}.previewImageTitle`)}
              imageUrl={formState.newImageUrl}
            />
          </div>
        )}

        <DynamicInput
          name="name"
          textId={`${viewDictionary}.nameLabel`}
          type="text"
          value={formState.name}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, name: e.target.value }))
          }
          disabled={formState.uploading}
        />
        <DynamicInput
          name="description"
          textId={`${viewDictionary}.descriptionLabel`}
          type="textarea"
          value={formState.description}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, description: e.target.value }))
          }
          disabled={formState.uploading}
        />

        <h2 className="mt-[4vh] mb-[2vh] text-xl font-semibold w-full text-center sm:text-left">
          {t(`${viewDictionary}.socialMediaTitle`)}
        </h2>

        <DynamicInput
          name="instagram"
          textId={`${viewDictionary}.instagramLabel`}
          type="text"
          value={formState.instagram}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, instagram: e.target.value }))
          }
          disabled={formState.uploading}
        />

        <DynamicInput
          name="facebook"
          textId={`${viewDictionary}.facebookLabel`}
          type="text"
          value={formState.facebook}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, facebook: e.target.value }))
          }
          disabled={formState.uploading}
        />

        <DynamicInput
          name="twitter"
          textId={`${viewDictionary}.twitterLabel`}
          type="text"
          value={formState.twitter}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, twitter: e.target.value }))
          }
          disabled={formState.uploading}
        />

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

export default ParticipantRegisterForm
