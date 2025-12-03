import { useState } from 'react'

export const useMenuToggle = () => {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => {
    setIsOpen((prev) => !prev)
  }

  const closeMenu = () => {
    setIsOpen(false)
  }

  return { isOpen, toggleMenu, closeMenu }
}
