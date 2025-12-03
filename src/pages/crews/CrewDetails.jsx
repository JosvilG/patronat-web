import React, { useState, useEffect, useContext } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  setDoc,
  addDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import useSlug from '../../hooks/useSlug'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import { STATUS, getStatusClass } from '../../models/statusData'
import { AuthContext } from '../../contexts/AuthContext'
import DOMPurify from 'dompurify'
import { ensureCrewGamesOnApprove } from '../../hooks/ensureCrewGamesOnApprove'

const AUTHORIZED_ROLES = ['admin']

const sanitizeHTML = (html) => {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'iframe', 'style', 'object'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  })
}

const logAction = async (userId, action, details) => {
  try {
    await addDoc(collection(db, 'actionLogs'), {
      userId,
      action,
      details,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    // Error logging action
  }
}

const CrewDetails = () => {
  const { slug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { generateSlug } = useSlug()
  const viewDictionary = 'pages.crew.details'

  const { user, userData, loading: authLoading } = useContext(AuthContext)

  const [crew, setCrew] = useState(null)
  const [crewGames, setCrewGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [responsables, setResponsables] = useState([])
  const [actionLoading, setActionLoading] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate('/login', { state: { returnUrl: location.pathname } })
      return
    }

    const hasPermission =
      userData &&
      (AUTHORIZED_ROLES.includes(userData.role) ||
        (crew?.responsable && crew.responsable.includes(user.uid)))

    setIsAuthorized(hasPermission || false)
  }, [user, userData, authLoading, crew, navigate, location.pathname])

  useEffect(() => {
    const fetchCrewData = async () => {
      if (authLoading) return

      if (!user) {
        setError(t(`${viewDictionary}.loginNeeded`))
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        let crewId = location.state?.crewId

        if (!crewId && slug) {
          const crewsSnapshot = await getDocs(
            query(collection(db, 'crews'), where('status', '!=', 'deleted'))
          )

          for (const crewDoc of crewsSnapshot.docs) {
            const crewData = crewDoc.data()
            if (crewData.title) {
              const currentSlug = generateSlug(crewData.title)
              if (currentSlug === slug) {
                crewId = crewDoc.id
                break
              }
            }
          }
        }

        if (!crewId) {
          setError(t(`${viewDictionary}.notFindedCrew`))
          setLoading(false)
          return
        }

        const crewRef = doc(db, 'crews', crewId)
        const crewDoc = await getDoc(crewRef)

        if (!crewDoc.exists()) {
          setError(t(`${viewDictionary}.notFindedCrew`))
          setLoading(false)
          return
        }

        const crewData = { id: crewDoc.id, ...crewDoc.data() }

        if (
          crewData.status === STATUS.DELETED &&
          !AUTHORIZED_ROLES.includes(userData?.role)
        ) {
          setError(t(`${viewDictionary}.noAvailableCrew`))
          setLoading(false)
          return
        }

        setCrew(crewData)

        if (
          !crewData.responsable?.includes(user.uid) &&
          userData?.role !== 'admin'
        ) {
          await updateDoc(crewRef, {
            viewCount: (crewData.viewCount || 0) + 1,
            lastViewed: serverTimestamp(),
          })
        }

        if (crewData.responsable && crewData.responsable.length > 0) {
          const responsablesLimit = Math.min(crewData.responsable.length, 10)
          const responsablesData = []

          for (let i = 0; i < responsablesLimit; i++) {
            const userId = crewData.responsable[i]
            try {
              if (!userId) continue

              const userDoc = await getDoc(doc(db, 'users', userId))
              if (userDoc.exists()) {
                const userData = userDoc.data()
                responsablesData.push({
                  id: userDoc.id,
                  firstName: userData.firstName || '',
                  lastName: userData.lastName || '',
                  email: userData.email || '',
                })
              }
            } catch (error) {
              // Error al obtener responsable
            }

            setResponsables(responsablesData)
          }
        }

        try {
          const gamesQuery = query(
            collection(db, 'crews', crewId, 'games'),
            where('gameStatus', '!=', STATUS.DELETED)
          )

          const gamesSnapshot = await getDocs(gamesQuery)

          if (!gamesSnapshot.empty) {
            const gamesData = []
            const gameDocsLimit = Math.min(gamesSnapshot.docs.length, 50)

            for (let i = 0; i < gameDocsLimit; i++) {
              const gameDoc = gamesSnapshot.docs[i]
              const gameData = { id: gameDoc.id, ...gameDoc.data() }

              try {
                const mainGameDoc = await getDoc(doc(db, 'games', gameDoc.id))
                if (mainGameDoc.exists()) {
                  const mainGameData = mainGameDoc.data()
                  Object.assign(gameData, {
                    name: mainGameData.name,
                    description: mainGameData.description,
                    date: mainGameData.date,
                    location: mainGameData.location,
                    status: mainGameData.status,
                  })
                }
              } catch (error) {
                // Error al obtener detalles del juego
              }

              gamesData.push(gameData)
            }

            const sortedGames = gamesData.sort((a, b) => {
              let dateA, dateB

              try {
                dateA = a.date
                  ? new Date(a.date.split('/').reverse().join('-'))
                  : new Date(0)
              } catch (e) {
                dateA = new Date(0)
              }

              try {
                dateB = b.date
                  ? new Date(b.date.split('/').reverse().join('-'))
                  : new Date(0)
              } catch (e) {
                dateB = new Date(0)
              }

              return dateB - dateA
            })

            setCrewGames(sortedGames)
          }
        } catch (gameError) {
          // Error al cargar juegos
        }

        setLoading(false)
      } catch (error) {
        setError(t(`${viewDictionary}.error`))
        setLoading(false)
        logAction(user?.uid || 'anonymous', 'error_loading_crew', {
          slug,
          error: error.message,
          stackTrace: error.stack?.substring(0, 500),
        })
      }
    }

    fetchCrewData()
  }, [slug, location.state, generateSlug, user, authLoading, userData?.role])

  const handleApprove = async () => {
    if (!isAuthorized || !AUTHORIZED_ROLES.includes(userData?.role)) {
      showPopup({
        title: t(`${viewDictionary}.accessDeniedTitle`),
        text: t(`${viewDictionary}.accessDeniedText`),
        icon: 'error',
      })
      return
    }

    try {
      setActionLoading(true)

      await runTransaction(db, async (transaction) => {
        const crewRef = doc(db, 'crews', crew.id)
        const crewSnap = await transaction.get(crewRef)

        if (!crewSnap.exists()) {
          throw new Error('La peña ya no existe')
        }

        const currentData = crewSnap.data()
        if (currentData.status !== STATUS.PENDING) {
          throw new Error(
            `La peña ya no está pendiente (estado actual: ${currentData.status})`
          )
        }

        transaction.update(crewRef, {
          status: STATUS.ACTIVE,
          updatedAt: serverTimestamp(),
          approvedBy: user.uid,
          approvedAt: serverTimestamp(),
        })

        const logRef = doc(collection(db, 'actionLogs'))
        transaction.set(logRef, {
          userId: user.uid,
          action: 'approve_crew',
          targetId: crew.id,
          timestamp: serverTimestamp(),
          details: {
            crewName: crew.title,
            previousStatus: currentData.status,
          },
        })
      })

      try {
        const messagesQuery = query(
          collection(db, 'messages'),
          where('crewId', '==', crew.id),
          where('messageType', '==', 'rechazo')
        )

        const messagesSnapshot = await getDocs(messagesQuery)
        let deletedMessagesCount = 0

        if (!messagesSnapshot.empty) {
          const batch = []
          let currentBatch = []

          messagesSnapshot.forEach((messageDoc) => {
            currentBatch.push(doc(db, 'messages', messageDoc.id))

            if (currentBatch.length >= 500) {
              batch.push([...currentBatch])
              currentBatch = []
            }
          })

          if (currentBatch.length > 0) {
            batch.push(currentBatch)
          }

          for (const batchItems of batch) {
            await runTransaction(db, async (transaction) => {
              batchItems.forEach((docRef) => {
                transaction.delete(docRef)
              })
            })
            deletedMessagesCount += batchItems.length
          }
        }

        const { createdCount, totalActiveGames, alreadyHadGames } =
          await ensureCrewGamesOnApprove(crew.id, {
            addedBy: user.uid,
            statusActive: STATUS.ACTIVE,
            participationPending: STATUS.PENDING,
          })

        setCrew({
          ...crew,
          status: STATUS.ACTIVE,
        })

        let successMessage =
          createdCount > 0
            ? t(`${viewDictionary}.approvalWithGames`, { count: createdCount })
            : alreadyHadGames
              ? t(`${viewDictionary}.approvalSuccess`)
              : totalActiveGames === 0
                ? t(`${viewDictionary}.approvalSuccess`)
                : t(`${viewDictionary}.approvalSuccess`)

        if (deletedMessagesCount > 0) {
          successMessage +=
            ' ' +
            t(`${viewDictionary}.messagesDeleted`, {
              count: deletedMessagesCount,
            })
        }

        await logAction(user.uid, 'crew_approval_success', {
          crewId: crew.id,
          crewName: crew.title,
          gamesAdded: createdCount,
          messagesDeleted: deletedMessagesCount,
        })

        showPopup({
          title: t(`${viewDictionary}.approvalTitle`),
          text: sanitizeHTML(successMessage),
          icon: 'success',
          onConfirm: () => window.location.reload(),
        })
      } catch (innerError) {
        await logAction(user.uid, 'crew_post_approval_error', {
          crewId: crew.id,
          error: innerError.message,
        })
      }
    } catch (error) {
      await logAction(user.uid, 'crew_approval_failed', {
        crewId: crew.id,
        error: error.message,
      })
      showPopup({
        title: t(`${viewDictionary}.errorTitle`),
        text: t(`${viewDictionary}.approvalError`),
        icon: 'error',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!isAuthorized || !AUTHORIZED_ROLES.includes(userData?.role)) {
      showPopup({
        title: t(`${viewDictionary}.accessDeniedTitle`),
        text: t(`${viewDictionary}.accessDeniedText`),
        icon: 'error',
      })
      return
    }

    try {
      const rejectOptions = {
        title: t(`${viewDictionary}.rejectTitle`, 'Rechazar peña'),
        text: sanitizeHTML(`<p>${t(`${viewDictionary}.rejectConfirmation`)}</p>
               <label class="swal2-input-label">${t(`${viewDictionary}.rejectReason`)}</label>
               <textarea class="swal2-textarea" placeholder="${t(`${viewDictionary}.rejectReasonPlaceholder`)}" aria-label="${t(`${viewDictionary}.rejectReason`)}" required maxlength="500"></textarea>`),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#8be484',
        cancelButtonColor: '#a3a3a3',
        confirmButtonText: t(`${viewDictionary}.rejectConfirmButton`),
        cancelButtonText: t(`${viewDictionary}.rejectCancelButton`),
        preConfirm: () => {
          const textarea = document.querySelector('.swal2-textarea')
          if (!textarea || !textarea.value.trim()) {
            return false
          }
          return textarea.value.trim().substring(0, 500)
        },
      }

      showPopup({
        ...rejectOptions,
        onConfirm: async () => {
          const textarea = document.querySelector('.swal2-textarea')
          if (!textarea || !textarea.value.trim()) {
            return
          }

          const rejectReason = textarea.value.trim().substring(0, 500)
          setActionLoading(true)

          try {
            await runTransaction(db, async (transaction) => {
              const crewRef = doc(db, 'crews', crew.id)
              const crewSnap = await transaction.get(crewRef)

              if (!crewSnap.exists()) {
                throw new Error(t(`${viewDictionary}.alreadyExistsError`))
              }

              const currentData = crewSnap.data()
              if (currentData.status !== STATUS.PENDING) {
                throw new Error(
                  t(`${viewDictionary}.actualStatusNotWaiting`, {
                    status: currentData.status,
                  })
                )
              }

              transaction.update(crewRef, {
                status: STATUS.REJECTED,
                updatedAt: serverTimestamp(),
                rejectedBy: user.uid,
                rejectedAt: serverTimestamp(),
                rejectionReason: rejectReason,
              })

              const messageRef = doc(collection(db, 'messages'))
              transaction.set(messageRef, {
                crewId: crew.id,
                crewName: crew.title,
                messageType: 'rechazo',
                message: rejectReason,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
              })

              const logRef = doc(collection(db, 'actionLogs'))
              transaction.set(logRef, {
                userId: user.uid,
                action: 'reject_crew',
                targetId: crew.id,
                timestamp: serverTimestamp(),
                details: {
                  crewName: crew.title,
                  previousStatus: currentData.status,
                  reason: rejectReason,
                },
              })
            })

            setCrew({
              ...crew,
              status: STATUS.REJECTED,
            })

            await logAction(user.uid, 'crew_rejection_success', {
              crewId: crew.id,
              crewName: crew.title,
            })

            showPopup({
              title: t(`${viewDictionary}.rejectSuccessTitle`, 'Rechazada'),
              text: t(`${viewDictionary}.rejectSuccess`),
              icon: 'info',
            })
          } catch (error) {
            await logAction(user.uid, 'crew_rejection_failed', {
              crewId: crew.id,
              error: error.message,
            })
            showPopup({
              title: t(`${viewDictionary}.errorTitle`, 'Error'),
              text: t(`${viewDictionary}.rejectError`),
              icon: 'error',
            })
          } finally {
            setActionLoading(false)
          }
        },
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.errorTitle`, 'Error'),
        text: t(`${viewDictionary}.rejectError`),
        icon: 'error',
      })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="w-[92%] mx-auto pb-[4vh] min-h-dvh">
        <Loader loading={true} text={t(`${viewDictionary}.loading`)} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-[92%] mx-auto pb-[4vh] min-h-dvh">
        <div className="p-[3%] text-center text-red-600">
          {t(`${viewDictionary}.error`, error)}
        </div>
        <div className="flex justify-center mt-[2vh]">
          <DynamicButton
            onClick={() => navigate('/crews')}
            size="medium"
            type="view"
            textId={t(`${viewDictionary}.backToCrews`)}
          />
        </div>
      </div>
    )
  }

  if (!isAuthorized && crew) {
    return (
      <div className="w-[92%] mx-auto pb-[4vh] min-h-dvh">
        <div className="p-[3%] text-center text-red-600">
          {t(`${viewDictionary}.unauthorized`)}
        </div>
        <div className="flex justify-center mt-[2vh]">
          <DynamicButton
            onClick={() => navigate('/crews')}
            size="medium"
            type="view"
            textId={t(`${viewDictionary}.backToCrews`)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="w-[92%] mx-auto pb-[4vh] min-h-dvh">
      <h1 className="mb-[4vh] text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`)}
      </h1>

      {crew && (
        <div className="space-y-[3vh]">
          {crew.status === STATUS.PENDING &&
            isAuthorized &&
            AUTHORIZED_ROLES.includes(userData?.role) && (
              <div className="p-[3%] mb-[3vh] text-center text-red-700 bg-red-100 border border-red-200 rounded-[1rem] sm:rounded-[1.5rem]">
                <p className="mb-[1vh] t18b">
                  {t(`${viewDictionary}.pendingApproval`)}
                </p>
                <div className="flex flex-wrap justify-center gap-[2vw] mt-[2vh]">
                  <DynamicButton
                    onClick={handleApprove}
                    size="small"
                    type="confirm"
                    textId={t(`${viewDictionary}.approveButton`)}
                    disabled={actionLoading}
                  />
                  <DynamicButton
                    onClick={handleReject}
                    size="small"
                    type="cancel"
                    textId={t(`${viewDictionary}.rejectButton`)}
                    disabled={actionLoading}
                  />
                </div>
                {actionLoading && (
                  <div className="mt-[2vh]">
                    <Loader
                      loading={true}
                      text={t(`${viewDictionary}.processingAction`)}
                    />
                  </div>
                )}
              </div>
            )}

          <div className="p-[5%] space-y-[3vh] rounded-[2rem] sm:rounded-[3rem] h-fit mb-[3vh] text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
            <div className="grid grid-cols-1 gap-[4vh] lg:grid-cols-2">
              <div>
                <h2 className="mb-[2vh] t24b">
                  {t(`${viewDictionary}.basicInfo`)}
                </h2>

                <div className="flex items-center mb-[2vh]">
                  <h3 className="t32b">{crew.title}</h3>
                  {crew.status && (
                    <span
                      className={`ml-[3%] px-[3%] py-[1%] rounded-full t14r ${getStatusClass(crew.status)}`}
                    >
                      {crew.status}
                    </span>
                  )}
                </div>

                {crew.logoURL && (
                  <div className="mb-[2vh]">
                    <img
                      src={crew.logoURL}
                      alt={t(
                        `${viewDictionary}.logoAlt`,
                        { name: crew.title },
                        `Logo de ${crew.title}`
                      )}
                      className="object-cover w-24 h-24 border-4 border-white rounded-full shadow-md sm:w-32 sm:h-32"
                    />
                  </div>
                )}

                <p className="mb-[1vh] t16r">
                  <span className="font-bold">
                    {t(`${viewDictionary}.members`)}
                  </span>{' '}
                  {((crew.membersNames && crew.membersNames.length) || 0) +
                    ((crew.responsable && crew.responsable.length) || 0)}
                </p>

                {crew.season && (
                  <p className="mb-[1vh] t16r">
                    <span className="font-bold">
                      {t(`${viewDictionary}.season`)}
                    </span>{' '}
                    {crew.season}
                  </p>
                )}

                {crew.createdAt && (
                  <p className="mb-[1vh] t16r">
                    <span className="font-bold">
                      {t(`${viewDictionary}.creationDate`)}
                    </span>{' '}
                    {crew.createdAt instanceof Date
                      ? crew.createdAt.toLocaleDateString()
                      : crew.createdAt.seconds
                        ? new Date(
                            crew.createdAt.seconds * 1000
                          ).toLocaleDateString()
                        : t(`${viewDictionary}.dateNotAvailable`)}
                  </p>
                )}

                {crew.updatedAt && (
                  <p className="mb-[1vh] t16r">
                    <span className="font-bold">
                      {t(`${viewDictionary}.lastUpdate`)}
                    </span>{' '}
                    {crew.updatedAt instanceof Date
                      ? crew.updatedAt.toLocaleDateString()
                      : crew.updatedAt.seconds
                        ? new Date(
                            crew.updatedAt.seconds * 1000
                          ).toLocaleDateString()
                        : t(`${viewDictionary}.dateNotAvailable`)}
                  </p>
                )}
              </div>

              <div>
                <h2 className="mb-[2vh] t24b">
                  {t(`${viewDictionary}.membersSection`)}
                </h2>

                {crew.membersNames && crew.membersNames.length > 0 ? (
                  <div className="grid grid-cols-1 gap-[1vh] md:grid-cols-2">
                    {crew.membersNames.map((memberName, index) => (
                      <div
                        key={index}
                        className="p-[2%] bg-opacity-50 rounded-lg"
                      >
                        <p className="t16r">{memberName}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 t16r">
                    {t(`${viewDictionary}.noMembers`)}
                  </p>
                )}

                <h2 className="mt-[3vh] mb-[2vh] t24b">
                  {t(`${viewDictionary}.responsables`)}
                </h2>

                {responsables.length > 0 ? (
                  <div className="space-y-[1vh]">
                    {responsables.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center p-[3%] bg-opacity-50 rounded-lg"
                        onClick={() =>
                          isAuthorized &&
                          navigate(
                            `/profile/${generateSlug(`${user.firstName} ${user.lastName}`)}`,
                            { state: { userId: user.id } }
                          )
                        }
                        style={{ cursor: isAuthorized ? 'pointer' : 'default' }}
                      >
                        <div>
                          <p className="t16b">
                            {user.firstName} {user.lastName}
                          </p>
                          {isAuthorized && (
                            <p className="text-gray-600 t14r">{user.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 t16r">
                    {t(`${viewDictionary}.noResponsables`)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {crewGames.length > 0 && (
            <div className="p-[5%] space-y-[3vh] rounded-[2rem] sm:rounded-[3rem] h-fit mb-[3vh] text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
              <h2 className="mb-[2vh] t24b">
                {t(`${viewDictionary}.gamesSection`)}
              </h2>

              <div className="space-y-[2vh]">
                {crewGames.map((game) => (
                  <div
                    key={game.id}
                    className="p-[3%] transition-shadow bg-white shadow-sm bg-opacity-70 rounded-[1rem] hover:shadow-md"
                    onClick={() =>
                      isAuthorized &&
                      navigate(
                        `/game-details/${generateSlug(game.name || 'juego')}`,
                        {
                          state: { gameId: game.id },
                        }
                      )
                    }
                    style={{ cursor: isAuthorized ? 'pointer' : 'default' }}
                  >
                    <div className="flex flex-col justify-between md:flex-row md:items-center">
                      <div className="flex-1 overflow-hidden">
                        <h3 className="truncate t18b">
                          {game.name || 'Sin nombre'}
                        </h3>
                        <div className="flex flex-wrap gap-[1vh] mt-[1vh]">
                          {game.date && (
                            <span className="px-[2%] py-[1%] text-purple-800 bg-purple-100 rounded-full t12r">
                              {game.date}
                            </span>
                          )}
                          {game.location && (
                            <span className="px-[2%] py-[1%] text-blue-800 bg-blue-100 rounded-full t12r max-w-[200px] truncate">
                              {game.location}
                            </span>
                          )}
                          {game.gameStatus && (
                            <span
                              className={`px-[2%] py-[1%] rounded-full t12r ${getStatusClass(game.gameStatus)}`}
                            >
                              {game.gameStatus}
                            </span>
                          )}
                        </div>

                        {game.description && (
                          <p className="mt-[1vh] text-gray-700 t14r line-clamp-2 max-w-prose">
                            {sanitizeHTML(game.description)}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0 mt-[2vh] md:mt-0 md:ml-[2vw]">
                        <div className="flex flex-col items-center">
                          <span className="t14b">
                            {t(`${viewDictionary}.points`)}
                          </span>
                          <span
                            className={`t24b ${game.points > 0 ? 'text-green-600' : 'text-gray-500'}`}
                          >
                            {game.points || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-[2vw]">
            <DynamicButton
              onClick={() => navigate(`/crews-list`)}
              size="medium"
              type="view"
              textId={t(`${viewDictionary}.backToCrews`)}
            />

            {isAuthorized && (
              <DynamicButton
                onClick={() =>
                  navigate(`/crews-modify/${slug}`, {
                    state: { crewId: crew.id },
                  })
                }
                size="medium"
                type="edit"
                textId={t(`${viewDictionary}.editCrew`)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CrewDetails
