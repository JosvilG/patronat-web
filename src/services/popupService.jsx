import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

/**
 * @param {Object} popupConfig
 * @property {string} popupConfig.title
 * @property {string} popupConfig.text
 * @property {string} [popupConfig.icon]
 * @property {string} [popupConfig.confirmButtonText]
 * @property {string} [popupConfig.confirmButtonColor]
 * @property {boolean} [popupConfig.showCancelButton]
 * @property {string} [popupConfig.cancelButtonText]
 * @property {string} [popupConfig.cancelButtonColor]
 * @property {function} [popupConfig.onConfirm]
 * @property {function} [popupConfig.onCancel]
 */
export const showPopup = async (popupConfig) => {
  const { onConfirm = null, onCancel = null, ...swalOptions } = popupConfig

  const result = await MySwal.fire({
    ...swalOptions,
    html: swalOptions.text,
  })

  if (result.isConfirmed && typeof onConfirm === 'function') {
    onConfirm()
  } else if (
    result.dismiss === Swal.DismissReason.cancel &&
    typeof onCancel === 'function'
  ) {
    onCancel()
  }

  return result
}
