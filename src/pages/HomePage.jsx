import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import DynamicCard from './../components/Cards'
import useEvents from '../hooks/useEvents'
import Calendar from '../components/Calendar'
import { useTranslation } from 'react-i18next'
import useGallery from '../hooks/useGallery'
import { Link, useNavigate } from 'react-router-dom'
import { Trans } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'

import patronatLogo from '../assets/logos/Patronat_50_color.png'
import Loader from '../components/Loader'

function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    galleryImages,
    loadingGallery,
    currentGalleryIndex,
    handleGalleryNext,
    handleGalleryPrev,
  } = useGallery()
  const { events, loading: loadingEvents, handleEventClick } = useEvents()

  const upcomingEvents = events
    .filter((event) => {
      const eventStartDate = new Date(event.start)
      const eventEndDate = event.end ? new Date(event.end) : null
      const now = new Date()

      const isSameDay =
        eventStartDate.getDate() === now.getDate() &&
        eventStartDate.getMonth() === now.getMonth() &&
        eventStartDate.getFullYear() === now.getFullYear()

      const isActive =
        eventEndDate && now >= eventStartDate && now <= eventEndDate
      const isFuture = eventStartDate >= now

      return isSameDay || isActive || isFuture
    })
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 3)

  return (
    <div className="flex flex-col items-center px-4 bg-transparent min-h-dvh ">
      <HeroSection t={t} logoSrc={patronatLogo} />
      <AboutSection t={t} />
      <GallerySection
        t={t}
        galleryImages={galleryImages}
        loadingGallery={loadingGallery}
        currentGalleryIndex={currentGalleryIndex}
        onNext={handleGalleryNext}
        onPrev={handleGalleryPrev}
      />
      <EventsSection
        t={t}
        events={upcomingEvents}
        loadingEvents={loadingEvents}
        onEventClick={(arg) => {
          handleEventClick(arg)
          const slug = arg.event.extendedProps.title
            .toLowerCase()
            .replace(/ /g, '-')
          navigate(`/event/${slug}`)
        }}
      />
      <Calendar />
      <WantToParticipateSection t={t} />
    </div>
  )
}

const HeroSection = ({ logoSrc }) => (
  <section className="relative top-0 h-[90vh] min-h-[500px] -mt-4 sm:-mt-16 sm:mb-[5vh] mb-0 bg-transparent max-w-full sm:max-w-none">
    <div className="absolute inset-0 flex items-center justify-center">
      <img
        src={logoSrc}
        alt="Patronat 50 Aniversari"
        className="absolute w-full h-auto -z-10 opacity-5 top-[2%] left-[2%]"
      />
    </div>
    <div className="absolute inset-0 bg-transparent" />
    <div className="relative flex flex-col justify-between h-full">
      <p className="w-auto pt-[10vh] font-bold text-black t36l text-9xl">
        <Trans i18nKey="pages.home.heroSection.description" />
      </p>
      <div className="pb-[5vh] sm:pb-0">
        <p className="font-bold text-black sm:t64xl t40l text-9xl text-end">
          <Trans
            i18nKey="pages.home.heroSection.title"
            components={{ br: <br /> }}
          />
        </p>
        <p className="font-bold sm:t92b t64b text-9xl text-end text-[#15642E]">
          <Trans i18nKey="pages.home.heroSection.roquetesTitle" />
        </p>
      </div>
    </div>
  </section>
)

