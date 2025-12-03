import React, { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import Loader from '../../components/Loader'

function CollabList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [collaborators, setCollaborators] = useState([])
  const [filteredCollaborators, setFilteredCollaborators] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const viewDictionary = 'pages.collaborators.listCollaborators'

  useEffect(() => {
    const fetchCollaborators = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'collaborators'))
        const collabData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setCollaborators(collabData)
        setFilteredCollaborators(collabData)
      } catch (error) {
        return
      } finally {
        setLoading(false)
      }
    }

    fetchCollaborators()
  }, [])

  const handleSearchChange = (event) => {
    const query = event.target.value
    setSearchQuery(query)

    const filtered = collaborators.filter(
      (collab) =>
        (collab.name && collab.name.toLowerCase().includes(query)) ||
        (collab.email && collab.email.toLowerCase().includes(query))
    )

    setFilteredCollaborators(filtered)
  }

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'collaborators', id))
      const updatedCollaborators = collaborators.filter(
        (collab) => collab.id !== id
      )
      setCollaborators(updatedCollaborators)
      setFilteredCollaborators(updatedCollaborators)
    } catch (error) {
      return
    }
  }

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/ /g, '-')
  }

  if (loading)
    return (
      <Loader
        loading={true}
        color="rgb(21, 100, 46)"
        text={t(`${viewDictionary}.loadingText`)}
      />
    )

  return (
    <div className="min-h-[50vh] max-h-[75dvh] pb-[5vh] mx-auto w-[92%] md:w-auto md:max-w-[90%] overflow-y-auto flex flex-col items-center sm:flex-none">
      <h1 className="mb-[4vh] text-center sm:text-start sm:t64b t40b">
        {t(`${viewDictionary}.title`)}
      </h1>
      <div className="grid items-center w-full grid-cols-1 gap-[3vh] mb-[4vh] md:justify-items-end sm:grid-cols-2 sm:justify-between">
        <DynamicInput
          name="search"
          type="text"
          placeholder={t(`${viewDictionary}.searchPlaceholder`)}
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full"
        />
        <div className="flex justify-center w-full sm:justify-start">
          <DynamicButton
            onClick={() => navigate(`/new-collaborator/`)}
            size="small"
            state="normal"
            type="add"
            textId={t(`${viewDictionary}.addNewButton`)}
          />
        </div>
      </div>
      <ul className="w-full space-y-[3vh]">
        {filteredCollaborators.map((collab) => (
          <li
            key={collab.id}
            className="flex flex-wrap items-center justify-between p-[4%] gap-[2vw] bg-gray-100 rounded-lg shadow"
          >
            <div className="flex items-center gap-[3vw]">
              <img
                src={collab.url}
                alt={collab.name}
                className="object-cover w-[3rem] h-[3rem] sm:w-[4rem] sm:h-[4rem] rounded-full"
              />
              <span className="text-base font-semibold break-words sm:text-lg">
                {collab.name}
              </span>
            </div>

            <div className="flex gap-[1vw] mt-[1vh] sm:mt-0 ml-auto sm:ml-0">
              <DynamicButton
                onClick={() => {
                  const slug = generateSlug(collab.name)
                  navigate(`/modify-collaborator/${slug}`, {
                    state: { collaboratorId: collab.id },
                  })
                }}
                size="x-small"
                state="normal"
                type="edit"
              />
              <DynamicButton
                onClick={() => handleDelete(collab.id)}
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

export default CollabList
