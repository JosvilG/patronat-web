import React, { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import { formatDate } from './NewSeason'

function SeasonsList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [seasons, setSeasons] = useState([])
  const [filteredSeasons, setFilteredSeasons] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const viewDictionary = 'pages.seasons.seasonsList'

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'seasons'))
        const seasonData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }))

        const sortedSeasons = seasonData.sort(
          (a, b) => b.seasonYear - a.seasonYear
        )

        setSeasons(sortedSeasons)
        setFilteredSeasons(sortedSeasons)
      } catch (error) {
        await showPopup({
          title: t(`${viewDictionary}.errorPopup.title`),
          text: t(`${viewDictionary}.errorPopup.loadError`),
          icon: 'error',
          confirmButtonText: t('components.buttons.confirm'),
          confirmButtonColor: '#a3a3a3',
        })
      }
    }

    fetchSeasons()
  }, [t, viewDictionary])

  const handleSearchChange = (event) => {
    const query = event.target.value.toLowerCase()
    setSearchQuery(query)

    const filtered = seasons.filter(
      (season) =>
        season.seasonYear.toString().includes(query) ||
        (season.totalPrice && season.totalPrice.toString().includes(query))
    )

    setFilteredSeasons(filtered)
  }

  const handleDelete = async (id) => {
    try {
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('seasonYear', '==', seasons.find((s) => s.id === id).seasonYear)
      )
      const paymentsSnapshot = await getDocs(paymentsQuery)

      if (!paymentsSnapshot.empty) {
        await showPopup({
          title: t(`${viewDictionary}.warningPopup.title`),
          text: t(`${viewDictionary}.warningPopup.hasPayments`),
          icon: 'warning',
          confirmButtonText: t('components.buttons.confirm'),
          confirmButtonColor: '#8be484',
        })
        return
      }

      const result = await showPopup({
        title: t(`${viewDictionary}.confirmPopup.title`),
        text: t(`${viewDictionary}.confirmPopup.deleteMessage`),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: t('components.buttons.delete'),
        confirmButtonColor: '#8be484',
        cancelButtonText: t('components.buttons.cancel'),
        cancelButtonColor: '#a3a3a3',
      })

      if (result.isConfirmed) {
        await deleteDoc(doc(db, 'seasons', id))
        const updatedSeasons = seasons.filter((season) => season.id !== id)
        setSeasons(updatedSeasons)
        setFilteredSeasons(updatedSeasons)

        await showPopup({
          title: t(`${viewDictionary}.successPopup.title`),
          text: t(`${viewDictionary}.successPopup.deleteSuccess`),
          icon: 'success',
          confirmButtonText: t('components.buttons.confirm'),
          confirmButtonColor: '#8be484',
        })
      }
    } catch (error) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.deleteError`),
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
    }
  }

  return (
    <div className="w-[92%] pb-[4vh] mx-auto md:w-auto md:max-w-[90%] lg:max-w-[80%]">
      <h1 className="mb-[4vh] text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`)}
      </h1>

      <div className="grid items-center grid-cols-1 gap-[3vh] mb-[4vh] sm:grid-cols-2 sm:gap-[2vw]">
        <div className="w-full">
          <DynamicInput
            name="search"
            type="text"
            textId={`${viewDictionary}.searchPlaceholder`}
            placeholder={t(`${viewDictionary}.searchPlaceholder`)}
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
        <div className="flex justify-center sm:justify-end">
          <DynamicButton
            onClick={() => navigate('/new-season/')}
            size="small"
            state="normal"
            type="add"
            textId={t(`${viewDictionary}.addNewButton`)}
          />
        </div>
      </div>

      {filteredSeasons.length === 0 ? (
        <div className="p-[4%] text-center bg-gray-100 rounded-lg">
          <p>{t(`${viewDictionary}.noSeasons`)}</p>
        </div>
      ) : (
        <ul className="space-y-[3vh]">
          {filteredSeasons.map((season) => (
            <li
              key={season.id}
              className="p-[4%] bg-gray-100 rounded-lg shadow"
            >
              <div className="flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[2vh] sm:gap-0">
                  <div className="flex flex-wrap items-center gap-[2vw]">
                    <span className="text-lg font-semibold">
                      {t(`${viewDictionary}.seasonLabel`)}
                      {season.seasonYear}
                    </span>
                    {season.active && (
                      <span className="px-[2vw] py-[1vh] text-xs font-bold text-white bg-green-500 rounded-full">
                        {t(`${viewDictionary}.activeLabel`)}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-[2vw]">
                    <DynamicButton
                      onClick={() => navigate(`/edit-season/${season.id}`)}
                      size="small"
                      state="normal"
                      textId={t('components.buttons.edit')}
                    />
                    <DynamicButton
                      onClick={() => handleDelete(season.id)}
                      size="x-small"
                      type="delete"
                      disabled={season.active}
                      title={
                        season.active
                          ? t(`${viewDictionary}.cannotDeleteActive`)
                          : ''
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-[3vh] mt-[4vh] md:grid-cols-2 md:gap-[2vw]">
                  <div className="p-[5%] bg-[#D9D9D9] rounded-[20px] text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
                    <h3 className="mb-[2vh] font-bold text-center">
                      {t(`${viewDictionary}.adultPrices`)}
                    </h3>
                    <div className="grid grid-cols-1 gap-[1vh]">
                      <p className="text-sm">
                        <span className="font-medium">
                          {t(`${viewDictionary}.totalPrice`, {
                            amount: season.totalPrice,
                          })}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">
                          {t(`${viewDictionary}.fraction1`, {
                            amount: season.priceFirstFraction,
                          })}
                          :
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">
                          {t(`${viewDictionary}.fraction2`, {
                            amount: season.priceSeconFraction,
                          })}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">
                          {t(`${viewDictionary}.fraction3`, {
                            amount: season.priceThirdFraction,
                          })}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="p-[5%] bg-[#D9D9D9] rounded-[20px] text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
                    <h3 className="mb-[2vh] font-bold text-center">
                      {t(`${viewDictionary}.juniorPrices`)}
                    </h3>
                    <div className="grid grid-cols-1 gap-[1vh]">
                      <p className="text-sm">
                        <span className="font-medium">
                          {t(`${viewDictionary}.totalPrice`, {
                            amount: season.totalPriceJunior || 0,
                          })}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">
                          {t(`${viewDictionary}.fraction1`, {
                            amount: season.priceFirstFractionJunior || 0,
                          })}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">
                          {t(`${viewDictionary}.fraction2`, {
                            amount: season.priceSeconFractionJunior || 0,
                          })}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">
                          {t(`${viewDictionary}.fraction3`, {
                            amount: season.priceThirdFractionJunior || 0,
                          })}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-[2vh] text-sm text-gray-500">
                  <span className="font-medium">
                    {t(`${viewDictionary}.createdAt`, {
                      date: formatDate(season.createdAt),
                    })}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SeasonsList
