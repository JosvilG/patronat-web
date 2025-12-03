import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import Footer from './Footer'
import LiveChat from '../pages/contact/LiveChat'

function Layout() {
  return (
    <div>
      <Navbar />
      <div className="w-full sm:max-w-[98%] justify-self-center min-h-dvh">
        <Outlet />
      </div>
      <Footer />
      <LiveChat />
    </div>
  )
}

export default Layout
