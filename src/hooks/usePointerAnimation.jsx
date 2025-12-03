import { useMotionValue, useSpring, useTransform } from 'framer-motion'

/**
 * Custom hook to create cursor tracking effect with spring animation
 * @param {Object} options - Configuration options
 * @param {Object} options.springConfig - Spring effect configuration {damping, stiffness}
 * @param {Array} options.range - Input range for transform [-min, max]
 * @param {Array} options.output - Output range for transform [-min, max]
 * @returns {Object} - Values and functions for animation
 */
const usePointerAnimation = (options = {}) => {
  const {
    springConfig = { damping: 25, stiffness: 120 },
    range = [-800, 800],
    output = [-15, 15],
  } = options

  // Create motion values for X and Y
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Apply spring configuration
  const springX = useSpring(mouseX, springConfig)
  const springY = useSpring(mouseY, springConfig)

  // Transform values to make movement more subtle
  const moveX = useTransform(springX, range, output)
  const moveY = useTransform(springY, range, output)

  // Function to handle mouse movement
  const handleMouseMove = (e) => {
    const { clientX, clientY } = e
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    const x = clientX - left - width / 2
    const y = clientY - top - height / 2

    mouseX.set(x)
    mouseY.set(y)
  }

  return {
    moveX,
    moveY,
    handleMouseMove,
  }
}

export default usePointerAnimation
