import React from 'react'
import { useTranslation } from 'react-i18next'

const UnderConstructionPage = () => {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center min-h-[67dvh]">
      <div className="w-full sm:max-w-lg max-w-[340px] p-8 text-center bg-white rounded-lg shadow-2xl">
        <h1 className="mb-4 text-[#15642E] sm:t64b t40b">
          {t('pages.underConstruction.title')}
        </h1>
        <p className="mb-6 text-xl text-gray-700">
          {t('pages.underConstruction.weAreWorking')}
        </p>
        <p className="text-lg text-gray-500">
          {t('pages.underConstruction.askUs')}
          <a
            href="mailto:soporte@tusitio.com"
            className="text-[#15642E] sm:t16b t12b hover:underline"
          >
            <br />
            info@patronatfestesroquetes.com
          </a>
          .
        </p>
      </div>
    </div>
  )
}

export default UnderConstructionPage