const GallerySection = ({
  t,
  galleryImages,
  loadingGallery,
  currentGalleryIndex,
  onNext,
  onPrev,
}) => {
  const [isChanging, setIsChanging] = useState(false)

  const handlePrev = () => {
    if (!isChanging) {
      setIsChanging(true)
      onPrev()
      setTimeout(() => setIsChanging(false), 500)
    }
  }

  const handleNext = () => {
    if (!isChanging) {
      setIsChanging(true)
      onNext()
      setTimeout(() => setIsChanging(false), 500)
    }
  }

  useEffect(() => {
    if (galleryImages.length > 0) {
      galleryImages.forEach((image) => {
        const img = new Image()
        img.src = image.url
      })
    }
  }, [galleryImages])

  return (
    <section className="w-full py-16 pt-8 overflow-hidden bg-transparent">
      <h2 className="mb-6 text-right sm:t64s t40s">
        <a href="/gallery">{t('pages.home.gallerySection.title')}</a>
      </h2>
      {loadingGallery ? (
        <div className="flex items-center justify-center"></div>
      ) : galleryImages.length >= 3 ? (
        <div className="relative">
          <div className="flex justify-center overflow-hidden">
            <div className="w-full sm:hidden">
              <motion.div
                key={`mobile-container-${currentGalleryIndex}`}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = Math.abs(offset.x) * velocity.x

                  if (swipe < -100) {
                    handleNext()
                  } else if (swipe > 100) {
                    handlePrev()
                  }
                }}
              >
                <motion.div
                  key={`mobile-slide-${currentGalleryIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-center"
                >
                  <GalleryCard
                    galleryImages={galleryImages}
                    index={currentGalleryIndex}
                    mobileView={true}
                  />
                </motion.div>
              </motion.div>
            </div>

            <div className="hidden sm:flex">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`left-${currentGalleryIndex}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 0.5, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="flex-shrink-0"
                >
                  <GalleryCard
                    galleryImages={galleryImages}
                    index={
                      (currentGalleryIndex - 1 + galleryImages.length) %
                      galleryImages.length
                    }
                    opacity={0.5}
                    scale={0.9}
                    clickable={false}
                  />
                </motion.div>
                <motion.div
                  key={`center-${currentGalleryIndex}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="flex-shrink-0"
                >
                  <GalleryCard
                    galleryImages={galleryImages}
                    index={currentGalleryIndex}
                  />
                </motion.div>
                <motion.div
                  key={`right-${currentGalleryIndex}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 0.5, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.4 }}
                  className="flex-shrink-0"
                >
                  <GalleryCard
                    galleryImages={galleryImages}
                    index={(currentGalleryIndex + 1) % galleryImages.length}
                    opacity={0.5}
                    scale={0.9}
                    clickable={false}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <GalleryNavigation
            onPrev={handlePrev}
            onNext={handleNext}
            disabled={isChanging}
          />
        </div>
      ) : galleryImages.length >= 1 ? (
        <div className="relative">
          <div className="w-full sm:hidden">
            <motion.div
              key={`mobile-single-container-${currentGalleryIndex}`}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = Math.abs(offset.x) * velocity.x

                if (galleryImages.length > 1) {
                  if (swipe < -100) {
                    handleNext()
                  } else if (swipe > 100) {
                    handlePrev()
                  }
                }
              }}
            >
              <motion.div
                key={`mobile-single-${currentGalleryIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex justify-center"
              >
                <GalleryCard
                  galleryImages={galleryImages}
                  index={currentGalleryIndex}
                  mobileView={true}
                />
              </motion.div>
            </motion.div>
          </div>

          <div className="justify-center hidden sm:flex">
            <GalleryCard
              galleryImages={galleryImages}
              index={currentGalleryIndex}
            />
            {galleryImages.length === 2 && (
              <GalleryCard
                galleryImages={galleryImages}
                index={(currentGalleryIndex + 1) % galleryImages.length}
              />
            )}
          </div>

          {galleryImages.length === 2 && (
            <GalleryNavigation
              onPrev={handlePrev}
              onNext={handleNext}
              disabled={isChanging}
            />
          )}
        </div>
      ) : galleryImages.length === 0 ? (
        <p className="text-center">{t('pages.home.gallerySection.noImages')}</p>
      ) : null}
    </section>
  )
}

const GalleryCard = ({
  galleryImages,
  index,
  opacity = 1,
  scale = 1,
  clickable = true,
  mobileView = false,
}) => (
  <motion.div
    className={`flex-shrink-0 transition-all duration-300 px-[3%] ${
      mobileView
        ? 'w-[90vw] max-w-[380px]'
        : 'max-sm:w-full sm:w-[45vw] md:w-[35vw] lg:w-[550px] aspect-[1/0.96]'
    }`}
    style={{ opacity, scale }}
  >
    <DynamicCard
      type="gallery"
      title={galleryImages[index]?.name}
      imageUrl={galleryImages[index]?.url}
      description={galleryImages[index]?.description}
      clickable={clickable}
    />
  </motion.div>
)

const AboutSection = ({ t }) => (
  <section className="py-[5vh] sm:mb-[5vh] mb-[3vh] text-center bg-transparent">
    <h2 className="text-left sm:t64s t40s mb-[5vh]">
      <a href="/about">{t('pages.home.aboutSection.title')}</a>
    </h2>
    <p className="sm:t24l t20l max-w-[95%] mx-auto lg:max-w-[1109px]">
      {t('pages.home.aboutSection.description')}
    </p>
  </section>
)

const GalleryNavigation = ({ onPrev, onNext, disabled }) => (
  <>
    <div className="absolute inset-y-0 left-0 flex items-center justify-center sm:left-[5%] max-h-[100%]">
      <motion.button
        onClick={onPrev}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={disabled}
        className={`p-2 text-black sm:t36b t20r backdrop-blur-lg sm:shadow-[0px_12px_20px_rgba(0,0,0,0.7)] backdrop-saturate-[180%] bg-[rgba(255,255,255,0.8)] w-[10vw] h-[10vw] max-w-[80px] max-h-[80px] min-w-[40px] min-h-[40px] rounded-full transition-transform duration-300 ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[rgba(255,255,255,0.9)]'}`}
      >
        &lt;
      </motion.button>
    </div>
    <div className="absolute inset-y-0 right-0 flex items-center justify-center sm:right-[5%] max-h-[100%]">
      <motion.button
        onClick={onNext}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={disabled}
        className={`p-2 text-black sm:t36b t20r backdrop-blur-lg sm:shadow-[0px_12px_20px_rgba(0,0,0,0.7)] backdrop-saturate-[180%] bg-[rgba(255,255,255,0.8)] w-[10vw] h-[10vw] max-w-[80px] max-h-[80px] min-w-[40px] min-h-[40px] rounded-full transition-transform duration-300 ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[rgba(255,255,255,0.9)]'}`}
      >
        &gt;
      </motion.button>
    </div>
  </>
)

