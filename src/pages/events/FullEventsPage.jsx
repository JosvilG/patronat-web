import React, { useState, useEffect } from 'react'
import useEvents from '../../hooks/useEvents'
import DynamicCard from '../../components/Cards'
import DynamicInput from '../../components/Inputs'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const FullEventsPage = () => {
  const { events, error } = useEvents()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredEvents, setFilteredEvents] = useState([])
  const viewDictionary = 'pages.events.fullListEvents'

  useEffect(() => {
    setFilteredEvents(events)
  }, [events])

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen px-[4%] text-center">
        <p className="font-medium text-red-600">
          {t(`${viewDictionary}.errorLoadingEvents`)}
        </p>
      </div>
    )
  }

  const handleEventClick = (event) => {
    navigate(`/event/${event.title.toLowerCase().replace(/ /g, '-')}`)
  }

  const handleSearchChange = (event) => {
    const query = event.target.value.toLowerCase()
    setSearchQuery(query)

    const filtered = events.filter(
      (event) =>
        (event.title && event.title.toLowerCase().includes(query)) ||
        (event.description &&
          event.description.toLowerCase().includes(query)) ||
        (event.location && event.location.toLowerCase().includes(query))
    )

    setFilteredEvents(filtered)
  }

  return (
    <div className="container flex flex-col items-center px-[4%] pb-[4vh] mx-auto min-h-dvh sm:flex-none">
      <h1 className="mb-[4vh] text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`)}
      </h1>

      <div className="w-full max-w-md mx-auto mb-[5vh]">
        <DynamicInput
          name="search"
          type="text"
          placeholder={t(`${viewDictionary}.searchPlaceholder`)}
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>
      <div className="grid grid-cols-1 gap-[3vh] sm:grid-cols-2 lg:grid-cols-3 w-[92%] sm:w-auto">
        {filteredEvents.map((event) => {
          return (
            <div
              key={event.eventId}
              onClick={() => handleEventClick(event)}
              className="cursor-pointer"
            >
              <DynamicCard
                type="event"
                title={event.title}
                description={event.description}
                date={new Date(event.start).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
                imageUrl={event.eventURL ? event.eventURL : '/placeholder.png'}
                link={`/event/${event.title.toLowerCase().replace(/ /g, '-')}`}
              />
            </div>
          )
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="w-full text-center py-[5vh]">
          <p className="t16r">{t(`${viewDictionary}.noEvents`)}</p>
        </div>
      )}
    </div>
  )
}

export default FullEventsPage
