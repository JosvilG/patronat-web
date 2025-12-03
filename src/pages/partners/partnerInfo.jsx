import React, { useEffect, useState, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import useSlug from '../../hooks/useSlug'
import { showPopup } from '../../services/popupService'
import {
  listenPartnerPaymentForSeason,
  listenPartnerPaymentHistory,
  getActiveSeason,
} from '../../hooks/paymentService'
import { exportPartnerToExcel } from '../../utils/createExcel'
import DynamicButton from '../../components/Buttons'

function PartnerInfo() {
  const [partnerData, setPartnerData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { slug } = useParams()
  const location = useLocation()
  const partnerId = location.state?.partnerId
  const { t } = useTranslation()
  const viewDictionary = 'pages.partners.partnerInfo'
  const { generateSlug } = useSlug()

  const [activeSeason, setActiveSeason] = useState(null)
  const [loadingSeason, setLoadingSeason] = useState(false)
  const [partnerPayments, setPartnerPayments] = useState(null)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const paymentListenerRef = useRef(null)
  const historyListenerRef = useRef(null)

  useEffect(() => {
    const fetchPartnerData = async () => {
      setLoading(true)
      try {
        let docSnap = null
        if (partnerId) {
          docSnap = await getDoc(doc(db, 'partners', partnerId))
        } else if (slug) {
          const partsSnap = await getDoc(doc(db, 'partners', slug))
          docSnap = partsSnap.exists() ? partsSnap : null
        }

        if (!docSnap || !docSnap.exists()) {
          setError(t(`${viewDictionary}.errorsMessage.partnerNotFound`))
        } else {
          const data = { id: docSnap.id, ...docSnap.data() }
          setPartnerData(data)

          if (data.status === 'approved') {
            fetchActiveSeason()
          }
        }
      } catch (err) {
        setError(t(`${viewDictionary}.errorsMessage.partnerDataNotLoaded`))
        await showPopup({
          title: t(`${viewDictionary}.errorPopup.title`),
          text: t(`${viewDictionary}.errorsMessage.partnerDataNotLoaded`),
          icon: 'error',
          confirmButtonText: t('components.buttons.accept'),
          confirmButtonColor: '#a3a3a3',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPartnerData()

    return () => {
      if (paymentListenerRef.current) {
        paymentListenerRef.current()
      }
      if (historyListenerRef.current) {
        historyListenerRef.current()
      }
    }
  }, [slug, partnerId, t, generateSlug, viewDictionary])

  useEffect(() => {
    if (!partnerData || !activeSeason) return

    if (paymentListenerRef.current) {
      paymentListenerRef.current()
    }
    if (historyListenerRef.current) {
      historyListenerRef.current()
    }

    setLoadingPayments(true)
    paymentListenerRef.current = listenPartnerPaymentForSeason(
      partnerData.id,
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
      partnerData.id,
      activeSeason.seasonYear,
      (history) => {
        setPaymentHistory(history || [])
        setLoadingHistory(false)
      },
      (error) => {
        setLoadingHistory(false)
      }
    )
  }, [partnerData, activeSeason])

  const fetchActiveSeason = async () => {
    setLoadingSeason(true)
    try {
      const season = await getActiveSeason()
      setActiveSeason(season)
    } catch (error) {
      setActiveSeason(null)
    } finally {
      setLoadingSeason(false)
    }
  }

  const handleExportToExcel = async () => {
    if (!partnerData) return

    try {
      await exportPartnerToExcel(
        partnerData,
        activeSeason,
        partnerPayments,
        paymentHistory,
        showPopup,
        t,
        viewDictionary
      )
    } catch (error) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorsMessage.exportError`),
        icon: 'error',
        confirmButtonText: t('components.buttons.accept'),
        confirmButtonColor: '#a3a3a3',
      })
    }
  }

  const formatDate = (dateObj) => {
    if (!dateObj) return '-'

    if (dateObj.toDate) {
      dateObj = dateObj.toDate()
    }

    if (dateObj instanceof Date) {
      return dateObj.toLocaleDateString()
    }

    return dateObj
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 px-[2vw] py-[1vh] rounded-full text-xs inline-block'
      case 'rejected':
        return 'bg-red-100 text-red-800 px-[2vw] py-[1vh] rounded-full text-xs inline-block'
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 px-[2vw] py-[1vh] rounded-full text-xs inline-block'
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

  if (loading) {
    return <Loader loading={true} text={t(`${viewDictionary}.loading`)} />
  }

  if (error) {
    return (
      <div className="p-[4%] text-center text-red-600">
        {t(`${viewDictionary}.${error}`, error)}
      </div>
    )
  }

  return (
    <div className="container pb-[4vh] mx-auto w-[92%] md:w-auto">
      <h1 className="mb-[4vh] text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`)}
      </h1>

      {partnerData ? (
        <div className="p-[4%]">
          <div className="flex justify-end mb-[3vh]">
            <DynamicButton
              onClick={handleExportToExcel}
              size="small"
              state="normal"
              type="download"
              textId={`${viewDictionary}.exportToExcel`}
              defaultText="Exportar datos"
            />
          </div>

          <div className="grid grid-cols-1 gap-[4vh] md:grid-cols-2 md:gap-[3vw] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
            <div className="py-[3vh] pl-[4%] pr-[4%] md:pr-0">
              <h2 className="mb-[3vh] t24b">
                {t(`${viewDictionary}.personalInformation.title`)}
              </h2>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.name`)}
                </span>
                {partnerData.name} {partnerData.lastName}
              </p>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.email`)}
                </span>
                {partnerData.email}
              </p>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.dni`)}
                </span>
                {partnerData.dni}
              </p>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.phone`)}
                </span>
                {partnerData.phone || '-'}
              </p>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.birthDate`)}
                </span>
                {formatDate(partnerData.birthDate) || '-'}
              </p>
            </div>

            <div className="py-[3vh] pl-[4%] pr-[4%] md:pr-0">
              <h2 className="mb-[3vh] t24b">
                {t(`${viewDictionary}.additionalInformation.title`)}
              </h2>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(`${viewDictionary}.additionalInformation.address`)}
                </span>
                {partnerData.address || '-'}
              </p>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(`${viewDictionary}.additionalInformation.accountNumber`)}
                </span>
                {partnerData.accountNumber || '-'}
              </p>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(`${viewDictionary}.additionalInformation.status`)}
                </span>
                <span
                  className={`${getStatusBadgeClass(partnerData.status)} break-words`}
                >
                  {getStatusText(partnerData.status)}
                </span>
              </p>
            </div>
          </div>

          {partnerData.createdAt && (
            <div className="py-[3vh] px-[4%] mt-[4vh] border-t backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
              <p className="text-sm text-gray-500 break-words">
                <span className="font-bold">
                  {t(`${viewDictionary}.registrationInformation.createdAt`)}
                </span>
                {formatDate(partnerData.createdAt)}
              </p>
            </div>
          )}

          {partnerData.status === 'approved' && (
            <div className="pt-[3vh] mt-[4vh] pb-[3vh] px-[4%] border-t backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
              <h2 className="mb-[3vh] t24b">
                {t(`${viewDictionary}.payments.title`)}
              </h2>

              {activeSeason ? (
                <div className="p-[4%] mb-[4vh]">
                  <h3 className="mb-[2vh] font-medium break-words">
                    {t(`${viewDictionary}.payments.activeSeason`, {
                      year: activeSeason.seasonYear,
                    })}
                  </h3>
                  <div className="grid grid-cols-1 gap-[3vh] md:grid-cols-2 md:gap-[2vw]">
                    <div>
                      <p className="text-sm font-medium text-gray-700 break-words">
                        {t(`${viewDictionary}.payments.adultPrices`)}
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(`${viewDictionary}.payments.totalPrice`, {
                          amount: activeSeason.totalPrice,
                        })}
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(`${viewDictionary}.payments.firstFraction`, {
                          amount: activeSeason.priceFirstFraction,
                        })}
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(`${viewDictionary}.payments.secondFraction`, {
                          amount: activeSeason.priceSeconFraction,
                        })}
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(`${viewDictionary}.payments.thirdFraction`, {
                          amount: activeSeason.priceThirdFraction,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 break-words">
                        {t(`${viewDictionary}.payments.juniorPrices`)}
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(`${viewDictionary}.payments.totalPrice`, {
                          amount: activeSeason.totalPriceJunior,
                        })}
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(`${viewDictionary}.payments.firstFraction`, {
                          amount: activeSeason.priceFirstFractionJunior,
                        })}
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(`${viewDictionary}.payments.secondFraction`, {
                          amount: activeSeason.priceSeconFractionJunior,
                        })}
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(`${viewDictionary}.payments.thirdFraction`, {
                          amount: activeSeason.priceThirdFractionJunior,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-[4%] mb-[4vh] bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-500 break-words">
                    {t(`${viewDictionary}.payments.noActiveSeason`)}
                  </p>
                </div>
              )}

              <div className="mb-[4vh]">
                <h3 className="mb-[2vh] font-medium t18b break-words">
                  {t(`${viewDictionary}.payments.paymentStatus`)}
                </h3>

                {loadingPayments ? (
                  <p className="text-sm text-gray-500 break-words">
                    {t(`${viewDictionary}.payments.loadingPayments`)}
                  </p>
                ) : partnerPayments ? (
                  <div className="p-[4%]">
                    <h4 className="mb-[2vh] text-sm font-medium break-words">
                      {t(`${viewDictionary}.payments.fractionsStatus`)}
                    </h4>

                    <div className="pb-[1.5vh] mb-[3vh] border-b border-gray-200">
                      <div className="flex flex-wrap items-center justify-between mb-[1.5vh]">
                        <span className="font-medium break-words">
                          {t(`${viewDictionary}.payments.firstFraction`)}
                        </span>
                        <span
                          className={`px-[2vw] py-[1vh] rounded-full text-xs break-words ${
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
                          <span className="break-words">
                            {t(
                              `${viewDictionary}.payments.amountWithCurrency`,
                              { amount: partnerPayments.firstPaymentPrice }
                            )}
                            :
                          </span>
                        </div>
                      )}

                      {partnerPayments.firstPayment &&
                        partnerPayments.firstPaymentDate && (
                          <div className="flex justify-between text-sm">
                            <span className="break-words">
                              {t(
                                `${viewDictionary}.payments.paymentDateWithPlaceholder`,
                                {
                                  date: formatDate(
                                    partnerPayments.firstPaymentDate
                                  ),
                                }
                              )}
                              :
                            </span>
                          </div>
                        )}
                    </div>

                    {activeSeason && activeSeason.numberOfFractions >= 2 && (
                      <div className="pb-[1.5vh] mb-[3vh] border-b border-gray-200">
                        <div className="flex flex-wrap items-center justify-between mb-[1.5vh]">
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
                              {t(
                                `${viewDictionary}.payments.amountWithCurrency`,
                                { amount: partnerPayments.secondPaymentPrice }
                              )}
                              :
                            </span>
                          </div>
                        )}

                        {partnerPayments.secondPayment &&
                          partnerPayments.secondPaymentDate && (
                            <div className="flex justify-between text-sm">
                              <span>
                                {t(
                                  `${viewDictionary}.payments.paymentDateWithPlaceholder`,
                                  {
                                    date: formatDate(
                                      partnerPayments.secondPaymentDate
                                    ),
                                  }
                                )}
                                :
                              </span>
                            </div>
                          )}
                      </div>
                    )}

                    {activeSeason && activeSeason.numberOfFractions >= 3 && (
                      <div className="mb-[2vh]">
                        <div className="flex flex-wrap items-center justify-between mb-[1.5vh]">
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
                              {t(
                                `${viewDictionary}.payments.amountWithCurrency`,
                                { amount: partnerPayments.thirdPaymentPrice }
                              )}
                              :
                            </span>
                          </div>
                        )}

                        {partnerPayments.thirdPayment &&
                          partnerPayments.thirdPaymentDate && (
                            <div className="flex justify-between text-sm">
                              <span>
                                {t(
                                  `${viewDictionary}.payments.paymentDateWithPlaceholder`,
                                  {
                                    date: formatDate(
                                      partnerPayments.thirdPaymentDate
                                    ),
                                  }
                                )}
                                :
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 break-words">
                    {t(`${viewDictionary}.payments.noPaymentsFound`)}
                  </p>
                )}
              </div>

              <div className="mb-[4vh]">
                <h3 className="mb-[2vh] font-medium t18b break-words">
                  {t(`${viewDictionary}.payments.history`)}
                </h3>

                {loadingHistory ? (
                  <p className="text-sm text-gray-500 break-words">
                    {t(`${viewDictionary}.payments.loadingHistory`)}
                  </p>
                ) : paymentHistory.length > 0 ? (
                  <div className="grid grid-cols-1 gap-[3vh] sm:grid-cols-2 sm:gap-[2vw] md:grid-cols-3">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="p-[4%] rounded-lg">
                        <div className="flex items-center justify-between mb-[1.5vh]">
                          <span className="font-medium break-words">
                            {t(`${viewDictionary}.seasonLabel`, {
                              seasonYear: payment.seasonYear,
                            })}
                          </span>
                        </div>

                        {(payment.firstPayment ||
                          payment.firstPaymentPrice > 0) && (
                          <div className="pb-[1vh] mb-[1.5vh] border-b border-gray-200">
                            <div className="flex flex-wrap items-center justify-between">
                              <span className="text-sm break-words">
                                {t(
                                  `${viewDictionary}.payments.priceFirstFraction`
                                )}
                              </span>
                              <span
                                className={`px-[2vw] py-[0.5vh] rounded-full text-xs break-words ${
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
                                  {t(
                                    `${viewDictionary}.payments.amountWithCurrency`,
                                    { amount: payment.firstPaymentPrice }
                                  )}
                                </span>
                              </div>
                            )}
                            {payment.firstPayment &&
                              payment.firstPaymentDate && (
                                <div className="flex justify-between mt-[1vh] text-xs">
                                  <span>
                                    {t(
                                      `${viewDictionary}.payments.paymentDateWithPlaceholder`,
                                      {
                                        date: formatDate(
                                          payment.firstPaymentDate
                                        ),
                                      }
                                    )}
                                  </span>
                                </div>
                              )}
                          </div>
                        )}

                        {(payment.secondPayment ||
                          payment.secondPaymentPrice > 0) && (
                          <div className="pb-[1vh] mb-[1.5vh] border-b border-gray-200">
                            <div className="flex flex-wrap items-center justify-between">
                              <span className="text-sm break-words">
                                {t(
                                  `${viewDictionary}.payments.priceSecondFraction`
                                )}
                              </span>
                              <span
                                className={`px-[2vw] py-[0.5vh] rounded-full text-xs break-words ${
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
                                  {t(
                                    `${viewDictionary}.payments.amountWithCurrency`,
                                    { amount: payment.secondPaymentPrice }
                                  )}
                                </span>
                              </div>
                            )}
                            {payment.secondPayment &&
                              payment.secondPaymentDate && (
                                <div className="flex justify-between mt-[1vh] text-xs">
                                  <span>
                                    {t(
                                      `${viewDictionary}.payments.paymentDateWithPlaceholder`,
                                      {
                                        date: formatDate(
                                          payment.secondPaymentDate
                                        ),
                                      }
                                    )}
                                  </span>
                                </div>
                              )}
                          </div>
                        )}

                        {(payment.thirdPayment ||
                          payment.thirdPaymentPrice > 0) && (
                          <div className="mb-[1vh]">
                            <div className="flex flex-wrap items-center justify-between">
                              <span className="text-sm break-words">
                                {t(
                                  `${viewDictionary}.payments.priceThirdFraction`
                                )}
                              </span>
                              <span
                                className={`px-[2vw] py-[0.5vh] rounded-full text-xs break-words ${
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
                                  {t(
                                    `${viewDictionary}.payments.amountWithCurrency`,
                                    { amount: payment.thirdPaymentPrice }
                                  )}
                                </span>
                              </div>
                            )}
                            {payment.thirdPayment &&
                              payment.thirdPaymentDate && (
                                <div className="flex justify-between mt-[1vh] text-xs">
                                  <span>
                                    {t(
                                      `${viewDictionary}.payments.paymentDateWithPlaceholder`,
                                      {
                                        date: formatDate(
                                          payment.thirdPaymentDate
                                        ),
                                      }
                                    )}
                                  </span>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 break-words">
                    {t(`${viewDictionary}.payments.noPaymentHistory`)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-500">
          {t(`${viewDictionary}.notFound`)}
        </p>
      )}
    </div>
  )
}

export default PartnerInfo
