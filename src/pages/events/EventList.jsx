import React, { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import useSlug from '../../hooks/useSlug'
import { showPopup } from '../../services/popupService'

function EventList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const viewDictionary = 'pages.events.fullListEvents'
  const { generateSlug } = useSlug()

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'events'))
        const eventData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setEvents(eventData)
        setFilteredEvents(eventData)
      } catch (error) {
        return
      }
    }

    fetchEvents()
  }, [])

  const handleSearchChange = (event) => {
    const query = event.target.value
    setSearchQuery(query)

    const normalizedQuery = query.toLowerCase().trim()

    const filtered = events.filter((event) => {
      if (!event.title) return false

      return event.title.toLowerCase().includes(normalizedQuery)
    })

    setFilteredEvents(filtered)
  }

  const handleDelete = async (id) => {
    try {
      showPopup({
        title: t(`${viewDictionary}.deleteConfirmTitle`),
        text: t(`${viewDictionary}.deleteConfirmText`),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#8be484',
        cancelButtonColor: '#a3a3a3',
        confirmButtonText: t(`${viewDictionary}.deleteConfirmButton`),
        cancelButtonText: t('components.buttons.cancel'),
        onConfirm: async () => {
          try {
            const inscriptionsQuery = query(
              collection(db, 'inscriptions'),
              where('eventId', '==', id)
            )

            const inscriptionsSnapshot = await getDocs(inscriptionsQuery)

            const deletePromises = inscriptionsSnapshot.docs.map(
              (inscriptionDoc) =>
                deleteDoc(doc(db, 'inscriptions', inscriptionDoc.id))
            )

            await Promise.all(deletePromises)

            await deleteDoc(doc(db, 'events', id))

            const updatedEvents = events.filter((event) => event.id !== id)
            setEvents(updatedEvents)
            setFilteredEvents(updatedEvents)

            showPopup({
              title: t(`${viewDictionary}.deleteSuccessTitle`),
              text: t(`${viewDictionary}.deleteSuccessText`),
              icon: 'success',
            })
          } catch (error) {
            showPopup({
              title: t(`${viewDictionary}.deleteErrorTitle`),
              text: t(`${viewDictionary}.deleteErrorText`),
              icon: 'error',
            })
          }
        },
      })
    } catch (error) {
      // Error al mostrar el diálogo de confirmación
    }
  }

  return (
    <div className="flex flex-col items-center w-[92%] mx-auto pb-[4vh] sm:w-full md:w-auto sm:flex-none">
      <h1 className="mb-[4vh] text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`)}
      </h1>
      <div className="grid items-center justify-start grid-cols-1 gap-[3vh] mb-[4vh] w-full md:justify-items-end sm:grid-cols-2 sm:justify-between">
        <DynamicInput
          name="search"
          type="text"
          textId={t(`${viewDictionary}.searchPlaceholder`)}
          placeholder={t(`${viewDictionary}.searchPlaceholder`)}
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <div className="pl-0 sm:pl-[5%] md:pl-[10%] flex justify-center sm:justify-end">
          <DynamicButton
            onClick={() => navigate(`/new-event/`)}
            size="small"
            state="normal"
            type="add"
            textId={t(`${viewDictionary}.addNewButton`)}
          />
        </div>
      </div>
      <ul className="w-full space-y-[3vh]">
        {filteredEvents.map((event) => (
          <li
            key={event.id}
            className="flex flex-col sm:flex-row items-center justify-between p-[4%] sm:p-[2%] space-y-[2vh] sm:space-y-0 sm:space-x-[2%] bg-gray-100 rounded-lg shadow"
          >
            <div className="flex items-center space-x-[3%] w-full">
              <div className="w-[15vw] h-[15vw] max-w-16 max-h-16 min-w-10 min-h-10">
                <img
                  src={event.eventURL}
                  alt={event.title}
                  className="object-cover w-full h-full rounded-full"
                />
              </div>
              <span className="text-lg font-semibold truncate max-w-[65%] sm:max-w-none">
                {event.title}
              </span>
            </div>

            <div className="flex space-x-[2vw] mt-[2vh] sm:mt-0">
              <DynamicButton
                onClick={() => {
                  const slug = generateSlug(event.title)

                  navigate(`/edit-event/${slug}`, {
                    state: { eventId: event.id },
                  })
                }}
                size="x-small"
                state="normal"
                type="edit"
              />

              {event.needForm === true && (
                <DynamicButton
                  onClick={() => {
                    const slug = generateSlug(event.title)
                    navigate(`/event-participants/${slug}`, {
                      state: { eventId: event.id, eventTitle: event.title },
                    })
                  }}
                  size="x-small"
                  type="view"
                  title="Ver participantes"
                />
              )}

              <DynamicButton
                onClick={() => handleDelete(event.id)}
                size="x-small"
                type="delete"
                title="Eliminar evento"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default EventList
