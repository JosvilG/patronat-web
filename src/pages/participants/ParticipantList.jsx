import React, { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import useSlug from '../../hooks/useSlug'
import { showPopup } from '../../services/popupService'

function ParticipantList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [participant, setParticipants] = useState([])
  const [filteredParticipants, setFilteredParticipants] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const { generateSlug } = useSlug()
  const viewDictionary = 'pages.participants.listParticipants'

  useEffect(() => {
    const fetchParticipant = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'participants'))
        const participantData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setParticipants(participantData)
        setFilteredParticipants(participantData)
      } catch (error) {
        return
      }
    }

    fetchParticipant()
  }, [])

  const handleSearchChange = (event) => {
    const query = event.target.value.toLowerCase()
    setSearchQuery(event.target.value)

    const filtered = participant.filter(
      (part) =>
        (part.name && part.name.toLowerCase().includes(query)) ||
        (part.email && part.email.toLowerCase().includes(query))
    )

    setFilteredParticipants(filtered)
  }

  const handleDelete = async (id) => {
    const participantToDelete = participant.find((part) => part.id === id)

    if (!participantToDelete) return

    showPopup({
      title: t(`${viewDictionary}.popups.delete.title`),
      text: t(`${viewDictionary}.popups.delete.text`, {
        fileName: participantToDelete.name,
      }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('componentes.buttons.delete'),
      cancelButtonText: t('componentes.buttons.cancel'),
      confirmButtonColor: '#a3a3a3',
      cancelButtonColor: '#8be484',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'participants', id))
          const updateParticipants = participant.filter(
            (part) => part.id !== id
          )
          setParticipants(updateParticipants)
          setFilteredParticipants(updateParticipants)

          showPopup({
            title: t(`${viewDictionary}.popups.success.title`),
            text: t(`${viewDictionary}.popups.success.text`),
            icon: 'success',
          })
        } catch (error) {
          showPopup({
            title: t(`${viewDictionary}.popups.error.title`),
            text: t(`${viewDictionary}.popups.error.text`),
            icon: 'error',
          })
        }
      },
    })
  }

  return (
    <div className="min-h-[50vh] max-h-[90vh] pb-[4vh] mx-auto w-[92%] sm:w-full md:w-auto flex flex-col items-center">
      <h1 className="mb-[4vh] text-center sm:t64b t40b sm:text-start">
        {t(`${viewDictionary}.title`)}
      </h1>

      <div className="w-full grid items-center grid-cols-1 gap-[3vh] mb-[4vh] sm:grid-cols-2 sm:gap-[2vw]">
        <div className="w-full">
          <DynamicInput
            name="search"
            type="text"
            placeholder={t(`${viewDictionary}.searchPlaceholder`)}
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
        <div className="flex justify-center sm:justify-end">
          <DynamicButton
            onClick={() => navigate(`/new-participant/`)}
            size="small"
            state="normal"
            type="add"
            textId={t(`${viewDictionary}.addNewButton`)}
          />
        </div>
      </div>

      <ul className="w-full space-y-[3vh]">
        {filteredParticipants.map((part) => (
          <li
            key={part.id}
            className="flex flex-col sm:flex-row items-center justify-between p-[4%] rounded-lg shadow bg-gray-100"
          >
            <div className="flex items-center gap-[3vw] mb-[2vh] sm:mb-0">
              <img
                src={part.url}
                alt={part.name}
                className="object-cover w-[3.5rem] h-[3.5rem] sm:w-[4rem] sm:h-[4rem] rounded-full"
              />
              <span className="text-lg font-semibold">{part.name}</span>
            </div>

            <div className="flex gap-[2vw]">
              <DynamicButton
                onClick={() => {
                  const slug = generateSlug(part.name)
                  navigate(`/modify-participant/${slug}`, {
                    state: { participantId: part.id },
                  })
                }}
                size="x-small"
                state="normal"
                type="edit"
              />
              <DynamicButton
                onClick={() => handleDelete(part.id)}
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

export default ParticipantList
