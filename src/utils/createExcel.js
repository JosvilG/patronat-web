import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

/**
 * Formatea cualquier valor de fecha (Date, Timestamp de Firestore o string) a un string legible.
 * @param {Date|{toDate: Function}|string|null} dateObj
 * @returns {string}
 */
const formatDate = (dateObj) => {
  if (!dateObj) return ''

  // Si es un timestamp de Firestore
  if (dateObj && typeof dateObj.toDate === 'function') {
    dateObj = dateObj.toDate()
  }

  // Si es una fecha válida
  if (dateObj instanceof Date) {
    return dateObj.toLocaleDateString()
  }

  return String(dateObj)
}

/**
 * Devuelve una etiqueta legible para estados de socios.
 * @param {'approved'|'rejected'|'pending'|string} status
 * @returns {string}
 */
const getStatusText = (status) => {
  switch (status) {
    case 'approved':
      return 'Alta'
    case 'rejected':
      return 'Baja'
    case 'pending':
    default:
      return 'Pendiente'
  }
}

/**
 * Crea una hoja de Excel basada en una colección homogénea de objetos.
 * @param {ExcelJS.Workbook} workbook
 * @param {string} sheetName
 * @param {Array<Object>} data
 * @returns {void}
 */
const appendSheetFromData = (workbook, sheetName, data = []) => {
  if (!data || data.length === 0) return

  const worksheet = workbook.addWorksheet(sheetName)
  const columnKeys = Array.from(
    data.reduce((keys, row) => {
      Object.keys(row || {}).forEach((key) => keys.add(key))
      return keys
    }, new Set())
  )

  worksheet.columns = columnKeys.map((key) => ({
    header: key,
    key,
    width: Math.min(40, Math.max(10, key.length + 2)),
  }))

  data.forEach((row) => {
    const normalizedRow = {}
    columnKeys.forEach((key) => {
      normalizedRow[key] = row?.[key] ?? ''
    })
    worksheet.addRow(normalizedRow)
  })
}

/**
 * Exporta los datos de un socio a un libro Excel con pestañas para datos personales y pagos.
 *
 * @param {Object} partner
 * @param {Object|null} activeSeason
 * @param {Object|null} payments
 * @param {Array<Object>} history
 * @param {function(Object): Promise<void>} showPopupFn
 * @param {function(string, string=): string} tFn
 * @param {string} viewDictionary
 * @returns {Promise<void>}
 */
export const exportPartnerToExcel = async (
  partner,
  activeSeason,
  payments,
  history,
  showPopupFn,
  tFn,
  viewDictionary
) => {
  if (!partner) return

  try {
    // 1. Información personal
    const personalInfo = {
      ID: partner.id,
      Nombre: partner.name || '',
      Apellidos: partner.lastName || '',
      Email: partner.email || '',
      DNI: partner.dni || '',
      Teléfono: partner.phone || '',
      Dirección: partner.address || '',
      IBAN: partner.accountNumber || '',
      'Fecha de nacimiento': formatDate(partner.birthDate) || '',
      Estado: getStatusText(partner.status),
      'Fecha de registro': formatDate(partner.createdAt) || '',
    }

    // 2. Pagos de temporada actual
    let currentPayments = []
    if (payments) {
      currentPayments.push({
        Temporada: payments.seasonYear,
        Fracción: 'Primera',
        Estado: payments.firstPayment ? 'Pagado' : 'Pendiente',
        Importe: payments.firstPaymentPrice || 0,
        'Fecha de pago': formatDate(payments.firstPaymentDate) || '',
      })

      if (payments.secondPaymentPrice > 0) {
        currentPayments.push({
          Temporada: payments.seasonYear,
          Fracción: 'Segunda',
          Estado: payments.secondPayment ? 'Pagado' : 'Pendiente',
          Importe: payments.secondPaymentPrice || 0,
          'Fecha de pago': formatDate(payments.secondPaymentDate) || '',
        })
      }

      if (payments.thirdPaymentPrice > 0) {
        currentPayments.push({
          Temporada: payments.seasonYear,
          Fracción: 'Tercera',
          Estado: payments.thirdPayment ? 'Pagado' : 'Pendiente',
          Importe: payments.thirdPaymentPrice || 0,
          'Fecha de pago': formatDate(payments.thirdPaymentDate) || '',
        })
      }
    }

    // 3. Historial de pagos
    let paymentHistoryData = []
    if (history && history.length > 0) {
      history.forEach((payment) => {
        if (payment.firstPaymentPrice > 0) {
          paymentHistoryData.push({
            Temporada: payment.seasonYear,
            Fracción: 'Primera',
            Estado: payment.firstPayment ? 'Pagado' : 'Pendiente',
            Importe: payment.firstPaymentPrice || 0,
            'Fecha de pago': formatDate(payment.firstPaymentDate) || '',
          })
        }

        if (payment.secondPaymentPrice > 0) {
          paymentHistoryData.push({
            Temporada: payment.seasonYear,
            Fracción: 'Segunda',
            Estado: payment.secondPayment ? 'Pagado' : 'Pendiente',
            Importe: payment.secondPaymentPrice || 0,
            'Fecha de pago': formatDate(payment.secondPaymentDate) || '',
          })
        }

        if (payment.thirdPaymentPrice > 0) {
          paymentHistoryData.push({
            Temporada: payment.seasonYear,
            Fracción: 'Tercera',
            Estado: payment.thirdPayment ? 'Pagado' : 'Pendiente',
            Importe: payment.thirdPaymentPrice || 0,
            'Fecha de pago': formatDate(payment.thirdPaymentDate) || '',
          })
        }
      })
    }

    const workbook = new ExcelJS.Workbook()
    appendSheetFromData(workbook, 'Datos Personales', [personalInfo])
    appendSheetFromData(workbook, 'Pagos Actuales', currentPayments)
    appendSheetFromData(workbook, 'Historial de Pagos', paymentHistoryData)

    const excelBuffer = await workbook.xlsx.writeBuffer()

    // Crear un blob
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    })

    // Guardar el archivo
    saveAs(
      blob,
      `socio_${partner.name}_${partner.lastName}_${new Date().toISOString().split('T')[0]}.xlsx`
    )

    // Mostrar mensaje de éxito
    await showPopupFn({
      title: tFn(
        `${viewDictionary}.exportSuccessTitle`,
        'Exportación completada'
      ),
      text: tFn(
        `${viewDictionary}.exportSuccessText`,
        'Los datos del socio se han exportado correctamente.'
      ),
      icon: 'success',
      confirmButtonText: tFn('components.buttons.confirm', 'Aceptar'),
      confirmButtonColor: '#8be484',
    })
  } catch (error) {
    await showPopupFn({
      title: tFn(`${viewDictionary}.errorPopup.title`, 'Error'),
      text: tFn(
        `${viewDictionary}.errorPopup.exportError`,
        'Ha ocurrido un error al exportar los datos del socio.'
      ),
      icon: 'error',
      confirmButtonText: tFn('components.buttons.confirm', 'Aceptar'),
      confirmButtonColor: '#a3a3a3',
    })
  }
}

