import React, { useState } from 'react'
import {
  Timestamp,
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import log from 'loglevel'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'

const createGameModel = () => {
  return {
    name: '',
    description: '',
    date: '',
    time: '',
    location: '',
    minParticipants: 0,
    score: 0,
    season: '',
    status: 'Inactivo',
    isGimcana: false, // ← nuevo campo
  }
}

function GamesRegister() {
  const { t } = useTranslation()
  const [gameData, setGameData] = useState(createGameModel())
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const viewDictionary = 'pages.games.registerGame'

  log.setLevel('debug')

  const statusOptions = [
    { label: `${viewDictionary}.statusOptions.active`, value: 'Activo' },
    { label: `${viewDictionary}.statusOptions.inactive`, value: 'Inactivo' },
    { label: `${viewDictionary}.statusOptions.planned`, value: 'Planificado' },
    { label: `${viewDictionary}.statusOptions.completed`, value: 'Completado' },
  ]

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setGameData({
      ...gameData,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const gameRef = doc(collection(db, 'games'))
      const gameId = gameRef.id

      await setDoc(gameRef, {
        ...gameData,
        createdAt: Timestamp.now(),
        minParticipants: Number(gameData.minParticipants),
        score: Number(gameData.score),
      })

      const crewsQuery = query(
        collection(db, 'crews'),
        where('status', '==', 'Activo')
      )

      const crewsSnapshot = await getDocs(crewsQuery)

      const crewUpdates = []
      crewsSnapshot.forEach((crewDoc) => {
        const crewId = crewDoc.id
        const gameSubcolRef = doc(
          collection(db, 'crews', crewId, 'games'),
          gameId
        )

        const gameSubcolData = {
          gameId: gameId,
          gameName: gameData.name,
          gameSeason: gameData.season,
          gameDate: gameData.date,
          gameStatus: gameData.status,
          participationStatus: 'Pendiente',
          points: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }

        crewUpdates.push(setDoc(gameSubcolRef, gameSubcolData))
      })

      await Promise.all(crewUpdates)
      await showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
        confirmButtonText: t('components.buttons.accept'),
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

      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.text`, {
          errorMessage: errorMessage,
        }),
        icon: 'error',
        confirmButtonText: t('components.buttons.close'),
        confirmButtonColor: '#a3a3a3',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container px-[4%] pb-[4vh] mx-auto flex flex-col items-center justify-center min-h-[80vh]">
      <Loader loading={submitting} />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center mx-auto space-y-[3vh] max-w-md md:max-w-7xl w-full sm:flex-none"
      >
        <h1 className="mb-[4vh] text-center sm:t64b t40b">
          {t(`${viewDictionary}.title`)}
        </h1>

        <div className="p-[4%] mb-[4vh] rounded-lg shadow-sm bg-white/50 w-full">
          <h3 className="mb-[3vh] text-lg font-semibold text-gray-700 text-center md:text-left">
            {t(`${viewDictionary}.basicInfoTitle`)}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[3vw] gap-y-[3vh] justify-items-center">
            <div className="w-[90%] md:w-full">
              <DynamicInput
                name="name"
                textId={t(`${viewDictionary}.nameLabel`)}
                type="text"
                value={gameData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="w-[90%] md:w-full">
              <DynamicInput
                name="location"
                textId={t(`${viewDictionary}.locationLabel`)}
                type="text"
                value={gameData.location}
                onChange={handleChange}
                required
              />
            </div>

            <div className="w-[90%] md:w-full col-span-1 md:col-span-2">
              <DynamicInput
                name="description"
                textId={t(`${viewDictionary}.descriptionLabel`)}
                type="textarea"
                value={gameData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className="w-[90%] md:w-full">
              <DynamicInput
                name="date"
                textId={t(`${viewDictionary}.dateLabel`)}
                type="date"
                value={gameData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="w-[90%] md:w-full">
              <DynamicInput
                name="time"
                textId={t(`${viewDictionary}.timeLabel`)}
                type="time"
                value={gameData.time}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        <div className="p-[4%] mb-[4vh] rounded-lg shadow-sm bg-white/50 w-full">
          <h3 className="mb-[3vh] text-lg font-semibold text-gray-700 text-center md:text-left">
            {t(`${viewDictionary}.gameDetailsTitle`)}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[3vw] gap-y-[3vh] justify-items-center">
            <div className="w-[90%] md:w-full">
              <DynamicInput
                name="minParticipants"
                textId={t(`${viewDictionary}.minParticipantsLabel`)}
                type="number"
                value={gameData.minParticipants}
                onChange={handleChange}
                required
              />
            </div>

            <div className="w-[90%] md:w-full">
              <DynamicInput
                name="score"
                textId={t(`${viewDictionary}.scoreLabel`)}
                type="number"
                value={gameData.score}
                onChange={handleChange}
                required
              />
            </div>

            <div className="w-[90%] md:w-full">
              <DynamicInput
                name="season"
                textId={t(`${viewDictionary}.seasonLabel`)}
                type="text"
                value={gameData.season}
                onChange={handleChange}
                required
              />
            </div>

            <div className="w-[90%] md:w-full">
              <DynamicInput
                name="status"
                textId={t(`${viewDictionary}.statusLabel`)}
                type="select"
                options={statusOptions}
                value={gameData.status}
                onChange={handleChange}
                required
              />
            </div>

            <div className="w-[90%] md:w-full flex items-center">
              <DynamicInput
                name="isGimcana"
                textId={`${viewDictionary}.isGimcanaLabel`}
                type="checkbox"
                checked={gameData.isGimcana}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-[2vh] sm:flex-row sm:justify-end sm:gap-[2vw] mt-[4vh] w-[90%] md:w-full items-center sm:items-stretch">
          <DynamicButton
            type="button"
            onClick={() => navigate('/dashboard')}
            size="small"
            state="normal"
            textId={t('components.buttons.cancel')}
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

export default GamesRegister
