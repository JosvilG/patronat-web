import React, { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import DynamicButton from '../../components/Buttons'
import DynamicInput from '../../components/Inputs'
import Loader from '../../components/Loader'
import useSlug from '../../hooks/useSlug'

function EventsParticipants() {
  const { t } = useTranslation()
  const { slug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { generateSlug } = useSlug()

  const eventId = location.state?.eventId
  const eventTitle = location.state?.eventTitle

  const [participants, setParticipants] = useState([])
  const [filteredParticipants, setFilteredParticipants] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const viewDictionary = 'pages.events.eventParticipants'

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        setLoading(true)

        let currentEventId = eventId
        if (!currentEventId) {
          const eventsSnapshot = await getDocs(collection(db, 'events'))
          const eventDoc = eventsSnapshot.docs.find(
            (doc) => generateSlug(doc.data().title) === slug
          )

          if (!eventDoc) {
            setError(t(`${viewDictionary}.eventNotFound`))
            setLoading(false)
            return
          }

          currentEventId = eventDoc.id
        }

        const inscriptionsQuery = query(
          collection(db, 'inscriptions'),
          where('eventId', '==', currentEventId)
        )

        const inscriptionsSnapshot = await getDocs(inscriptionsQuery)

        if (inscriptionsSnapshot.empty) {
          setParticipants([])
          setFilteredParticipants([])
          setLoading(false)
          return
        }

        const participantsData = inscriptionsSnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate().toLocaleDateString(),
          }
        })

        setParticipants(participantsData)
        setFilteredParticipants(participantsData)
        setLoading(false)
      } catch (error) {
        setError(t(`${viewDictionary}.loadingError`))
        setLoading(false)
      }
    }

    fetchParticipants()
  }, [eventId, slug, generateSlug, t])

  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase()
    setSearchQuery(query)

    if (query.trim() === '') {
      setFilteredParticipants(participants)
      return
    }

    const filtered = participants.filter((participant) => {
      const responses = participant.responses || {}
      return Object.values(responses).some((value) =>
        value.toString().toLowerCase().includes(query)
      )
    })

    setFilteredParticipants(filtered)
  }

  const updateParticipantStatus = async (participantId, newStatus) => {
    try {
      setIsUpdating(true)

      const participantRef = doc(db, 'inscriptions', participantId)
      await updateDoc(participantRef, {
        status: newStatus,
      })

      const updatedParticipants = participants.map((participant) =>
        participant.id === participantId
          ? { ...participant, status: newStatus }
          : participant
      )

      setParticipants(updatedParticipants)
      setFilteredParticipants(
        searchQuery.trim() === ''
          ? updatedParticipants
          : updatedParticipants.filter((participant) => {
              const responses = participant.responses || {}
              return Object.values(responses).some((value) =>
                value
                  .toString()
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase())
              )
            })
      )

      setIsUpdating(false)
    } catch (error) {
      setIsUpdating(false)
    }
  }

  const handleApprove = (participantId) => {
    updateParticipantStatus(participantId, 'aprobado')
  }

  const handleReject = (participantId) => {
    updateParticipantStatus(participantId, 'rechazado')
  }

  if (loading || isUpdating) {
    return <Loader loading={true} />
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
            textId={t('components.buttons.back')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container px-[4%] py-[4vh] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-[4vh] gap-[2vh]">
        <h1 className="text-xl font-bold sm:text-2xl">
          {t(`${viewDictionary}.title`, { eventTitle: eventTitle || 'Evento' })}
        </h1>
        <DynamicButton
          type="button"
          onClick={() => navigate(-1)}
          size="small"
          state="normal"
          textId={t('components.buttons.back')}
        />
      </div>

      <div className="mb-[4vh]">
        <DynamicInput
          name="search"
          type="text"
          textId={t(`${viewDictionary}.searchPlaceholder`)}
          placeholder={t(`${viewDictionary}.searchPlaceholder`)}
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      {filteredParticipants.length === 0 ? (
        <div className="p-[5%] text-center bg-gray-100 rounded-lg">
          <p className="text-lg text-gray-600">
            {t(`${viewDictionary}.noParticipants`)}
          </p>
        </div>
      ) : (
        <ul className="space-y-[3vh]">
          {filteredParticipants.map((participant) => (
            <li
              key={participant.id}
              className="p-[4%] bg-gray-100 rounded-lg shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-[2vh] gap-[2vh]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-[1vh] sm:gap-[1vw]">
                  <span
                    className={`px-[2%] py-[0.5vh] inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${
                      participant.status === 'pendiente'
                        ? 'bg-yellow-100 text-yellow-800'
                        : participant.status === 'aprobado'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {t(
                      `${viewDictionary}.status${participant.status ? participant.status.charAt(0).toUpperCase() + participant.status.slice(1) : 'Pending'}`
                    )}
                  </span>
                  <span className="text-sm text-gray-500">
                    {t(`${viewDictionary}.dateLabel`)} {participant.createdAt}
                  </span>
                </div>
                <div className="flex gap-[2vw]">
                  {participant.status !== 'aprobado' && (
                    <DynamicButton
                      onClick={() => handleApprove(participant.id)}
                      size="x-small"
                      type="confirm"
                      title={t(`${viewDictionary}.approveButton`)}
                    />
                  )}
                  {participant.status !== 'rechazado' && (
                    <DynamicButton
                      onClick={() => handleReject(participant.id)}
                      size="x-small"
                      type="cancel"
                      title={t(`${viewDictionary}.rejectButton`)}
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-[2vh] mt-[3vh]">
                {participant.responses &&
                  Object.entries(participant.responses).map(([key, value]) => (
                    <div
                      key={key}
                      className="px-[3%] py-[1vh] text-sm bg-white rounded-lg shadow-sm w-full sm:w-auto"
                    >
                      <span className="font-medium">{key}:</span> {value}
                    </div>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default EventsParticipants
