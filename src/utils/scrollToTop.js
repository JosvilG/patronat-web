import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname } = useLocation()

  const scrollToTopSmooth = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    scrollToTopSmooth()
  }, [pathname])

  useEffect(() => {
    scrollToTopSmooth()

    const handleBeforeUnload = () => {
      window.scrollTo(0, 0)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return null
}

export default ScrollToTop
