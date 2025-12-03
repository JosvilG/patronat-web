import React, { useEffect, useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
// Importar los locales que necesites
import caLocale from '@fullcalendar/core/locales/ca'
import esLocale from '@fullcalendar/core/locales/es'
import enLocale from '@fullcalendar/core/locales/en-gb'
import useEvents from '../hooks/useEvents'
import { useNavigate } from 'react-router-dom'
import { showPopup } from '../services/popupService'
import { useTranslation } from 'react-i18next'
import tagColors from '../models/tagColors'
import useSlug from '../hooks/useSlug'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'

const buildPopupText = (eventData, t) => {
  const startDate = new Date(eventData.start).toLocaleString()
  const endDate = eventData.end
    ? `${t('pages.events.details.popupEndDate')} ${new Date(eventData.end).toLocaleString()}`
    : ''
  return `
    ${t('pages.events.details.popupText')}${eventData.description}
    ${t('pages.events.details.popupInitDate')} ${startDate}
    ${endDate}
    ${eventData.location ? t(`pages.events.details.popupUbication`, { location: eventData.location }) : ''}
    ${eventData.type === 'game' ? `Temporada: ${eventData.season || ''}` : ''}
    ${eventData.type === 'game' ? `Mínimo participantes: ${eventData.minParticipants || ''}` : ''}
    ${eventData.type === 'game' ? `Puntuación: ${eventData.score || ''}` : ''}
  `
}

const getEventClassNames = (eventTags = [], eventType = 'event') => {
  return `bg-transparent border-0 shadow-none text-gray-800 p-0.5 text-xs`
}

const Calendar = () => {
  const { events } = useEvents()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { generateSlug } = useSlug()
  const [games, setGames] = useState([])
  const [allCalendarEvents, setAllCalendarEvents] = useState([])
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const calendarRef = useRef(null)
  const [currentView, setCurrentView] = useState('dayGridMonth')

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const gamesCollection = collection(db, 'games')
        const gamesSnapshot = await getDocs(gamesCollection)
        const gamesList = gamesSnapshot.docs.map((doc) => {
          const gameData = doc.data()
          return {
            id: doc.id,
            title: gameData.name,
            start: `${gameData.date}T${gameData.time || '00:00:00'}`,
            description: gameData.description,
            location: gameData.location,
            minParticipants: gameData.minParticipants,
            score: gameData.score,
            season: gameData.season,
            status: gameData.status,
            type: 'game',
            extendedProps: {
              type: 'game',
              gameId: doc.id,
              location: gameData.location,
              minParticipants: gameData.minParticipants,
              score: gameData.score,
              season: gameData.season,
              status: gameData.status,
            },
          }
        })
        setGames(gamesList)
      } catch (error) {
        return
      }
    }

    fetchGames()
  }, [])

  useEffect(() => {
    const combinedEvents = [
      ...events.map((event) => ({
        ...event,
        type: 'event',
        extendedProps: {
          ...event.extendedProps,
          type: 'event',
        },
      })),
      ...games,
    ]
    setAllCalendarEvents(combinedEvents)
  }, [events, games])

  const handleEventClick = (info) => {
    const { title, start, end, extendedProps = {} } = info.event
    const isGame = extendedProps.type === 'game'

    const eventData = {
      title,
      description: extendedProps?.description || 'Sin descripción',
      start,
      end,
      tags: extendedProps?.tags || [],
      eventId: extendedProps?.eventId || extendedProps?.gameId || 'Sin ID',
      type: extendedProps?.type || 'event',
      location: extendedProps?.location,
      season: extendedProps?.season,
      minParticipants: extendedProps?.minParticipants,
      score: extendedProps?.score,
      status: extendedProps?.status,
    }

    showPopup({
      title: `${eventData.title} `,
      text: buildPopupText(eventData, t),
      icon: 'info',
      showCancelButton: false,
      cancelButtonText: t('components.buttons.cancel'),
      customClass: {
        popup: 'bg-white rounded-lg shadow-xl p-3 sm:p-6',
        title: 'text-lg sm:text-xl font-semibold text-gray-800',
        content: 'text-sm sm:text-base text-gray-700',
        confirmButton:
          'bg-blue-500 text-white rounded-lg py-1 px-3 sm:py-2 sm:px-4 hover:bg-blue-600',
        cancelButton:
          'bg-gray-300 text-gray-700 rounded-lg py-1 px-3 sm:py-2 sm:px-4 hover:bg-gray-400',
      },
      onConfirm: () => {
        if (!isGame) {
          const eventSlug = generateSlug(eventData.title)
          navigate(`/event/${eventSlug}`)
        }
      },
    })
  }

  const isMobile = windowWidth < 640

  const headerToolbar = isMobile
    ? {
        left: 'prev,next',
        center: 'title',
        right: '',
      }
    : {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek,dayGridDay',
      }

  const initialView = isMobile ? 'dayGridDay' : 'dayGridMonth'

  const goBackView = () => {
    if (calendarRef.current && !isMobile) {
      const calendarApi = calendarRef.current.getApi()

      if (currentView === 'dayGridDay') {
        calendarApi.changeView('dayGridWeek')
        setCurrentView('dayGridWeek')
      } else if (currentView === 'dayGridWeek') {
        calendarApi.changeView('dayGridMonth')
        setCurrentView('dayGridMonth')
      }
    }
  }

  // Función para obtener el locale correcto según el idioma actual
  const getLocale = () => {
    switch (i18n.language) {
      case 'ca':
        return caLocale
      case 'es':
        return esLocale
      case 'en':
        return enLocale
      default:
        return caLocale // Por defecto catalán
    }
  }

  return (
    <div className="w-full max-w-5xl p-2 sm:p-6 mx-auto my-4 sm:my-8 bg-white backdrop-blur-[17px] bg-[rgba(255,255,255,0.4)] rounded-xl shadow-lg overflow-hidden">
      <h2 className="mb-2 text-gray-800 sm:mb-4 t20b sm:t24b">
        {t('components.calendar.title')}
      </h2>
      {!isMobile && currentView === 'dayGridDay' && (
        <div className="mb-2">
          <button
            onClick={goBackView}
            className="px-3 py-1 text-sm text-blue-600 transition-colors rounded-lg bg-blue-50 hover:bg-blue-100"
          >
            ← {t('components.calendar.week')}
          </button>
        </div>
      )}
      <div className="calendar-container">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView={initialView}
          locale={getLocale()} // Usar locale dinámico
          events={allCalendarEvents}
          eventClick={handleEventClick}
          headerToolbar={headerToolbar}
          buttonText={{
            today: t('components.calendar.today'),
            month: t('components.calendar.month'),
            week: t('components.calendar.week'),
            day: t('components.calendar.day'),
          }}
          viewDidMount={(view) => {
            setCurrentView(view.view.type)
          }}
          contentHeight="auto"
          dayCellClassNames="border-gray-200"
          dateClick={() => {}}
          dayPopoverFormat={false}
          eventClassNames={({ event }) => {
            const eventType = event.extendedProps?.type || 'event'
            return getEventClassNames(
              event.extendedProps?.tags || [],
              eventType
            )
          }}
          eventContent={(eventInfo) => {
            const eventType = eventInfo.event.extendedProps?.type || 'event'
            const eventTags = eventInfo.event.extendedProps?.tags || []

            let dotColor = 'bg-[#D9D9D9]'

            if (eventType === 'game') {
              dotColor = 'bg-[#3498db]'
            } else {
              for (const tag of eventTags) {
                if (tagColors?.[tag]) {
                  const tagStyle = tagColors[tag]
                  const bgStyleMatch = tagStyle.match(/bg-[a-z0-9-\[\]#]+/)
                  if (bgStyleMatch) {
                    dotColor = bgStyleMatch[0]
                    break
                  }
                }
              }
            }
            return (
              <div className="flex items-start space-x-1 px-1 py-0.5 max-w-full overflow-hidden">
                <div
                  className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full mt-0.5 flex-shrink-0 ${dotColor}`}
                ></div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-xs font-normal leading-tight text-gray-800">
                    <span className="block max-w-full truncate">
                      {eventInfo.event.title}
                    </span>
                  </div>
                </div>
              </div>
            )
          }}
          views={{
            dayGridMonth: {
              dayMaxEvents: false,
              dayMaxEventRows: false,
              dayPopoverFormat: false,
            },
            dayGridWeek: {
              dayMaxEvents: false,
              dayMaxEventRows: false,
              dayPopoverFormat: false,
            },
            dayGridDay: {
              dayMaxEvents: false,
              dayMaxEventRows: false,
            },
          }}
        />
      </div>
      <div className="pt-3 mt-3 border-t sm:pt-4 sm:mt-6">
        <h3 className="mb-1 text-xs font-medium sm:mb-2 sm:text-sm">
          {t('components.calendar.legend')}
        </h3>
        <div className="grid grid-cols-2 gap-1 sm:gap-2 md:grid-cols-4">
          <div className="col-span-2 mt-1 mb-0.5 sm:mb-1 md:col-span-4">
            <h4 className="text-xs font-medium text-gray-700">
              {t('components.calendar.categories')}
            </h4>
          </div>

          {/* Leyenda más compacta para móviles */}
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 mr-1 bg-red-100 rounded-full sm:w-3 sm:h-3 sm:mr-2"></span>
            <span className="text-xs">{t('components.calendar.FMRLabel')}</span>
          </div>
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 mr-1 bg-blue-100 rounded-full sm:w-3 sm:h-3 sm:mr-2"></span>
            <span className="text-xs">
              {t('components.calendar.ChristmasLabel')}
            </span>
          </div>
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 mr-1 bg-yellow-100 rounded-full sm:w-3 sm:h-3 sm:mr-2"></span>
            <span className="text-xs">
              {t('components.calendar.SantosLabel')}
            </span>
          </div>
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 mr-1 bg-green-100 rounded-full sm:w-3 sm:h-3 sm:mr-2"></span>
            <span className="text-xs">
              {t('components.calendar.RabalLabel')}
            </span>
          </div>
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 mr-1 bg-orange-100 rounded-full sm:w-3 sm:h-3 sm:mr-2"></span>
            <span className="text-xs">
              {t('components.calendar.FestivalLabel')}
            </span>
          </div>
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 mr-1 bg-purple-100 rounded-full sm:w-3 sm:h-3 sm:mr-2"></span>
            <span className="text-xs">
              {t('components.calendar.MeetingLabel')}
            </span>
          </div>
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 mr-1 bg-gray-100 rounded-full sm:w-3 sm:h-3 sm:mr-2"></span>
            <span className="text-xs">
              {t('components.calendar.OtherLabel')}
            </span>
          </div>
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 sm:w-3 sm:h-3 mr-1 sm:mr-2 bg-[#3498db] rounded-full"></span>
            <span className="text-xs">
              {t('components.calendar.PruebasLabel')}
            </span>
          </div>
        </div>
      </div>{' '}
      {/* Estilos para dispositivos móviles */}
      <style>{`
        @media (max-width: 640px) {
          .fc .fc-toolbar-title {
            font-size: 1.2em; 
          }
          .fc .fc-button {
            padding: 0.4em 0.6em;
            font-size: 0.9em;
          }
          .fc .fc-col-header-cell-cushion {
            padding: 8px;
            font-size: 0.85em;
          }
          .fc .fc-daygrid-day-number {
            padding: 6px;
            font-size: 0.9em;
          }
          .fc .fc-daygrid-day-frame {
            min-height: auto; 
          }
          
          .fc .fc-event {
            max-height: 24px !important;
            font-size: 0.8em !important; 
          }
          
          .fc .fc-event-main {
            padding: 3px 4px !important;
          }
          
          .fc .fc-event .text-xs {
            font-size: 0.75em !important; 
          }
          
          .fc-dayGridDay-view .fc-event {
            max-height: 28px !important;
            font-size: 0.85em !important;
          }
          
          .fc-dayGridDay-view .fc-event-main {
            padding: 4px 6px !important;
          }
        }
        
        @media (min-width: 641px) {
          .fc .fc-daygrid-day-frame {
            min-height: 140px;
          }
        }
        
        .fc .fc-more-link {
          display: none !important;
        }
        
        .fc .fc-popover {
          display: none !important;
        }
        
        .fc .fc-more-popover {
          display: none !important;
        }
        
        .fc .fc-daygrid-event-harness-abs {
          position: relative !important;
          right: auto !important;
          left: auto !important;
          top: auto !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        
        .fc .fc-daygrid-block-event {
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }
        
        .fc .fc-h-event {
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }
        
        .fc .fc-event {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          max-width: 100% !important;
          width: 100% !important;
          margin-bottom: 1px !important;
          height: auto !important;
          max-height: 18px !important;
          line-height: 1.2 !important;
        }
        
        .fc .fc-event-title {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          line-height: 1.2 !important;
        }
        
        .fc .fc-daygrid-event {
          margin: 0.5px 0 !important;
          overflow: hidden !important;
          max-height: 18px !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        
        .fc .fc-daygrid-event-harness {
          overflow: hidden !important;
          max-height: 18px !important;
          width: 100% !important;
          max-width: 100% !important;
          position: relative !important;
        }
        
        .fc .fc-event-main {
          overflow: hidden !important;
          max-height: 18px !important;
          padding: 1px 2px !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        
        .fc .fc-event .flex {
          max-width: 100% !important;
          width: 100% !important;
        }
        
        .fc .fc-event .flex-1 {
          max-width: calc(100% - 20px) !important;
          min-width: 0 !important;
        }
        
        .fc .fc-event .truncate {
          max-width: 100% !important;
          width: 100% !important;
        }
        
        .fc .fc-daygrid-day-events {
          margin-bottom: 2px !important;
          overflow: visible !important;
          max-height: none !important;
        }
        
        .fc .fc-daygrid-day-bottom {
          margin-top: 2px !important;
        }
        
        .fc .fc-daygrid-day {
          overflow: visible !important;
          position: relative !important;
        }
        
        .fc .fc-daygrid-day-top {
          flex-shrink: 0 !important;
          margin-bottom: 2px !important;
        }
        
        .fc .fc-event-main-frame {
          padding: 1px 2px !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }
        
        .fc .fc-event .fc-event-main .fc-event-main-frame .fc-event-title-container .fc-event-title {
          font-size: 0.7em !important;
          line-height: 1.2 !important;
          padding: 0px 1px !important;
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        
        .fc .fc-daygrid-event-harness .fc-event {
          min-height: 16px !important;
          height: auto !important;
          max-width: 100% !important;
        }
        
        .fc .fc-event-main-frame {
          min-height: 16px !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }
        
        .fc .fc-daygrid-block-event .fc-event-main {
          max-width: 100% !important;
          overflow: hidden !important;
        }
        
        .fc .fc-h-event .fc-event-main {
          max-width: 100% !important;
          overflow: hidden !important;
        }
      `}</style>
    </div>
  )
}

export default Calendar
