import React, { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  Timestamp,
} from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../../firebase/firebase'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import Loader from '../../components/Loader'
import useSlug from '../../hooks/useSlug'
import { showPopup } from '../../services/popupService'
import { AuthContext } from '../../contexts/AuthContext'

function EventParticipationForm() {
  const { t } = useTranslation()
  const { eventSlug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { generateSlug } = useSlug()
  const eventIdFromState = location.state?.eventId
  const [eventId, setEventId] = useState(eventIdFromState || null)
  const [eventData, setEventData] = useState(null)
  const [formFields, setFormFields] = useState([])
  const [formValues, setFormValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const viewDictionary = 'pages.events.eventParticipationForm'
  const { user } = useContext(AuthContext)

  useEffect(() => {
    const fetchEventAndForm = async () => {
      try {
        let currentEventId = eventId

        if (!currentEventId) {
          const eventsSnapshot = await getDocs(collection(db, 'events'))
          const eventDoc = eventsSnapshot.docs.find(
            (doc) => generateSlug(doc.data().title) === eventSlug
          )

          if (!eventDoc) {
            setError(t(`${viewDictionary}.notFoundError`))
            setLoading(false)
            return
          }

          currentEventId = eventDoc.id
          setEventId(currentEventId)
        }

        const eventRef = doc(db, 'events', currentEventId)
        const eventDoc = await getDoc(eventRef)

        if (!eventDoc.exists()) {
          setError(t(`${viewDictionary}.notFoundError`))
          setLoading(false)
          return
        }
        const event = eventDoc.data()
        setEventData(event)

        if (!event.needForm) {
          setError(t(`${viewDictionary}.noFormError`))
          setLoading(false)
          return
        }

        // Verificar si el evento tiene formFieldsIds
        if (!event.formFieldsIds || event.formFieldsIds.length === 0) {
          setError(t(`${viewDictionary}.noFormFieldsError`))
          setLoading(false)
          return
        }

        // Generar los campos del formulario basándose en los IDs del array formFieldsIds
        const fieldsArray = event.formFieldsIds.map((fieldId, index) => {
          // Configuración básica para cada campo
          let fieldConfig = {
            id: fieldId,
            fieldId: fieldId,
            label: fieldId, // Puedes cambiar esto por traducciones específicas
            required: true,
            order: index,
          }

          // Configuraciones específicas por tipo de campo
          switch (fieldId) {
            case 'nombre':
              fieldConfig = { ...fieldConfig, type: 'text', label: 'Nombre' }
              break
            case 'tematica':
              fieldConfig = { ...fieldConfig, type: 'text', label: 'Temática' }
              break
            case 'responsable1':
              fieldConfig = {
                ...fieldConfig,
                type: 'text',
                label: 'Responsable 1',
              }
              break
            case 'responsable2':
              fieldConfig = {
                ...fieldConfig,
                type: 'text',
                label: 'Responsable 2',
              }
              break
            case 'dni1':
              fieldConfig = {
                ...fieldConfig,
                type: 'text',
                label: 'DNI Responsable 1',
              }
              break
            case 'dni2':
              fieldConfig = {
                ...fieldConfig,
                type: 'text',
                label: 'DNI Responsable 2',
              }
              break
            case 'telefono1':
              fieldConfig = {
                ...fieldConfig,
                type: 'phone',
                label: 'Teléfono 1',
              }
              break
            case 'telefono2':
              fieldConfig = {
                ...fieldConfig,
                type: 'phone',
                label: 'Teléfono 2',
              }
              break
            case 'ubicacion':
              fieldConfig = { ...fieldConfig, type: 'text', label: 'Ubicación' }
              break
            default:
              fieldConfig = { ...fieldConfig, type: 'text', label: fieldId }
          }

          return fieldConfig
        })

        setFormFields(fieldsArray)

        const initialValues = {}
        fieldsArray.forEach((field) => {
          initialValues[field.fieldId] = ''
        })
        setFormValues(initialValues)

        setLoading(false)
      } catch (error) {
        setError(t(`${viewDictionary}.loadingError`))
        setLoading(false)
      }
    }

    fetchEventAndForm()
  }, [eventSlug, eventId, generateSlug, t])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const requiredFields = formFields.filter((field) => field.required)
      const missingFields = requiredFields.filter(
        (field) => !formValues[field.fieldId]
      )

      if (missingFields.length > 0) {
        await showPopup({
          title: t(`${viewDictionary}.incompleteFieldsTitle`),
          text: `<div>${t(`${viewDictionary}.incompleteFieldsText`)}<br/>
          ${missingFields.map((field) => `- ${field.label}`).join('<br/>')}</div>`,
          icon: 'warning',
          confirmButtonText: t('components.buttons.accept'),
          confirmButtonColor: '#8be484',
        })
        setSubmitting(false)
        return
      }

      const inscriptionData = {
        eventId,
        eventTitle: eventData.title,
        eventSlug,
        responses: { ...formValues },
        createdAt: Timestamp.now(),
        status: 'pendiente',
        submitBy: user ? user.uid : null,
      }

      await addDoc(collection(db, 'inscriptions'), inscriptionData)

      await showPopup({
        title: t(`${viewDictionary}.successTitle`),
        text: t(`${viewDictionary}.successText`),
        icon: 'success',
        confirmButtonText: t('components.buttons.accept'),
        confirmButtonColor: '#8be484',
        onConfirm: () => {
          navigate(`/event/${eventSlug}`)
        },
      })
    } catch (error) {
      await showPopup({
        title: t(`${viewDictionary}.errorTitle`),
        text: t(`${viewDictionary}.errorText`),
        icon: 'error',
        confirmButtonText: t('components.buttons.close'),
        confirmButtonColor: '#f87171',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="container px-[4%] py-[5vh] mx-auto sm:py-[8vh] md:py-[10vh]">
        <div className="max-w-3xl mx-auto text-center bg-white bg-opacity-75 backdrop-blur-lg backdrop-saturate-[180%] rounded-xl sm:rounded-2xl p-[1rem] sm:p-[1.5rem] md:p-[2rem] shadow-lg flex flex-col items-center">
          <h2 className="mb-[1rem] text-xl font-bold text-gray-800 sm:mb-[1.5rem] sm:text-2xl md:text-3xl">
            {t('common.authRequiredEvents.title')}
          </h2>

          <div className="mb-[1rem] text-base sm:mb-[2rem] sm:text-lg">
            <p className="mb-[0.5rem] sm:mb-[1rem]">
              {t('common.authRequiredEvents.text')}
            </p>
            <p>{t('common.authRequiredEvents.eventViewInfo')}</p>
          </div>

          <div className="flex flex-col justify-center w-full space-y-[1rem] sm:w-auto sm:flex-row sm:space-y-0 sm:space-x-[1rem] md:space-x-[1.5rem]">
            <DynamicButton
              type="personAdd"
              size="medium"
              state="normal"
              textId={t('common.register')}
              onClick={() => navigate('/register')}
            />

            <DynamicButton
              type="submit"
              size="medium"
              state="highlighted"
              textId={t('common.login')}
              onClick={() => navigate('/login')}
            />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container px-[4%] py-[5vh] mx-auto text-center">
        <h2 className="text-2xl font-bold text-red-600">{error}</h2>
        <div className="mt-[3vh]">
          <DynamicButton
            type="button"
            onClick={() => navigate(-1)}
            size="small"
            state="normal"
            textId={t('components.buttons.close')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container px-[4%] pb-[4vh] mx-auto">
      <Loader loading={submitting} />

      <form onSubmit={handleSubmit} className="mx-auto space-y-[4vh]">
        <h1 className="mb-[4vh] text-center sm:t64b t40b">
          {t(`${viewDictionary}.title`, { eventTitle: eventData?.title })}
        </h1>
        <div className="p-[4%] mb-[4vh] rounded-lg backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
          <div className="grid grid-cols-1 gap-[3vh] md:grid-cols-2">
            {formFields.map((field) => (
              <div
                key={field.id}
                className={field.type === 'textarea' ? 'md:col-span-2' : ''}
              >
                <DynamicInput
                  name={field.fieldId}
                  textId={field.label}
                  type={field.type}
                  value={formValues[field.fieldId]}
                  onChange={handleChange}
                  required={field.required}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-[4vh] gap-[3vw]">
          <DynamicButton
            type="button"
            onClick={() => navigate(-1)}
            size="small"
            state="normal"
            textId={t('components.buttons.cancel')}
          />

          <DynamicButton
            type="submit"
            size="small"
            state={submitting ? 'disabled' : 'normal'}
            textId={
              submitting
                ? `${viewDictionary}.submittingText`
                : `${viewDictionary}.submitButton`
            }
            disabled={submitting}
          />
        </div>
      </form>
    </div>
  )
}

export default EventParticipationForm
