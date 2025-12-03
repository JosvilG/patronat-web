import React, { useState, useEffect } from 'react'
import { deleteDoc, doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getAuth } from 'firebase/auth'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import Loader from '../../components/Loader'
import PaginationControl from '../../components/Pagination'
import useFetchUsers from '../../hooks/useFetchUsers'
import useChangeTracker from '../../hooks/useModificationsRegister'
import { showPopup } from '../../services/popupService'
import useSlug from '../../hooks/useSlug'

function UserList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { filteredUsers, search, setSearch, loading, error } = useFetchUsers()
  const viewDictionary = 'pages.users.listUsers'
  const auth = getAuth()
  const [deletingUserId, setDeletingUserId] = useState(null)
  const { generateSlug } = useSlug()

  const { trackDeletion, isTracking } = useChangeTracker({
    tag: 'users',
    entityType: 'user',
  })

  const [page, setPage] = useState(1)
  const [paginatedUsers, setPaginatedUsers] = useState([])
  const itemsPerPage = 20
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

  useEffect(() => {
    const startIndex = (page - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const slicedUsers = filteredUsers.slice(startIndex, endIndex)
    setPaginatedUsers(slicedUsers)

    if (slicedUsers.length === 0 && filteredUsers.length > 0 && page > 1) {
      setPage(1)
    }
  }, [filteredUsers, page])

  const navigateToUserEdit = (user) => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
    const slug = generateSlug(fullName) || 'usuario'
    navigate(`/edit-user/${slug}`, {
      state: { userId: user.id },
    })
  }

  const handleDelete = async (id) => {
    if (!auth.currentUser) {
      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.notAuthenticated`),
        icon: 'error',
      })
      return
    }

    const confirmed = window.confirm(t(`${viewDictionary}.confirmDelete`))
    if (!confirmed) return

    setDeletingUserId(id)

    try {
      const userDoc = await getDoc(doc(db, 'users', id))

      if (!userDoc.exists()) {
        throw new Error(t(`${viewDictionary}.errorMessages.noExistingUser`))
      }

      const userData = userDoc.data()
      const userName =
        `${userData.firstName || ''} ${userData.lastName || ''}`.trim()

      await deleteDoc(doc(db, 'users', id))

      await trackDeletion({
        entityId: id,
        entityData: userData,
        modifierId: auth.currentUser.uid,
        entityName: userName,
        sensitiveFields: ['email', 'phoneNumber', 'dni'],
        onSuccess: () => {
          showPopup({
            title: t(`${viewDictionary}.deleteSuccess`),
            text: t(`${viewDictionary}.userDeleted`),
            icon: 'success',
          })
          setPaginatedUsers(paginatedUsers.filter((user) => user.id !== id))
        },
        onError: (error) => {
          showPopup({
            title: t(`${viewDictionary}.deleteSuccess`),
            text: t(`${viewDictionary}.userDeletedNoLog`),
            icon: 'warning',
          })
          setPaginatedUsers(paginatedUsers.filter((user) => user.id !== id))
        },
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.deleteError`),
        icon: 'error',
      })
    } finally {
      setDeletingUserId(null)
    }
  }
  const navigateToUserDetail = (user) => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
    const slug = generateSlug(fullName) || 'usuario'
    navigate(`/profile/${slug}`, {
      state: { userId: user.id },
    })
  }

  const handleSearchChange = (event) => {
    setSearch(event.target.value)
    setPage(1)
  }

  const handlePageChange = (event, newPage) => {
    setPage(newPage)
  }

  if (loading || isTracking)
    return (
      <Loader
        loading={true}
        size="50px"
        color="rgb(21, 100, 46)"
        text={
          isTracking
            ? t(`${viewDictionary}.trackingChanges`)
            : t(`${viewDictionary}.loadingText`)
        }
      />
    )

  if (error)
    return (
      <div className="p-4 text-center text-red-600">Error: {error.message}</div>
    )

  return (
    <div className="flex flex-col items-center h-auto max-w-full pb-6 mx-auto min-h-dvh md:max-w-fit sm:flex-none">
      <h1 className="mb-4 text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`)}
      </h1>
      <div className="grid items-center justify-end grid-cols-1 gap-4 mb-4 md:justify-items-end sm:grid-cols-2 sm:justify-between">
        <DynamicInput
          name="search"
          type="text"
          placeholder={t(`${viewDictionary}.searchPlaceholder`)}
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      {filteredUsers.length > 0 ? (
        <>
          <div className="overflow-auto sm:w-full">
            <ul className="space-y-4">
              {paginatedUsers.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between p-4 space-x-4 bg-gray-100 rounded-lg shadow"
                >
                  <div>
                    <span className="block text-lg font-semibold">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="block text-sm text-gray-600">
                      {user.email}
                    </span>
                    <span className="block text-sm text-gray-600">
                      DNI: {user.dni}
                    </span>
                    <span className="block text-sm text-gray-600">
                      Tel: {user.phoneNumber}
                    </span>
                  </div>

                  <div className="flex space-x-2">
                    <DynamicButton
                      onClick={() => navigateToUserDetail(user)}
                      size="x-small"
                      state="normal"
                      type="view"
                    />
                    <DynamicButton
                      onClick={() => navigateToUserEdit(user)}
                      size="x-small"
                      type="edit"
                      state="normal"
                    />
                    <DynamicButton
                      onClick={() => handleDelete(user.id)}
                      size="x-small"
                      state={deletingUserId === user.id ? 'disabled' : 'normal'}
                      type="delete"
                      disabled={deletingUserId === user.id}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {totalPages > 1 && (
            <PaginationControl
              page={page}
              count={totalPages}
              totalItems={filteredUsers.length}
              itemsPerPage={itemsPerPage}
              onChange={handlePageChange}
              showItemCount={true}
              className="mt-4"
              scrollToTop={true}
            />
          )}
        </>
      ) : (
        <div className="p-4 text-center bg-gray-100 rounded-lg">
          {search
            ? t(`${viewDictionary}.noResultsFound`)
            : t(`${viewDictionary}.noUsers`)}
        </div>
      )}
    </div>
  )
}

export default UserList
