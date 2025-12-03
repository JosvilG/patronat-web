import React from 'react'
import { useTranslation } from 'react-i18next'
import DynamicCard from '../components/Cards'
import useStaffMembers from '../hooks/useStaffMembers'

function AboutPage() {
  const { t } = useTranslation()
  const { staffMembers, loading, error } = useStaffMembers()
  const viewDictionary = 'pages.home.aboutSection'

  return (
    <div className="px-[4%] pb-[4vh] bg-transparent min-h-dvh">
      <div>
        <h1 className="text-center t40b sm:t64b">
          {t(`${viewDictionary}.mainTitle`)}
        </h1>
      </div>
      <section className="mt-[5vh] sm:mt-[10vh] text-left justify-start flex flex-col items-start">
        <h2 className="sm:t40s t36s mb-[3vh]">
          {t(`${viewDictionary}.title`)}
        </h2>
        <p className="sm:t24r t16r text-start">
          {t(`${viewDictionary}.description`)}
        </p>
      </section>

      <section className="mt-[8vh] sm:mt-[10vh] justify-end flex flex-col items-end">
        <h2 className="t40s mb-[3vh]">{t(`${viewDictionary}.historyTitle`)}</h2>
        <p className="sm:t24r t16r text-end">
          {t(`${viewDictionary}.historyDescription`)}
        </p>
      </section>

      <section className="mt-[8vh] sm:mt-[10vh] justify-start flex flex-col items-start">
        <h2 className="t40s mb-[3vh]">
          {t(`${viewDictionary}.motivationTitle`)}
        </h2>
        <p className="sm:t24r t16r text-start">
          {t(`${viewDictionary}.motivationDescription`)}
        </p>
      </section>

      <section className="mt-[8vh] sm:mt-[10vh] flex flex-col">
        <h2 className="sm:t64s t40s mb-[5vh] sm:mb-[10vh] text-end">
          {t(`${viewDictionary}.staffTitle`)}
        </h2>

        {loading && (
          <p className="text-center sm:t24r t16r">
            {t(`${viewDictionary}.loadingStaff`)}
          </p>
        )}

        {error && (
          <p className="text-center text-red-500 sm:t24r t16r">
            {t(`${viewDictionary}.errorStaff`)} {error}
          </p>
        )}

        {!loading && !error && staffMembers.length === 0 && (
          <p className="text-center t16r">
            {t(`${viewDictionary}.noStaffMembers`)}
          </p>
        )}

        {!loading &&
          !error &&
          staffMembers.map((member, index) => (
            <div
              key={member.id}
              className={`flex flex-col ${
                index % 2 !== 0 ? 'md:flex-row-reverse' : 'md:flex-row'
              } mb-[8vh] sm:mb-[10vh]`}
            >
              <div className="w-full md:w-[45%] lg:w-[40%] aspect-square mb-[3vh] md:mb-0">
                <DynamicCard
                  t={t}
                  imageUrl={
                    member.documentUrl ||
                    '/assets/Patronat_color_1024x1024.webp'
                  }
                />
              </div>
              <div
                className={`w-full md:w-[55%] lg:w-[60%] ${
                  index % 2 !== 0 ? 'md:mr-[4%]' : 'md:ml-[4%]'
                }`}
              >
                <h3
                  className={`t40b sm:t64b ${index % 2 !== 0 ? 'md:text-end' : ''}`}
                >
                  {member.firstName || t(`${viewDictionary}.defaultName`)}
                </h3>
                <h4
                  className={`t24s sm:t36s text-[#000000] opacity-50 ${
                    index % 2 !== 0 ? 'md:text-end' : ''
                  }`}
                >
                  {member.lastName || t(`${viewDictionary}.defaultLastName`)}
                </h4>
                <span
                  className={`t16r sm:t18r italic text-[#000000] opacity-70 ${
                    index % 2 !== 0 ? 'md:text-end' : ''
                  } block mb-[2vh]`}
                >
                  {member.position || t(`${viewDictionary}.defaultPosition`)}
                </span>
                <p
                  className={`sm:t24r t16r ${
                    index % 2 !== 0 ? 'md:text-end' : ''
                  }`}
                >
                  {member.description ||
                    t(`${viewDictionary}.defaultDescription`)}
                </p>
              </div>
            </div>
          ))}
      </section>
    </div>
  )
}

export default AboutPage
