import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import {
  ProtectedRoute,
  AdminProtectedRoute,
} from './components/ProtectedRoute'
import UnderConstruction from './pages/UnderConstruction'
import './translations/index'
import {
  publicRoutes,
  userProtectedRoutes,
  adminProtectedRoutes,
} from './routes/routes'
import ScrollToTop from './utils/scrollToTop'

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Layout />}>
          {publicRoutes.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}

          {userProtectedRoutes.map(({ path, element }) => (
            <Route
              key={path}
              path={path}
              element={<ProtectedRoute>{element}</ProtectedRoute>}
            />
          ))}

          {adminProtectedRoutes.map(({ path, element }) => (
            <Route
              key={path}
              path={path}
              element={<AdminProtectedRoute>{element}</AdminProtectedRoute>}
            />
          ))}

          <Route path="*" element={<UnderConstruction />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
