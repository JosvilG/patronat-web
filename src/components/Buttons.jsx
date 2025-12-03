import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import LoopIcon from '@mui/icons-material/Loop'
import SendIcon from '@mui/icons-material/Send'
import DownloadIcon from '@mui/icons-material/Download'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import NoAccountsIcon from '@mui/icons-material/NoAccounts'
import EuroIcon from '@mui/icons-material/Euro'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import ScoreboardIcon from '@mui/icons-material/Scoreboard'

/**
 * Renderiza un botón dinámico que adapta tamaño, estado y tipo según las props recibidas.
 *
 * @param {Object} props - Propiedades de configuración del botón.
 * @param {string} [props.size='medium'] - Tamaño lógico del botón.
 * @param {string} [props.state='normal'] - Estado visual (normal, disabled, highlighted).
 * @param {string} [props.type] - Tipo semántico que determina iconos y estilos.
 * @param {string} [props.textId] - Clave de traducción para mostrar texto localizado.
 * @param {React.ReactNode} [props.children] - Contenido alternativo cuando no se usa `textId`.
 * @returns {JSX.Element} Un botón estilizado listo para reutilizar.
 */
const DynamicButton = ({ size, state, type, textId, children, ...props }) => {
  const { t } = useTranslation()

  /**
   * Relaciona el tamaño lógico con las clases utilitarias.
   * @param {string} sizeValue
   * @returns {string}
   */
  const getSizeClasses = (size) => {
    switch (size) {
      case 'large':
        return 'w-[400px] h-[56px]'
      case 'medium':
        return 'w-[250px] h-[56px]'
      case 'small':
        return 'w-[150px] h-[41px]'
      case 'x-small':
        return 'w-[41px] h-[41px]'
      default:
        return 'w-[250px]'
    }
  }

  /**
   * Determina los estilos base según el estado visual.
   * @param {string} stateValue
   * @returns {string}
   */
  const getStateClasses = (state) => {
    switch (state) {
      case 'normal':
        return 'bg-[#3A3A3A] text-[#FFFFFF] hover:bg-[#696969] hover:text-[#3A3A3A]'
      case 'disabled':
        return 'bg-[rgba(91,91,91,0.53)] text-[rgba(80,79,80,0.31)] cursor-not-allowed'
      case 'highlighted':
        return 'bg-[#696969] text-[#3A3A3A] hover:bg-[#3A3A3A] hover:text-[#FFFFFF]'
      default:
        return 'bg-[#3A3A3A] text-[#FFFFFF]'
    }
  }

  /**
   * Devuelve icono y clases para estados especiales (delete, save, etc).
   * @param {string} typeValue
   * @returns {{icon: React.ReactNode|null, classes?: string}}
   */
  const getTypeClasses = (type) => {
    switch (type) {
      case 'delete':
        return {
          icon: <DeleteIcon />,
          classes:
            'bg-[#EB0E00] text-[#FFFFFF] hover:bg-[#E55C52] hover:text-[#FFFFFF]',
        }
      case 'edit':
        return {
          icon: <EditIcon />,
        }
      case 'view':
        return {
          icon: <VisibilityIcon />,
        }
      case 'save':
        return {
          icon: <SaveIcon />,
        }
      case 'cancel':
        return {
          icon: <CancelIcon />,
        }
      case 'confirm':
        return {
          icon: <CheckCircleIcon />,
        }
      case 'add':
        return {
          icon: <AddCircleIcon />,
        }
      case 'loading':
        return {
          icon: <LoopIcon className="animate-spin" />,
        }
      case 'submit':
        return {
          icon: <SendIcon />,
        }
      case 'download':
        return {
          icon: <DownloadIcon />,
        }
      case 'personAdd':
        return {
          icon: <PersonAddIcon />,
        }

      case 'personDown':
        return {
          icon: <NoAccountsIcon />,
        }

      case 'payment':
        return {
          icon: <EuroIcon />,
        }

      case 'done':
        return {
          icon: <DoneAllIcon />,
        }

      case 'play':
        return {
          icon: <PlayArrowIcon />,
        }

      case 'pause':
        return {
          icon: <PauseIcon />,
        }
      case 'score':
        return {
          icon: <ScoreboardIcon />,
        }
      default:
        return { icon: null, classes: '' }
    }
  }

  const sizeClasses = getSizeClasses(size)
  const stateClasses = getStateClasses(state)
  const { icon, classes: typeClasses } = getTypeClasses(type)

  const transitionClasses =
    'transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]'

  return (
    <button
      className={`t16s flex justify-center items-center ${sizeClasses} ${stateClasses} px-4 py-2 rounded-[60px] ${props.className} ${typeClasses} ${transitionClasses}`}
      disabled={state === 'disabled' || props.disabled}
      {...props}
    >
      {textId ? t(textId) : icon || children || ''}
    </button>
  )
}

DynamicButton.propTypes = {
  size: PropTypes.string,
  state: PropTypes.string,
  type: PropTypes.string,
  textId: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
  disabled: PropTypes.bool,
}

export default DynamicButton
