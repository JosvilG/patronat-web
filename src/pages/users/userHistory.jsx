import React, { useState, useEffect, useMemo } from 'react'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import Loader from '../../components/Loader'
import DynamicInput from '../../components/Inputs'
import PaginationControl from '../../components/Pagination'
import log from 'loglevel'
import useSearchFilter from '../../hooks/useSearchFilter'

function UserHistory() {
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { t } = useTranslation()

  const [page, setPage] = useState(1)
  const [paginatedChanges, setPaginatedChanges] = useState([])
  const itemsPerPage = 20

  const viewDictionary = 'pages.users.userHistoryView'

  const searchOptions = useMemo(
    () => ({
      searchFields: [
        'targetEntityName',
        'targetEntityType',
        'targetEntityId',
        'description',
        'formattedDate',
        'formattedTime',
        'changeType',
      ],
      customSearchFunction: (item, searchTerm) => {
        if (
          item.modifiedBy?.name &&
          item.modifiedBy.name.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return true
        }

        if (item.changesDetail) {
          const fieldsMatch = Object.keys(item.changesDetail).some((field) =>
            field.toLowerCase().includes(searchTerm.toLowerCase())
          )

          if (fieldsMatch) return true

          const valuesMatch = Object.values(item.changesDetail).some(
            (change) => {
              const prevValue = String(change.previousValue || '')
              const newValue = String(change.newValue || '')

              return (
                prevValue.toLowerCase().includes(searchTerm.toLowerCase()) ||
                newValue.toLowerCase().includes(searchTerm.toLowerCase())
              )
            }
          )

          if (valuesMatch) return true
        }

        return false
      },
      debounceTime: 300,
    }),
    []
  )

  const {
    searchQuery,
    filteredItems: filteredChanges,
    handleSearchChange,
    updateItems,
  } = useSearchFilter([], searchOptions)

  useEffect(() => {
    const loadChanges = async () => {
      setLoading(true)
      try {
        const changesQuery = query(
          collection(db, 'changes'),
          orderBy('timestamp', 'desc')
        )

        const querySnapshot = await getDocs(changesQuery)
        const changesData = []

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          const timestamp = data.timestamp
            ? new Date(data.timestamp.toDate())
            : new Date()

          changesData.push({
            id: doc.id,
            ...data,
            timestamp,
            formattedDate: timestamp.toLocaleDateString(),
            formattedTime: timestamp.toLocaleTimeString(),
          })
        })

        setChanges(changesData)
        updateItems(changesData)
        setPage(1)
      } catch (err) {
        setError(t(`${viewDictionary}.chargeHistoryFailure`))
      } finally {
        setLoading(false)
      }
    }

    loadChanges()
  }, [updateItems])

  useEffect(() => {
    const startIndex = (page - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedItems = filteredChanges.slice(startIndex, endIndex)
    setPaginatedChanges(paginatedItems)

    if (paginatedItems.length === 0 && filteredChanges.length > 0 && page > 1) {
      setPage(1)
    }
  }, [filteredChanges, page])

  const handlePageChange = (event, newPage) => {
    setPage(newPage)
  }

  const formatFieldChange = (field, change) => {
    if (
      field === 'password' ||
      field.toLowerCase().includes('password') ||
      change.isSensitive
    ) {
      return (
        <span className="italic text-gray-500">
          {t(`${viewDictionary}.protectedData`)}
        </span>
      )
    }

    const formatValue = (value) => {
      if (value === null || value === undefined)
        return (
          <span className="italic text-gray-500">
            {t(`${viewDictionary}.noValue`)}
          </span>
        )
      if (value === '')
        return (
          <span className="italic text-gray-500">
            {t(`${viewDictionary}.emptyString`)}
          </span>
        )
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    }

    return (
      <div className="mt-1">
        <div className="text-sm">
          <span className="font-bold">{field}:</span>
        </div>
        <div className="pl-4 text-sm">
          <div>
            <span className="text-red-600">- </span>
            {formatValue(change.previousValue)}
          </div>
          <div>
            <span className="text-green-600">+ </span>
            {formatValue(change.newValue)}
          </div>
        </div>
      </div>
    )
  }

  const getChangeTypeIcon = (changeType) => {
    switch (changeType) {
      case 'create':
        return '➕'
      case 'update':
        return '✏️'
      case 'delete':
        return '🗑️'
      default:
        return '📝'
    }
  }

  const getChangeTypeColor = (changeType) => {
    switch (changeType) {
      case 'create':
        return 'bg-green-100 text-green-800'
      case 'update':
        return 'bg-blue-100 text-blue-800'
      case 'delete':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Loader
        loading={true}
        size="50px"
        color="rgb(21, 100, 46)"
        text={t(`${viewDictionary}.chargingHistory`)}
      />
    )
  }

  const totalPages = Math.ceil(filteredChanges.length / itemsPerPage)

  return (
    <div className="h-auto max-w-full p-6 mx-auto min-h-dvh md:max-w-fit">
      <h1 className="mb-4 text-center t64b">{t(`${viewDictionary}.title`)}</h1>

      <div className="mb-6">
        <DynamicInput
          name="search"
          type="text"
          placeholder={t(`${viewDictionary}.searchHistory`)}
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      {error && (
        <p className="p-4 mb-4 text-white bg-red-500 rounded">{error}</p>
      )}

      {filteredChanges.length === 0 ? (
        <div className="p-6 text-center bg-gray-100 rounded-lg">
          <p className="t16r">
            {searchQuery.trim() !== ''
              ? t(`${viewDictionary}.searchNoCoincidence`)
              : t(`${viewDictionary}.searchNoRegistration`)}
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-gray-600">
            {t(`${viewDictionary}.searchQuantityResults`, {
              paginated: paginatedChanges.length,
              total: filteredChanges.length,
            })}
          </div>

          <div className="space-y-6">
            {paginatedChanges.map((change) => (
              <div
                key={change.id}
                className="p-4 overflow-hidden shadow-sm backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl"
              >
                <div className="flex flex-wrap items-center justify-between mb-4 gap-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="t16r">
                      {getChangeTypeIcon(change.changeType)}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getChangeTypeColor(change.changeType)}`}
                    >
                      {change.changeType === 'create'
                        ? t(`${viewDictionary}.createLabel`)
                        : change.changeType === 'update'
                          ? t(`${viewDictionary}.modifyLabel`)
                          : change.changeType === 'delete'
                            ? t(`${viewDictionary}.deleteLabel`)
                            : t(`${viewDictionary}.changeLabel`)}
                    </span>
                    <span className="capitalize t16r ">
                      {change.targetEntityType}
                    </span>
                    <span className="t16b">{change.targetEntityName}</span>
                  </div>
                  <div className="t16r">
                    {change.formattedDate} {change.formattedTime}
                  </div>
                </div>

                <div className="mb-3">
                  <span className="t16r">
                    {t(`${viewDictionary}.modifiedByLabel`)}
                    <span className="t16b">
                      {change.modifiedBy?.name ||
                        t(`${viewDictionary}.unknownUserLabel`)}
                    </span>
                  </span>
                </div>

                <div className="p-3 mt-3 rounded-md">
                  <div className="mb-2 font-medium">
                    {t(`${viewDictionary}.changesRealizedLabel`)}
                  </div>
                  {change.changesDetail &&
                    Object.keys(change.changesDetail).map((field) => (
                      <div key={field}>
                        {formatFieldChange(field, change.changesDetail[field])}
                      </div>
                    ))}
                </div>

                <div className="mt-4 t12r">
                  <span className="font-medium">
                    {t(`${viewDictionary}.idReferenceLabel`)}
                  </span>{' '}
                  {change.targetEntityId}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <PaginationControl
              page={page}
              count={totalPages}
              totalItems={filteredChanges.length}
              itemsPerPage={itemsPerPage}
              onChange={handlePageChange}
              showItemCount={true}
              scrollToTop={true}
              className="mt-6"
            />
          )}
        </div>
      )}
    </div>
  )
}

export default UserHistory
