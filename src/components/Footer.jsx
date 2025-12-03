import React from 'react'

function Footer() {
  return (
    <footer className="w-full min-h-[12rem] py-[1.5rem] sm:py-[2rem] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] text-black flex flex-col justify-between">
      <div className="w-full text-center mb-[2rem] sm:mb-[1rem]">
        <p className="t16r sm:t20sb">
          Carretera del Reguers, km 1, Roquetes
          <br />
          43520 Tarragona, España <br /> info@patronatfestesroquetes.com
        </p>
      </div>

      <div className="w-full px-[1rem] sm:px-[2rem] flex flex-col sm:flex-row justify-between gap-[1rem] sm:gap-[2rem]">
        <div className="order-2 sm:order-1">
          <p className="text-black t12b">
            2025 Patronat de Festes de Roquetes. <br />
          </p>
        </div>

        <div className="text-left sm:text-right order-2 sm:order-2 mb-[1rem] sm:mb-0">
          <p className="text-black t12b">
            Web designed and developed by: Josep Vilchez Garcia
          </p>
          <p className="text-black sm:t14b t12b">
            jvgcontacto@gmail.com or +34 650 851 990
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
