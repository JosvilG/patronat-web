import React, { useEffect, useState, useRef } from 'react'
import {
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import Loader from '../../components/Loader'
import { showPopup } from '../../services/popupService'
import useSlug from '../../hooks/useSlug'
import {
  listenPartnerPaymentForSeason,
  listenPartnerPaymentHistory,
  getActiveSeason,
  createPaymentForPartner,
  getPartnerPaymentHistory,
  getPartnerPaymentsForSeason,
} from '../../hooks/paymentService'
import { getAuth } from 'firebase/auth'
import {
  exportPartnerToExcel,
  exportAllPartnersToExcel,
} from '../../utils/createExcel'

function PartnerList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { generateSlug } = useSlug()
  const [partners, setPartners] = useState([])
  const [filteredPartners, setFilteredPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [activeSeason, setActiveSeason] = useState(null)
  const [loadingSeason, setLoadingSeason] = useState(false)
  const [partnerPayments, setPartnerPayments] = useState(null)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [exportingToExcel, setExportingToExcel] = useState(false)
  const [exportingAllToExcel, setExportingAllToExcel] = useState(false)
  const paymentListenerRef = useRef(null)
  const historyListenerRef = useRef(null)
  const viewDictionary = 'pages.partners.listPartners'

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'partners'))
        const partnerData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setPartners(partnerData)
        setFilteredPartners(partnerData)
      } catch (error) {
        await showPopup({
          title: t(`${viewDictionary}.errorPopup.title`),
          text: t(`${viewDictionary}.errorPopup.text`),
          icon: 'error',
          confirmButtonText: t('components.buttons.confirm'),
          confirmButtonColor: '#a3a3a3',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPartners()

    return () => {
      if (paymentListenerRef.current) {
        paymentListenerRef.current()
      }
      if (historyListenerRef.current) {
        historyListenerRef.current()
      }
    }
  }, [t])

  useEffect(() => {
    if (!sidebarOpen || !selectedPartner || !activeSeason) return

    if (paymentListenerRef.current) {
      paymentListenerRef.current()
    }
    if (historyListenerRef.current) {
      historyListenerRef.current()
    }

    if (selectedPartner.status === 'approved') {
      setLoadingPayments(true)
      paymentListenerRef.current = listenPartnerPaymentForSeason(
        selectedPartner.id,
        activeSeason.seasonYear,
        (payment) => {
          if (!payment) {
            payment = {
              id: 'pending-creation',
              seasonYear: activeSeason.seasonYear,
              firstPayment: false,
              firstPaymentPrice: activeSeason.priceFirstFraction || 0,
              secondPayment: false,
              secondPaymentPrice: activeSeason.priceSeconFraction || 0,
              thirdPayment: false,
              thirdPaymentPrice: activeSeason.priceThirdFraction || 0,
            }
          }
          setPartnerPayments(payment)
          setLoadingPayments(false)
        },
        (error) => {
          setLoadingPayments(false)
        }
      )

      setLoadingHistory(true)
      historyListenerRef.current = listenPartnerPaymentHistory(
        selectedPartner.id,
        activeSeason.seasonYear,
        (history) => {
          setPaymentHistory(history || [])
          setLoadingHistory(false)
        },
        (error) => {
          setLoadingHistory(false)
        }
      )
    }
  }, [selectedPartner, activeSeason, sidebarOpen])

  const handleSearchChange = (event) => {
    const query = event.target.value.toLowerCase()
    setSearchQuery(query)

    const filtered = partners.filter(
      (partner) =>
        (partner.name && partner.name.toLowerCase().includes(query)) ||
        (partner.lastName && partner.lastName.toLowerCase().includes(query)) ||
        (partner.email && partner.email.toLowerCase().includes(query)) ||
        (partner.dni && partner.dni.toLowerCase().includes(query))
    )

    setFilteredPartners(filtered)
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs'
      case 'rejected':
        return 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs'
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return t(`${viewDictionary}.status.approved`)
      case 'rejected':
        return t(`${viewDictionary}.status.rejected`)
      case 'pending':
      default:
        return t(`${viewDictionary}.status.pending`)
    }
  }

  const formatDate = (dateObj) => {
    if (!dateObj) return ''

    if (dateObj.toDate) {
      dateObj = dateObj.toDate()
    }

    if (dateObj instanceof Date) {
      return dateObj.toLocaleDateString()
    }

    return ''
  }

  const approvePartner = async (id) => {
    try {
      setLoadingSeason(true)
      const currentActiveSeason = await getActiveSeason()
      setLoadingSeason(false)

      if (!currentActiveSeason) {
        await showPopup({
          title: t(`${viewDictionary}.warningPopup.title`),
          text: t(`${viewDictionary}.warningPopup.noActiveSeason`),
          icon: 'warning',
          confirmButtonText: t('components.buttons.confirm'),
          confirmButtonColor: '#8be484',
        })
      }

      let userId = 'sistema'
      try {
        const auth = getAuth()
        const currentUser = auth.currentUser
        if (currentUser) {
          userId = currentUser.uid
        }
      } catch (authError) {
        return
      }

      const partnerRef = doc(db, 'partners', id)
      await updateDoc(partnerRef, {
        status: 'approved',
        lastUpdateDate: new Date(),
      })

      if (currentActiveSeason) {
        const now = new Date()
        const newPaymentData = {
          createdAt: now,
          lastUpdateDate: now,
          seasonYear: currentActiveSeason.seasonYear,
          userId: userId,

          firstPayment: false,
          firstPaymentDate: null,
          firstPaymentPrice: currentActiveSeason.priceFirstFraction || 0,

          secondPayment: false,
          secondPaymentDate: null,
          secondPaymentPrice: currentActiveSeason.priceSeconFraction || 0,

          thirdPayment: false,
          thirdPaymentDate: null,
          thirdPaymentPrice: currentActiveSeason.priceThirdFraction || 0,
        }

        try {
          await createPaymentForPartner(id, newPaymentData, userId)
        } catch (paymentError) {
          return
        }
      }

      const updatedPartners = partners.map((partner) =>
        partner.id === id ? { ...partner, status: 'approved' } : partner
      )
      setPartners(updatedPartners)
      setFilteredPartners(
        filteredPartners.map((partner) =>
          partner.id === id ? { ...partner, status: 'approved' } : partner
        )
      )

      await showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: currentActiveSeason
          ? t(`${viewDictionary}.successPopup.approvedWithPayment`)
          : t(`${viewDictionary}.successPopup.statusUpdateText`),
        icon: 'success',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#8be484',
      })
    } catch (error) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.statusUpdateError`),
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
    }
  }

  const rejectPartner = async (id) => {
    try {
      const partnerRef = doc(db, 'partners', id)
      await updateDoc(partnerRef, {
        status: 'rejected',
        lastUpdateDate: new Date(),
      })

      const updatedPartners = partners.map((partner) =>
        partner.id === id ? { ...partner, status: 'rejected' } : partner
      )
      setPartners(updatedPartners)
      setFilteredPartners(
        filteredPartners.map((partner) =>
          partner.id === id ? { ...partner, status: 'rejected' } : partner
        )
      )

      showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.statusUpdateText`),
        icon: 'success',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#8be484',
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.statusUpdateError`),
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
    }
  }

  const deletePartner = async (id) => {
    try {
      const confirmResult = await showPopup({
        title: t(`${viewDictionary}.confirmPopup.title`),
        text: t(`${viewDictionary}.confirmPopup.text`),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: t('components.buttons.delete'),
        confirmButtonColor: '#8be484',
        cancelButtonText: t('components.buttons.cancel'),
        cancelButtonColor: '#a3a3a3',
      })

      if (!confirmResult.isConfirmed) {
        return
      }

      setLoading(true)

      const paymentsQuery = query(
        collection(db, 'payments'),
        where('partnerId', '==', id)
      )

      const paymentsSnapshot = await getDocs(paymentsQuery)

      if (!paymentsSnapshot.empty) {
        const batch = writeBatch(db)
        paymentsSnapshot.docs.forEach((paymentDoc) => {
          batch.delete(doc(db, 'payments', paymentDoc.id))
        })
        await batch.commit()
      }

      await deleteDoc(doc(db, 'partners', id))

      const updatedPartners = partners.filter((partner) => partner.id !== id)
      setPartners(updatedPartners)
      setFilteredPartners(updatedPartners)

      await showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.deleteText`),
        icon: 'success',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#8be484',
      })
    } catch (error) {
      if (error && error.isDismissed) return
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.deleteError`),
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExportToExcel = async (partnerId) => {
    try {
      const partner = partners.find((p) => p.id === partnerId)
      if (!partner) {
        throw new Error('Socio no encontrado')
      }

      setExportingToExcel(true)

      let payments = null
      let history = []
      let currentActiveSeason = null

      if (partner.status === 'approved') {
        currentActiveSeason = await getActiveSeason()

        if (currentActiveSeason) {
          try {
            if (selectedPartner && selectedPartner.id === partnerId) {
              payments = partnerPayments
              history = paymentHistory
            } else {
              payments = await getPartnerPaymentsForSeason(
                partnerId,
                currentActiveSeason.seasonYear
              )

              const historyData = await getPartnerPaymentHistory(
                partnerId,
                currentActiveSeason.seasonYear
              )
              history = historyData || []
            }
          } catch (error) {
            // Manejo silencioso, no mostrar error en consola
          }
        }
      }

      await exportPartnerToExcel(
        partner,
        currentActiveSeason,
        payments,
        history,
        showPopup,
        t,
        'pages.partners.listPartners'
      )
    } catch (error) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.exportError`),
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
    } finally {
      setExportingToExcel(false)
    }
  }

  const handleExportAllToExcel = async () => {
    try {
      setExportingAllToExcel(true)

      let currentActiveSeason = activeSeason
      if (!currentActiveSeason) {
        currentActiveSeason = await getActiveSeason()
      }

      await exportAllPartnersToExcel(
        partners,
        currentActiveSeason,
        getPartnerPaymentsForSeason,
        getPartnerPaymentHistory,
        showPopup,
        t,
        'pages.partners.listPartners'
      )
    } catch (error) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.exportAllError`),
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
    } finally {
      setExportingAllToExcel(false)
    }
  }

  const openSidebar = async (partner) => {
    setSelectedPartner(partner)
    setSidebarOpen(true)

    setPartnerPayments(null)
    setPaymentHistory([])

    try {
      await fetchActiveSeason()
    } catch (error) {
      // Manejo silencioso, no mostrar error en consola
    }
  }

  const closeSidebar = () => {
    if (paymentListenerRef.current) {
      paymentListenerRef.current()
      paymentListenerRef.current = null
    }
    if (historyListenerRef.current) {
      historyListenerRef.current()
      historyListenerRef.current = null
    }

    setSidebarOpen(false)
    setSelectedPartner(null)
  }

  const fetchActiveSeason = async () => {
    setLoadingSeason(true)
    try {
      const season = await getActiveSeason()
      setActiveSeason(season)
      return season
    } catch (error) {
      setActiveSeason(null)
      return null
    } finally {
      setLoadingSeason(false)
    }
  }

  if (loading)
    return <Loader loading={true} text={t(`${viewDictionary}.loadingText`)} />

  return (
    <div className="h-screen max-h-[75dvh] pb-[4vh] mx-auto w-[92%] md:w-auto md:max-w-[90%] overflow-y-auto relative flex flex-col items-center sm:flex-none">
      <Loader
        loading={exportingAllToExcel}
        text={t(`${viewDictionary}.exportingAllDataText`)}
      />

      <Loader
        loading={exportingToExcel}
        text={t(`${viewDictionary}.exportingDataText`)}
      />

      <h1 className="mb-[4vh] text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`)}
      </h1>
      <div className="grid items-center justify-start grid-cols-1 gap-[3vh] mb-[4vh] md:justify-items-start sm:grid-cols-2 sm:justify-between">
        <DynamicInput
          name="search"
          type="text"
          placeholder={t(`${viewDictionary}.searchPlaceholder`)}
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full"
        />
        <div className="flex justify-center w-full gap-[2vw] sm:justify-start">
          <DynamicButton
            onClick={handleExportAllToExcel}
            size="small"
            state="normal"
            type="download"
            textId={t(`${viewDictionary}.exportAllToExcel`)}
          />

          <DynamicButton
            onClick={() => navigate(`/admin-partner-form/`)}
            size="small"
            state="normal"
            type="add"
            textId={t(`${viewDictionary}.addNewButton`)}
          />
        </div>
      </div>

      {sidebarOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black bg-opacity-50">
          <div className="w-full h-full max-w-md p-[4%] overflow-y-auto transition-transform duration-300 ease-in-out transform bg-white shadow-lg">
            <div className="flex items-center justify-between mb-[3vh]">
              <h2 className="text-center t24b">
                {t(`${viewDictionary}.payments.title`)}
              </h2>
              <button
                onClick={closeSidebar}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            <div className="mb-[3vh]">
              <div className="font-medium">
                {selectedPartner.name} {selectedPartner.lastName}
              </div>
              <div className="text-sm text-gray-600">
                {selectedPartner.email}
              </div>
              <div className="mt-[1vh] text-sm text-gray-600">
                {t(`${viewDictionary}.payments.status`)}
                <span
                  className={`ml-[0.5vw] ${getStatusBadgeClass(selectedPartner.status)}`}
                >
                  {getStatusText(selectedPartner.status)}
                </span>
              </div>
            </div>

            <div className="pt-[3vh] mb-[3vh] border-t border-gray-200">
              <h3 className="mb-[2vh] font-medium">
                {t(`${viewDictionary}.payments.activeSeason`)}
              </h3>

              {loadingSeason ? (
                <p className="text-sm text-gray-500">
                  {t(`${viewDictionary}.payments.loadingSeason`)}
                </p>
              ) : activeSeason ? (
                <div className="p-[4%] rounded-lg bg-gray-50">
                  <div className="flex justify-between mb-[1.5vh]">
                    <span className="font-medium">
                      {t(`${viewDictionary}.payments.seasonYear`, {
                        year: activeSeason.seasonYear,
                      })}
                    </span>
                  </div>

                  <div className="flex justify-between mb-[1.5vh]">
                    <span className="font-medium">
                      {t(`${viewDictionary}.payments.totalPrice`, {
                        amount: activeSeason.totalPrice,
                      })}
                    </span>
                  </div>

                  <div className="flex justify-between mb-[1.5vh]">
                    <span className="font-medium">
                      {t(`${viewDictionary}.payments.numberOfFractions`, {
                        amount: activeSeason.numberOfFractions,
                      })}
                    </span>
                  </div>

                  {activeSeason.priceFirstFraction > 0 && (
                    <div className="flex justify-between mb-[1.5vh]">
                      <span className="font-medium">
                        {t(`${viewDictionary}.payments.priceFirstFraction`, {
                          amount: activeSeason.priceFirstFraction,
                        })}
                      </span>
                    </div>
                  )}

                  {activeSeason.priceSeconFraction > 0 && (
                    <div className="flex justify-between mb-[1.5vh]">
                      <span className="font-medium">
                        {t(`${viewDictionary}.payments.priceSecondFraction`, {
                          amount: activeSeason.priceSeconFraction,
                        })}
                      </span>
                    </div>
                  )}

                  {activeSeason.priceThirdFraction > 0 && (
                    <div className="flex justify-between mb-[1.5vh]">
                      <span className="font-medium">
                        {t(`${viewDictionary}.payments.priceThirdFraction`, {
                          amount: activeSeason.priceThirdFraction,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {t(`${viewDictionary}.payments.noActiveSeason`)}
                </p>
              )}
            </div>

            {selectedPartner.status === 'approved' && (
              <div className="pt-[3vh] mb-[3vh] border-t border-gray-200">
                <h3 className="mb-[2vh] font-medium">
                  {t(`${viewDictionary}.payments.paymentStatus`)}
                </h3>

                {loadingPayments ? (
                  <p className="text-sm text-gray-500">
                    {t(`${viewDictionary}.payments.loadingPayments`)}
                  </p>
                ) : partnerPayments ? (
                  <div className="p-[4%] rounded-lg bg-gray-50">
                    <h4 className="mb-[2vh] text-sm font-medium">
                      {t(`${viewDictionary}.payments.fractionsStatus`)}
                    </h4>

                    <div className="pb-[1.5vh] mb-[3vh] border-b border-gray-200">
                      <div className="flex items-center justify-between mb-[1.5vh]">
                        <span className="font-medium">
                          {t(`${viewDictionary}.payments.firstFraction`)}
                        </span>
                        <span
                          className={`px-[2vw] py-[1vh] rounded-full text-xs ${
                            partnerPayments.firstPayment
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {partnerPayments.firstPayment
                            ? t(`${viewDictionary}.payments.paid`)
                            : t(`${viewDictionary}.payments.pending`)}
                        </span>
                      </div>

                      {partnerPayments.firstPaymentPrice > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>
                            {t(`${viewDictionary}.payments.amount`, {
                              amount: partnerPayments.firstPaymentPrice,
                            })}
                          </span>
                        </div>
                      )}

                      {partnerPayments.firstPayment &&
                        partnerPayments.firstPaymentDate && (
                          <div className="flex justify-between text-sm">
                            <span>
                              {t(`${viewDictionary}.payments.paymentDate`, {
                                date: formatDate(
                                  partnerPayments.firstPaymentDate
                                ),
                              })}
                            </span>
                          </div>
                        )}
                    </div>

                    {activeSeason && activeSeason.numberOfFractions >= 2 && (
                      <div className="pb-[1.5vh] mb-[3vh] border-b border-gray-200">
                        <div className="flex items-center justify-between mb-[1.5vh]">
                          <span className="font-medium">
                            {t(`${viewDictionary}.payments.secondFraction`)}
                          </span>
                          <span
                            className={`px-[2vw] py-[1vh] rounded-full text-xs ${
                              partnerPayments.secondPayment
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {partnerPayments.secondPayment
                              ? t(`${viewDictionary}.payments.paid`)
                              : t(`${viewDictionary}.payments.pending`)}
                          </span>
                        </div>

                        {partnerPayments.secondPaymentPrice > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>
                              {t(`${viewDictionary}.payments.amount`, {
                                amount: partnerPayments.secondPaymentPrice,
                              })}
                            </span>
                          </div>
                        )}

                        {partnerPayments.secondPayment &&
                          partnerPayments.secondPaymentDate && (
                            <div className="flex justify-between text-sm">
                              <span>
                                {t(`${viewDictionary}.payments.paymentDate`, {
                                  date: formatDate(
                                    partnerPayments.secondPaymentDate
                                  ),
                                })}
                              </span>
                            </div>
                          )}
                      </div>
                    )}

                    {activeSeason && activeSeason.numberOfFractions >= 3 && (
                      <div className="mb-[2vh]">
                        <div className="flex items-center justify-between mb-[1.5vh]">
                          <span className="font-medium">
                            {t(`${viewDictionary}.payments.thirdFraction`)}
                          </span>
                          <span
                            className={`px-[2vw] py-[1vh] rounded-full text-xs ${
                              partnerPayments.thirdPayment
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {partnerPayments.thirdPayment
                              ? t(`${viewDictionary}.payments.paid`)
                              : t(`${viewDictionary}.payments.pending`)}
                          </span>
                        </div>

                        {partnerPayments.thirdPaymentPrice > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>
                              {t(`${viewDictionary}.payments.amount`, {
                                amount: partnerPayments.thirdPaymentPrice,
                              })}
                            </span>
                          </div>
                        )}

                        {partnerPayments.thirdPayment &&
                          partnerPayments.thirdPaymentDate && (
                            <div className="flex justify-between text-sm">
                              <span>
                                {t(`${viewDictionary}.payments.paymentDate`, {
                                  date: formatDate(
                                    partnerPayments.thirdPaymentDate
                                  ),
                                })}
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-[4%] rounded-lg bg-gray-50">
                    <p className="mb-[2vh] text-sm text-gray-500">
                      {t(`${viewDictionary}.payments.noPaymentsFound`)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-[3vh] border-t border-gray-200">
              <h3 className="mb-[2vh] font-medium">
                {t(`${viewDictionary}.payments.history`)}
              </h3>

              {loadingHistory ? (
                <p className="text-sm text-gray-500">
                  {t(`${viewDictionary}.payments.loadingHistory`)}
                </p>
              ) : paymentHistory.length > 0 ? (
                <div className="space-y-[3vh]">
                  {paymentHistory.map((payment) => (
                    <div
                      key={payment.id}
                      className="p-[4%] rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-[1.5vh]">
                        <span className="font-medium">
                          {t(`${viewDictionary}.payments.season`, {
                            season: payment.seasonYear,
                          })}
                        </span>
                      </div>

                      {(payment.firstPayment ||
                        payment.firstPaymentPrice > 0) && (
                        <div className="pb-[1vh] mb-[1.5vh] border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">
                              {t(`${viewDictionary}.payments.firstFraction`)}
                            </span>
                            <span
                              className={`px-[2vw] py-[0.5vh] rounded-full text-xs ${
                                payment.firstPayment
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {payment.firstPayment
                                ? t(`${viewDictionary}.payments.paid`)
                                : t(`${viewDictionary}.payments.pending`)}
                            </span>
                          </div>
                          {payment.firstPaymentPrice > 0 && (
                            <div className="flex justify-between mt-[1vh] text-xs">
                              <span>
                                {t(`${viewDictionary}.payments.amount`, {
                                  amount: payment.firstPaymentPrice,
                                })}
                              </span>
                            </div>
                          )}
                          {payment.firstPayment && payment.firstPaymentDate && (
                            <div className="flex justify-between mt-[1vh] text-xs">
                              <span>
                                {t(`${viewDictionary}.payments.paymentDate`, {
                                  date: formatDate(payment.firstPaymentDate),
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {(payment.secondPayment ||
                        payment.secondPaymentPrice > 0) && (
                        <div className="pb-[1vh] mb-[1.5vh] border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">
                              {t(`${viewDictionary}.payments.secondFraction`)}
                            </span>
                            <span
                              className={`px-[2vw] py-[0.5vh] rounded-full text-xs ${
                                payment.secondPayment
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {payment.secondPayment
                                ? t(`${viewDictionary}.payments.paid`)
                                : t(`${viewDictionary}.payments.pending`)}
                            </span>
                          </div>
                          {payment.secondPaymentPrice > 0 && (
                            <div className="flex justify-between mt-[1vh] text-xs">
                              <span>
                                {t(`${viewDictionary}.payments.amount`, {
                                  amount: payment.secondPaymentPrice,
                                })}
                              </span>
                            </div>
                          )}
                          {payment.secondPayment &&
                            payment.secondPaymentDate && (
                              <div className="flex justify-between mt-[1vh] text-xs">
                                <span>
                                  {t(`${viewDictionary}.payments.paymentDate`, {
                                    date: formatDate(payment.secondPaymentDate),
                                  })}
                                </span>
                              </div>
                            )}
                        </div>
                      )}

                      {(payment.thirdPayment ||
                        payment.thirdPaymentPrice > 0) && (
                        <div className="mb-[1vh]">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">
                              {' '}
                              {t(`${viewDictionary}.payments.thirdFraction`)}
                            </span>
                            <span
                              className={`px-[2vw] py-[0.5vh] rounded-full text-xs ${
                                payment.thirdPayment
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {payment.thirdPayment
                                ? t(`${viewDictionary}.payments.paid`)
                                : t(`${viewDictionary}.payments.pending`)}
                            </span>
                          </div>
                          {payment.thirdPaymentPrice > 0 && (
                            <div className="flex justify-between mt-[1vh] text-xs">
                              <span>
                                {' '}
                                {t(`${viewDictionary}.payments.amount`, {
                                  amount: payment.thirdPaymentPrice,
                                })}
                              </span>
                            </div>
                          )}
                          {payment.thirdPayment && payment.thirdPaymentDate && (
                            <div className="flex justify-between mt-[1vh] text-xs">
                              <span>
                                {' '}
                                {t(`${viewDictionary}.payments.paymentDate`, {
                                  date: formatDate(payment.thirdPaymentDate),
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {t(`${viewDictionary}.payments.noPaymentHistory`)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {filteredPartners.length === 0 ? (
        <div className="p-[4%] mb-[3vh] text-sm text-blue-700 bg-blue-100 rounded-lg w-full">
          <p className="text-center text-gray-500">
            {t(`${viewDictionary}.noPartnersFound`)}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden w-full overflow-x-auto sm:block">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="p-[2%] text-xs font-medium tracking-wider text-left text-gray-500 uppercase w-[20%]"
                  >
                    {t(`${viewDictionary}.table.name`)}
                  </th>
                  <th
                    scope="col"
                    className="p-[2%] text-xs font-medium tracking-wider text-left text-gray-500 uppercase w-[22%] max-w-[20rem]"
                  >
                    {t(`${viewDictionary}.table.email`)}
                  </th>
                  <th
                    scope="col"
                    className="p-[2%] text-xs font-medium tracking-wider text-left text-gray-500 uppercase w-[12%]"
                  >
                    {t(`${viewDictionary}.table.phone`)}
                  </th>
                  <th
                    scope="col"
                    className="p-[2%] text-xs font-medium tracking-wider text-left text-gray-500 uppercase w-[15%]"
                  >
                    {t(`${viewDictionary}.table.createdAt`)}
                  </th>
                  <th
                    scope="col"
                    className="p-[2%] text-xs font-medium tracking-wider text-left text-gray-500 uppercase w-[10%]"
                  >
                    {t(`${viewDictionary}.table.status`)}
                  </th>
                  <th
                    scope="col"
                    className="p-[2%] text-xs font-medium tracking-wider text-left text-gray-500 uppercase w-[21%]"
                  >
                    {t(`${viewDictionary}.table.actions`)}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPartners.map((partner) => (
                  <tr key={partner.id}>
                    <td className="p-[2%] whitespace-normal">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {partner.name} {partner.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {partner.dni || '-'}
                      </div>
                    </td>
                    <td className="p-[2%]">
                      <div className="max-w-full overflow-hidden text-sm text-gray-900 truncate">
                        {partner.email}
                      </div>
                    </td>
                    <td className="p-[2%] whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {partner.phone || '-'}
                      </div>
                    </td>
                    <td className="p-[2%] whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(partner.createdAt)}
                      </div>
                    </td>
                    <td className="p-0 whitespace-nowrap">
                      <span
                        className={`${getStatusBadgeClass(partner.status)} px-[2vw] py-[1vh] inline-block`}
                      >
                        {getStatusText(partner.status)}
                      </span>
                    </td>
                    <td className="p-[2%] text-sm font-medium">
                      <div className="flex flex-wrap gap-[1vw]">
                        <DynamicButton
                          onClick={() => {
                            const slug = generateSlug(
                              `${partner.name}-${partner.lastName}`
                            )
                            navigate(`/partners-info/${slug}`, {
                              state: { partnerId: partner.id },
                            })
                          }}
                          size="x-small"
                          state="normal"
                          type="view"
                        />
                        <DynamicButton
                          onClick={() => {
                            const slug = generateSlug(
                              `${partner.name}-${partner.lastName}`
                            )
                            navigate(`/partners-modify/${slug}`, {
                              state: { partnerId: partner.id },
                            })
                          }}
                          size="x-small"
                          state="normal"
                          type="edit"
                        />
                        <DynamicButton
                          onClick={() => approvePartner(partner.id)}
                          size="x-small"
                          state="normal"
                          type="personAdd"
                        />
                        <DynamicButton
                          onClick={() => rejectPartner(partner.id)}
                          size="x-small"
                          state="normal"
                          type="personDown"
                        />
                        <DynamicButton
                          onClick={() => deletePartner(partner.id)}
                          size="x-small"
                          type="delete"
                        />
                        <DynamicButton
                          onClick={() => handleExportToExcel(partner.id)}
                          size="x-small"
                          state="normal"
                          type="download"
                          title={t(`${viewDictionary}.exportToExcel`)}
                        />
                        <DynamicButton
                          name="openModal"
                          onClick={() => openSidebar(partner)}
                          size="x-small"
                          state="normal"
                          type="payment"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="w-full sm:hidden">
            {filteredPartners.map((partner) => (
              <div
                key={partner.id}
                className="p-[4%] mb-[3vh] bg-white rounded-lg shadow-md"
              >
                <div className="flex items-center justify-between mb-[2vh]">
                  <div className="font-medium">
                    {partner.name} {partner.lastName}
                  </div>
                  <span
                    className={`${getStatusBadgeClass(partner.status)} px-[2vw] py-[1vh]`}
                  >
                    {getStatusText(partner.status)}
                  </span>
                </div>

                <div className="mb-[1vh] text-sm text-gray-600">
                  <div>
                    {t(`${viewDictionary}.DNILabel`, {
                      dni: partner.dni || '-',
                    })}
                  </div>
                  <div>
                    {t(`${viewDictionary}.emailLabel`, {
                      email: partner.email || '-',
                    })}
                  </div>
                  <div>
                    {t(`${viewDictionary}.phoneLabel`, {
                      phone: partner.phone || '-',
                    })}
                  </div>
                  <div>
                    {t(`${viewDictionary}.createdAtLabel`, {
                      date: formatDate(partner.createdAt) || '-',
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-[2vw] pt-[2vh] mt-[2vh] border-t">
                  <DynamicButton
                    onClick={() => {
                      const slug = generateSlug(
                        `${partner.name}-${partner.lastName}`
                      )
                      navigate(`/partners-info/${slug}`, {
                        state: { partnerId: partner.id },
                      })
                    }}
                    size="x-small"
                    state="normal"
                    type="view"
                  />
                  <DynamicButton
                    onClick={() => {
                      const slug = generateSlug(
                        `${partner.name}-${partner.lastName}`
                      )
                      navigate(`/partners-modify/${slug}`, {
                        state: { partnerId: partner.id },
                      })
                    }}
                    size="x-small"
                    state="normal"
                    type="edit"
                  />
                  <DynamicButton
                    onClick={() => approvePartner(partner.id)}
                    size="x-small"
                    state="normal"
                    type="personAdd"
                  />
                  <DynamicButton
                    onClick={() => rejectPartner(partner.id)}
                    size="x-small"
                    state="normal"
                    type="personDown"
                  />
                  <DynamicButton
                    onClick={() => deletePartner(partner.id)}
                    size="x-small"
                    type="delete"
                  />
                  <DynamicButton
                    onClick={() => handleExportToExcel(partner.id)}
                    size="x-small"
                    state="normal"
                    type="download"
                  />
                  <DynamicButton
                    name="openModal"
                    onClick={() => openSidebar(partner)}
                    size="x-small"
                    state="normal"
                    type="payment"
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default PartnerList
