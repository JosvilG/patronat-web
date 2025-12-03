import React, { useEffect, useState, useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { AuthContext } from '../../contexts/AuthContext'
import Loader from '../../components/Loader'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import { useTranslation } from 'react-i18next'
import {
  getPartnerPaymentsByStatus,
  updatePartnerPayment,
  normalizePaymentDates,
} from '../../hooks/paymentService'

const calculateAge = (birthDate) => {
  if (!birthDate) return null

  try {
    let birthDateObj = birthDate
    if (birthDate?.toDate) {
      birthDateObj = birthDate.toDate()
    } else if (typeof birthDate === 'string') {
      birthDateObj = new Date(birthDate)
    }

    const today = new Date()
    let age = today.getFullYear() - birthDateObj.getFullYear()
    const monthDiff = today.getMonth() - birthDateObj.getMonth()

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDateObj.getDate())
    ) {
      age--
    }

    return age
  } catch (error) {
    return null
  }
}

function PartnerModifyForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useContext(AuthContext)
  const partnerId = location.state?.partnerId
  const viewDictionary = 'pages.partners.modifyPartners'

  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    dni: '',
    birthDate: '',
    accountNumber: '',
    status: 'pending',
    priceCategory: 'adult',
    createdAt: null,
    lastUpdateDate: null,
    submitting: false,
  })

  const [activeSeason, setActiveSeason] = useState(null)
  const [loadingSeason, setLoadingSeason] = useState(false)
  const [paymentData, setPaymentData] = useState(null)
  const [paymentId, setPaymentId] = useState(null)
  const [loadingPayments, setLoadingPayments] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const formatDate = (dateObj) => {
    if (!dateObj) return ''

    if (dateObj.toDate) {
      dateObj = dateObj.toDate()
    }

    if (dateObj instanceof Date) {
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    return ''
  }

  const fetchActiveSeason = async () => {
    setLoadingSeason(true)
    try {
      const seasonsQuery = query(
        collection(db, 'seasons'),
        where('active', '==', true)
      )

      const querySnapshot = await getDocs(seasonsQuery)

      if (!querySnapshot.empty) {
        const seasonDoc = querySnapshot.docs[0]
        setActiveSeason({ id: seasonDoc.id, ...seasonDoc.data() })
      } else {
        setActiveSeason(null)
      }
    } catch (error) {
      setActiveSeason(null)
    } finally {
      setLoadingSeason(false)
    }
  }

  const fetchPartnerPayments = async (id) => {
    if (!id) return

    setLoadingPayments(true)
    try {
      const paymentInfo = await getPartnerPaymentsByStatus(id)

      if (paymentInfo && paymentInfo.current) {
        setPaymentId(paymentInfo.current.id)
        setPaymentData({
          ...paymentInfo.current,
          priceCategory:
            paymentInfo.current.priceCategory ||
            formData.priceCategory ||
            'adult',
        })
      } else {
        setPaymentData(null)
        setPaymentId(null)
      }

      if (!activeSeason) {
        await fetchActiveSeason()
      }
    } catch (error) {
      setPaymentData(null)
      setPaymentId(null)
    } finally {
      setLoadingPayments(false)
    }
  }

  const updatePricesBasedOnCategory = (category) => {
    if (!paymentData || !activeSeason) return

    let firstPrice, secondPrice, thirdPrice

    if (category === 'junior') {
      firstPrice = activeSeason.priceFirstFractionJunior || 0
      secondPrice = activeSeason.priceSeconFractionJunior || 0
      thirdPrice = activeSeason.priceThirdFractionJunior || 0
    } else {
      firstPrice = activeSeason.priceFirstFraction || 0
      secondPrice = activeSeason.priceSeconFraction || 0
      thirdPrice = activeSeason.priceThirdFraction || 0
    }

    setPaymentData((prev) => ({
      ...prev,
      firstPaymentPrice: prev.firstPaymentDone
        ? prev.firstPaymentPrice
        : firstPrice,
      secondPaymentPrice: prev.secondPaymentDone
        ? prev.secondPaymentPrice
        : secondPrice,
      thirdPaymentPrice: prev.thirdPaymentDone
        ? prev.thirdPaymentPrice
        : thirdPrice,
      priceCategory: category,
    }))
  }

  useEffect(() => {
    const fetchPartner = async () => {
      if (!partnerId) {
        setError(t(`${viewDictionary}.errorMessages.errorPartnerCharging`))
        setLoading(false)
        return
      }

      try {
        const docRef = doc(db, 'partners', partnerId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const partnerData = docSnap.data()

          const age = calculateAge(partnerData.birthDate)
          const suggestedCategory =
            age !== null && age >= 14 && age <= 16 ? 'junior' : 'adult'

          setFormData({
            id: docSnap.id,
            name: partnerData.name || '',
            lastName: partnerData.lastName || '',
            email: partnerData.email || '',
            phone: partnerData.phone || '',
            address: partnerData.address || '',
            dni: partnerData.dni || '',
            birthDate: formatDate(partnerData.birthDate) || '',
            accountNumber: partnerData.accountNumber || '',
            status: partnerData.status || 'pending',
            priceCategory: partnerData.priceCategory || suggestedCategory,
            createdAt: partnerData.createdAt || null,
            lastUpdateDate: partnerData.lastUpdateDate || null,
            submitting: false,
          })

          if (partnerData.status === 'approved') {
            await fetchActiveSeason()
            await fetchPartnerPayments(docSnap.id)
          }
        } else {
          setError(t(`${viewDictionary}.errorMessages.noPartnerFound`))
        }
      } catch (error) {
        setError(t(`${viewDictionary}.errorMessages.errorPartnerCharging`))
      } finally {
        setLoading(false)
      }
    }

    fetchPartner()
  }, [partnerId])

  const validateForm = () => {
    if (
      !formData.name ||
      !formData.lastName ||
      !formData.email ||
      !formData.dni
    ) {
      return t(`${viewDictionary}.validation.requiredFields`)
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRx.test(formData.email)) {
      return t(`${viewDictionary}.validation.invalidEmail`)
    }
    const dniRx = /^[0-9]{8}[A-Za-z]$/
    if (!dniRx.test(formData.dni)) {
      return t(`${viewDictionary}.validation.invalidDni`)
    }
    if (formData.accountNumber) {
      const ibanRx = /^ES[0-9]{22}$/
      if (!ibanRx.test(formData.accountNumber)) {
        return t(`${viewDictionary}.validation.invalidIban`)
      }
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormData((prev) => ({ ...prev, submitting: true }))

    const validationError = validateForm()
    if (validationError) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: validationError,
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
      setFormData((prev) => ({ ...prev, submitting: false }))
      return
    }

    try {
      const updatedFields = {
        name: formData.name,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        dni: formData.dni,
        birthDate: formData.birthDate,
        accountNumber: formData.accountNumber,
        status: formData.status,
        priceCategory: formData.priceCategory,
        lastUpdateDate: serverTimestamp(),
      }

      await updateDoc(doc(db, 'partners', partnerId), updatedFields)

      if (paymentId && paymentData && formData.status === 'approved') {
        const normalizedPaymentData = normalizePaymentDates({
          ...paymentData,
          priceCategory: formData.priceCategory,
        })

        await updatePartnerPayment(
          partnerId,
          paymentId,
          normalizedPaymentData,
          user?.uid || ''
        )
      }

      await showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#8be484',
      })

      navigate('/partners-list')
    } catch (error) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.updateError`),
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
    } finally {
      setFormData((prev) => ({ ...prev, submitting: false }))
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleStatusChange = (e) => {
    setFormData((prev) => ({ ...prev, status: e.target.value }))
  }

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value
    setFormData((prev) => ({ ...prev, priceCategory: newCategory }))

    if (paymentData && activeSeason) {
      updatePricesBasedOnCategory(newCategory)
    }
  }

  const handlePaymentChange = (e) => {
    const { name, value, type, checked } = e.target

    const newValue = type === 'checkbox' ? checked : value

    const parsedValue = [
      'firstPaymentPrice',
      'secondPaymentPrice',
      'thirdPaymentPrice',
    ].includes(name)
      ? newValue === ''
        ? 0
        : Number(newValue)
      : newValue

    setPaymentData((prev) => ({
      ...prev,
      [name]: parsedValue,
    }))
  }

  const handleDateChange = (e) => {
    const { name, value } = e.target

    let dateValue = value ? new Date(value) : null

    setPaymentData((prev) => ({
      ...prev,
      [name]: dateValue,
    }))
  }

  const refreshPaymentData = async () => {
    if (!partnerId) return

    setLoadingPayments(true)
    try {
      await fetchPartnerPayments(partnerId)
    } finally {
      setLoadingPayments(false)
    }
  }

  if (loading) {
    return <Loader loading={loading} />
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>
  }

  return (
    <div className="bg-transparent min-h-dvh pb-[5vh]">
      <section className="max-w-full mx-auto">
        <h2 className="mb-[5vh] text-center sm:t64b t40b">
          {t(`${viewDictionary}.title`)}
        </h2>
        <Loader loading={formData.submitting} />

        <form onSubmit={handleSubmit} className="p-[4%] space-y-[5vh]">
          <h2 className="mb-[3vh] text-center t24b">
            {t(`${viewDictionary}.personalInfoSection`)}
          </h2>

          <div className="grid grid-cols-1 gap-[4vh] md:gap-[3vw] md:grid-cols-2 justify-items-center w-full">
            <DynamicInput
              name="name"
              textId={t(`${viewDictionary}.nameLabel`)}
              placeholder={t(`${viewDictionary}.namePlaceholder`)}
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              disabled={formData.submitting}
              required
              className="w-full"
            />

            <DynamicInput
              name="lastName"
              textId={t(`${viewDictionary}.lastNameLabel`)}
              placeholder={t(`${viewDictionary}.lastNamePlaceholder`)}
              type="text"
              value={formData.lastName}
              onChange={handleInputChange}
              disabled={formData.submitting}
              required
              className="w-full"
            />

            <DynamicInput
              name="email"
              textId={t(`${viewDictionary}.emailLabel`)}
              placeholder={t(`${viewDictionary}.emailPlaceholder`)}
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={formData.submitting}
              required
              className="w-full"
            />

            <DynamicInput
              name="phone"
              textId={t(`${viewDictionary}.phoneLabel`)}
              placeholder={t(`${viewDictionary}.phonePlaceholder`)}
              type="phone"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={formData.submitting}
              className="w-full"
            />

            <DynamicInput
              name="dni"
              textId={t(`${viewDictionary}.dniLabel`)}
              placeholder={t(`${viewDictionary}.dniPlaceholder`)}
              type="text"
              value={formData.dni}
              onChange={handleInputChange}
              disabled={formData.submitting}
              required
              className="w-full"
            />

            <DynamicInput
              name="birthDate"
              textId={t(`${viewDictionary}.birthDateLabel`)}
              placeholder={t(`${viewDictionary}.birthDatePlaceholder`)}
              type="date"
              value={formData.birthDate}
              onChange={handleInputChange}
              disabled={formData.submitting}
              className="w-full"
            />

            <DynamicInput
              name="address"
              textId={t(`${viewDictionary}.addressLabel`)}
              placeholder={t(`${viewDictionary}.addressPlaceholder`)}
              type="text"
              value={formData.address}
              onChange={handleInputChange}
              disabled={formData.submitting}
              className="w-full"
            />

            <DynamicInput
              name="accountNumber"
              textId={t(`${viewDictionary}.accountNumberLabel`)}
              placeholder={t(`${viewDictionary}.accountNumberLabel`)}
              type="text"
              value={formData.accountNumber}
              onChange={handleInputChange}
              disabled={formData.submitting}
              className="w-full"
            />

            <DynamicInput
              name="status"
              type="select"
              textId={t(`${viewDictionary}.statusLabel`)}
              defaultText={t(`${viewDictionary}.partnerStatus`)}
              value={formData.status}
              onChange={handleStatusChange}
              disabled={formData.submitting}
              options={[
                {
                  value: 'pending',
                  label: t(`${viewDictionary}.statusOptions.review`),
                },
                {
                  value: 'approved',
                  label: t(`${viewDictionary}.statusOptions.active`),
                },
                {
                  value: 'rejected',
                  label: t(`${viewDictionary}.statusOptions.inactive`),
                },
              ]}
              className="w-full"
            />
          </div>

          {formData.status === 'approved' && (
            <div className="pt-[5vh] mt-[4vh] border-t border-gray-200">
              <h2 className="mb-[3vh] text-center t24b">
                {t(`${viewDictionary}.paymentsSection`)}
              </h2>

              <div className="grid grid-cols-1 gap-[4vh] justify-items-center w-full">
                <DynamicInput
                  name="priceCategory"
                  type="select"
                  textId={t(`${viewDictionary}.priceCategoryLabel`)}
                  defaultText="Categoría de precios"
                  value={formData.priceCategory}
                  onChange={handleCategoryChange}
                  disabled={formData.submitting}
                  options={[
                    {
                      value: 'adult',
                      label: t(`${viewDictionary}.priceCategoryAdult`),
                    },
                    {
                      value: 'junior',
                      label: t(`${viewDictionary}.priceCategoryJunior`),
                    },
                  ]}
                  className="w-full md:w-1/2"
                />
              </div>

              {loadingSeason ? (
                <p className="mt-[3vh] mb-[3vh] text-sm text-center text-gray-500">
                  {t(`${viewDictionary}.payments.loadingSeason`)}
                </p>
              ) : activeSeason ? (
                <div className="p-4 mb-6 bg-gray-100 rounded-lg">
                  <h3 className="mb-3 font-medium">
                    {t(`${viewDictionary}.payments.seasonInfo`, {
                      seasonYear: activeSeason.seasonYear,
                    })}
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {t(`${viewDictionary}.payments.adultPrices`)}:
                      </p>
                      <p className="text-sm text-gray-600">
                        {t(`${viewDictionary}.payments.totalPrice`, {
                          amount: activeSeason.totalPrice,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {t(`${viewDictionary}.payments.juniorPrices`)}:
                      </p>
                      <p className="text-sm text-gray-600">
                        {t(`${viewDictionary}.payments.totalPrice`, {
                          amount: activeSeason.totalPriceJunior,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-[4%] mt-[3vh] mb-[4vh] text-center bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-500 break-words">
                    {t(`${viewDictionary}.payments.noActiveSeason`)}
                  </p>
                </div>
              )}

              {loadingPayments ? (
                <div className="p-[4%] text-center">
                  <p className="text-sm text-gray-500 break-words">
                    {t(`${viewDictionary}.payments.loadingPayments`)}
                  </p>
                </div>
              ) : paymentData && activeSeason ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[4vh] md:gap-[2vw] mt-[3vh]">
                  {/* Primer fraccionamiento */}
                  <div className="p-[5%] bg-gray-50 rounded-lg w-full">
                    <h4 className="font-medium mb-[2vh] break-words">
                      {t(`${viewDictionary}.payments.firstFraction`)}
                    </h4>
                    <div className="flex items-center mb-[2vh]">
                      <input
                        id="firstPayment"
                        name="firstPayment"
                        type="checkbox"
                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        checked={paymentData.firstPayment}
                        onChange={handlePaymentChange}
                        disabled={formData.submitting}
                      />
                      <label
                        htmlFor="firstPayment"
                        className="ml-[0.5rem] block text-sm text-gray-700 break-words"
                      >
                        {t(`${viewDictionary}.payments.markAsPaid`)}
                      </label>
                    </div>
                    <div className="mb-[2vh]">
                      <label className="block text-xs text-gray-700 mb-[1vh] break-words">
                        {t(`${viewDictionary}.payments.amount`)}
                      </label>
                      <div className="flex rounded-md shadow-sm">
                        <input
                          type="number"
                          name="firstPaymentPrice"
                          value={paymentData.firstPaymentPrice || 0}
                          onChange={handlePaymentChange}
                          className="block w-full rounded-l-md border-0 py-[0.75vh] px-[1vw] text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                          disabled={formData.submitting}
                          min="0"
                          step="0.01"
                        />
                        <span className="inline-flex items-center px-[0.75rem] rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                          €
                        </span>
                      </div>
                    </div>
                    {paymentData.firstPayment && (
                      <div>
                        <label className="block text-xs text-gray-700 mb-[1vh] break-words">
                          {t(`${viewDictionary}.payments.paymentDate`)}
                        </label>
                        <input
                          type="date"
                          name="firstPaymentDate"
                          value={
                            paymentData.firstPaymentDate
                              ? formatDate(paymentData.firstPaymentDate)
                              : ''
                          }
                          onChange={handleDateChange}
                          className="block w-full rounded-md border-0 py-[0.75vh] px-[1vw] text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                          disabled={formData.submitting}
                        />
                      </div>
                    )}
                  </div>
                  {/* Segundo fraccionamiento */}
                  <div className="p-[5%] bg-gray-50 rounded-lg w-full">
                    <h4 className="font-medium mb-[2vh] break-words">
                      {t(`${viewDictionary}.payments.secondFraction`)}
                    </h4>
                    <div className="flex items-center mb-[2vh]">
                      <input
                        id="secondPayment"
                        name="secondPayment"
                        type="checkbox"
                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        checked={paymentData.secondPayment}
                        onChange={handlePaymentChange}
                        disabled={formData.submitting}
                      />
                      <label
                        htmlFor="secondPayment"
                        className="ml-[0.5rem] block text-sm text-gray-700 break-words"
                      >
                        {t(`${viewDictionary}.payments.markAsPaid`)}
                      </label>
                    </div>
                    <div className="mb-[2vh]">
                      <label className="block text-xs text-gray-700 mb-[1vh] break-words">
                        {t(`${viewDictionary}.payments.amount`)}
                      </label>
                      <div className="flex rounded-md shadow-sm">
                        <input
                          type="number"
                          name="secondPaymentPrice"
                          value={paymentData.secondPaymentPrice || 0}
                          onChange={handlePaymentChange}
                          className="block w-full rounded-l-md border-0 py-[0.75vh] px-[1vw] text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                          disabled={formData.submitting}
                          min="0"
                          step="0.01"
                        />
                        <span className="inline-flex items-center px-[0.75rem] rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                          €
                        </span>
                      </div>
                    </div>
                    {paymentData.secondPayment && (
                      <div>
                        <label className="block text-xs text-gray-700 mb-[1vh] break-words">
                          {t(`${viewDictionary}.payments.paymentDate`)}
                        </label>
                        <input
                          type="date"
                          name="secondPaymentDate"
                          value={
                            paymentData.secondPaymentDate
                              ? formatDate(paymentData.secondPaymentDate)
                              : ''
                          }
                          onChange={handleDateChange}
                          className="block w-full rounded-md border-0 py-[0.75vh] px-[1vw] text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                          disabled={formData.submitting}
                        />
                      </div>
                    )}
                  </div>
                  {/* Tercer fraccionamiento */}
                  <div className="p-[5%] bg-gray-50 rounded-lg w-full">
                    <h4 className="font-medium mb-[2vh] break-words">
                      {t(`${viewDictionary}.payments.thirdFraction`)}
                    </h4>
                    <div className="flex items-center mb-[2vh]">
                      <input
                        id="thirdPayment"
                        name="thirdPayment"
                        type="checkbox"
                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        checked={paymentData.thirdPayment}
                        onChange={handlePaymentChange}
                        disabled={formData.submitting}
                      />
                      <label
                        htmlFor="thirdPayment"
                        className="ml-[0.5rem] block text-sm text-gray-700 break-words"
                      >
                        {t(`${viewDictionary}.payments.markAsPaid`)}
                      </label>
                    </div>
                    <div className="mb-[2vh]">
                      <label className="block text-xs text-gray-700 mb-[1vh] break-words">
                        {t(`${viewDictionary}.payments.amount`)}
                      </label>
                      <div className="flex rounded-md shadow-sm">
                        <input
                          type="number"
                          name="thirdPaymentPrice"
                          value={paymentData.thirdPaymentPrice || 0}
                          onChange={handlePaymentChange}
                          className="block w-full rounded-l-md border-0 py-[0.75vh] px-[1vw] text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                          disabled={formData.submitting}
                          min="0"
                          step="0.01"
                        />
                        <span className="inline-flex items-center px-[0.75rem] rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                          €
                        </span>
                      </div>
                    </div>
                    {paymentData.thirdPayment && (
                      <div>
                        <label className="block text-xs text-gray-700 mb-[1vh] break-words">
                          {t(`${viewDictionary}.payments.paymentDate`)}
                        </label>
                        <input
                          type="date"
                          name="thirdPaymentDate"
                          value={
                            paymentData.thirdPaymentDate
                              ? formatDate(paymentData.thirdPaymentDate)
                              : ''
                          }
                          onChange={handleDateChange}
                          className="block w-full rounded-md border-0 py-[0.75vh] px-[1vw] text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                          disabled={formData.submitting}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-[4%] mt-[3vh] text-center rounded-lg bg-gray-50">
                  <p className="mb-[2vh] text-sm text-gray-500 break-words">
                    {t(`${viewDictionary}.payments.noPaymentsFound`)}
                  </p>
                  <button
                    onClick={refreshPaymentData}
                    className="flex items-center px-[1rem] py-[0.5rem] mx-auto text-sm bg-gray-200 rounded hover:bg-gray-300"
                    type="button"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 mr-[0.5rem]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    {t(`${viewDictionary}.payments.retryLoad`)}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-center pt-[3vh]">
            <DynamicButton
              type="submit"
              size="medium"
              state={formData.submitting ? 'disabled' : 'normal'}
              textId={
                formData.submitting
                  ? t(`${viewDictionary}.submittingText`)
                  : t('components.buttons.save')
              }
              defaultText={
                formData.submitting
                  ? t(`${viewDictionary}.savingButtonText`)
                  : t('components.buttons.save')
              }
              disabled={formData.submitting}
            />
          </div>
        </form>
      </section>
    </div>
  )
}

export default PartnerModifyForm
