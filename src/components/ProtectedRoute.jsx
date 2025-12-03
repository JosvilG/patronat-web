import React, { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { AuthContext } from '../contexts/AuthContext'

export function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext)

  if (!user) {
    return <Navigate to="/" />
  }

  return children
}

export function AdminProtectedRoute({ children }) {
  const { user, userData } = useContext(AuthContext)

  if (!user) return <Navigate to="/" />
  if (userData?.role !== 'admin') return <Navigate to="/" />

  return children
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
}

AdminProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
}
