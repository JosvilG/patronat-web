import React, { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore'
import log from 'loglevel'
import { db } from '../../../firebase/firebase'
import Loader from '../../../components/Loader'
import DynamicInput from '../../../components/Inputs'
import DynamicButton from '../../../components/Buttons'
import { showPopup } from '../../../services/popupService'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '../../../contexts/AuthContext'

function GimcanaGame() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [crewDocId, setCrewDocId] = useState(null)
  const [groupNum, setGroupNum] = useState('')
  const [pruebas, setPruebas] = useState([])
  const [gimcanaDocId, setGimcanaDocId] = useState(null)
  const [current, setCurrent] = useState(0)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const { user, userData, loading: authLoading } = useContext(AuthContext)
  const userId = user?.uid || userData?.id
  const viewDictionary = 'pages.games.gimcana'

  useEffect(() => {
    if (authLoading) return

    const fetchCrew = async () => {
      if (!userId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        log.debug('Buscando crew del usuario...')

        const q = query(
          collection(db, 'crews'),
          where('responsable', 'array-contains', userId)
        )
        const snap = await getDocs(q)
        log.debug('fetchCrew snap size=', snap.size)

        if (!snap.empty) {
          const id = snap.docs[0].id
          log.debug('fetchCrew: crewDocId encontrado=', id)
          setCrewDocId(id)
        } else {
          log.warn('fetchCrew: no hay crew para este usuario')
        }
      } catch (err) {
        log.error('fetchCrew error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCrew()
  }, [authLoading, userId])

  useEffect(() => {
    if (!crewDocId) return

    const buscarJuegoEnProgreso = async () => {
      try {
        setLoading(true)
        log.debug('Buscando juego asignado a la crew...')

        // Buscar cualquier gimcana asignada a esta crew
        const q = query(
          collection(db, 'gimcana'),
          where('crewId', '==', crewDocId)
        )
        const snap = await getDocs(q)

        if (!snap.empty) {
          log.debug('Juego encontrado para esta crew')
          const docSnap = snap.docs[0]
          const data = docSnap.data()
          setGimcanaDocId(docSnap.id)
          setGroupNum(String(data.grupo || ''))

          // Si la gimcana ya está completada, redirigir a la página de resultados
          if (data.status === 'completed') {
            log.debug('Gimcana ya completada, redirigiendo a resultados...')
            navigate('/gimcana-results')
            return
          }

          const pruebasOrdenadas = [...(data.pruebas || [])].sort(
            (a, b) => a.numeroOrden - b.numeroOrden
          )

          setPruebas(pruebasOrdenadas)

          const primerNoResuelto = pruebasOrdenadas.findIndex(
            (p) => !p.resuelto
          )
          if (primerNoResuelto >= 0) {
            setCurrent(primerNoResuelto)
          } else {
            setCurrent(0)
          }
        }
      } catch (err) {
        log.error('Error buscando juego asignado:', err)
      } finally {
        setLoading(false)
      }
    }

    buscarJuegoEnProgreso()
  }, [crewDocId, navigate])

  const loadGroup = async (e) => {
    e.preventDefault()

    log.debug('loadGroup: grupo=', groupNum, ' crewDocId=', crewDocId)

    if (!groupNum) return
    if (!crewDocId) {
      await showPopup({
        title: t(`${viewDictionary}.game.error.title`),
        text: t(`${viewDictionary}.game.error.noCrewId`),
        icon: 'error',
        confirmButtonText: t('components.buttons.close'),
      })
      return
    }

    setLoading(true)
    log.debug('Cargando grupo...')

    try {
      const q = query(
        collection(db, 'gimcana'),
        where('grupo', '==', Number(groupNum))
      )
      const snap = await getDocs(q)
      if (snap.empty) {
        await showPopup({
          title: t(`${viewDictionary}.game.noGroup.title`),
          text: t(`${viewDictionary}.game.noGroup.text`),
          icon: 'error',
          confirmButtonText: t('components.buttons.close'),
        })
        return
      }

      const docSnap = snap.docs[0]
      const data = docSnap.data()
      log.debug('loadGroup data=', data)

      setGimcanaDocId(docSnap.id)

      if (data.crewId && data.crewId !== crewDocId) {
        await showPopup({
          title: t(`${viewDictionary}.game.inUse.title`),
          text: t(`${viewDictionary}.game.inUse.text`),
          icon: 'warning',
          confirmButtonText: t('components.buttons.close'),
        })
        return
      }

      if (!data.crewId) {
        log.debug(
          'Actualizando documento con crewId, status started y timestamp de inicio...'
        )
        await updateDoc(doc(db, 'gimcana', docSnap.id), {
          crewId: crewDocId,
          status: 'started',
          startedAt: Timestamp.now(),
        })
        log.debug(
          'loadGroup: crewId, status y startedAt actualizados en Firestore'
        )
      }

      const pruebasOrdenadas = [...(data.pruebas || [])].sort(
        (a, b) => a.numeroOrden - b.numeroOrden
      )

      setPruebas(pruebasOrdenadas)

      const primerNoResuelto = pruebasOrdenadas.findIndex((p) => !p.resuelto)
      if (primerNoResuelto >= 0) {
        setCurrent(primerNoResuelto)
      } else {
        setCurrent(0)
      }
    } catch (err) {
      log.error('loadGroup error:', err)
      await showPopup({
        title: t(`${viewDictionary}.game.error.title`),
        text: err.message,
        icon: 'error',
        confirmButtonText: t('components.buttons.close'),
      })
    } finally {
      setLoading(false)
    }
  }
  const normalizeString = (str) => {
    return str
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[·]/g, '')
      .replace(/[ł]/g, 'l')
      .replace(/[ñ]/g, 'n')
      .replace(/[ç]/g, 'c')
      .replace(/[-_.,!¡?¿;:()]/g, ' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const handleAnswer = async (e) => {
    e.preventDefault()
    const currentPrueba = pruebas[current]

    if (!currentPrueba) return

    const normalizedAnswer = normalizeString(answer)
    const normalizedCorrectAnswer = normalizeString(currentPrueba.respuesta)

    log.debug(
      'Validando respuesta:',
      answer,
      '(normalizada:',
      normalizedAnswer,
      ') contra:',
      currentPrueba.respuesta,
      '(normalizada:',
      normalizedCorrectAnswer,
      ')'
    )

    if (normalizedAnswer !== normalizedCorrectAnswer) {
      await showPopup({
        title: t(`${viewDictionary}.game.wrong.title`),
        text: t(`${viewDictionary}.game.wrong.text`),
        icon: 'error',
        confirmButtonText: t('components.buttons.close'),
      })
      return
    }

    setLoading(true)
    log.debug('Respuesta correcta. Actualizando prueba...')

    try {
      if (!gimcanaDocId) {
        log.error('No hay ID de documento de gimcana')
        return
      }

      const docRef = doc(db, 'gimcana', gimcanaDocId)
      const gimcanaDoc = await getDoc(docRef)

      if (gimcanaDoc.exists()) {
        const todasLasPruebas = gimcanaDoc.data().pruebas || []

        const pruebaIndex = todasLasPruebas.findIndex(
          (p) => p.numeroOrden === currentPrueba.numeroOrden
        )

        if (pruebaIndex !== -1) {
          todasLasPruebas[pruebaIndex] = {
            ...todasLasPruebas[pruebaIndex],
            resuelto: true,
          }

          const todasResueltas = todasLasPruebas.every((p) => p.resuelto)

          log.debug('Actualizando documento en Firestore...')
          await updateDoc(docRef, {
            pruebas: todasLasPruebas,
            ...(todasResueltas
              ? {
                  status: 'completed',
                  completedAt: Timestamp.now(),
                }
              : {}),
          })

          log.debug(
            'Prueba marcada como resuelta. Total pruebas:',
            todasLasPruebas.length
          )

          if (todasResueltas) {
            log.debug(
              'Todas las pruebas completadas, status cambiado a completed y guardada fecha de finalización'
            )
          }
        }
      }

      setPruebas((prevPruebas) => {
        const updatedPruebas = [...prevPruebas]
        updatedPruebas[current] = {
          ...updatedPruebas[current],
          resuelto: true,
        }
        return updatedPruebas
      })
    } catch (err) {
      log.error('Error al actualizar prueba:', err)
      await showPopup({
        title: t(`${viewDictionary}.game.error.title`),
        text: err.message,
        icon: 'error',
        confirmButtonText: t('components.buttons.close'),
      })
    } finally {
      setLoading(false)
    }

    setAnswer('')

    const todasResueltas = pruebas.every((p, i) => {
      if (i === current) return true
      return p.resuelto
    })

    if (todasResueltas) {
      await showPopup({
        title: t(`${viewDictionary}.game.finished.title`),
        text: t(`${viewDictionary}.game.finished.text`),
        icon: 'success',
        confirmButtonText: t('components.buttons.accept'),
        onConfirm: () => navigate('/dashboard'),
      })
      return
    }

    const nextUnresolved = pruebas.findIndex(
      (p, i) => i > current && !p.resuelto
    )

    if (nextUnresolved >= 0) {
      setCurrent(nextUnresolved)
    } else if (current + 1 < pruebas.length) {
      setCurrent(current + 1)
    }
  }

  if (loading) return <Loader loading={true} text="Cargando..." />

  if (pruebas.length === 0 && !gimcanaDocId) {
    return (
      <div className="container p-3 mx-auto sm:p-4">
        <h1 className="mb-4 text-2xl font-bold text-center sm:mb-6 sm:text-4xl">
          {t(`${viewDictionary}.game.title`)}
        </h1>
        <div className="p-3 mb-4 bg-white rounded-lg shadow-md sm:p-4 sm:mb-6">
          <h2 className="mb-3 text-lg font-bold text-center text-green-700 sm:mb-4 sm:text-xl">
            {t(`${viewDictionary}.instructions.title`)}
          </h2>

          <div className="space-y-3 text-sm sm:space-y-4 sm:text-base">
            <section>
              <h3 className="mb-1 text-base font-semibold text-green-600 sm:mb-2 sm:text-lg">
                {t(`${viewDictionary}.instructions.welcome.title`)}
              </h3>
              <p className="mb-2">
                {t(`${viewDictionary}.instructions.welcome.text`)}
              </p>
            </section>

            <section>
              <h3 className="mb-1 text-base font-semibold text-green-600 sm:mb-2 sm:text-lg">
                {t(`${viewDictionary}.instructions.howTo.title`)}
              </h3>
              <ol className="pl-4 space-y-1 list-decimal sm:pl-5 sm:space-y-2">
                <li>{t(`${viewDictionary}.instructions.howTo.step1`)}</li>
                <li>{t(`${viewDictionary}.instructions.howTo.step2`)}</li>
                <li>{t(`${viewDictionary}.instructions.howTo.step3`)}</li>
              </ol>
            </section>

            <section>
              <h3 className="mb-1 text-base font-semibold text-green-600 sm:mb-2 sm:text-lg">
                {t(`${viewDictionary}.instructions.navigation.title`)}
              </h3>
              <ul className="pl-4 space-y-1 list-disc sm:pl-5 sm:space-y-2">
                <li>{t(`${viewDictionary}.instructions.navigation.item1`)}</li>
                <li>{t(`${viewDictionary}.instructions.navigation.item2`)}</li>
              </ul>
            </section>

            <section className="p-2 border-l-4 border-green-500 rounded sm:p-3 bg-green-50">
              <h3 className="mb-1 text-sm font-semibold text-green-600 sm:mb-2 sm:text-base">
                {t(`${viewDictionary}.instructions.tips.title`)}
              </h3>
              <ul className="pl-4 space-y-1 text-sm list-disc sm:pl-5">
                <li>{t(`${viewDictionary}.instructions.tips.item1`)}</li>
                <li>{t(`${viewDictionary}.instructions.tips.item2`)}</li>
                <li>{t(`${viewDictionary}.instructions.tips.item3`)}</li>
              </ul>
            </section>
          </div>
        </div>
        <form
          onSubmit={loadGroup}
          className="max-w-xs mx-auto space-y-3 sm:space-y-4"
        >
          <DynamicInput
            name="groupNum"
            textId={`${viewDictionary}.game.fields.groupNum`}
            type="number"
            value={groupNum}
            onChange={(e) => setGroupNum(e.target.value)}
            required
            inputClassName="text-lg py-2.5"
          />
          <DynamicButton
            type="submit"
            textId={`${viewDictionary}.game.fields.loadButton`}
            size="small"
            state="normal"
          />
        </form>
      </div>
    )
  } else if (pruebas.length === 0) {
    return (
      <div className="container p-4 mx-auto">
        <h1 className="mb-6 text-center t40b">
          {t(`${viewDictionary}.game.title`)}
        </h1>
        <div className="max-w-md p-4 mx-auto text-center bg-yellow-100 border border-yellow-300 rounded-md">
          <p className="mb-4 t16r">Ya tienes asignado el grupo {groupNum}</p>
        </div>
      </div>
    )
  }

  const prueba = pruebas[current]
  const totalResueltas = pruebas.filter((p) => p.resuelto).length
  const porcentajeCompletado = Math.round(
    (totalResueltas / pruebas.length) * 100
  )
  return (
    <div className="container max-w-lg p-4 mx-auto">
      <div className="p-2 mb-4 bg-white rounded-lg shadow-sm sm:p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="t18b">Progreso</h2>
          <span className="t16r">
            {totalResueltas}/{pruebas.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-green-600 h-2.5 rounded-full"
            style={{ width: `${porcentajeCompletado}%` }}
          ></div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <span className="text-sm font-medium text-center sm:text-base">
          Prueba {current + 1} de {pruebas.length}
        </span>
      </div>

      <div className="p-3 bg-white rounded-lg shadow-md sm:p-6">
        <h2 className="mb-2 text-xl font-bold text-center sm:mb-4 sm:text-2xl">
          Prueba {prueba.numeroOrden}/{pruebas.length}
        </h2>

        {prueba.resuelto ? (
          <div className="mb-4 text-center sm:mb-6">
            <div className="p-2 text-green-800 bg-green-100 rounded-md sm:p-3">
              <span className="text-lg sm:text-xl">✓</span> Prueba completada
            </div>
            <DynamicButton
              type="button"
              textId={`${viewDictionary}.game.nextUnsolvedButton`}
              size="small"
              state="normal"
              onClick={() => {
                const nextUnresolved = pruebas.findIndex((p) => !p.resuelto)
                if (nextUnresolved >= 0) {
                  setCurrent(nextUnresolved)
                } else if (current + 1 < pruebas.length) {
                  setCurrent(current + 1)
                }
              }}
            />
          </div>
        ) : (
          <>
            <div className="p-3 mb-4 border-l-4 border-blue-500 rounded-md sm:p-4 sm:mb-6 bg-blue-50">
              <p className="text-sm t16r sm:text-base">{prueba.pista}</p>
            </div>
            <form onSubmit={handleAnswer} className="space-y-3 sm:space-y-4">
              <DynamicInput
                name="respuesta"
                textId={`${viewDictionary}.game.fields.answer`}
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                required
                autoComplete="off"
                className="text-base sm:text-lg"
              />
              <div className="flex justify-center">
                <DynamicButton
                  type="submit"
                  textId={`${viewDictionary}.game.fields.submitAnswer`}
                  size="small"
                  state="normal"
                />
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default GimcanaGame
