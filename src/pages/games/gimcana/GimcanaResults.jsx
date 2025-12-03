import React, { useState, useEffect } from 'react'
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  getDocs,
} from 'firebase/firestore'
import { db } from '../../../firebase/firebase'
import Loader from '../../../components/Loader'
import log from 'loglevel'
import { useTranslation } from 'react-i18next'

function GimcanaResults() {
  const { t } = useTranslation()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [crewDetails, setCrewDetails] = useState({})
  const viewDictionary = 'pages.games.gimcana.results'

  useEffect(() => {
    const fetchCrewDetails = async () => {
      try {
        const crewsQuery = query(collection(db, 'crews'))
        const crewSnap = await getDocs(crewsQuery)
        const crewData = {}

        crewSnap.forEach((doc) => {
          const data = doc.data()
          crewData[doc.id] = {
            title: data.title || 'Sin nombre',
            membersCount: data.numberOfMembers || 0,
          }
        })

        setCrewDetails(crewData)
        log.debug('Datos de crews cargados:', Object.keys(crewData).length)
      } catch (error) {
        log.error('Error al cargar datos de crews:', error)
      }
    }
    fetchCrewDetails()
  }, [])

  useEffect(() => {
    setLoading(true)

    const gimcanaQuery = query(collection(db, 'gimcana'), orderBy('status'))

    const unsubscribe = onSnapshot(
      gimcanaQuery,
      (querySnapshot) => {
        const gimcanaData = []

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          const totalPruebas = data.pruebas?.length || 0
          const pruebasResueltas =
            data.pruebas?.filter((p) => p.resuelto)?.length || 0

          gimcanaData.push({
            id: doc.id,
            grupo: data.grupo || 0,
            crewId: data.crewId || '',
            status: data.status || 'pending',
            pruebasResueltas,
            totalPruebas,
            progreso:
              totalPruebas > 0 ? (pruebasResueltas / totalPruebas) * 100 : 0,
            startedAt: data.startedAt ? data.startedAt.toDate() : null,
            completedAt: data.completedAt ? data.completedAt.toDate() : null,
          })
        })

        const sortedData = gimcanaData.sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return -1
          if (a.status !== 'completed' && b.status === 'completed') return 1

          if (a.status === 'completed' && b.status === 'completed') {
            return a.completedAt - b.completedAt
          }

          if (a.status === 'started' && b.status === 'started') {
            return b.progreso - a.progreso
          }

          return a.grupo - b.grupo
        })

        setResults(sortedData)
        setLoading(false)
        log.debug('Datos de gimcana actualizados:', gimcanaData.length)
      },
      (error) => {
        log.error('Error al obtener datos de gimcana:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const formatDate = (date) => {
    if (!date) return '-'
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date)
  }

  const formatDuration = (start, end) => {
    if (!start || !end) return '-'

    const diffMs = end - start
    const diffSec = Math.floor(diffMs / 1000)

    const hours = Math.floor(diffSec / 3600)
    const minutes = Math.floor((diffSec % 3600) / 60)
    const seconds = diffSec % 60

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <Loader
        loading={true}
        text={t(`${viewDictionary}.loading`, 'Cargando resultados...')}
      />
    )
  }

  return (
    <div className="container px-4 mx-auto sm:px-6">
      <h1 className="mb-4 text-2xl font-bold text-center sm:mb-8 sm:text-3xl md:text-4xl">
        {t(`${viewDictionary}.title`)}
      </h1>

      {results.length === 0 ? (
        <div className="p-4 mb-4 text-center text-blue-700 bg-blue-100 rounded-lg">
          {t(`${viewDictionary}.noResults`)}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full bg-white border border-gray-200 rounded-lg shadow-md">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left">
                    {t(`${viewDictionary}.table.group`)}
                  </th>
                  <th className="p-4 text-left">
                    {t(`${viewDictionary}.table.team`)}
                  </th>
                  <th className="p-4 text-left">
                    {t(`${viewDictionary}.table.status`)}
                  </th>
                  <th className="p-4 text-left">
                    {t(`${viewDictionary}.table.progress`)}
                  </th>
                  <th className="p-4 text-left">
                    {t(`${viewDictionary}.table.started`)}
                  </th>
                  <th className="p-4 text-left">
                    {t(`${viewDictionary}.table.completed`)}
                  </th>
                  <th className="p-4 text-left">
                    {t(`${viewDictionary}.table.duration`)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Filas de tabla existentes */}
                {results.map((item) => (
                  <tr
                    key={`table-${item.id}`}
                    className={
                      item.status === 'completed'
                        ? 'bg-green-50'
                        : item.status === 'started'
                          ? 'bg-blue-50'
                          : ''
                    }
                  >
                    <td className="p-4 font-medium">{item.grupo}</td>
                    <td className="p-4">
                      {item.crewId ? (
                        crewDetails[item.crewId] ? (
                          <div>
                            <div className="font-medium">
                              {crewDetails[item.crewId].title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {crewDetails[item.crewId].membersCount}{' '}
                              {t(`${viewDictionary}.teamInfo.members`)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">
                            {t(`${viewDictionary}.teamInfo.assigned`)}
                          </span>
                        )
                      ) : (
                        <span className="text-gray-500">
                          {t(`${viewDictionary}.teamInfo.noTeam`)}
                        </span>
                      )}
                    </td>
                    <td className="p-4">{getStatusBadge(item.status)}</td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-green-600 h-2.5 rounded-full"
                              style={{ width: `${item.progreso}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-sm">
                          {item.pruebasResueltas}/{item.totalPruebas}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {item.status !== 'pending' ? (
                        <span>{formatDate(item.startedAt)}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-4">
                      {item.status === 'completed' ? (
                        <span className="text-green-700">
                          {formatDate(item.completedAt)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-4">
                      {item.status === 'completed' &&
                      item.startedAt &&
                      item.completedAt ? (
                        <span>
                          {formatDuration(item.startedAt, item.completedAt)}
                        </span>
                      ) : item.status === 'started' && item.startedAt ? (
                        <span>
                          {t(`${viewDictionary}.inProgress`)} (
                          {formatDuration(item.startedAt, new Date())})
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista de tarjetas para dispositivos móviles (por debajo de SM) */}
          <div className="space-y-4 sm:hidden">
            {results.map((item) => (
              <div
                key={`card-${item.id}`}
                className={`p-4 rounded-lg shadow border ${
                  item.status === 'completed'
                    ? 'bg-green-50 border-green-200'
                    : item.status === 'started'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold">#{item.grupo}</span>
                    <div>{getStatusBadge(item.status)}</div>
                  </div>
                  <div className="text-sm">
                    {item.pruebasResueltas}/{item.totalPruebas}
                  </div>
                </div>

                {/* Equipo */}
                <div className="mb-3">
                  {item.crewId ? (
                    crewDetails[item.crewId] ? (
                      <div>
                        <div className="font-medium">
                          {crewDetails[item.crewId].title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {crewDetails[item.crewId].membersCount}{' '}
                          {t(`${viewDictionary}.teamInfo.members`)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">
                        {t(`${viewDictionary}.teamInfo.assigned`)}
                      </span>
                    )
                  ) : (
                    <span className="text-gray-500">
                      {t(`${viewDictionary}.teamInfo.noTeam`)}
                    </span>
                  )}
                </div>

                {/* Barra de progreso */}
                <div className="mb-3">
                  <div className="flex items-center mb-1 space-x-2">
                    <span className="text-xs font-medium text-gray-700">
                      {t(`${viewDictionary}.table.progress`)}
                    </span>
                    <span className="text-xs font-medium">
                      {Math.round(item.progreso)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-green-600 h-2.5 rounded-full"
                      style={{ width: `${item.progreso}%` }}
                    ></div>
                  </div>
                </div>

                {/* Fechas y duración */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {item.status !== 'pending' && (
                    <div>
                      <span className="block text-xs text-gray-500">
                        {t(`${viewDictionary}.table.started`)}
                      </span>
                      <span>{formatDate(item.startedAt)}</span>
                    </div>
                  )}

                  {item.status === 'completed' && (
                    <div>
                      <span className="block text-xs text-gray-500">
                        {t(`${viewDictionary}.table.completed`)}
                      </span>
                      <span className="text-green-700">
                        {formatDate(item.completedAt)}
                      </span>
                    </div>
                  )}

                  {(item.status === 'completed' ||
                    item.status === 'started') && (
                    <div className="col-span-2 mt-1">
                      <span className="block text-xs text-gray-500">
                        {t(`${viewDictionary}.table.duration`)}
                      </span>
                      {item.status === 'completed' &&
                      item.startedAt &&
                      item.completedAt ? (
                        <span>
                          {formatDuration(item.startedAt, item.completedAt)}
                        </span>
                      ) : item.status === 'started' && item.startedAt ? (
                        <span>
                          {t(`${viewDictionary}.inProgress`)} (
                          {formatDuration(item.startedAt, new Date())})
                        </span>
                      ) : (
                        '-'
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-4 text-xs text-center text-gray-500 sm:text-sm">
        {t(`${viewDictionary}.realTime`)}
      </div>
    </div>
  )

  function getStatusBadge(status) {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
            {t(`${viewDictionary}.status.completed`)}
          </span>
        )
      case 'started':
        return (
          <span className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
            {t(`${viewDictionary}.status.started`)}
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded-full">
            {t(`${viewDictionary}.status.pending`)}
          </span>
        )
    }
  }
}

export default GimcanaResults
