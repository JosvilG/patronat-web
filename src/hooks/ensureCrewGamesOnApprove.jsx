import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

export async function ensureCrewGamesOnApprove(
  crewId,
  {
    addedBy = null,
    statusActive = 'Activo',
    participationPending = 'Pendiente',
  } = {}
) {
  // Juegos activos del catálogo
  const activeGamesSnap = await getDocs(
    query(collection(db, 'games'), where('status', '==', statusActive))
  )

  // Juegos ya asignados a la crew
  const crewGamesSnap = await getDocs(collection(db, 'crews', crewId, 'games'))
  const existingIds = new Set(crewGamesSnap.docs.map((d) => d.id))

  const batch = writeBatch(db)
  let createdCount = 0
  let updatedExistingCount = 0

  if (crewGamesSnap.empty) {
    activeGamesSnap.forEach((gameDoc) => {
      const g = gameDoc.data()
      const ref = doc(db, 'crews', crewId, 'games', gameDoc.id)
      batch.set(ref, {
        gameId: gameDoc.id,
        gameName: g.name || '',
        gameSeason: g.season || '',
        gameDate: g.date || '',
        gameStatus: g.status || statusActive,
        participationStatus: participationPending,
        points: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(addedBy ? { addedBy } : {}),
      })
      createdCount++
    })
  } else {
    activeGamesSnap.forEach((gameDoc) => {
      const g = gameDoc.data()
      const ref = doc(db, 'crews', crewId, 'games', gameDoc.id)

      if (!existingIds.has(gameDoc.id)) {
        batch.set(ref, {
          gameId: gameDoc.id,
          gameName: g.name || '',
          gameSeason: g.season || '',
          gameDate: g.date || '',
          gameStatus: g.status || statusActive,
          participationStatus: participationPending,
          points: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...(addedBy ? { addedBy } : {}),
        })
        createdCount++
      } else {
        batch.set(
          ref,
          {
            gameStatus: g.status || statusActive,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
        updatedExistingCount++
      }
    })
  }

  if (createdCount + updatedExistingCount > 0) {
    await batch.commit()
  }

  return {
    createdCount,
    updatedExistingCount,
    totalActiveGames: activeGamesSnap.size,
    alreadyHadGames: !crewGamesSnap.empty,
  }
}
