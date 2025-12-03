import React from 'react'

const MaintenancePage = () => {
  return (
    <div className="flex items-center justify-center bg-gray-100 min-h-dvh px-[4%]">
      <div className="w-full sm:w-[90%] md:w-[80%] max-w-lg p-[5%] sm:p-[4%] text-center bg-white rounded-lg sm:rounded-xl shadow-lg">
        <h1 className="mb-[3vh] text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600">
          Sitio en Mantenimiento
        </h1>
        <p className="mb-[4vh] text-base sm:text-lg md:text-xl text-gray-700">
          Estamos trabajando para mejorar nuestro sitio. ¡Volveremos pronto!
        </p>
        <div className="flex justify-center mb-[4vh]">
          <div className="w-[12vmin] h-[12vmin] max-w-16 max-h-16 border-t-4 border-blue-600 border-solid rounded-full animate-spin"></div>
        </div>
        <p className="text-sm text-gray-500 sm:text-base md:text-lg">
          Mientras tanto, si necesitas ayuda, por favor{' '}
          <a
            href="mailto:soporte@tusitio.com"
            className="text-blue-600 hover:underline"
          >
            contáctanos
          </a>
          .
        </p>
      </div>
    </div>
  )
}

export default MaintenancePage
