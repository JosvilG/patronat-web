import React, { useContext, useEffect } from 'react'
import PropTypes from 'prop-types'
import { AuthContext } from './AuthContext'
import { setUserPreferredLanguage } from '../translations'
import log from 'loglevel'

export function LanguageProvider({ children }) {
  const { userData, loading } = useContext(AuthContext)

  useEffect(() => {
    if (!loading && userData) {
      try {
        if (userData.preferredLanguage) {
          setUserPreferredLanguage(userData.preferredLanguage)
          log.info(`Idioma establecido a: ${userData.preferredLanguage}`)
        }
      } catch (error) {
        log.error('Error al establecer el idioma preferido:', error)
      }
    }
  }, [userData, loading])

  return <>{children}</>
}

LanguageProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
