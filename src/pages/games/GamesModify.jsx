import React, { useState, useEffect } from 'react'
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import log from 'loglevel'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import useSlug from '../../hooks/useSlug'
import { showPopup } from '../../services/popupService'

function GamesModify() {
  const { t } = useTranslation()
  const [gameData, setGameData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    location: '',
    minParticipants: 0,
    score: 0,
    season: '',
    status: 'Inactivo',
    isGimcana: false,
  })
  const [originalGameData, setOriginalGameData] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState([])
  const navigate = useNavigate()
  const { slug } = useParams()
  const location = useLocation()
  const { gameId } = location.state || {}
  const { generateSlug } = useSlug()
  const viewDictionary = 'pages.games.modifyGame'

  const statusOptions = [
    { label: `${viewDictionary}.statusOptions.active`, value: 'Activo' },
    { label: `${viewDictionary}.statusOptions.inactive`, value: 'Inactivo' },
    { label: `${viewDictionary}.statusOptions.planned`, value: 'Planificado' },
    { label: `${viewDictionary}.statusOptions.completed`, value: 'Completado' },
  ]

  log.setLevel('debug')

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const seasonsSnapshot = await getDocs(collection(db, 'seasons'))
        const seasonsData = seasonsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setSeasons(seasonsData)
      } catch (error) {
        // Manejo de error silencioso para producción
      }
    }

    fetchSeasons()
  }, [])

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        if (!gameId) {
          throw new Error(t(`${viewDictionary}.errorId`))
        }

        const gameDoc = await getDoc(doc(db, 'games', gameId))

        if (!gameDoc.exists()) {
          throw new Error(t(`${viewDictionary}.gameNotExist`))
        }

        const data = gameDoc.data()
        const gameDataWithDefaults = {
          ...data,
          minParticipants: data.minParticipants || 0,
          score: data.score || 0,
          isGimcana: data.isGimcana || false,
        }
        setGameData(gameDataWithDefaults)
        setOriginalGameData(gameDataWithDefaults)
      } catch (error) {
        showPopup({
          title: t(`${viewDictionary}.titleError`),
          text: t(`${viewDictionary}.errorPopup.loadingFailed`),
          icon: 'error',
          confirmButtonText: t('components.buttons.back'),
          confirmButtonColor: '#a3a3a3',
          onConfirm: () => navigate('/dashboard'),
        })
      } finally {
        setLoading(false)
      }
    }

    fetchGameData()
  }, [gameId, navigate, t])

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
      if (originalGameData && gameData.season !== originalGameData.season) {
        const confirmResult = await showPopup({
          title: t(`${viewDictionary}.confirmSeasonChange.title`),
          text: t(`${viewDictionary}.confirmSeasonChange.text`, {
            oldSeason: originalGameData.season,
            newSeason: gameData.season,
          }),
          icon: 'question',
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonColor: '#8be484',
          confirmButtonText: t(
            `${viewDictionary}.confirmSeasonChange.createNew`
          ),
          denyButtonText: t(
            `${viewDictionary}.confirmSeasonChange.updateExisting`
          ),
          cancelButton: t('components.buttons.cancel'),
        })

        if (
          !confirmResult ||
          confirmResult.isDenied ||
          confirmResult.isDismissed ||
          confirmResult.isConfirmed === false
        ) {
          setGameData((prev) => ({ ...prev, season: originalGameData.season }))
          setSubmitting(false)
          return
        }

        if (confirmResult && confirmResult.isConfirmed) {
          await createNewGameForSeason(gameData.season)
          return
        }
      }

      const gameRef = doc(db, 'games', gameId)
      await updateDoc(gameRef, {
        ...gameData,
        updatedAt: serverTimestamp(),
        minParticipants: Number(gameData.minParticipants),
        score: Number(gameData.score),
      })

      const relevantFieldsChanged =
        originalGameData.name !== gameData.name ||
        originalGameData.season !== gameData.season ||
        originalGameData.date !== gameData.date ||
        originalGameData.status !== gameData.status

      if (relevantFieldsChanged) {
        await updateGameInCrews(gameId, {
          gameName: gameData.name,
          gameSeason: gameData.season,
          gameDate: gameData.date,
          gameStatus: gameData.status,
          updatedAt: serverTimestamp(),
        })
      } else if (originalGameData.status !== gameData.status) {
        await updateGameStatusInCrews(gameId, gameData.status)
      }

      showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
        confirmButtonColor: '#8be484',
        confirmButtonText: t('components.buttons.accept'),
        onConfirm: () => navigate('/games-list'),
      })
    } catch (error) {
      let errorMessage = t(`${viewDictionary}.errorMessages.default`)
      if (error.code === 'unavailable') {
        errorMessage = t(`${viewDictionary}.errorMessages.unavailable`)
      } else if (error.code === 'permission-denied') {
        errorMessage = t(`${viewDictionary}.errorMessages.permission-denied`)
      }

      showPopup({
        title: t(`${viewDictionary}.titleError`),
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

  const updateGameStatusInCrews = async (gameId, newStatus) => {
    try {
      const crewsQuery = query(collection(db, 'crews'))
      const crewsSnapshot = await getDocs(crewsQuery)
      const batch = writeBatch(db)

      for (const crewDoc of crewsSnapshot.docs) {
        const crewId = crewDoc.id
        const gameSubcolRef = doc(db, 'crews', crewId, 'games', gameId)
        const gameSubcolDoc = await getDoc(gameSubcolRef)

        if (gameSubcolDoc.exists()) {
          batch.update(gameSubcolRef, {
            gameStatus: newStatus,
            updatedAt: serverTimestamp(),
          })
        }
      }

      await batch.commit()
    } catch (error) {
      // Manejo de error silencioso para producción
    }
  }

  const updateGameInCrews = async (gameId, updatedFields) => {
    const crewsQuery = query(collection(db, 'crews'))
    const crewsSnapshot = await getDocs(crewsQuery)
    let batch = writeBatch(db)
    let updatesCount = 0

    for (const crewDoc of crewsSnapshot.docs) {
      const crewId = crewDoc.id
      const gameSubcolRef = doc(db, 'crews', crewId, 'games', gameId)
      const gameSubcolDoc = await getDoc(gameSubcolRef)

      if (gameSubcolDoc.exists()) {
        batch.update(gameSubcolRef, updatedFields)
        updatesCount++

        if (updatesCount >= 450) {
          await batch.commit()
          batch = writeBatch(db)
          updatesCount = 0
        }
      }
    }

    if (updatesCount > 0) {
      await batch.commit()
    }
  }

  const createNewGameForSeason = async (newSeason) => {
    try {
      const newGameData = {
        ...gameData,
        name: gameData.name.includes(`(${originalGameData.season})`)
          ? gameData.name.replace(
              `(${originalGameData.season})`,
              `(${newSeason})`
            )
          : gameData.name,
        season: newSeason,
        status: 'Planificado',
        createdAt: serverTimestamp(),
        isClonedFrom: gameId,
      }

      const newGameRef = await addDoc(collection(db, 'games'), {
        ...newGameData,
        minParticipants: Number(newGameData.minParticipants),
        score: Number(newGameData.score),
      })

      const newGameId = newGameRef.id
      const crewsQuery = query(
        collection(db, 'crews'),
        where('status', '==', 'Activo'),
        where('season', '==', newSeason)
      )

      const crewsSnapshot = await getDocs(crewsQuery)
      let crewsToUpdate = crewsSnapshot.docs
      if (crewsToUpdate.length === 0) {
        const allCrewsQuery = query(
          collection(db, 'crews'),
          where('status', '==', 'Activo')
        )
        const allCrewsSnapshot = await getDocs(allCrewsQuery)
        crewsToUpdate = allCrewsSnapshot.docs
      }

      const batch = writeBatch(db)

      crewsToUpdate.forEach((crewDoc) => {
        const crewId = crewDoc.id

        const gameSubcolRef = doc(db, 'crews', crewId, 'games', newGameId)

        const gameSubcolData = {
          gameId: newGameId,
          gameName: newGameData.name,
          gameSeason: newSeason,
          gameDate: newGameData.date,
          gameStatus: newGameData.status,
          participationStatus: 'Pendiente',
          points: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }

        batch.set(gameSubcolRef, gameSubcolData)
      })

      await batch.commit()

      showPopup({
        title: t(`${viewDictionary}.newGameSuccess.title`),
        text: t(`${viewDictionary}.newGameSuccess.text`, {
          season: newSeason,
        }),
        icon: 'success',
        confirmButtonText: t('components.buttons.accept'),
        confirmButtonColor: '#8be484',
        onConfirm: () => {
          const slug = generateSlug(newGameData.name)
          navigate(`/edit-game/${slug}`, {
            state: { gameId: newGameId },
          })
        },
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.titleError`),
        text: t(`${viewDictionary}.newGameError.text`, {
          season: newSeason,
          errorMessage: error.message,
        }),
        icon: 'error',
        confirmButtonText: t('components.buttons.close'),
        confirmButtonColor: '#a3a3a3',
      })
      setSubmitting(false)
    }
  }

  const handleCloneForNewSeason = async () => {
    setSubmitting(true)

    const { value: selectedSeason } = await showPopup({
      title: t(`${viewDictionary}.cloneGame.title`),
      input: 'select',
      inputOptions: Object.fromEntries(
        seasons.map((season) => [season.id, season.name])
      ),
      inputPlaceholder: t(`${viewDictionary}.cloneGame.selectSeason`),
      showCancelButton: true,
      inputValidator: (value) => {
        return new Promise((resolve) => {
          if (!value) {
            resolve(t(`${viewDictionary}.cloneGame.validationError`))
          } else {
            resolve()
          }
        })
      },
    })

    if (!selectedSeason) {
      setSubmitting(false)
      return
    }

    const selectedSeasonObj = seasons.find((s) => s.id === selectedSeason)
    await createNewGameForSeason(selectedSeasonObj.name)
  }

  if (loading) {
    return <Loader loading={true} />
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
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              navigate('/games-list')
            }}
            size="small"
            state="normal"
            textId={t('components.buttons.cancel')}
          />

          <DynamicButton
            type="submit"
            size="small"
            state="normal"
            textId={t('components.buttons.save')}
          />
        </div>
      </form>
    </div>
  )
}

export default GamesModify
