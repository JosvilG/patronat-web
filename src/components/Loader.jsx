import React from 'react'
import PropTypes from 'prop-types'
import '../animations/loading.css'

const Loader = ({
  loading,
  size = '50px',
  color = 'rgb(21, 100, 46)',
  text,
}) => {
  if (!loading) return null

  const loaderStyle = {
    width: size,
    aspectRatio: '1',
    borderRightColor: color,
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 loader" style={loaderStyle}></div>
      {text && <label>{text}</label>}
    </div>
  )
}

Loader.propTypes = {
  loading: PropTypes.bool.isRequired,
  size: PropTypes.string,
  color: PropTypes.string,
  text: PropTypes.string,
}

export default Loader
