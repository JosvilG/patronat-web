import React, { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { useNavigate } from 'react-router-dom'
import log from 'loglevel'
import { db, storage } from '../../firebase/firebase'
import { createEventModel } from '../../models/eventData'
import { createFormFieldsModel } from '../../models/formData'
import imageCompression from 'browser-image-compression'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicItems from '../../components/Items'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'

const createEventModelWithParticipants = () => {
  const baseModel = createEventModel()
  return {
    ...baseModel,
  }
}

function EventForm() {
  const { t } = useTranslation()
  const [eventData, setEventData] = useState(createEventModelWithParticipants())
  const [collaborators, setCollaborators] = useState([])
  const [participants, setParticipants] = useState([])
  const [collaboratorSearch, setCollaboratorSearch] = useState('')
  const [participantSearch, setParticipantSearch] = useState('')
  const [filteredCollaborators, setFilteredCollaborators] = useState([])
  const [filteredParticipants, setFilteredParticipants] = useState([])
  const [organizerSearch, setOrganizerSearch] = useState('')
  const [filteredOrganizers, setFilteredOrganizers] = useState([])
  const [file, setFile] = useState(null)
  const [authDocument, setAuthDocument] = useState(null)
  const [uploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [authDocProgress, setAuthDocProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [selectedFormFields, setSelectedFormFields] = useState([
    'nombre',
    'tematica',
    'responsable1',
    'responsable2',
    'dni1',
    'dni2',
    'telefono1',
    'telefono2',
    'ubicacion',
  ])
  const navigate = useNavigate()
  const viewDictionary = 'pages.events.registerEvent'

  log.setLevel('debug')

  const convertToWebP = async (imageFile) => {
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: 'image/webp',
      }
      const compressedFile = await imageCompression(imageFile, options)
      return compressedFile
    } catch (error) {
      log.error('Error al convertir la imagen:', error)
      throw error
    }
  }

  const predefinedTags = [
    'fmr',
    'nadal',
    'sants',
    'raval',
    'festival',
    'reuniones',
    'otros',
  ]

  useEffect(() => {
    const fetchCollaborators = async () => {
      const collaboratorsSnap = await getDocs(collection(db, 'collaborators'))
      const collaboratorsList = collaboratorsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      setCollaborators(collaboratorsList)
      setFilteredCollaborators(collaboratorsList)
    }

    const fetchParticipants = async () => {
      const participantsSnap = await getDocs(collection(db, 'participants'))
      const participantsList = participantsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      setParticipants(participantsList)
      setFilteredParticipants(participantsList)
    }

    fetchCollaborators()
    fetchParticipants()
  }, [])

  useEffect(() => {
    setFilteredCollaborators(
      collaborators.filter((collab) =>
        collab.name.toLowerCase().includes(collaboratorSearch.toLowerCase())
      )
    )
  }, [collaboratorSearch, collaborators])

  useEffect(() => {
    setFilteredParticipants(
      participants.filter((participant) =>
        participant.name.toLowerCase().includes(participantSearch.toLowerCase())
      )
    )
  }, [participantSearch, participants])

  useEffect(() => {
    setFilteredOrganizers(
      collaborators.filter((collab) =>
        collab.name.toLowerCase().includes(organizerSearch.toLowerCase())
      )
    )
  }, [organizerSearch, collaborators])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setEventData({
      ...eventData,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  const addCollaboratorToEvent = (collab) => {
    if (!eventData.collaborators.includes(collab.id)) {
      setEventData({
        ...eventData,
        collaborators: [...eventData.collaborators, collab.id],
      })
    }
  }

  const removeCollaboratorFromEvent = (collabId) => {
    setEventData({
      ...eventData,
      collaborators: eventData.collaborators.filter((id) => id !== collabId),
    })
  }

  const addParticipantToEvent = (participant) => {
    if (!eventData.participants.includes(participant.id)) {
      setEventData({
        ...eventData,
        participants: [...eventData.participants, participant.id],
      })
    }
  }

  const removeParticipantFromEvent = (participantId) => {
    setEventData({
      ...eventData,
      participants: eventData.participants.filter((id) => id !== participantId),
    })
  }

  const setOrganizer = (collab) => {
    setEventData({
      ...eventData,
      organizer: collab.id,
    })
  }

  const removeOrganizer = () => {
    setEventData({
      ...eventData,
      organizer: '',
    })
  }

  const handleAuthDocChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setAuthDocument(selectedFile)
    }
  }

  const uploadFile = async (file, progressSetter, isAuthDoc = false) => {
    try {
      const folderPath = isAuthDoc ? 'authorizations' : 'uploads'
      const storageRef = ref(storage, `${folderPath}/${file.name}`)
      const uploadTask = uploadBytesResumable(storageRef, file)

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progressPercent =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            progressSetter(progressPercent)
          },
          (error) => {
            reject(error)
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref)
            resolve(url)
          }
        )
      })
    } catch (error) {
      log.error('Error al subir el archivo:', error)
      throw error
    }
  }

  const handleTagChange = (tag) => {
    setEventData({ ...eventData, tags: [tag] })
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      try {
        const webpFile = await convertToWebP(selectedFile)
        setFile(webpFile)

        const previewURL = URL.createObjectURL(webpFile)
        setEventData({
          ...eventData,
          imageURL: previewURL,
        })
      } catch (error) {
        log.error('Error al convertir la imagen:', error)
      }
    }
  }

  const handleFormFieldToggle = (fieldId) => {
    setSelectedFormFields((prev) => {
      if (prev.includes(fieldId)) {
        return prev.filter((id) => id !== fieldId)
      } else {
        return [...prev, fieldId]
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      let fileUrl = ''
      let authDocUrl = ''

      if (file) {
        fileUrl = await uploadFile(file, setProgress, false)
      }

      if (authDocument) {
        authDocUrl = await uploadFile(authDocument, setAuthDocProgress, true)
      }

      const eventDataToSave = { ...eventData }
      delete eventDataToSave.imageURL

      const eventDocRef = await addDoc(collection(db, 'events'), {
        ...eventDataToSave,
        createdAt: Timestamp.now(),
        eventURL: fileUrl,
        authDocumentURL: authDocUrl,
        formFieldsIds: eventData.needForm ? selectedFormFields : [],
      })

      if (eventData.needForm) {
        const allFormFields = createFormFieldsModel()

        const formFields = allFormFields.filter((field) =>
          selectedFormFields.includes(field.fieldId)
        )

        formFields.forEach((field, index) => {
          field.order = index + 1
        })

        const formCampsRef = collection(
          db,
          'events',
          eventDocRef.id,
          'formCamps'
        )

        await Promise.all(
          formFields.map((field) => addDoc(formCampsRef, field))
        )
      }

      showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#8be484',
        onConfirm: () => navigate('/dashboard'),
      })
    } catch (error) {
      let errorMessage = t(`${viewDictionary}.errorMessages.default`)
      if (error.code === 'unavailable') {
        errorMessage = t(`${viewDictionary}.errorMessages.unavailable`)
      } else if (error.code === 'permission-denied') {
        errorMessage = t(`${viewDictionary}.errorMessages.permission-denied`)
      }

      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.text`, { errorMessage }),
        icon: 'error',
        confirmButtonText: t('components.buttons.close'),
        confirmButtonColor: '#a3a3a3',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container px-[4%] pb-[4vh] mx-auto">
      <Loader loading={submitting} />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center mx-auto space-y-[4vh] max-w-7xl sm:flex-none"
      >
        <h1 className="mb-[4vh] text-center sm:t64b t40b">
          {t(`${viewDictionary}.title`)}
        </h1>

        <div className="p-[4%] mb-[4vh] rounded-lg sm:w-full">
          <h3 className="mb-[2vh] text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.basicInfoTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-[3vh] md:grid-cols-2">
            <div className="col-span-2">
              <DynamicInput
                name="title"
                textId={t(`${viewDictionary}.nameLabel`)}
                type="text"
                value={eventData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-span-2">
              <DynamicInput
                name="description"
                textId={t(`${viewDictionary}.descriptionLabel`)}
                type="textarea"
                value={eventData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-span-2">
              <h3 className="mb-[2vh] text-lg font-semibold text-gray-700">
                {t(`${viewDictionary}.organizerLabel`)}
              </h3>

              <div className="grid grid-cols-1 gap-[3vh] md:grid-cols-2">
                <div>
                  <DynamicInput
                    name="searchOrganizer"
                    textId="Buscar organizador"
                    type="text"
                    value={organizerSearch}
                    onChange={(e) => setOrganizerSearch(e.target.value)}
                  />

                  <div className="p-[3%] mt-[2vh] overflow-y-auto max-h-[40vh] text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                    <DynamicItems
                      items={filteredOrganizers.map((collab) => ({
                        title: collab.name,
                        description: collab.role,
                        type: 'eventData',
                        icon: (
                          <button
                            type="button"
                            onClick={() => setOrganizer(collab)}
                          >
                            <AddIcon fontSize="small" />
                          </button>
                        ),
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="mb-[2vh] text-gray-700 t16r">
                    {t(`${viewDictionary}.selectedOrganizerLabel`)}
                  </h4>
                  <div className="p-[3%] overflow-y-auto max-h-[40vh] text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                    {eventData.organizer ? (
                      <DynamicItems
                        items={(() => {
                          const organizer = collaborators.find(
                            (collab) => collab.id === eventData.organizer
                          )
                          return organizer
                            ? [
                                {
                                  title: organizer.name,
                                  description: organizer.role,
                                  type: 'eventData',
                                  icon: (
                                    <button
                                      type="button"
                                      onClick={removeOrganizer}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </button>
                                  ),
                                },
                              ]
                            : []
                        })()}
                      />
                    ) : (
                      <p className="p-[3%] text-gray-500">
                        {t(`${viewDictionary}.anyOrganizerLabel`)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <DynamicInput
                name="location"
                textId={t(`${viewDictionary}.locationLabel`)}
                type="text"
                value={eventData.location}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="p-[4%] mb-[4vh] rounded-lg sm:w-full">
          <h3 className="mb-[2vh] text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.dateInfoTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-[3vh] md:grid-cols-4">
            <div>
              <DynamicInput
                name="startDate"
                textId={t(`${viewDictionary}.initDateLabel`)}
                type="date"
                value={eventData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <DynamicInput
                name="startTime"
                textId={t(`${viewDictionary}.startTimeLabel`)}
                type="time"
                value={eventData.startTime}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <DynamicInput
                name="endDate"
                textId={t(`${viewDictionary}.endDateLabel`)}
                type="date"
                value={eventData.endDate}
                onChange={handleChange}
              />
            </div>

            <div>
              <DynamicInput
                name="endTime"
                textId={t(`${viewDictionary}.endTimeLabel`)}
                type="time"
                value={eventData.endTime}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="p-[4%] mb-[4vh] rounded-lg sm:w-full">
          <h3 className="mb-[2vh] text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.detailsInfoTitle`)}
          </h3>

          <div className="grid items-center justify-center grid-cols-1 gap-[3vh] justify-items-center md:grid-cols-3">
            <div>
              <DynamicInput
                name="capacity"
                textId={t(`${viewDictionary}.capacityLabel`)}
                type="number"
                value={eventData.capacity}
                onChange={handleChange}
              />
            </div>

            <div>
              <DynamicInput
                name="price"
                textId={t(`${viewDictionary}.priceLabel`)}
                type="number"
                value={eventData.price}
                onChange={handleChange}
              />
            </div>

            <div>
              <DynamicInput
                name="minAge"
                textId={t(`${viewDictionary}.minAgeLabel`)}
                type="number"
                value={eventData.minAge}
                onChange={handleChange}
              />
            </div>

            <div className="flex items-center sm:mr-[5%]">
              <DynamicInput
                name="allowCars"
                textId={t(`${viewDictionary}.allowCarsLabel`)}
                type="checkbox"
                checked={eventData.allowCars}
                onChange={handleChange}
              />
            </div>

            <div className="flex items-center">
              <DynamicInput
                name="hasBar"
                textId={t(`${viewDictionary}.hasBarLabel`)}
                type="checkbox"
                checked={eventData.hasBar}
                onChange={handleChange}
              />
            </div>

            <div className="flex items-center">
              <DynamicInput
                name="needForm"
                textId={t(`${viewDictionary}.needFormLabel`)}
                type="checkbox"
                checked={eventData.needForm}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {eventData.needForm && (
          <div className="p-[4%] mb-[4vh] rounded-lg sm:w-full">
            <h3 className="mb-[2vh] text-lg font-semibold text-gray-700">
              {t(`${viewDictionary}.inscriptionCampsForm`)}
            </h3>
            <div className="grid grid-cols-1 gap-[3vh] sm:grid-cols-2 md:grid-cols-3">
              {createFormFieldsModel().map((field) => (
                <div key={field.fieldId}>
                  <DynamicInput
                    name={`field-${field.fieldId}`}
                    textId={`${t(field.label)} ${field.required ? t(`${viewDictionary}.mandatoryLabel`) : t(`${viewDictionary}.optionalLabel`)}`}
                    type="checkbox"
                    checked={selectedFormFields.includes(field.fieldId)}
                    onChange={() => handleFormFieldToggle(field.fieldId)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-[4%] mb-[4vh] rounded-lg sm:w-full">
          <h3 className="mb-[2vh] text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.galleryInfoTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-[3vh]">
            <div>
              <h4 className="t16r">{t(`${viewDictionary}.addImage`)}</h4>
              <DynamicInput
                name="eventImage"
                type="document"
                onChange={handleFileChange}
              />
              {uploading && <p>Subiendo archivo: {progress}%</p>}
              {progress > 0 && progress < 100 && (
                <div className="mt-[2vh]">
                  <div className="w-full h-[0.5vh] bg-gray-200 rounded-md">
                    <div
                      className="h-[0.5vh] bg-blue-600 rounded-md"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {eventData.imageURL && (
                <div className="mt-[2vh]">
                  <img
                    src={eventData.imageURL}
                    alt="Vista previa del evento"
                    className="object-cover w-full rounded-lg shadow-md aspect-video"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-[4%] mb-[4vh] rounded-lg sm:w-full">
          <h3 className="mb-[2vh] text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.authorizationDocumentTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-[3vh]">
            <div>
              <h4 className="t16r">
                {t(`${viewDictionary}.uploadAutDocument`)}
              </h4>
              <DynamicInput
                name="authDocument"
                type="document"
                onChange={handleAuthDocChange}
              />
              {authDocument && (
                <p className="mt-[2vh] text-sm text-gray-600">
                  Documento seleccionado: {authDocument.name}
                </p>
              )}
              {authDocProgress > 0 && authDocProgress < 100 && (
                <div className="mt-[2vh]">
                  <div className="w-full h-[0.5vh] bg-gray-200 rounded-md">
                    <div
                      className="h-[0.5vh] bg-blue-600 rounded-md"
                      style={{ width: `${authDocProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-[4%] mb-[4vh] rounded-lg sm:w-full">
          <h3 className="mb-[2vh] text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.tagsInfoTitle`)}
          </h3>

          <div>
            <h4 className="mb-[2vh] text-gray-700 t16r">
              {t(`${viewDictionary}.tagsLabel`)}
            </h4>
            <div className="grid grid-cols-2 gap-[3vh] md:grid-cols-4">
              {predefinedTags.map((tag) => (
                <DynamicInput
                  key={tag}
                  name={`tag-${tag}`}
                  textId={`${tag}`}
                  type="radio"
                  checked={eventData.tags.includes(tag)}
                  onChange={() => handleTagChange(tag)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-[4%] mb-[4vh] rounded-lg sm:w-full">
          <h3 className="mb-[2vh] text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.collaboratorsInfoTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-[3vh]">
            <div>
              <DynamicInput
                name="searchCollaborator"
                textId={t(`${viewDictionary}.collaboratorsSearchLabel`)}
                type="text"
                value={collaboratorSearch}
                onChange={(e) => setCollaboratorSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-[3vh] md:grid-cols-2">
              <div className="">
                <h4 className="mb-[2vh] text-gray-700 t16r">
                  {t(`${viewDictionary}.collaboratorsLabel`)}
                </h4>
                <div className="p-[3%] overflow-y-auto max-h-[40vh] text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                  <DynamicItems
                    items={filteredCollaborators.map((collab) => ({
                      title: collab.name,
                      description: collab.role,
                      type: 'eventData',
                      icon: (
                        <button
                          type="button"
                          onClick={() => addCollaboratorToEvent(collab)}
                        >
                          <AddIcon fontSize="small" />
                        </button>
                      ),
                    }))}
                  />
                </div>
              </div>

              <div>
                <h4 className="mb-[2vh] text-gray-700 t16r">
                  {t(`${viewDictionary}.collaboratorsSelectedLabel`)}
                </h4>
                <div className="p-[3%] overflow-y-auto max-h-[40vh] text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                  <DynamicItems
                    items={eventData.collaborators
                      .map((collabId) => {
                        const collaborator = collaborators.find(
                          (collab) => collab.id === collabId
                        )
                        return collaborator
                          ? {
                              title: collaborator.name,
                              description: collaborator.role,
                              type: 'eventData',
                              icon: (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeCollaboratorFromEvent(collabId)
                                  }
                                >
                                  <DeleteIcon fontSize="small" />
                                </button>
                              ),
                            }
                          : null
                      })
                      .filter(Boolean)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-[4%] mb-[4vh] rounded-lg sm:w-full">
          <h3 className="mb-[2vh] text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.participantTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-[3vh]">
            <div>
              <DynamicInput
                name="searchParticipant"
                textId={t(`${viewDictionary}.searchParticipantsLabel`)}
                type="text"
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-[3vh] md:grid-cols-2">
              <div className="">
                <h4 className="mb-[2vh] text-gray-700 t16r">
                  {t(`${viewDictionary}.participantList`)}
                </h4>
                <div className="p-[3%] overflow-y-auto max-h-[40vh] text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                  <DynamicItems
                    items={filteredParticipants.map((participant) => ({
                      title: participant.name,
                      description: participant.email,
                      type: 'eventData',
                      icon: (
                        <button
                          type="button"
                          onClick={() => addParticipantToEvent(participant)}
                        >
                          <AddIcon fontSize="small" />
                        </button>
                      ),
                    }))}
                  />
                </div>
              </div>

              <div>
                <h4 className="mb-[2vh] text-gray-700 t16r">
                  {t(`${viewDictionary}.selectedParticipantsTitle`)}
                </h4>
                <div className="p-[3%] overflow-y-auto max-h-[40vh] text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                  <DynamicItems
                    items={eventData.participants
                      .map((participantId) => {
                        const participant = participants.find(
                          (p) => p.id === participantId
                        )
                        return participant
                          ? {
                              title: participant.name,
                              description: participant.email,
                              type: 'eventData',
                              icon: (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeParticipantFromEvent(participantId)
                                  }
                                >
                                  <DeleteIcon fontSize="small" />
                                </button>
                              ),
                            }
                          : null
                      })
                      .filter(Boolean)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-[3vh] sm:mt-[4vh]">
          <DynamicButton
            type="button"
            onClick={() => navigate('/dashboard')}
            size="small"
            state="normal"
            textId="components.buttons.cancel"
            className="mr-[3vh]"
          />

          <DynamicButton
            type="submit"
            size="small"
            state="normal"
            textId={`${viewDictionary}.submitButton`}
          />
        </div>
      </form>
    </div>
  )
}

export default EventForm
