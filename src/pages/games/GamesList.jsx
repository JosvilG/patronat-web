import React, { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import useSlug from '../../hooks/useSlug'
import useSearchFilter from '../../hooks/useSearchFilter'
import { showPopup } from '../../services/popupService'

function GamesList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const viewDictionary = 'pages.games.fullListGames'
  const { generateSlug } = useSlug()

  const {
    searchQuery,
    filteredItems: filteredGames,
    handleSearchChange,
    updateItems,
  } = useSearchFilter([], {
    searchFields: ['name', 'description', 'season', 'location', 'status'],
    debounceTime: 300,
    caseSensitive: false,
  })

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'games'))
        const gameData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        const sortedGameData = gameData.sort((a, b) => {
          const dateA = a.date
            ? new Date(a.date.split('/').reverse().join('-'))
            : new Date(0)
          const dateB = b.date
            ? new Date(b.date.split('/').reverse().join('-'))
            : new Date(0)

          return dateB - dateA
        })

        updateItems(sortedGameData)
        setGames(sortedGameData)
      } catch (error) {
        // Error al obtener los juegos, manejo silencioso
      }
    }

    fetchGames()
  }, [updateItems])

  const handleDelete = async (id) => {
    try {
      const confirmResult = await showPopup({
        title: t(`${viewDictionary}.deletePopups.titleSure`),
        text: t(`${viewDictionary}.deletePopups.textSure`),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#8be484',
        cancelButtonColor: '#a3a3a3',
        confirmButtonText: t(`${viewDictionary}.deleteButton`),
        cancelButtonText: t('components.buttons.cancel'),
      })

      if (!confirmResult || confirmResult.isConfirmed === false) {
        return
      }

      const crewsSnapshot = await getDocs(collection(db, 'crews'))

      const deletePromises = []
      crewsSnapshot.docs.forEach((crewDoc) => {
        const crewId = crewDoc.id
        const gameDocRef = doc(db, 'crews', crewId, 'games', id)
        deletePromises.push(deleteDoc(gameDocRef))
      })

      await Promise.all(deletePromises)

      await deleteDoc(doc(db, 'games', id))

      const updatedGames = games.filter((game) => game.id !== id)
      setGames(updatedGames)
      updateItems(updatedGames)

      showPopup({
        title: t(`${viewDictionary}.deletePopups.titleSuccessDelete`),
        text: t(`${viewDictionary}.deletePopups.textSuccessDelete`),
        icon: 'success',
        confirmButtonText: t('components.buttons.accept'),
        confirmButtonColor: '#8be484',
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.titleError`),
        text: t(`${viewDictionary}.deletePopups.textDeleteError`),
        icon: 'error',
        confirmButtonText: t('components.buttons.close'),
        confirmButtonColor: '#a3a3a3',
      })
    }
  }

  const handleToggleStatus = async (game) => {
    try {
      const currentStatus = game.status || 'Inactivo'
      const newStatus = currentStatus === 'Activo' ? 'Inactivo' : 'Activo'

      const confirmResult = await showPopup({
        title: t(`${viewDictionary}.statusToggle.title`),
        text: t(`${viewDictionary}.statusToggle.text`, {
          currentStatus: currentStatus,
          newStatus: newStatus,
        }),
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#8be484',
        cancelButtonColor: '#a3a3a3',
        confirmButtonText: t(`${viewDictionary}.statusToggle.confirmButton`),
        cancelButtonText: t('components.buttons.cancel'),
      })

      if (!confirmResult || confirmResult.isConfirmed === false) {
        return
      }

      const gameRef = doc(db, 'games', game.id)
      await updateDoc(gameRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      })

      try {
        await updateGameStatusInCrews(game.id, newStatus, game)
      } catch (crewUpdateError) {
        // console.error('Error al actualizar en crews:', crewUpdateError)
      }

      const updatedGames = games.map((g) =>
        g.id === game.id ? { ...g, status: newStatus } : g
      )

      setGames(updatedGames)
      updateItems(updatedGames)

      showPopup({
        title: t(`${viewDictionary}.statusToggle.success.title`),
        text: t(`${viewDictionary}.statusToggle.success.text`, {
          status: newStatus.toLowerCase(),
        }),
        icon: 'success',
        confirmButtonText: t('components.buttons.accept'),
        confirmButtonColor: '#8be484',
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.titleError`),
        text: t(`${viewDictionary}.statusToggle.error.text`),
        icon: 'error',
        confirmButtonText: t('components.buttons.close'),
        confirmButtonColor: '#a3a3a3',
      })
    }
  }

  const updateGameStatusInCrews = async (gameId, newStatus, gameData) => {
    const crewsSnapshot = await getDocs(collection(db, 'crews'))
    const batch = writeBatch(db)
    let updatesCount = 0

    for (const crewDoc of crewsSnapshot.docs) {
      const crewId = crewDoc.id

      const gameSubcolRef = doc(db, 'crews', crewId, 'games', gameId)
      const gameSubcolDoc = await getDoc(gameSubcolRef)

      if (gameSubcolDoc.exists()) {
        batch.update(gameSubcolRef, {
          gameStatus: newStatus,
          updatedAt: serverTimestamp(),
        })
        updatesCount++
      } else {
        const gameDataToAdd = {
          gameId: gameId,
          gameName: gameData.name || '',
          gameDate: gameData.date || '',
          gameSeason: gameData.season || '',
          gameStatus: newStatus,
          participationStatus: 'Pendiente',
          points: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }

        batch.set(gameSubcolRef, gameDataToAdd)
        updatesCount++
      }

      if (updatesCount >= 450) {
        await batch.commit()
        updatesCount = 0
      }
    }

    if (updatesCount > 0) {
      await batch.commit()
    }
  }

  const handleMarkAsCompleted = async (game) => {
    try {
      if (game.status === 'Completado') {
        showPopup({
          title: t(`${viewDictionary}.markCompleted.alreadyCompleted.title`),
          text: t(`${viewDictionary}.markCompleted.alreadyCompleted.text`),
          icon: 'info',
          confirmButtonText: t('components.buttons.accept'),
          confirmButtonColor: '#8be484',
        })
        return
      }

      const confirmResult = await showPopup({
        title: t(`${viewDictionary}.markCompleted.title`),
        text: t(`${viewDictionary}.markCompleted.text`, {
          gameName: game.name,
        }),
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#8be484',
        cancelButtonColor: '#a3a3a3',
        confirmButtonText: t(`${viewDictionary}.markCompleted.confirmButton`),
        cancelButtonText: t('components.buttons.cancel'),
      })

      if (!confirmResult || confirmResult.isConfirmed === false) {
        return
      }

      const gameRef = doc(db, 'games', game.id)
      await updateDoc(gameRef, {
        status: 'Completado',
        updatedAt: serverTimestamp(),
      })

      await updateGameStatusInCrews(game.id, 'Completado', game)

      const updatedGames = games.map((g) =>
        g.id === game.id ? { ...g, status: 'Completado' } : g
      )

      setGames(updatedGames)
      updateItems(updatedGames)

      showPopup({
        title: t(`${viewDictionary}.markCompleted.success.title`),
        text: t(`${viewDictionary}.markCompleted.success.text`),
        icon: 'success',
        confirmButtonText: t('components.buttons.accept'),
        confirmButtonColor: '#8be484',
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.titleError`),
        text: t(`${viewDictionary}.markCompleted.error.text`),
        icon: 'error',
        confirmButtonText: t('components.buttons.close'),
        confirmButtonColor: '#a3a3a3',
      })
    }
  }

  return (
    <div className="w-[92%] sm:w-full md:w-auto pb-[4vh] mx-auto">
      <h1 className="mb-[4vh] text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`)}
      </h1>

      <div className="grid grid-cols-1 gap-[3vh] mb-[4vh] md:grid-cols-2">
        <div className="md:col-span-1">
          <DynamicInput
            name="search"
            type="text"
            textId={t(`${viewDictionary}.searchPlaceholder`)}
            placeholder={t(`${viewDictionary}.searchPlaceholder`)}
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex items-end justify-end md:col-span-1">
          <DynamicButton
            onClick={() => navigate(`/games-register/`)}
            size="small"
            state="normal"
            type="add"
            textId={t(`${viewDictionary}.addNewButton`)}
          />
        </div>
      </div>

      <ul className="space-y-[3vh]">
        {filteredGames.map((game) => (
          <li
            key={game.id}
            className="flex flex-col p-[4%] space-y-[2vh] bg-gray-100 rounded-lg shadow sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:space-x-[3%]"
          >
            <div className="flex flex-col space-y-[1vh] sm:max-w-[65%]">
              <span className="t16b">{game.name}</span>
              <div className="flex flex-wrap gap-[1vh]">
                <span className="t16l line-clamp-2 w-auto max-w-full sm:max-w-[80%]">
                  {game.description}
                </span>
              </div>
              <div className="flex flex-wrap gap-[1vh] mt-[1vh]">
                {game.season && (
                  <span className="px-[3%] py-[0.5vh] text-yellow-800 bg-yellow-100 rounded-full t12r">
                    {t(`${viewDictionary}.season`, {
                      season: game.season,
                    })}
                  </span>
                )}
                {game.location && (
                  <span className="px-[3%] py-[0.5vh] text-blue-800 bg-blue-100 rounded-full t12r">
                    {game.location}
                  </span>
                )}
                {game.date && (
                  <span className="px-[3%] py-[0.5vh] text-purple-800 bg-purple-100 rounded-full t12r">
                    {game.date}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-[2vw] justify-end">
              <DynamicButton
                onClick={() => handleToggleStatus(game)}
                size="x-small"
                state="normal"
                type={game.status === 'Activo' ? 'pause' : 'play'}
              />

              {game.status !== 'Completado' && (
                <DynamicButton
                  onClick={() => handleMarkAsCompleted(game)}
                  size="x-small"
                  state="normal"
                  type="done"
                />
              )}

              <DynamicButton
                onClick={() => {
                  const slug = generateSlug(game.name)
                  navigate(`/edit-game/${slug}`, {
                    state: { gameId: game.id },
                  })
                }}
                size="x-small"
                state="normal"
                type="edit"
              />

              <DynamicButton
                onClick={() => {
                  const slug = generateSlug(game.name)
                  navigate(`/game-details/${slug}`, {
                    state: { gameId: game.id },
                  })
                }}
                size="x-small"
                type="view"
              />

              <DynamicButton
                onClick={() => handleDelete(game.id)}
                size="x-small"
                type="delete"
              />
            </div>
          </li>
        ))}
        {filteredGames.length === 0 && (
          <li className="p-[4%] text-center bg-gray-100 rounded-lg shadow">
            <span className="text-black">
              {t(`${viewDictionary}.noGamesFound`)}
            </span>
          </li>
        )}
      </ul>
    </div>
  )
}

export default GamesList
