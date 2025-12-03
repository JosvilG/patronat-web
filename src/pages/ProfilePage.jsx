import React, { useContext, useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'
import Loader from '../components/Loader'
import { useTranslation } from 'react-i18next'
import useSlug from '../hooks/useSlug'
import DynamicButton from '../components/Buttons'

function ProfilePage() {
  const { userData: authUserData, loading: authLoading } =
    useContext(AuthContext)
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { slug } = useParams()
  const location = useLocation()
  const userId = location.state?.userId
  const { t } = useTranslation()
  const viewDictionary = 'pages.users.userProfile'
  const { generateSlug } = useSlug()

  useEffect(() => {
    if (authLoading) return

    const fetchUserData = async () => {
      setLoading(true)
      try {
        if (userId) {
          const userDoc = await getDoc(doc(db, 'users', userId))
          if (userDoc.exists()) {
            setProfileData({ id: userDoc.id, ...userDoc.data() })
          } else {
            setError(t(`${viewDictionary}.errorMessage.userNotFound`))
          }
        } else if (slug) {
          const usersSnapshot = await getDocs(collection(db, 'users'))
          let found = false

          for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data()
            const fullName =
              `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
            const currentSlug = generateSlug(fullName) || 'usuario'

            if (currentSlug === slug) {
              setProfileData({ id: userDoc.id, ...userData })
              found = true
              break
            }
          }

          if (!found) {
            setError(t(`${viewDictionary}.errorMessage.userNotFound`))
          }
        } else {
          setProfileData(authUserData)
        }
      } catch (err) {
        setError(t(`${viewDictionary}.errorMessage.userLoadingError`))
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [slug, userId, authUserData, authLoading])

  if (loading || authLoading) {
    return <Loader loading={true} text={t(`${viewDictionary}.loading`)} />
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        {t(`${viewDictionary}.${error}`, error)}
      </div>
    )
  }

  const userData = profileData || authUserData

  return (
    <div className="w-[92%] mx-auto pb-[4vh] min-h-dvh">
      <h1 className="mb-[4vh] text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`)}
      </h1>

      {userData ? (
        <div className="p-[5%] space-y-[3vh] rounded-[2rem] sm:rounded-[3rem] h-fit mb-[5vh] text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
          <div className="grid grid-cols-1 gap-[4vh] md:grid-cols-2">
            <div>
              <h2 className="mb-[2vh] t24b">
                {t(`${viewDictionary}.personalInformation.title`)}
              </h2>
              <p className="mb-[1vh] t16r">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.name`)}
                </span>
                {userData.firstName} {userData.lastName}
              </p>
              <p className="mb-[1vh] t16r">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.email`)}
                </span>
                {userData.email}
              </p>
              <p className="mb-[1vh] t16r">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.dni`)}
                </span>
                {userData.dni}
              </p>
              <p className="mb-[1vh] t16r">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.phone`)}
                </span>
                {userData.phoneNumber}
              </p>
              <p className="mb-[1vh] t16r">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.birthDate`)}
                </span>
                {userData.birthDate}
              </p>
              <p className="mb-[1vh] t16r">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.age`, {
                    age: userData.age,
                  })}
                </span>
              </p>
            </div>

            {userData.isStaff && (
              <div>
                <h2 className="mb-[2vh] t24b">
                  {t(`${viewDictionary}.staffInformation.title`)}
                </h2>
                <p className="mb-[1vh] t16r">
                  <span className="font-bold">
                    {t(`${viewDictionary}.staffInformation.position`)}
                  </span>
                  {userData.position}
                </p>
                <p className="mb-[1vh] t16r">
                  <span className="font-bold">
                    {t(`${viewDictionary}.staffInformation.startDate`)}
                  </span>
                  {userData.startDate}
                </p>
                {userData.endDate && (
                  <p className="mb-[1vh] t16r">
                    <span className="font-bold">
                      {t(`${viewDictionary}.staffInformation.endDate`)}
                    </span>
                    {userData.endDate}
                  </p>
                )}
                <p className="mb-[1vh] t16r">
                  <span className="font-bold">
                    {t(`${viewDictionary}.staffInformation.description`)}
                  </span>
                  {userData.description}
                </p>
                {userData.documentUrl && (
                  <div className="mt-[2vh]">
                    <p className="mb-[1vh] font-bold t16r">
                      {t(`${viewDictionary}.staffInformation.document`)}
                    </p>
                    <DynamicButton
                      size="medium"
                      state="normal"
                      type="download"
                      textId={`${viewDictionary}.staffInformation.viewDocument`}
                      onClick={() =>
                        window.open(userData.documentUrl, '_blank')
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {userData.preferredLanguage && (
            <div className="mt-[3vh]">
              <h2 className="mb-[2vh] t24b">
                {t(`${viewDictionary}.preferences.title`)}
              </h2>
              <p className="mb-[1vh] t16r">
                <span className="font-bold">
                  {t(`${viewDictionary}.preferences.language`)}
                </span>
                {userData.preferredLanguage === 'es' ? 'Español' : 'Català'}
              </p>
              <p className="mb-[1vh] t16r">
                <span className="font-bold">
                  {t(`${viewDictionary}.preferences.notifications`)}
                </span>
                {userData.emailNotifications
                  ? t(`${viewDictionary}.preferences.enabled`)
                  : t(`${viewDictionary}.preferences.disabled`)}
              </p>
            </div>
          )}

          {userData.createdAt && (
            <p className="mt-[3vh] text-sm text-gray-500">
              <span className="font-bold">
                {t(`${viewDictionary}.accountInformation.registrationDate`)}
              </span>
              {new Date(userData.createdAt.seconds * 1000).toLocaleDateString()}
            </p>
          )}
        </div>
      ) : (
        <p>{t(`${viewDictionary}.notFound`)}</p>
      )}
    </div>
  )
}

export default ProfilePage
