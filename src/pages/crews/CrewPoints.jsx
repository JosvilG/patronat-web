import React, { useState, useEffect } from 'react'
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'

const CrewPoints = () => {
  const { t } = useTranslation()
  const [crews, setCrews] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedCrewId, setExpandedCrewId] = useState(null)
  const [pointsData, setPointsData] = useState({})
  const viewDictionary = 'pages.crew.points'

  useEffect(() => {
    const fetchCrewsAndGames = async () => {
      try {
        setLoading(true)

        const crewsSnapshot = await getDocs(collection(db, 'crews'))

        const gamesSnapshot = await getDocs(
          query(collection(db, 'games'), where('status', '==', 'Activo'))
        )

        const activeGamesById = {}
        gamesSnapshot.docs.forEach((gameDoc) => {
          activeGamesById[gameDoc.id] = {
            id: gameDoc.id,
            ...gameDoc.data(),
          }
        })

        const crewsWithGames = []
        const initialPointsData = {}

        for (const crewDoc of crewsSnapshot.docs) {
          const crewId = crewDoc.id
          const crewData = crewDoc.data()

          const crewGamesSnapshot = await getDocs(
            collection(db, 'crews', crewId, 'games')
          )

          const activeGames = []

          for (const gameDoc of crewGamesSnapshot.docs) {
            const gameId = gameDoc.id
            const gameData = gameDoc.data()

            if (activeGamesById[gameId] && gameData.gameStatus === 'Activo') {
              const gameWithDetails = {
                id: gameId,
                ...activeGamesById[gameId],
                ...gameData,
                points: gameData.points || 0,
              }

              activeGames.push(gameWithDetails)

              if (!initialPointsData[crewId]) {
                initialPointsData[crewId] = {}
              }
              initialPointsData[crewId][gameId] = gameData.points || 0
            }
          }

          if (activeGames.length > 0) {
            crewsWithGames.push({
              id: crewId,
              name: crewData.title || crewData.name,
              status: crewData.status,
              games: activeGames.sort((a, b) => a.name.localeCompare(b.name)),
            })
          }
        }

        setCrews(crewsWithGames.sort((a, b) => a.name.localeCompare(b.name)))
        setPointsData(initialPointsData)
        setLoading(false)
      } catch (error) {
        setLoading(false)
        showPopup({
          title: t(`${viewDictionary}.errorMessages.errorTitle`),
          text: t(`${viewDictionary}.errorMessages.loadError`),
          icon: 'error',
        })
      }
    }

    fetchCrewsAndGames()
  }, [])

  const handlePointsChange = (crewId, gameId, value) => {
    const numValue = parseInt(value) || 0

    setPointsData((prev) => ({
      ...prev,
      [crewId]: {
        ...prev[crewId],
        [gameId]: numValue,
      },
    }))
  }

  const saveGamePoints = async (crewId, gameId) => {
    try {
      setSaving(true)

      const points = pointsData[crewId][gameId]
      const gameRef = doc(db, 'crews', crewId, 'games', gameId)

      const newParticipationStatus = points > 0 ? 'Participado' : 'Pendiente'

      await updateDoc(gameRef, {
        points,
        participationStatus: newParticipationStatus,
        updatedAt: serverTimestamp(),
      })

      setCrews((prevCrews) =>
        prevCrews.map((crew) => {
          if (crew.id === crewId) {
            return {
              ...crew,
              games: crew.games.map((game) => {
                if (game.id === gameId) {
                  return {
                    ...game,
                    points,
                    participationStatus: newParticipationStatus,
                  }
                }
                return game
              }),
            }
          }
          return crew
        })
      )

      showPopup({
        title: t(`${viewDictionary}.successMessages.pointsSaved`),
        text: t(`${viewDictionary}.successMessages.pointsUpdated`),
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.errorMessages.errorTitle`),
        text: t(`${viewDictionary}.errorMessages.saveError`),
        icon: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const saveAllPoints = async () => {
    try {
      setSaving(true)

      const promises = []
      const updatedStatus = {}

      for (const crewId in pointsData) {
        if (!updatedStatus[crewId]) {
          updatedStatus[crewId] = {}
        }

        for (const gameId in pointsData[crewId]) {
          const points = pointsData[crewId][gameId]
          const newParticipationStatus =
            points > 0 ? 'Participado' : 'Pendiente'
          updatedStatus[crewId][gameId] = newParticipationStatus

          const gameRef = doc(db, 'crews', crewId, 'games', gameId)

          promises.push(
            updateDoc(gameRef, {
              points,
              participationStatus: newParticipationStatus,
              updatedAt: serverTimestamp(),
            })
          )
        }
      }

      await Promise.all(promises)

      setCrews((prevCrews) =>
        prevCrews.map((crew) => ({
          ...crew,
          games: crew.games.map((game) => ({
            ...game,
            points: pointsData[crew.id][game.id],
            participationStatus: updatedStatus[crew.id][game.id],
          })),
        }))
      )

      showPopup({
        title: t(`${viewDictionary}.successMessages.pointsSaved`),
        text: t(`${viewDictionary}.successMessages.allPointsSaved`),
        icon: 'success',
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.errorMessages.errorTitle`),
        text: t(`${viewDictionary}.errorMessages.saveAllError`),
        icon: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const calculateTotalPoints = (crewId) => {
    if (!pointsData[crewId]) return 0
    return Object.values(pointsData[crewId]).reduce(
      (sum, points) => sum + points,
      0
    )
  }

  if (loading) {
    return <Loader loading={true} />
  }

  return (
    <div className="h-auto px-3 pb-4 mx-auto sm:px-4 sm:pb-8 max-w-7xl">
      <h1 className="mb-6 text-center sm:mb-8 md:mb-12 t64b">
        {t(`${viewDictionary}.title`)}
      </h1>

      <div className="p-4 sm:p-6 mb-4 sm:mb-8 backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl sm:rounded-2xl md:rounded-[40px]">
        <p className="mb-3 text-base text-center sm:mb-4 sm:text-lg md:text-xl t20r">
          {t(`${viewDictionary}.description`)}
        </p>

        <div className="flex justify-center">
          <DynamicButton
            onClick={saveAllPoints}
            size="medium"
            state={saving ? 'loading' : 'normal'}
            type="primary"
            textId={t(`${viewDictionary}.saveAllButton`)}
            disabled={saving}
          />
        </div>
      </div>

      {crews.length === 0 ? (
        <div className="p-4 sm:p-6 text-center backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl sm:rounded-2xl md:rounded-[40px]">
          <p className="text-base sm:text-lg md:text-xl t20r">
            {t(`${viewDictionary}.noCrews`)}
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {crews.map((crew) => (
            <div
              key={crew.id}
              className="overflow-hidden backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl sm:rounded-2xl md:rounded-[30px] shadow"
            >
              <div
                className="flex items-center justify-between p-3 cursor-pointer sm:p-4"
                onClick={() =>
                  setExpandedCrewId(expandedCrewId === crew.id ? null : crew.id)
                }
              >
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <div>
                    <h3 className="text-lg sm:text-xl md:text-2xl t24b">
                      {crew.name}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1 sm:gap-2">
                      <span
                        className={`inline-block px-2 py-0.5 sm:py-1 text-xs sm:text-sm t14r rounded-full ${
                          crew.status === 'Activo'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {crew.status}
                      </span>
                      <span className="px-2 py-0.5 sm:py-1 text-xs sm:text-sm text-blue-800 bg-blue-100 rounded-full t14r">
                        {t(`${viewDictionary}.totalPoints`, {
                          points: calculateTotalPoints(crew.id),
                        })}
                      </span>
                      <span className="px-2 py-0.5 sm:py-1 text-xs sm:text-sm text-yellow-800 bg-yellow-100 rounded-full t14r">
                        {t(`${viewDictionary}.gamesCount`, {
                          count: crew.games.length,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <svg
                  className={`w-6 h-6 sm:w-8 sm:h-8 transition-transform ${
                    expandedCrewId === crew.id ? 'transform rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              {expandedCrewId === crew.id && (
                <div className="p-3 sm:p-6">
                  <div className="space-y-2 sm:space-y-3">
                    {crew.games.map((game) => (
                      <div
                        key={game.id}
                        className="flex flex-col p-3 space-y-3 transition-colors rounded-lg sm:p-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
                      >
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-medium sm:text-base md:text-lg t16b">
                            {game.name}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1 sm:gap-2">
                            {game.date && (
                              <span className="px-2 py-0.5 text-xs sm:text-sm text-purple-800 bg-purple-100 rounded-full t12r">
                                {game.date}
                              </span>
                            )}
                            {game.location && (
                              <span className="px-2 py-0.5 text-xs sm:text-sm text-blue-800 bg-blue-100 rounded-full t12r">
                                {game.location}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="flex flex-col items-center">
                            <DynamicInput
                              name={`points-${crew.id}-${game.id}`}
                              type="number"
                              textId={t(
                                `${viewDictionary}.pointsColumn`,
                                'Puntos'
                              )}
                              value={pointsData[crew.id][game.id]}
                              onChange={(e) =>
                                handlePointsChange(
                                  crew.id,
                                  game.id,
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <DynamicButton
                            onClick={() => saveGamePoints(crew.id, game.id)}
                            size="small"
                            state={saving ? 'loading' : 'normal'}
                            type="success"
                            textId={t(
                              `${viewDictionary}.saveButton`,
                              'Guardar'
                            )}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CrewPoints
