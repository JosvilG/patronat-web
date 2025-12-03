import React, { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../../contexts/AuthContext'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import DynamicItems from '../../components/Items'
import DynamicButton from '../../components/Buttons'
import useSlug from '../../hooks/useSlug'
import Loader from '../../components/Loader'

const GamesDetails = () => {
  const { slug } = useParams()
  const [game, setGame] = useState(null)
  const [gameId, setGameId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [crews, setCrews] = useState([])
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { generateSlug } = useSlug()
  const { userData } = useContext(AuthContext)
  const viewDictionary = 'pages.games.details'

  useEffect(() => {
    const fetchGameId = async () => {
      if (location.state?.gameId) {
        setGameId(location.state.gameId)
        return
      }

      try {
        const gamesSnapshot = await getDocs(collection(db, 'games'))
        const gameDoc = gamesSnapshot.docs.find(
          (doc) => generateSlug(doc.data().name) === slug
        )

        if (gameDoc) {
          setGameId(gameDoc.id)
        } else {
          navigate('/games-list')
        }
      } catch (error) {
        navigate('/games-list')
      }
    }

    fetchGameId()
  }, [slug, location.state, navigate, generateSlug])

  useEffect(() => {
    const fetchGameData = async () => {
      if (!gameId) return

      try {
        setLoading(true)
        const gameDoc = await getDoc(doc(db, 'games', gameId))

        if (!gameDoc.exists()) {
          navigate('/games-list')
          return
        }

        const gameData = gameDoc.data()
        setGame({
          id: gameId,
          ...gameData,
        })

        const crewsSnapshot = await getDocs(collection(db, 'crews'))

        const crewsWithGameStatus = []
        const crewQueries = []

        for (const crewDoc of crewsSnapshot.docs) {
          const crewId = crewDoc.id
          const crewData = crewDoc.data()

          const queryPromise = getDoc(
            doc(db, 'crews', crewId, 'games', gameId)
          ).then((gameInCrewDoc) => {
            if (gameInCrewDoc.exists()) {
              const gameInCrewData = gameInCrewDoc.data()
              crewsWithGameStatus.push({
                id: crewId,
                name: crewData.title || crewData.name,
                season: crewData.season,
                numberOfMembers: crewData.numberOfMembers || 0,
                points: gameInCrewData.points || 0,
              })
            }
          })

          crewQueries.push(queryPromise)
        }

        await Promise.all(crewQueries)

        crewsWithGameStatus.sort((a, b) => {
          const statusOrder = { Confirmado: 0, Pendiente: 1, Rechazado: 2 }
          return (
            statusOrder[a.participationStatus] -
            statusOrder[b.participationStatus]
          )
        })

        setCrews(crewsWithGameStatus)
      } catch (error) {
        // Error al cargar el juego, navegación o manejo silencioso
      } finally {
        setLoading(false)
      }
    }

    fetchGameData()
  }, [gameId, navigate])

  if (loading) {
    return <Loader loading={true} />
  }

  if (!game) {
    return (
      <div className="p-[4%] text-center">
        <p className="t20r">{t(`${viewDictionary}.gameNotFound`)}</p>
        <DynamicButton
          onClick={() => navigate('/games-list')}
          size="medium"
          state="normal"
          type="primary"
          textId={t(`${viewDictionary}.backToList`)}
          className="mt-[4vh]"
        />
      </div>
    )
  }

  const gameDetailsItems = [
    {
      title: t(`${viewDictionary}.dateLabel`),
      description: game.date,
      type: 'gameData',
    },
    {
      title: t(`${viewDictionary}.timeLabel`),
      description: game.time,
      type: 'gameData',
    },
    {
      title: t(`${viewDictionary}.locationLabel`),
      description: game.location,
      type: 'gameData',
    },
  ]

  const gameParticipantsItems = [
    {
      title: t(`${viewDictionary}.minParticipantsLabel`),
      description: game.minParticipants.toString(),
      type: 'gameData',
    },
    {
      title: t(`${viewDictionary}.seasonLabel`),
      description: game.season,
      type: 'gameData',
    },
  ]

  return (
    <div className="h-auto px-[4%] pb-[4vh]">
      <h1 className="mb-[8vh] text-center t40b sm:t64b">{game.name}</h1>

      <div className="grid grid-cols-1 gap-[3vh]">
        <div className="col-span-3 mb-[3vh]">
          <div className="p-[5%] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-[5vh] h-fit">
            <div className="flex mb-[3vh] space-x-[3%]"></div>
            <h2 className="mb-[3vh] sm:t40b t24b">
              {' '}
              {t(`${viewDictionary}.descriptionTitle`)}
            </h2>
            <p className="sm:t20r t16r">{game.description}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[3vh]">
          <div className="space-y-[3vh] w-full rounded-[5vh] h-fit mb-[4vh] text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
            <h3 className="pt-[3vh] px-[5%] sm:t40b t24b">
              {t(`${viewDictionary}.dateInfoTitle`)}
            </h3>
            <div className="px-[5%] pb-[3vh]">
              <DynamicItems items={gameDetailsItems} />
            </div>
          </div>

          <div className="space-y-[3vh] w-full rounded-[5vh] h-fit mb-[4vh] text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
            <h3 className="pt-[3vh] px-[5%] sm:t40b t24b">
              {t(`${viewDictionary}.gameInfoTitle`)}
            </h3>
            <div className="px-[5%] pb-[3vh]">
              <DynamicItems items={gameParticipantsItems} />
            </div>
          </div>
        </div>
      </div>

      {/* Sección de peñas participantes - Versión simplificada */}
      {userData?.role === 'admin' && crews.length > 0 && (
        <div className="mt-[8vh]">
          <h2 className="mb-[4vh] text-center t40b">
            {t(`${viewDictionary}.participatingCrewsTitle`)}
          </h2>

          <div className="grid grid-cols-1 gap-[3vh] md:grid-cols-2 lg:grid-cols-3">
            {crews.map((crew) => (
              <div
                key={crew.id}
                className="flex flex-col items-center p-[5%] bg-white shadow rounded-xl"
              >
                <h3 className="mb-[2vh] t20b">{crew.name}</h3>

                <div className="flex flex-wrap justify-center gap-[1vh] mb-[2vh] w-full">
                  {crew.points >= 0 && (
                    <span className="px-[3%] py-[0.5vh] text-blue-800 bg-blue-100 rounded-full t12r">
                      {t(`${viewDictionary}.points`, {
                        points: crew.points,
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {userData?.role === 'admin' && crews.length === 0 && (
        <div className="p-[5%] mt-[8vh] text-center bg-gray-50 rounded-xl">
          <h2 className="mb-[3vh] text-gray-700 t24b">
            {t(`${viewDictionary}.noCrewsTitle`)}
          </h2>
          <p className="text-gray-600 t16r">
            {t(`${viewDictionary}.noCrewsDescription`)}
          </p>
        </div>
      )}

      <div className="flex justify-center mt-[6vh]">
        <DynamicButton
          onClick={() => navigate('/games-list')}
          size="medium"
          state="normal"
          type="primary"
          textId={t(`${viewDictionary}.backToList`)}
        />
      </div>
    </div>
  )
}

export default GamesDetails
