import React, { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  setDoc,
  addDoc,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import useSlug from '../../hooks/useSlug'
import { showPopup } from '../../services/popupService'
import { ensureCrewGamesOnApprove } from '../../hooks/ensureCrewGamesOnApprove'

function CrewList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [crews, setCrews] = useState([])
  const [pendingCrews, setPendingCrews] = useState([])
  const [filteredCrews, setFilteredCrews] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const viewDictionary = 'pages.crew.fullListCrews'
  const { generateSlug } = useSlug()

  useEffect(() => {
    const fetchCrews = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'crews'))
        const crewData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        const pending = crewData.filter((crew) => crew.status === 'Pendiente')
        setPendingCrews(pending)

        const nonPendingCrews = crewData.filter(
          (crew) => crew.status !== 'Pendiente'
        )
        setCrews(nonPendingCrews)
        setFilteredCrews(nonPendingCrews)
      } catch (error) {
        // Error al obtener las crews
      }
    }

    fetchCrews()
  }, [])

  const handleSearchChange = (event) => {
    const query = event.target.value.toLowerCase()
    setSearchQuery(query)

    const filtered = crews.filter(
      (crew) => crew.title && crew.title.toLowerCase().includes(query)
    )

    setFilteredCrews(filtered)
  }

  const handleApprove = async (id) => {
    try {
      await showPopup({
        title: t(`${viewDictionary}.approveCrewButton`),
        text: DOMPurify.sanitize(t(`${viewDictionary}.approveCrewDescription`)),
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#8be484',
        cancelButtonColor: '#a3a3a3',
        confirmButtonText: t(`${viewDictionary}.activateButtonTitle`),
        cancelButtonText: t(`${viewDictionary}.cancelButton`),
        onConfirm: async () => {
          setLoading(true)

          const crewRef = doc(db, 'crews', id)
          await updateDoc(crewRef, {
            status: 'Activo',
            updatedAt: new Date(),
          })

          let messagesSnapshot = { size: 0 }
          let deletedMessagesCount = 0

          try {
            const messagesQuery = query(
              collection(db, 'messages'),
              where('crewId', '==', id),
              where('messageType', '==', 'rechazo')
            )

            messagesSnapshot = await getDocs(messagesQuery)

            if (!messagesSnapshot.empty) {
              const deletePromises = []

              messagesSnapshot.forEach((messageDoc) => {
                deletePromises.push(
                  deleteDoc(doc(db, 'messages', messageDoc.id))
                )
              })

              if (deletePromises.length > 0) {
                await Promise.all(deletePromises)
                deletedMessagesCount = deletePromises.length
              }
            }
          } catch (msgError) {
            // Error al eliminar mensajes de rechazo
          }

          const { createdCount, totalActiveGames, alreadyHadGames } =
            await ensureCrewGamesOnApprove(id, {
              addedBy: null,
              statusActive: 'Activo',
              participationPending: 'Pendiente',
            })

          const approvedCrew = pendingCrews.find((crew) => crew.id === id)
          if (approvedCrew) {
            const updatedApprovedCrew = { ...approvedCrew, status: 'Activo' }
            const updatedPendingCrews = pendingCrews.filter(
              (crew) => crew.id !== id
            )
            setPendingCrews(updatedPendingCrews)

            const updatedCrews = [...crews, updatedApprovedCrew]
            setCrews(updatedCrews)
            setFilteredCrews(updatedCrews)
          }

          let successMessage =
            createdCount > 0
              ? DOMPurify.sanitize(
                  t(`${viewDictionary}.approveWithGamesMessage`, {
                    count: createdCount,
                  })
                )
              : alreadyHadGames
                ? DOMPurify.sanitize(
                    t(`${viewDictionary}.approveSuccessMessage`)
                  )
                : totalActiveGames === 0
                  ? DOMPurify.sanitize(
                      t(`${viewDictionary}.approveSuccessMessage`)
                    )
                  : DOMPurify.sanitize(
                      t(`${viewDictionary}.approveSuccessMessage`)
                    )

          if (deletedMessagesCount > 0) {
            successMessage += DOMPurify.sanitize(
              t(`${viewDictionary}.deletedMessagesInfo`, {
                count: deletedMessagesCount,
                message: deletedMessagesCount === 1 ? 'mensaje' : 'mensajes',
              })
            )
          }

          showPopup({
            title: t(`${viewDictionary}.approveSuccessTitle`),
            text: successMessage,
            icon: 'success',
          })
        },
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.deleteErrorTitle`),
        text: t(`${viewDictionary}.approveErrorMessage`),
        icon: 'error',
      })
    } finally {
      setLoading && setLoading(false)
    }
  }

  const handleReject = async (id) => {
    try {
      const sanitizedConfirmMessage = DOMPurify.sanitize(
        `<p>${t(`${viewDictionary}.confirmRejectMessage`)}</p><textarea class="swal2-textarea" aria-label="Motivo de rechazo" required></textarea>`
      )

      const rejectOptions = {
        title: t(`${viewDictionary}.confirmReject`),
        text: sanitizedConfirmMessage,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#8be484',
        cancelButtonColor: '#a3a3a3',
        confirmButtonText: t(`${viewDictionary}.confirmRejectButton`),
        cancelButtonText: t(`${viewDictionary}.cancelButton`),
        preConfirm: () => {
          const textarea = document.querySelector('.swal2-textarea')
          if (!textarea || !textarea.value.trim()) {
            return false
          }
          return DOMPurify.sanitize(textarea.value)
        },
      }

      showPopup({
        ...rejectOptions,
        onConfirm: async () => {
          const textarea = document.querySelector('.swal2-textarea')
          if (!textarea || !textarea.value.trim()) {
            return
          }

          const rejectReason = DOMPurify.sanitize(textarea.value)
          setLoading && setLoading(true)

          const crewRef = doc(db, 'crews', id)
          await updateDoc(crewRef, {
            status: 'Rechazado',
            updatedAt: new Date(),
          })

          const rejectedCrew = pendingCrews.find((crew) => crew.id === id)
          await addDoc(collection(db, 'messages'), {
            crewId: id,
            crewName: rejectedCrew?.title
              ? DOMPurify.sanitize(rejectedCrew.title)
              : '',
            messageType: 'rechazo',
            message: rejectReason,
            createdAt: new Date(),
          })

          const updatedPendingCrews = pendingCrews.filter(
            (crew) => crew.id !== id
          )
          setPendingCrews(updatedPendingCrews)

          const updatedCrews = crews.map((crew) =>
            crew.id === id ? { ...crew, status: 'Rechazado' } : crew
          )
          setCrews(updatedCrews)
          setFilteredCrews(updatedCrews)

          showPopup({
            title: t(`${viewDictionary}.rejectSuccessTitle`),
            text: t(`${viewDictionary}.rejectSuccessMessage`),
            icon: 'info',
          })
        },
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.deleteErrorTitle`),
        text: t(`${viewDictionary}.rejectErrorMessage`),
        icon: 'error',
      })
    } finally {
      setLoading && setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      const confirmResult = await showPopup({
        title: t(`${viewDictionary}.confirmDelete`),
        text: t(`${viewDictionary}.confirmDeleteMessage`),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#8be484',
        cancelButtonColor: '#a3a3a3',
        confirmButtonText: t(`${viewDictionary}.confirmDeleteButton`),
        cancelButtonText: t(`${viewDictionary}.cancelButton`),
      })

      if (!confirmResult.isConfirmed) {
        return
      }

      await deleteDoc(doc(db, 'crews', id))

      const updatedCrews = crews.filter((crew) => crew.id !== id)
      setCrews(updatedCrews)
      setFilteredCrews(updatedCrews)

      showPopup({
        title: t(`${viewDictionary}.deleteSuccessTitle`),
        text: t(`${viewDictionary}.deleteSuccessMessage`),
        icon: 'success',
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.deleteErrorTitle`),
        text: t(`${viewDictionary}.deleteErrorMessage`),
        icon: 'error',
      })
    }
  }

  const handleToggleStatus = async (crewId, currentStatus) => {
    try {
      let newStatus
      let statusTitleKey
      let confirmTextKey

      switch (currentStatus) {
        case 'Activo':
          newStatus = 'Baja'
          statusTitleKey = 'deactivateConfirmTitle'
          confirmTextKey = 'deactivateConfirmMessage'
          break
        case 'Baja':
          newStatus = 'Activo'
          statusTitleKey = 'activateConfirmTitle'
          confirmTextKey = 'activateConfirmMessage'
          break
        case 'Rechazado':
          newStatus = 'Activo'
          statusTitleKey = 'activateRejectedConfirmTitle'
          confirmTextKey = 'activateRejectedConfirmMessage'
          break
        default:
          return
      }

      showPopup({
        title: t(`${viewDictionary}.${statusTitleKey}`),
        text: DOMPurify.sanitize(t(`${viewDictionary}.${confirmTextKey}`)),
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#8be484',
        cancelButtonColor: '#a3a3a3',
        confirmButtonText: t(`${viewDictionary}.toggleStatusButton`),
        cancelButtonText: t(`${viewDictionary}.cancelButton`),
        onConfirm: async () => {
          setLoading(true)

          const crewRef = doc(db, 'crews', crewId)
          await updateDoc(crewRef, {
            status: newStatus,
            updatedAt: new Date(),
          })

          const updatedCrews = crews.map((crew) =>
            crew.id === crewId ? { ...crew, status: newStatus } : crew
          )

          setCrews(updatedCrews)
          setFilteredCrews(
            updatedCrews.filter(
              (crew) =>
                crew.title &&
                crew.title.toLowerCase().includes(searchQuery.toLowerCase())
            )
          )

          showPopup({
            title: t(`${viewDictionary}.toggleStatusSuccessTitle`),
            text: DOMPurify.sanitize(
              t(`${viewDictionary}.toggleStatusSuccessMessage`, {
                status: newStatus,
              })
            ),
            icon: 'success',
          })
        },
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.deleteErrorTitle`),
        text: t(`${viewDictionary}.toggleStatusErrorMessage`),
        icon: 'error',
      })
    } finally {
      setLoading && setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center w-[92%] mx-auto pb-[4vh] sm:w-full md:w-auto sm:flex-none">
      <h1 className="mb-[4vh] text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`)}
      </h1>

      {pendingCrews.length > 0 && (
        <div className="w-full p-3 sm:p-4 mb-[4vh] transition-all duration-300 backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,220,220,0.75)] border border-red-200 rounded-lg sm:rounded-xl md:rounded-[30px] shadow-md">
          <h2 className="mb-3 text-xl text-red-700 sm:mb-4 sm:text-2xl t24b">
            {pendingCrews.length === 1
              ? t(`${viewDictionary}.pendingCrewSingular`)
              : t(`${viewDictionary}.pendingCrewsPlural`, {
                  count: pendingCrews.length,
                })}
          </h2>

          <div className="space-y-[2vh]">
            {pendingCrews.map((crew) => (
              <div
                key={crew.id}
                className="p-[4%] sm:p-[2%] border border-red-100 rounded-md sm:rounded-xl backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-[2vh] sm:space-y-0">
                  <div className="flex items-center space-x-[3%]">
                    <div>
                      <h3 className="t18b">{crew.title}</h3>
                      <div className="flex flex-wrap gap-1 mt-1 sm:gap-2">
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs text-red-800 bg-red-100 rounded-full t12r">
                          {t(`${viewDictionary}.pendingStatus`)}
                        </span>
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs text-gray-800 bg-gray-100 rounded-full t12r">
                          {(() => {
                            const memberCount = crew.membersNames?.length || 0
                            const responsibleCount = Array.isArray(
                              crew.responsable
                            )
                              ? crew.responsable.length
                              : crew.responsable
                                ? 1
                                : 0
                            const totalCount = memberCount + responsibleCount
                            return totalCount > 0
                              ? t(`${viewDictionary}.membersCount`, {
                                  count: totalCount,
                                })
                              : t(`${viewDictionary}.noMembers`)
                          })()}
                        </span>
                        {crew.season && (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs text-yellow-800 bg-yellow-100 rounded-full t12r">
                            {t(`${viewDictionary}.seasonLabel`)} {crew.season}
                          </span>
                        )}
                        {(!crew.responsable ||
                          crew.responsable.length === 0) && (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded-full text-amber-800 bg-amber-100 t12r">
                            {t(`${viewDictionary}.noResponsible`)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-[2vw] mt-[2vh] sm:mt-0">
                    <DynamicButton
                      onClick={() => {
                        const slug = generateSlug(crew.title)
                        navigate(`/crew-details/${slug}`, {
                          state: { crewId: crew.id },
                        })
                      }}
                      size="x-small"
                      state="normal"
                      type="view"
                    />
                    <DynamicButton
                      onClick={() => handleApprove(crew.id)}
                      size="x-small"
                      state="normal"
                      type="confirm"
                    />
                    <DynamicButton
                      onClick={() => handleReject(crew.id)}
                      size="x-small"
                      state="normal"
                      type="cancel"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid items-center justify-start grid-cols-1 gap-[3vh] mb-[4vh] w-full md:justify-items-end sm:grid-cols-2 sm:justify-between">
        <DynamicInput
          name="search"
          type="text"
          textId={t(`${viewDictionary}.searchPlaceholder`)}
          placeholder={t(`${viewDictionary}.searchPlaceholder`)}
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <div className="pl-0 sm:pl-[5%] md:pl-[10%] flex justify-center sm:justify-end">
          <DynamicButton
            onClick={() => navigate(`/new-crew/`)}
            size="small"
            state="normal"
            type="add"
            textId={t(`${viewDictionary}.addNewButton`)}
          />
        </div>
      </div>

      <ul className="w-full space-y-[3vh]">
        {filteredCrews.map((crew) => (
          <li
            key={crew.id}
            className="flex flex-col sm:flex-row items-center justify-between p-[4%] sm:p-[2%] space-y-[2vh] sm:space-y-0 sm:space-x-[2%] bg-gray-100 rounded-lg shadow"
          >
            <div className="flex flex-col w-full sm:w-auto">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <span className="text-lg font-semibold">{crew.title}</span>
                {crew.status && (
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full 
                      ${
                        crew.status === 'Activo'
                          ? 'text-green-800 bg-green-100'
                          : crew.status === 'Pendiente'
                            ? 'text-red-800 bg-red-100'
                            : crew.status === 'Baja'
                              ? 'text-orange-800 bg-orange-100'
                              : crew.status === 'Rechazado'
                                ? 'text-gray-800 bg-gray-200'
                                : 'text-gray-800 bg-gray-200'
                      }`}
                  >
                    {crew.status === 'Activo'
                      ? t(`${viewDictionary}.activeCrewStatus`)
                      : crew.status === 'Baja'
                        ? t(`${viewDictionary}.inactiveCrewStatus`)
                        : crew.status === 'Pendiente'
                          ? t(`${viewDictionary}.pendingCrewStatus`)
                          : crew.status === 'Rechazado'
                            ? t(`${viewDictionary}.rejectedStatus`)
                            : crew.status}
                  </span>
                )}
                {(!crew.responsable || crew.responsable.length === 0) && (
                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full text-amber-800 bg-amber-100">
                    {t(`${viewDictionary}.noResponsible`)}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-600 sm:text-sm">
                {(() => {
                  const memberCount = crew.membersNames?.length || 0
                  const responsibleCount = Array.isArray(crew.responsable)
                    ? crew.responsable.length
                    : crew.responsable
                      ? 1
                      : 0
                  const totalCount = memberCount + responsibleCount
                  return totalCount > 0
                    ? t(`${viewDictionary}.membersCount`, { count: totalCount })
                    : t(`${viewDictionary}.noMembers`)
                })()}
              </span>
            </div>

            <div className="flex space-x-[2vw] mt-[2vh] sm:mt-0">
              {crew.status !== 'Pendiente' && (
                <DynamicButton
                  onClick={() => handleToggleStatus(crew.id, crew.status)}
                  size="x-small"
                  state="normal"
                  type={crew.status === 'Activo' ? 'pause' : 'play'}
                  title={
                    crew.status === 'Activo'
                      ? t(`${viewDictionary}.deactivateButtonTitle`)
                      : t(`${viewDictionary}.activateButtonTitle`)
                  }
                />
              )}

              <DynamicButton
                onClick={() => {
                  const slug = generateSlug(crew.title)
                  navigate(`/crew-details/${slug}`, {
                    state: { crewId: crew.id },
                  })
                }}
                size="x-small"
                state="normal"
                type="view"
              />

              <DynamicButton
                onClick={() => {
                  const slug = generateSlug(crew.title)
                  navigate(`/crews-modify/${slug}`, {
                    state: { crewId: crew.id },
                  })
                }}
                size="x-small"
                state="normal"
                type="edit"
              />

              <DynamicButton
                onClick={() => handleDelete(crew.id)}
                size="x-small"
                type="delete"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CrewList
