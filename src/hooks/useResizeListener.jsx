import { useState, useEffect } from 'react'

export const useResizeListener = () => {
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 987)

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth <= 987)
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return isSmallScreen
}
