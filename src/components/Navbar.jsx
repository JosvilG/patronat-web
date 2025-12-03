import React, { useContext, useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import log from 'loglevel'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '../contexts/AuthContext'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import { useSignOut } from '../hooks/signOut'
import { useOutsideClick } from '../hooks/useOutSideClickListener'
import { useResizeListener } from '../hooks/useResizeListener'
import { motion, AnimatePresence } from 'framer-motion'
import PropTypes from 'prop-types'
import useSlug from '../hooks/useSlug'

const navLinksData = [
  { to: '/events-list', label: 'components.navbar.eventTitle' },
  { to: '/gallery', label: 'components.navbar.galeryTitle' },
  { to: '/crews', label: 'components.navbar.crewTitle' },
  { to: '/about', label: 'components.navbar.whoWeAreTitle' },
  { to: '/partner-form', label: 'components.navbar.partnersTitle' },
  { to: '/contact', label: 'components.navbar.contactTitle' },
]

// Estilo común para botones y enlaces en todos los menús
const commonMenuItemStyle =
  't12s flex px-[1rem] py-[0.5rem] w-full text-sm transition duration-300 ease-in-out mb-[0.25rem] rounded-[1.5rem] justify-center backdrop-blur-lg backdrop-saturate-[180%] hover:text-[#D9D9D9] bg-[rgba(255,255,255,0.75)] active:bg-gray-300'

const NavLink = ({ to, label, onClick, isSmallScreen }) => {
  // Si es pantalla pequeña, usar el estilo común del menú desplegable
  const baseClass = isSmallScreen
    ? commonMenuItemStyle
    : 'flex items-center px-[1rem] py-[0.5rem] rounded-[1.5rem] transition duration-300 ease-in-out'

  const linkClass = isSmallScreen
    ? ''
    : 'text-[#1E1E1E] hover:text-[#D9D9D9] active:text-[#D9D9D9]'

  return (
    <div
      className={`h-auto min-h-[2.5rem] flex flex-col justify-center items-center w-full ${isSmallScreen ? 'mb-[0.5rem]' : ''}`}
    >
      <Link
        to={to}
        className={`${baseClass} ${linkClass} ${isSmallScreen ? 'w-full' : 'w-auto'}`}
        onClick={onClick}
      >
        {label}
      </Link>
    </div>
  )
}

const MobileMenuButton = ({ onClick, isOpen }) => (
  <button
    className="absolute pr-[1rem] mt-[1.5rem] focus:outline-none right-[2rem]"
    onClick={onClick}
    aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
  >
    <div className="flex justify-center items-center w-[2.75rem] h-[2.75rem] bg-[#3A3A3A] text-white hover:text-[#3A3A3A] hover:bg-gray-200 active:text-[#3A3A3A] active:bg-gray-300 rounded-[0.75rem]">
      {isOpen ? (
        <CloseIcon fontSize="medium" />
      ) : (
        <MenuIcon fontSize="medium" />
      )}
    </div>
  </button>
)

const DropdownMenu = ({ items, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    className="absolute right-0 w-[12rem] mt-[0.5rem] bg-transparent rounded-md"
  >
    <div className="py-[0.5rem]">
      {items.map((item, index) =>
        item.isButton ? (
          <button
            key={index}
            onClick={() => {
              item.onClick()
              onClose()
            }}
            className={commonMenuItemStyle}
          >
            {item.label}
          </button>
        ) : item.onClick ? (
          <button
            key={index}
            onClick={() => {
              item.onClick()
              onClose()
            }}
            className={commonMenuItemStyle}
          >
            {item.label}
          </button>
        ) : (
          <Link
            key={index}
            to={item.to}
            className={commonMenuItemStyle}
            onClick={() => {
              onClose()
            }}
          >
            {item.label}
          </Link>
        )
      )}
    </div>
  </motion.div>
)

export function Navbar() {
  const handleSignOut = useSignOut()
  const { t } = useTranslation()
  const { user, userData } = useContext(AuthContext)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isSmallScreen = useResizeListener()
  const dropdownRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const navigate = useNavigate()
  const { generateSlug } = useSlug()

  // Bloquear scroll cuando el menú móvil está abierto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [mobileMenuOpen])

  useOutsideClick(mobileMenuRef, () => setMobileMenuOpen(false))
  useOutsideClick(dropdownRef, () => !isSmallScreen && setDropdownOpen(false))

  const navigateToProfile = () => {
    if (userData) {
      const userId = userData.id || user.uid
      if (!userId) return

      const fullName =
        `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
      const slug = fullName
        ? `${generateSlug(fullName)}-${userId.slice(0, 8)}`
        : userId

      navigate(`/profile/${slug}`, { state: { userId } })
      setDropdownOpen(false)
    }
  }

  const navLinks = navLinksData.map((link) => ({
    ...link,
    label: t(link.label),
  }))

  const renderNavLinks = () =>
    navLinks.map((link, index) => (
      <NavLink key={index} {...link} isSmallScreen={isSmallScreen} />
    ))

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-[4vw] sm:px-[1.5rem] py-[1rem] bg-gradient-to-b from-white to-95%">
      <div className="flex items-center ml-[1rem] sm:ml-[2rem]">
        <Link to="/">
          <img
            src="/assets/logos/Patronat_color_1024x1024.webp"
            alt="Logo"
            className="mr-[0.5rem] w-[5rem] h-[5rem] sm:w-[7rem] sm:h-[7rem] md:w-[9rem] md:h-[9rem]"
          />
        </Link>
      </div>

      {!isSmallScreen && (
        <div className="t16r flex h-auto min-h-[2.5rem] items-center max-w-[38rem] w-full justify-center px-[0.5rem] text-[#D9D9D9] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-full transition duration-300">
          {renderNavLinks()}
        </div>
      )}

      {isSmallScreen ? (
        <MobileMenuButton
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          isOpen={mobileMenuOpen}
        />
      ) : (
        !user && (
          <Link
            to="/login"
            className="t16s px-[1.5rem] py-[0.5rem] text-white bg-[#3A3A3A] rounded-full hover:bg-[#D9D9D9] hover:text-gray-900 transition duration-300 ease-in-out active:bg-[#D9D9D9]"
          >
            {t('components.navbar.loginTitle')}
          </Link>
        )
      )}

      {/* Overlay con blur para toda la pantalla cuando el menú móvil está abierto */}
      <AnimatePresence>
        {isSmallScreen && mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Menú móvil */}
      <AnimatePresence>
        {isSmallScreen && mobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            className="fixed top-[5.5rem] right-[1rem] left-[1rem] flex flex-col items-center w-auto rounded-[1rem] p-[1rem] z-50 "
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {navLinks.map((link, index) => (
              <Link
                key={index}
                to={link.to}
                className={`${commonMenuItemStyle} py-[0.75rem] mb-[0.75rem] text-base`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!user ? (
              <Link
                to="/login"
                className="t12s flex px-[1rem] py-[0.75rem] w-full text-base font-medium justify-center text-white bg-[#3A3A3A] mb-[0.25rem] rounded-[1.5rem] hover:bg-gray-700 transition duration-300 ease-in-out"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('components.navbar.loginTitle')}
              </Link>
            ) : (
              <>
                <button
                  onClick={() => {
                    navigateToProfile()
                    setMobileMenuOpen(false)
                  }}
                  className={`${commonMenuItemStyle} py-[0.75rem] mb-[0.75rem] text-base`}
                >
                  {t('components.navbar.profileTitle')}
                </button>

                <Link
                  to="/settings"
                  className={`${commonMenuItemStyle} py-[0.75rem] mb-[0.75rem] text-base`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('components.navbar.settingsTitle')}
                </Link>

                {userData?.role === 'admin' && (
                  <Link
                    to="/dashboard"
                    className={`${commonMenuItemStyle} py-[0.75rem] mb-[0.75rem] text-base`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('components.navbar.dashboardTitle')}
                  </Link>
                )}

                <button
                  onClick={async () => {
                    await handleSignOut()
                    setMobileMenuOpen(false)
                  }}
                  className="t12s flex px-[1rem] py-[0.75rem] w-full text-base font-medium justify-center text-white bg-red-600 mb-[0.25rem] rounded-[1.5rem] hover:bg-red-700 transition duration-300 ease-in-out"
                >
                  {t('components.navbar.signOutTitle')}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {user && !isSmallScreen && (
        <div
          className="relative z-50 hidden md:block mr-[2.25rem]"
          ref={dropdownRef}
        >
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center"
          >
            <img
              src="/assets/icons/user-circle-black.svg"
              alt="Perfil"
              className="w-[2.5rem] h-[2.5rem] rounded-full"
            />
          </button>
          {dropdownOpen && userData && (
            <DropdownMenu
              items={[
                {
                  label: t('components.navbar.profileTitle'),
                  onClick: navigateToProfile,
                },
                {
                  to: '/settings',
                  label: t('components.navbar.settingsTitle'),
                },
                userData?.role === 'admin' && {
                  to: '/dashboard',
                  label: t('components.navbar.dashboardTitle'),
                },
                {
                  label: t('components.navbar.signOutTitle'),
                  onClick: handleSignOut,
                  isButton: true,
                },
              ].filter(Boolean)}
              onClose={() => setDropdownOpen(false)}
            />
          )}
        </div>
      )}
    </nav>
  )
}

NavLink.propTypes = {
  to: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  isSmallScreen: PropTypes.bool.isRequired,
}

DropdownMenu.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      to: PropTypes.string,
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func,
      isButton: PropTypes.bool,
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired,
}

MobileMenuButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
}