/**
 * Exporta a Excel la información agregada de todos los socios aprobados y su historial de pagos.
 *
 * @param {Array<Object>} partners
 * @param {Object|null} activeSeason
 * @param {function(string, (string|number)): Promise<Object|null>} getPartnerPaymentsForSeason
 * @param {function(string, (string|number)): Promise<Array<Object>>} getPartnerPaymentHistory
 * @param {function(Object): Promise<void>} showPopupFn
 * @param {function(string, string=): string} tFn
 * @param {string} viewDictionary
 * @returns {Promise<void>}
 */
export const exportAllPartnersToExcel = async (
  partners,
  activeSeason,
  getPartnerPaymentsForSeason,
  getPartnerPaymentHistory,
  showPopupFn,
  tFn,
  viewDictionary
) => {
  if (!partners || partners.length === 0) return

  try {
    // Crear lista de datos básicos de socios
    const partnersData = partners.map((partner) => ({
      ID: partner.id,
      Nombre: partner.name || '',
      Apellidos: partner.lastName || '',
      Email: partner.email || '',
      DNI: partner.dni || '',
      Teléfono: partner.phone || '',
      Dirección: partner.address || '',
      IBAN: partner.accountNumber || '',
      'Fecha de nacimiento': formatDate(partner.birthDate) || '',
      Estado: getStatusText(partner.status),
      'Fecha de registro': formatDate(partner.createdAt) || '',
    }))

    // Crear lista de pagos actuales para socios aprobados
    let allCurrentPayments = []
    let allPaymentHistory = []

    if (activeSeason && partners.length > 0) {
      // Obtener los pagos de cada socio aprobado
      for (const partner of partners) {
        // Pagos de temporada actual
        const payments = await getPartnerPaymentsForSeason(
          partner.id,
          activeSeason.seasonYear
        )

        if (payments) {
          // Añadir primera fracción
          allCurrentPayments.push({
            'ID Socio': partner.id,
            Nombre: partner.name,
            Apellidos: partner.lastName,
            Temporada: payments.seasonYear,
            Fracción: 'Primera',
            Estado_pagos: payments.firstPayment ? 'Pagado' : 'Pendiente',
            Estado_socio: partner.status === 'approved' ? 'Alta' : 'Baja',
            Importe: payments.firstPaymentPrice || 0,
            'Fecha de pago': formatDate(payments.firstPaymentDate) || '',
          })

          // Añadir segunda fracción si existe
          if (payments.secondPaymentPrice > 0) {
            allCurrentPayments.push({
              'ID Socio': partner.id,
              Nombre: partner.name,
              Apellidos: partner.lastName,
              Temporada: payments.seasonYear,
              Fracción: 'Segunda',
              Estado_pagos: payments.secondPayment ? 'Pagado' : 'Pendiente',
              Estado_socio: partner.status === 'approved' ? 'Alta' : 'Baja',
              Importe: payments.secondPaymentPrice || 0,
              'Fecha de pago': formatDate(payments.secondPaymentDate) || '',
            })
          }

          // Añadir tercera fracción si existe
          if (payments.thirdPaymentPrice > 0) {
            allCurrentPayments.push({
              'ID Socio': partner.id,
              Nombre: partner.name,
              Apellidos: partner.lastName,
              Temporada: payments.seasonYear,
              Fracción: 'Tercera',
              Estado_pagos: payments.thirdPayment ? 'Pagado' : 'Pendiente',
              Estado_socio: partner.status === 'approved' ? 'Alta' : 'Baja',
              Importe: payments.thirdPaymentPrice || 0,
              'Fecha de pago': formatDate(payments.thirdPaymentDate) || '',
            })
          }
        }

        // Historial de pagos
        const history =
          (await getPartnerPaymentHistory(
            partner.id,
            activeSeason.seasonYear
          )) || []

        if (history.length > 0) {
          for (const payment of history) {
            // Primera fracción
            if (payment.firstPaymentPrice > 0) {
              allPaymentHistory.push({
                'ID Socio': partner.id,
                Nombre: partner.name,
                Apellidos: partner.lastName,
                Temporada: payment.seasonYear,
                Fracción: 'Primera',
                Estado_pagos: payment.firstPayment ? 'Pagado' : 'Pendiente',
                Estado_socio: partner.status === 'approved' ? 'Alta' : 'Baja',
                Importe: payment.firstPaymentPrice || 0,
                'Fecha de pago': formatDate(payment.firstPaymentDate) || '',
              })
            }

            // Segunda fracción
            if (payment.secondPaymentPrice > 0) {
              allPaymentHistory.push({
                'ID Socio': partner.id,
                Nombre: partner.name,
                Apellidos: partner.lastName,
                Temporada: payment.seasonYear,
                Fracción: 'Segunda',
                Estado_pagos: payment.secondPayment ? 'Pagado' : 'Pendiente',
                Estado_socio: partner.status === 'approved' ? 'Alta' : 'Baja',
                Importe: payment.secondPaymentPrice || 0,
                'Fecha de pago': formatDate(payment.secondPaymentDate) || '',
              })
            }

            // Tercera fracción
            if (payment.thirdPaymentPrice > 0) {
              allPaymentHistory.push({
                'ID Socio': partner.id,
                Nombre: partner.name,
                Apellidos: partner.lastName,
                Temporada: payment.seasonYear,
                Fracción: 'Tercera',
                Estado_pagos: payment.thirdPayment ? 'Pagado' : 'Pendiente',
                Estado_socio: partner.status === 'approved' ? 'Alta' : 'Baja',
                Importe: payment.thirdPaymentPrice || 0,
                'Fecha de pago': formatDate(payment.thirdPaymentDate) || '',
              })
            }
          }
        }
      }
    }

    const workbook = new ExcelJS.Workbook()
    appendSheetFromData(workbook, 'Socios', partnersData)
    appendSheetFromData(workbook, 'Pagos Actuales', allCurrentPayments)
    appendSheetFromData(workbook, 'Historial de Pagos', allPaymentHistory)

    const excelBuffer = await workbook.xlsx.writeBuffer()

    // Crear un blob
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    })

    // Guardar el archivo
    saveAs(
      blob,
      `listado_completo_socios_${new Date().toISOString().split('T')[0]}.xlsx`
    )

    // Mostrar mensaje de éxito
    await showPopupFn({
      title: tFn(
        `${viewDictionary}.exportAllSuccessTitle`,
        'Exportación completada'
      ),
      text: tFn(
        `${viewDictionary}.exportAllSuccessText`,
        'Los datos de todos los socios se han exportado correctamente.'
      ),
      icon: 'success',
      confirmButtonText: tFn('components.buttons.confirm', 'Aceptar'),
      confirmButtonColor: '#8be484',
    })
  } catch (error) {
    await showPopupFn({
      title: tFn(`${viewDictionary}.errorPopup.title`, 'Error'),
      text: tFn(
        `${viewDictionary}.errorPopup.exportAllError`,
        'Ha ocurrido un error al exportar los datos de los socios.'
      ),
      icon: 'error',
      confirmButtonText: tFn('components.buttons.confirm', 'Aceptar'),
      confirmButtonColor: '#a3a3a3',
    })
  }
}

export default exportPartnerToExcel
