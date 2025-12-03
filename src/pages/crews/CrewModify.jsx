import React, { useState, useEffect, useContext } from 'react'
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import log from 'loglevel'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicItems from '../../components/Items'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import PersonAddIcon from '@mui/icons-material/PersonAdd' // Añadir import
import DynamicButton from '../../components/Buttons'
import { AuthContext } from '../../contexts/AuthContext'
import useFetchUsers from '../../hooks/useFetchUsers'
import useSlug from '../../hooks/useSlug'
import { showPopup } from '../../services/popupService'

function CrewModify() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { slug } = useParams()
  const crewId = location.state?.crewId
  const { user, userData, loading: authLoading } = useContext(AuthContext)
  const { users, loading: usersLoading } = useFetchUsers()
  const { generateSlug, slugToTitle } = useSlug()
  const viewDictionary = 'pages.crew.modifyCrew'

  const [crewData, setCrewData] = useState({
    title: '',
    responsable: [],
    membersNames: [],
    createdAt: null,
    updatedAt: null,
    slug: '',
    status: '',
  })

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [filteredUsers, setFilteredUsers] = useState([])
  const [responsableSearch, setResponsableSearch] = useState('')
  const [filteredResponsables, setFilteredResponsables] = useState([])

  log.setLevel('debug')

  useEffect(() => {
    const fetchCrew = async () => {
      if (!crewId) {
        showPopup({
          title: t(`${viewDictionary}.errorPopup.title`),
          text: t(`${viewDictionary}.errorPopup.idErrorMessage`),
          icon: 'error',
          onConfirm: () => navigate('/crews'),
        })
        return
      }

      try {
        setLoading(true)
        const crewDoc = await getDoc(doc(db, 'crews', crewId))

        if (crewDoc.exists()) {
          const crewData = crewDoc.data()

          const currentSlug = generateSlug(crewData.title)
          if (slug && currentSlug !== slug) {
            navigate(`/crews-modify/${currentSlug}`, {
              state: { crewId },
              replace: true,
            })
          }

          if (
            crewData.responsable &&
            !crewData.responsable.includes(user.uid) &&
            userData?.role !== 'admin'
          ) {
            showPopup({
              title: t(`${viewDictionary}.accessDeniedTitle`),
              text: t(`${viewDictionary}.accessDeniedText`),
              icon: 'error',
              confirmButtonText: t(`${viewDictionary}.confirmButton`),
              confirmButtonColor: '#a3a3a3',
              onConfirm: () => navigate('/crews'),
            })
            return
          }

          setCrewData({
            ...crewData,
            id: crewDoc.id,
          })
        } else {
          navigate('/crews')
        }
      } catch (error) {
        navigate('/crews')
      } finally {
        setLoading(false)
      }
    }

    fetchCrew()
  }, [crewId, user, navigate, slug, generateSlug, userData])

  useEffect(() => {
    if (!users || users.length === 0) return

    const filtered = users.filter(
      (u) =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) &&
        !(u.role === 'admin' && u.isStaff === true)
    )
    setFilteredUsers(filtered)
  }, [userSearch, users])

  useEffect(() => {
    if (!users || users.length === 0) return

    const filtered = users.filter(
      (u) =>
        u.name.toLowerCase().includes(responsableSearch.toLowerCase()) &&
        !(u.role === 'admin' && u.isStaff === true)
    )
    setFilteredResponsables(filtered)
  }, [responsableSearch, users])

  const handleChange = (e) => {
    const { name, value } = e.target
    setCrewData({
      ...crewData,
      [name]: value,
    })
  }

  const addMemberToCrew = (memberName) => {
    if (!crewData.membersNames.includes(memberName)) {
      setCrewData({
        ...crewData,
        membersNames: [...crewData.membersNames, memberName],
      })
    }
  }

  const removeMemberFromCrew = (memberName) => {
    setCrewData({
      ...crewData,
      membersNames: crewData.membersNames.filter((name) => name !== memberName),
    })
  }

  const addResponsableToCrew = (responsableId) => {
    if (!crewData.responsable.includes(responsableId)) {
      setCrewData({
        ...crewData,
        responsable: [...crewData.responsable, responsableId],
      })
    }
  }

  const removeResponsableFromCrew = (responsableId) => {
    setCrewData({
      ...crewData,
      responsable: crewData.responsable.filter((id) => id !== responsableId),
    })
  }

  const addCustomMemberFromSearch = () => {
    if (userSearch.trim() === '') return

    const memberName = userSearch.trim()

    if (!crewData.membersNames.includes(memberName)) {
      setCrewData({
        ...crewData,
        membersNames: [...crewData.membersNames, memberName],
      })
      setUserSearch('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const crewDataToSave = { ...crewData }

      crewDataToSave.slug = generateSlug(crewData.title)
      crewDataToSave.updatedAt = Timestamp.now()
      crewDataToSave.status = 'Pendiente'

      await updateDoc(doc(db, 'crews', crewId), crewDataToSave)

      showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
        confirmButtonText: t('components.buttons.accept'),
        confirmButtonColor: '#8be484',
        onConfirm: () => {
          userData?.role === 'admin'
            ? navigate('/crews-list')
            : navigate('/crews')
        },
      })
    } catch (error) {
      let errorMessage = t(`${viewDictionary}.errorMessages.default`)
      if (error.code === 'unavailable') {
        errorMessage = t(`${viewDictionary}.errorMessages.unavailable`)
      } else if (error.code === 'permission-denied') {
        errorMessage = t(`${viewDictionary}.errorMessages.permission-denied`)
      }

      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.text \n`, { errorMessage }),
        icon: 'error',
        confirmButtonText: t('components.buttons.close'),
        confirmButtonColor: '#a3a3a3',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = (e) => {
    e.preventDefault()
    e.stopPropagation()

    userData?.role === 'admin' ? navigate('/crews-list') : navigate('/crews')
  }

  if (loading || authLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="loader" />
      </div>
    )
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="w-[92%] mx-auto pb-[4vh] sm:pb-[6vh]">
      <Loader loading={submitting} />

      <form
        onSubmit={handleSubmit}
        className="mx-auto space-y-[1.5rem] max-w-7xl"
      >
        <h1 className="mb-[1.5rem] text-center sm:t64b t40b">
          {t(`${viewDictionary}.title`)}
        </h1>

        <div className="p-[5%] mb-[1.5rem] rounded-lg bg-white bg-opacity-75 shadow-sm">
          <h3 className="mb-[1rem] text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.basicInfoTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-[1rem]">
            <div>
              <DynamicInput
                name="title"
                textId={t(`${viewDictionary}.nameLabel`)}
                type="text"
                value={crewData.title}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        <div className="p-[5%] mb-[1.5rem] rounded-lg bg-white bg-opacity-75 shadow-sm">
          <h3 className="mb-[1rem] text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.responsablesTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-[1.5rem] lg:grid-cols-2">
            <div>
              <DynamicInput
                name="searchResponsable"
                textId={t(`${viewDictionary}.searchResponsableLabel`)}
                type="text"
                value={responsableSearch}
                onChange={(e) => setResponsableSearch(e.target.value)}
              />

              <div className="p-[0.5rem] mt-[0.5rem] overflow-y-auto max-h-[40vh] sm:max-h-[30vh] md:max-h-[15rem] text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                <DynamicItems
                  items={filteredResponsables.map((u) => ({
                    title: u.name,
                    type: 'userData',
                    icon: (
                      <button
                        type="button"
                        className="p-[0.5rem]"
                        onClick={() => addResponsableToCrew(u.id)}
                      >
                        <AddIcon fontSize="small" />
                      </button>
                    ),
                  }))}
                />
              </div>
            </div>

            <div>
              <h4 className="mb-[0.5rem] text-gray-700 t16r">
                {t(`${viewDictionary}.selectedResponsablesLabel`)}
              </h4>
              <div className="p-[0.5rem] overflow-y-auto max-h-[40vh] sm:max-h-[30vh] md:max-h-[15rem] text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                <DynamicItems
                  items={crewData.responsable
                    .map((responsableId) => {
                      const responsable = users.find(
                        (u) => u.id === responsableId
                      )
                      return responsable
                        ? {
                            title: responsable.name,
                            type: 'userData',
                            icon: (
                              <button
                                type="button"
                                className="p-[0.5rem]"
                                onClick={() =>
                                  removeResponsableFromCrew(responsableId)
                                }
                              >
                                <DeleteIcon fontSize="small" />
                              </button>
                            ),
                          }
                        : null
                    })
                    .filter(Boolean)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-[5%] mb-[1.5rem] rounded-lg bg-white bg-opacity-75 shadow-sm">
          <h3 className="mb-[1rem] text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.membersTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-[1.5rem] lg:grid-cols-2">
            <div>
              <DynamicInput
                name="searchUser"
                textId={t(`${viewDictionary}.searchMemberLabel`)}
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />

              <div className="p-[0.5rem] mt-[0.5rem] overflow-y-auto max-h-[40vh] sm:max-h-[30vh] md:max-h-[15rem] text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                {filteredUsers.length > 0 ? (
                  <DynamicItems
                    items={filteredUsers.map((u) => ({
                      title: u.name,
                      type: 'userData',
                      icon: (
                        <button
                          type="button"
                          className="p-[0.5rem]"
                          onClick={() => addMemberToCrew(u.name)}
                        >
                          <AddIcon fontSize="small" />
                        </button>
                      ),
                    }))}
                  />
                ) : (
                  <div>
                    {userSearch.trim() !== '' && (
                      <div className="flex items-center justify-between p-2 mt-1 sm:mt-2">
                        <button
                          type="button"
                          className="flex items-center text-sm sm:text-base hover:text-gray-900"
                          onClick={addCustomMemberFromSearch}
                        >
                          <PersonAddIcon fontSize="small" className="mr-1" />
                          {t('pages.crew.registerCrew.addCustomMember', {
                            name: userSearch.trim(),
                          })}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-[0.5rem] text-gray-700 t16r">
                {t(`${viewDictionary}.selectedMembersLabel`)}
              </h4>
              <div className="p-[0.5rem] overflow-y-auto max-h-[40vh] sm:max-h-[30vh] md:max-h-[15rem] text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                {crewData.membersNames && crewData.membersNames.length > 0 ? (
                  <DynamicItems
                    items={crewData.membersNames.map((memberName) => ({
                      title: memberName,
                      type: 'userData',
                      icon: (
                        <button
                          type="button"
                          className="p-[0.5rem]"
                          onClick={() => removeMemberFromCrew(memberName)}
                        >
                          <DeleteIcon fontSize="small" />
                        </button>
                      ),
                    }))}
                  />
                ) : (
                  <p className="p-[0.5rem] text-gray-500">
                    {t(`${viewDictionary}.noMembers`)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="items-center flex flex-col sm:flex-row justify-end gap-[1rem] sm:gap-[0.5rem] mt-[2rem]">
          <DynamicButton
            type="button"
            onClick={handleCancel}
            size="small"
            state="normal"
            textId={t('components.buttons.cancel')}
            className="mr-4"
          />

          <DynamicButton
            type="submit"
            size="small"
            state="normal"
            textId={t(`${viewDictionary}.submitButton`)}
          />
        </div>
      </form>
    </div>
  )
}

export default CrewModify
