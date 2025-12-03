import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from './../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import DynamicCard from '../../components/Cards'
import DynamicItems from '../../components/Items'
import InstagramIcon from '@mui/icons-material/Instagram'
import FacebookIcon from '@mui/icons-material/Facebook'
import XIcon from '@mui/icons-material/X'
import DynamicButton from '../../components/Buttons'
import useSlug from '../../hooks/useSlug'

const EventPage = () => {
  const { eventName } = useParams()
  const [event, setEvent] = useState(null)
  const [eventId, setEventId] = useState(null)
  const [collaborators, setCollaborators] = useState({})
  const [participants, setParticipants] = useState({})
  const [organizer, setOrganizer] = useState(null)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { generateSlug } = useSlug()
  const viewDictionary = 'pages.events.details'

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'events'))
        const eventDoc = querySnapshot.docs.find(
          (doc) => generateSlug(doc.data().title) === eventName
        )

        if (eventDoc) {
          setEventId(eventDoc.id)

          const eventData = eventDoc.data()
          setEvent(eventData)

          if (eventData.collaborators?.length) {
            fetchCollaborators(eventData.collaborators)
          }

          if (eventData.participants?.length) {
            fetchParticipants(eventData.participants)
          }

          if (eventData.organizer) {
            fetchOrganizer(eventData.organizer)
          }
        } else {
          navigate('/404')
        }
      } catch (error) {
        return
      }
    }

    fetchEvent()
  }, [eventName, navigate, generateSlug])

  const fetchOrganizer = async (organizerId) => {
    try {
      const docRef = doc(db, 'collaborators', organizerId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        setOrganizer({
          id: organizerId,
          url: data.url,
          name: data.name,
          role: data.role || '',
        })
      }
    } catch (error) {
      return
    }
  }

  const fetchCollaborators = async (collaboratorIds) => {
    try {
      const collaboratorsData = {}

      for (const collabId of collaboratorIds) {
        const docRef = doc(db, 'collaborators', collabId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          collaboratorsData[collabId] = { url: data.url, name: data.name }
        }
      }

      setCollaborators(collaboratorsData)
    } catch (error) {
      return
    }
  }

  const fetchParticipants = async (participantsIds) => {
    try {
      const participantsData = {}

      for (const partId of participantsIds) {
        const docRef = doc(db, 'participants', partId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          participantsData[partId] = {
            url: data.url,
            name: data.name,
            desc: data.description,
            twitter: data.twitter,
            instagram: data.instagram,
            facebook: data.facebook,
          }
        }
      }

      setParticipants(participantsData)
    } catch (error) {
      return
    }
  }

  const handleDownloadAuthorization = () => {
    if (event.authDocumentURL) {
      fetch(event.authDocumentURL)
        .then((response) => {
          if (!response.ok) {
            throw new Error(t(`${viewDictionary}.errorChargingDocument`))
          }
          return response.blob()
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          const fileName =
            event.authDocumentURL.split('/').pop().split('?')[0] ||
            `autorizacion_${event.title.toLowerCase().replace(/\s+/g, '_')}.pdf`
          a.download = fileName
          document.body.appendChild(a)
          a.click()

          setTimeout(() => {
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }, 100)
        })
        .catch((error) => {
          throw new Error(t(`${viewDictionary}.errorChargingDocument`))
        })
    }
  }

  const handleRegistration = () => {
    if (eventId) {
      navigate(`/event-participation-form/${generateSlug(event.title)}`, {
        state: { eventId },
      })
    }
  }

  if (!event) {
    return <p className="text-center"></p>
  }

  const eventDataDetails = [
    event.startDate && {
      title: t(`${viewDictionary}.startDate`),
      description: new Date(event.startDate).toLocaleDateString(),
      type: 'eventData',
    },
    event.endDate && {
      title: t(`${viewDictionary}.endDate`),
      description: new Date(event.endDate).toLocaleDateString(),
      type: 'eventData',
    },
    event.startTime && {
      title: t(`${viewDictionary}.startTime`),
      description: event.startTime,
      type: 'eventData',
    },
    event.endTime && {
      title: t(`${viewDictionary}.endTime`),
      description: event.endTime,
      type: 'eventData',
    },
  ].filter(Boolean)

  const eventAccessDetails = [
    event.location && {
      title: t(`${viewDictionary}.location`),
      description: event.location,
      type: 'eventData',
    },
    event.capacity && {
      title: t(`${viewDictionary}.capacity`),
      description: event.capacity,
      type: 'eventData',
    },
    event.minAge && {
      title: t(`${viewDictionary}.minAge`),
      description: t(`${viewDictionary}.yearsLabel`, { years: event.minAge }),
      type: 'eventData',
      extraContent:
        event.minAge <= 15 && event.authDocumentURL ? (
          <div className="mt-2 ml-2">
            <DynamicButton
              size="medium"
              state="normal"
              type="primary"
              textId={t(`${viewDictionary}.downloadPermission`)}
              onClick={handleDownloadAuthorization}
            ></DynamicButton>
          </div>
        ) : null,
    },
  ].filter(Boolean)

  const eventServicesDetails = [
    {
      title: t(`${viewDictionary}.price`),
      description:
        event.price === 0
          ? t(`${viewDictionary}.freeLabel`)
          : `${event.price} €`,
      type: 'eventData',
    },
    event.allowCars === true && {
      title: t(`${viewDictionary}.allowCars`),
      description: t(`${viewDictionary}.yesLabel`),
      type: 'eventData',
    },
    event.hasBar === true && {
      title: t(`${viewDictionary}.hasBar`),
      description: t(`${viewDictionary}.yesLabel`),
      type: 'eventData',
    },
  ].filter(Boolean)

  const hasCollaborators =
    event.collaborators?.length > 0 && Object.keys(collaborators).length > 0

  const hasParticipants =
    event.participants?.length > 0 && Object.keys(participants).length > 0

  const hasDateInfo = eventDataDetails.length > 0

  const hasAccessInfo = eventAccessDetails.length > 0

  const hasServicesInfo = eventServicesDetails.length > 0

  return (
    <div className="h-auto w-[92%] mx-auto pb-[4vh] sm:pb-[6vh]">
      <h1 className="mb-[5vh] sm:mb-[8vh] overflow-hidden text-center sm:t64b t40b whitespace-break-spaces line-clamp-2">
        {event.title}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-[1.5rem] justify-items-center md:justify-items-start">
        <div className="md:col-span-3 w-full max-w-[90vw] md:max-w-full mb-[1.5rem] md:mb-0">
          <DynamicCard
            key={event.eventId}
            type="gallery"
            extraClass="aspect-[3/4] w-full h-auto max-h-[80vh] object-cover"
            imageUrl={event.eventURL || '/placeholder.png'}
          />
        </div>

        <div className="md:col-span-2 w-full max-w-[90vw] md:max-w-full">
          {hasDateInfo && (
            <div className="space-y-[1rem] bg-[#D9D9D9] rounded-[2rem] sm:rounded-[3rem] h-fit w-full mb-[1.5rem] text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
              <h3 className="pt-[1rem] pl-[1.5rem] sm:pl-[2rem] t36b sm:t40b">
                {t(`${viewDictionary}.dateInfoTitle`)}
              </h3>
              <DynamicItems items={eventDataDetails} />
            </div>
          )}

          {hasAccessInfo && (
            <div className="space-y-[1rem] bg-[#D9D9D9] rounded-[2rem] sm:rounded-[3rem] h-fit w-full mb-[1.5rem] text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
              <h3 className="pt-[1rem] pl-[1.5rem] sm:pl-[2rem] t36b sm:t40b">
                {t(`${viewDictionary}.locationInfoTitle`)}
              </h3>
              <DynamicItems items={eventAccessDetails} />
            </div>
          )}

          {hasServicesInfo && (
            <div className="space-y-[1rem] bg-[#D9D9D9] rounded-[2rem] sm:rounded-[3rem] h-fit w-full mb-[1.5rem] text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
              <h3 className="pt-[1rem] pl-[1.5rem] sm:pl-[2rem] t36b sm:t40b">
                {t(`${viewDictionary}.pricesInfoTitle`)}
              </h3>
              <DynamicItems items={eventServicesDetails} />
            </div>
          )}
        </div>
      </div>

      {event.needForm && (
        <div className="flex justify-center my-[2rem]">
          <DynamicButton
            size="large"
            state="primary"
            type="button"
            textId={t(`${viewDictionary}.inscriptionLabel`)}
            onClick={handleRegistration}
          />
        </div>
      )}

      {event.description && (
        <div className="flex flex-col items-center mb-[1.5rem] mt-[1.5rem] p-[1rem] sm:p-[1.5rem] justify-center rounded-lg md:flex-row text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
          <div className="w-full md:w-auto">
            <p className="break-words break-all t18r sm:t20r">
              {event.description}
            </p>
          </div>
        </div>
      )}

      {(organizer || hasCollaborators) && (
        <div className="flex flex-col items-center justify-between p-[1rem] sm:p-[1.5rem] rounded-lg md:flex-row text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
          {organizer && (
            <div className="w-full md:w-auto">
              <p className="mb-[0.75rem] t18b sm:t20b">
                {t(`${viewDictionary}.organizer`)}
              </p>
              <div className="flex items-center gap-[0.75rem]">
                <img
                  src={organizer.url || '/placeholder.png'}
                  alt={`Organizador ${organizer.name}`}
                  className="object-contain w-[4.5rem] h-[4.5rem] sm:w-[6rem] sm:h-[6rem] rounded-full"
                />
              </div>
            </div>
          )}

          {hasCollaborators && (
            <div className="w-full mt-[1.5rem] md:mt-0 sm:w-fit">
              <p className="mb-[0.75rem] t18b sm:t20b">
                {t(`${viewDictionary}.collaborators`)}
              </p>
              <div className="flex flex-wrap items-center gap-[1rem]">
                {event.collaborators?.map((collabId) =>
                  collaborators[collabId] ? (
                    <div
                      key={collabId}
                      className="flex flex-col items-center gap-[0.5rem]"
                    >
                      <img
                        src={collaborators[collabId]?.url || '/placeholder.png'}
                        alt={collaborators[collabId]?.name || 'Colaborador'}
                        className="object-contain w-[4.5rem] h-[4.5rem] sm:w-[6rem] sm:h-[6rem] rounded-full"
                      />
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {hasParticipants && (
        <div className="flex flex-col items-center justify-between p-[1rem] sm:p-[1.5rem] my-[5vh] rounded-lg md:flex-row">
          <div className="w-full text-center">
            <h2 className="t40b sm:t64bl">
              {t(`${viewDictionary}.withParticipation`)}
            </h2>
            <div className="flex flex-col items-center gap-[2rem] my-[5vh] sm:my-[6vh]">
              {event.participants?.map((partId) =>
                participants[partId] ? (
                  <div
                    key={partId}
                    className="flex flex-col items-center justify-start w-full sm:flex-row sm:items-center sm:gap-[1.5rem]"
                  >
                    <img
                      src={participants[partId]?.url || '/placeholder.png'}
                      alt={participants[partId]?.name || 'Participante'}
                      className="object-contain w-[10rem] h-[10rem] sm:w-[16rem] sm:h-[16rem] rounded-full"
                    />
                    <div className="flex flex-col items-start justify-center mt-[1rem] sm:mt-0">
                      <span className="t36b sm:t64bl">
                        {participants[partId]?.name}
                      </span>
                      <p className="text-left t18l sm:t24l w-full max-w-full sm:max-w-[90%] break-words">
                        {participants[partId]?.desc}
                      </p>
                      <div className="flex flex-row items-center justify-center w-full gap-[1rem] mt-[0.75rem] sm:justify-start">
                        {participants[partId]?.twitter && (
                          <a
                            href={
                              participants[partId]?.twitter.startsWith('http')
                                ? participants[partId]?.twitter
                                : `https://twitter.com/${participants[partId]?.twitter.replace('@', '')}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-black transition-colors hover:text-blue-500"
                          >
                            <XIcon fontSize="large" />
                          </a>
                        )}
                        {participants[partId]?.instagram && (
                          <a
                            href={
                              participants[partId]?.instagram.startsWith('http')
                                ? participants[partId]?.instagram
                                : `https://instagram.com/${participants[partId]?.instagram.replace('@', '')}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-black transition-colors hover:text-pink-600"
                          >
                            <InstagramIcon fontSize="large" />
                          </a>
                        )}
                        {participants[partId]?.facebook && (
                          <a
                            href={
                              participants[partId]?.facebook.startsWith('http')
                                ? participants[partId]?.facebook
                                : `https://facebook.com/${participants[partId]?.facebook}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-black transition-colors hover:text-blue-700"
                          >
                            <FacebookIcon fontSize="large" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventPage
