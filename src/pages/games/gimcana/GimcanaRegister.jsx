import React, { useState } from 'react'
import { Timestamp, collection, doc, setDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import log from 'loglevel'
import { db } from '../../../firebase/firebase'
import Loader from '../../../components/Loader'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../../components/Inputs'
import DynamicButton from '../../../components/Buttons'
import { showPopup } from '../../../services/popupService'

const createPruebaModel = (index) => ({
  id: '',
  numeroOrden: index + 1,
  pista: '',
  respuesta: '',
  resuelto: false,
})

// helper para barajar array
const shuffle = (arr) => {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function PruebasRegister() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [numPruebas, setNumPruebas] = useState(27)
  const [pruebas, setPruebas] = useState(
    Array.from({ length: numPruebas }, (_, i) => createPruebaModel(i))
  )
  const [submitting, setSubmitting] = useState(false)
  const viewDictionary = 'pages.games.gimcana.pruebasRegister'

  log.setLevel('debug')

  const handleNumChange = (e) => {
    const n = parseInt(e.target.value, 10) || 0
    setNumPruebas(n)
    setPruebas(Array.from({ length: n }, (_, i) => createPruebaModel(i)))
  }

  const handleChange = (e, idx) => {
    const { name, value, type, checked } = e.target
    setPruebas((prev) =>
      prev.map((p, i) =>
        i === idx
          ? {
              ...p,
              [name]: type === 'checkbox' ? checked : value,
            }
          : p
      )
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const usedKeys = new Set()
      const docsData = []

      while (docsData.length < numPruebas) {
        const shuffled = shuffle(pruebas)
        const key = shuffled.map((p) => p.numeroOrden).join(',')
        if (usedKeys.has(key)) continue

        usedKeys.add(key)
        const pruebasOrdenadas = shuffled.map((p, i) => ({
          ...p,
          numeroOrden: i + 1,
        }))
        docsData.push({
          grupo: docsData.length + 1,
          pruebas: pruebasOrdenadas,
        })
      }

      const batch = docsData.map((data) => {
        const ref = doc(collection(db, 'gimcana'))
        return setDoc(ref, {
          ...data,
          crewId: '',
          createdAt: Timestamp.now(),
        })
      })

      await Promise.all(batch)
      await showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
        confirmButtonText: t('components.buttons.accept'),
        confirmButtonColor: '#8be484',
        onConfirm: () => navigate('/dashboard'),
      })
    } catch (error) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.text`, { error: error.message }),
        icon: 'error',
        confirmButtonText: t('components.buttons.close'),
        confirmButtonColor: '#a3a3a3',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container px-3 sm:px-[4%] pb-4 sm:pb-[4vh] mx-auto flex flex-col items-center justify-center min-h-[80vh]">
      <Loader loading={submitting} />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center mx-auto space-y-4 sm:space-y-[3vh] max-w-md md:max-w-7xl w-full"
      >
        <h1 className="mb-4 sm:mb-[4vh] text-center text-2xl sm:text-4xl md:text-5xl font-bold">
          {t(`${viewDictionary}.title`)}
        </h1>

        {/* input dinámico de número de pruebas */}
        <div className="w-full mb-4 sm:mb-[3vh]">
          <DynamicInput
            name="numPruebas"
            textId={t(`${viewDictionary}.fields.numPruebas`)}
            type="number"
            value={numPruebas}
            min={1}
            onChange={handleNumChange}
            required
            inputClassName="py-2.5 text-base sm:text-lg"
          />
        </div>

        <div className="p-3 sm:p-[4%] mb-4 sm:mb-[4vh] rounded-lg shadow-sm bg-white/50 w-full">
          <div className="space-y-4 sm:space-y-[3vh]">
            {pruebas.map((p, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-4 gap-x-3 sm:gap-x-[3vw] gap-y-2 sm:gap-y-[2vh] justify-items-center border-b border-gray-200 pb-3 sm:pb-4 last:border-0 last:pb-0"
              >
                <div className="w-[50%] md:w-full">
                  <DynamicInput
                    name="numeroOrden"
                    textId={t(`${viewDictionary}.fields.numeroOrden`)}
                    type="number"
                    value={p.numeroOrden}
                    onChange={(e) => handleChange(e, idx)}
                    disabled
                    inputClassName="text-center font-medium"
                  />
                </div>
                <div className="w-[90%] md:w-full col-span-1 md:col-span-2">
                  <DynamicInput
                    name="pista"
                    textId={t(`${viewDictionary}.fields.pista`)}
                    type="text"
                    value={p.pista}
                    onChange={(e) => handleChange(e, idx)}
                    required
                    inputClassName="py-2.5"
                  />
                </div>
                <div className="w-[90%] md:w-full">
                  <DynamicInput
                    name="respuesta"
                    textId={t(`${viewDictionary}.fields.respuesta`)}
                    type="text"
                    value={p.respuesta}
                    onChange={(e) => handleChange(e, idx)}
                    required
                    inputClassName="py-2.5"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* botones cancelar/submit */}
        <div className="flex flex-col gap-2 sm:gap-[2vh] sm:flex-row sm:justify-end sm:gap-[2vw] mt-4 sm:mt-[4vh] w-[90%] md:w-full">
          <DynamicButton
            type="button"
            onClick={() => navigate('/dashboard')}
            size="small"
            state="normal"
            textId={t('components.buttons.cancel')}
          />
          <DynamicButton
            type="submit"
            size="small"
            state="normal"
            textId={`${viewDictionary}.submitButton`}
          />
        </div>
      </form>
    </div>
  )
}

export default PruebasRegister