const EventsSection = ({ t, events, loadingEvents, onEventClick }) => {
  const [currentEventIndex, setCurrentEventIndex] = useState(0)
  const [isChanging, setIsChanging] = useState(false)

  const handlePrev = () => {
    if (!isChanging && events.length > 0) {
      setIsChanging(true)
      setCurrentEventIndex((prev) =>
        prev === 0 ? events.length - 1 : prev - 1
      )
      setTimeout(() => setIsChanging(false), 500)
    }
  }

  const handleNext = () => {
    if (!isChanging && events.length > 0) {
      setIsChanging(true)
      setCurrentEventIndex((prev) => (prev + 1) % events.length)
      setTimeout(() => setIsChanging(false), 500)
    }
  }

  return (
    <section>
      <h2 className="mb-6 text-left sm:t64s t40s">
        <a href="/events-list"> {t('pages.home.eventSection.title')}</a>
      </h2>
      {loadingEvents ? (
        <div className="flex items-center justify-center">
          <Loader loading={loadingEvents} />
        </div>
      ) : events.length > 0 ? (
        <div className="relative">
          {/* Vista móvil */}
          <div className="w-full sm:hidden">
            <motion.div
              key={`mobile-event-container-${currentEventIndex}`}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = Math.abs(offset.x) * velocity.x

                if (swipe < -100) {
                  handleNext()
                } else if (swipe > 100) {
                  handlePrev()
                }
              }}
            >
              <motion.div
                key={`mobile-event-slide-${currentEventIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex justify-center"
              >
                <EventCard
                  events={events}
                  index={currentEventIndex}
                  onEventClick={onEventClick}
                  mobileView={true}
                />
              </motion.div>
            </motion.div>
          </div>

          {/* Vista desktop */}
          <div className="hidden sm:flex">
            {events.length >= 3 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`event-left-${currentEventIndex}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 0.5, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="flex-shrink-0"
                >
                  <EventCard
                    events={events}
                    index={
                      (currentEventIndex - 1 + events.length) % events.length
                    }
                    onEventClick={onEventClick}
                    opacity={0.5}
                    scale={0.9}
                    clickable={false}
                  />
                </motion.div>
                <motion.div
                  key={`event-center-${currentEventIndex}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="flex-shrink-0"
                >
                  <EventCard
                    events={events}
                    index={currentEventIndex}
                    onEventClick={onEventClick}
                  />
                </motion.div>
                <motion.div
                  key={`event-right-${currentEventIndex}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 0.5, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.4 }}
                  className="flex-shrink-0"
                >
                  <EventCard
                    events={events}
                    index={(currentEventIndex + 1) % events.length}
                    onEventClick={onEventClick}
                    opacity={0.5}
                    scale={0.9}
                    clickable={false}
                  />
                </motion.div>
              </AnimatePresence>
            ) : events.length === 2 ? (
              <div className="flex justify-center">
                <EventCard
                  events={events}
                  index={currentEventIndex}
                  onEventClick={onEventClick}
                />
                <EventCard
                  events={events}
                  index={(currentEventIndex + 1) % events.length}
                  onEventClick={onEventClick}
                />
              </div>
            ) : (
              <div className="flex justify-center">
                <EventCard
                  events={events}
                  index={0}
                  onEventClick={onEventClick}
                />
              </div>
            )}
          </div>

          {/* Navegación (mostrar solo si hay más de 1 evento) */}
          {events.length > 1 && (
            <EventNavigation
              onPrev={handlePrev}
              onNext={handleNext}
              disabled={isChanging}
            />
          )}
        </div>
      ) : (
        <p className="text-center"> {t('pages.home.eventSection.noEvents')}</p>
      )}
    </section>
  )
}

const EventCard = ({
  events,
  index,
  onEventClick,
  opacity = 1,
  scale = 1,
  clickable = true,
  mobileView = false,
}) => (
  <motion.div
    className={`flex-shrink-0 transition-all duration-300 px-[3%] ${
      mobileView
        ? 'w-[90vw] max-w-[380px]'
        : 'max-sm:w-full sm:w-[45vw] md:w-[35vw] lg:w-[400px]'
    }`}
    style={{ opacity, scale }}
    onClick={
      clickable
        ? () =>
            onEventClick({
              event: { extendedProps: events[index] },
            })
        : undefined
    }
  >
    <DynamicCard
      type="event"
      title={events[index].title}
      description={events[index].description}
      date={new Date(events[index].start).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}
      imageUrl={
        events[index].eventURL
          ? events[index].eventURL
          : events[index].imageURL
            ? events[index].imageURL
            : '/placeholder.png'
      }
      link={`/event/${events[index].title.toLowerCase().replace(/ /g, '-')}`}
      clickable={clickable}
    />
  </motion.div>
)

const EventNavigation = ({ onPrev, onNext, disabled }) => (
  <>
    <div className="absolute inset-y-0 left-0 flex items-center justify-center sm:left-[5%] max-h-[100%]">
      <motion.button
        onClick={onPrev}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={disabled}
        className={`p-2 text-black sm:t36b t20r backdrop-blur-lg sm:shadow-[0px_12px_20px_rgba(0,0,0,0.7)] backdrop-saturate-[180%] bg-[rgba(255,255,255,0.8)] w-[10vw] h-[10vw] max-w-[80px] max-h-[80px] min-w-[40px] min-h-[40px] rounded-full transition-transform duration-300 ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[rgba(255,255,255,0.9)]'}`}
      >
        &lt;
      </motion.button>
    </div>
    <div className="absolute inset-y-0 right-0 flex items-center justify-center sm:right-[5%] max-h-[100%]">
      <motion.button
        onClick={onNext}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={disabled}
        className={`p-2 text-black sm:t36b t20r backdrop-blur-lg sm:shadow-[0px_12px_20px_rgba(0,0,0,0.7)] backdrop-saturate-[180%] bg-[rgba(255,255,255,0.8)] w-[10vw] h-[10vw] max-w-[80px] max-h-[80px] min-w-[40px] min-h-[40px] rounded-full transition-transform duration-300 ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[rgba(255,255,255,0.9)]'}`}
      >
        &gt;
      </motion.button>
    </div>
  </>
)

const WantToParticipateSection = ({ t }) => (
  <section className="wantTo py-[5vh] sm:mb-[5vh] text-center bg-transparent">
    <h2 className="text-right sm:t64s t40s mb-[5vh]">
      {t('pages.home.wantToParticipateSection.title')}
    </h2>
    <p className="sm:t24l t20l max-w-[95%] mx-auto lg:max-w-[1109px] text-right mb-[4vh]">
      {t('pages.home.wantToParticipateSection.firstPart')}
    </p>
    <p className="sm:t24l t20l max-w-[95%] mx-auto lg:max-w-[1109px] text-left mb-[4vh]">
      {t('pages.home.wantToParticipateSection.secondPart')}
    </p>
    <p className="sm:t24l t20l max-w-[95%] mx-auto lg:max-w-[1109px] text-right mb-[4vh]">
      {t('pages.home.wantToParticipateSection.thirdPart')}
    </p>
    <p className="sm:t24l t20l max-w-[95%] mx-auto lg:max-w-[1109px] text-center mb-[4vh]">
      <Trans
        i18nKey="pages.home.wantToParticipateSection.linksPart"
        components={{
          2: (
            <Link to="/new-crew">
              <b className="underline t24b" />
            </Link>
          ),
          1: (
            <Link to="/partner-form">
              <b className="underline t24b" />
            </Link>
          ),
        }}
      />
    </p>
  </section>
)

GallerySection.propTypes = {
  galleryImages: PropTypes.array.isRequired,
  loadingGallery: PropTypes.bool.isRequired,
  currentGalleryIndex: PropTypes.number.isRequired,
  onNext: PropTypes.func.isRequired,
  onPrev: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
}

AboutSection.propTypes = {
  t: PropTypes.func.isRequired,
}

HeroSection.propTypes = {
  t: PropTypes.func.isRequired,
  logoSrc: PropTypes.string.isRequired,
}

WantToParticipateSection.propTypes = {
  t: PropTypes.func.isRequired,
}

EventsSection.propTypes = {
  t: PropTypes.func.isRequired,
  events: PropTypes.array.isRequired,
  loadingEvents: PropTypes.bool.isRequired,
  onEventClick: PropTypes.func.isRequired,
}

EventCard.propTypes = {
  events: PropTypes.array.isRequired,
  index: PropTypes.number.isRequired,
  onEventClick: PropTypes.func.isRequired,
  opacity: PropTypes.number,
  scale: PropTypes.number,
  clickable: PropTypes.bool,
  mobileView: PropTypes.bool,
}

EventNavigation.propTypes = {
  onPrev: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}

export default HomePage
