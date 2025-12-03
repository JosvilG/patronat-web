import React, { useState, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { Input } from '@mui/base'
import { useTranslation } from 'react-i18next'
import TitleIcon from '@mui/icons-material/Title'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import NumbersIcon from '@mui/icons-material/Numbers'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark'

/**
 * Elimina etiquetas HTML y atributos peligrosos antes de propagar el nuevo valor.
 * @param {string} value
 * @returns {string}
 */
const sanitizeInput = (value) => {
  const clean = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
  return clean
}

/**
 * Campo de formulario reutilizable que cambia su representación según el tipo solicitado.
 *
 * @param {Object} props - Configuración del campo.
 * @param {string} props.name - Nombre de formulario.
 * @param {string} [props.textId] - Clave de traducción para etiquetas y placeholders.
 * @param {string} props.type - Tipo de input (text, select, checkbox, document, etc).
 * @param {Array<{label: string, value: string}>} [props.options] - Opciones para selects personalizados.
 * @param {Function} [props.onChange] - Callback que recibe los cambios sanitizados.
 * @returns {JSX.Element|null}
 */
const DynamicInput = ({
  name,
  textId,
  type,
  options,
  onChange,
  ...restProps
}) => {
  const { t } = useTranslation()
  const [selectedOption, setSelectedOption] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  const translatedLabel = textId ? t(textId) : ''
  const translatedPlaceholder = textId ? t(textId) : ''
  const shouldShowLabel = Boolean(textId && textId.trim())

  const handleChange = useCallback(
    (e) => {
      if (e.target.type === 'checkbox' || e.target.type === 'radio') {
        onChange &&
          onChange({
            target: {
              name: e.target.name,
              value: e.target.checked,
            },
          })
        return
      }

      let val = e.target.value
      val = sanitizeInput(val)
      if (restProps.maxLength && val.length > restProps.maxLength) {
        val = val.slice(0, restProps.maxLength)
      }
      onChange && onChange({ target: { name: e.target.name, value: val } })
    },
    [onChange, restProps.maxLength]
  )

  const handleSelectOption = (option) => {
    const cleanValue = sanitizeInput(option.value)
    setSelectedOption(option)
    setIsOpen(false)
    onChange && onChange({ target: { name, value: cleanValue } })
  }

  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg']
  const maxSize = 5 * 1024 * 1024
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!allowedTypes.includes(file.type)) {
      alert(t('components.inputs.fileTypeError'))
      return
    }
    if (file.size > maxSize) {
      alert(t('components.inputs.fileSizeError', { size: '5MB' }))
      return
    }

    onChange &&
      onChange({
        target: {
          name: e.target.name,
          value: file,
          files: e.target.files,
        },
      })
  }

  /**
   * Renderiza el selector personalizado que simula un componente nativo accesible.
   * @returns {JSX.Element}
   */
  const renderCustomSelect = () => (
    <div className="my-4">
      {shouldShowLabel && (
        <label htmlFor={name} className="block mb-2 t16r">
          {translatedLabel}
        </label>
      )}
      <div className="relative">
        <div
          className="w-full max-w-xs sm:max-w-md h-[54px] px-4 py-2 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl cursor-pointer flex justify-between items-center"
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-[#696969] truncate pr-2">
            {selectedOption ? t(selectedOption.label) : translatedPlaceholder}
          </span>
          {!isOpen ? (
            <ExpandMoreIcon fontSize="large" className="flex-shrink-0" />
          ) : (
            <ExpandLessIcon fontSize="large" className="flex-shrink-0" />
          )}
        </div>
        {isOpen && (
          <ul className="absolute flex flex-col top-[58px] w-full left-0 right-0 z-10 rounded-[24px] max-h-60 overflow-y-auto">
            {options.map((opt, idx) => (
              <li
                key={idx}
                onClick={() => handleSelectOption(opt)}
                className="px-4 py-2 w-full mb-1 text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl hover:cursor-pointer truncate"
                role="option"
              >
                {t(opt.label)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  const renderInput = () => {
    switch (type) {
      case 'text':
      case 'users':
      case 'email':
      case 'password':
      case 'number':
      case 'dni':
      case 'phone':
        return (
          <div className="w-full max-w-xs sm:max-w-md">
            {shouldShowLabel && (
              <label htmlFor={name} className="block mb-2 t16r">
                {translatedLabel}
              </label>
            )}
            <div
              className={`my-4 flex ${
                type === 'number' ? 'w-full max-w-[200px]' : 'w-full'
              } h-[54px] items-center backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl`}
            >
              <input
                autoComplete={'off'}
                name={name}
                type={
                  type === 'password'
                    ? 'password'
                    : type === 'users'
                      ? 'text'
                      : type
                }
                placeholder={
                  type === 'password'
                    ? t('components.inputs.enterPassword')
                    : translatedPlaceholder
                }
                onChange={handleChange}
                {...restProps}
                className={`t16l ${
                  type === 'number'
                    ? 'w-[calc(100%-40px)]'
                    : 'w-[calc(100%-40px)]'
                } px-4 py-2 focus:outline-none bg-transparent`}
              />
              <div className="flex justify-center flex-shrink-0 w-10">
                {
                  {
                    text: (
                      <TitleIcon fontSize="large" className="text-[#696969]" />
                    ),
                    users: (
                      <AccountCircleIcon
                        fontSize="large"
                        className="text-[#696969]"
                      />
                    ),
                    email: (
                      <EmailIcon fontSize="large" className="text-[#696969]" />
                    ),
                    password: (
                      <VisibilityIcon
                        fontSize="large"
                        className="text-[#696969]"
                      />
                    ),
                    number: <NumbersIcon className="text-[#696969]" />,
                    dni: (
                      <BrandingWatermarkIcon
                        fontSize="large"
                        className="text-[#696969]"
                      />
                    ),
                    phone: (
                      <PhoneIcon fontSize="large" className="text-[#696969]" />
                    ),
                  }[type]
                }
              </div>
            </div>
          </div>
        )

      case 'checkbox':
      case 'radio':
        return (
          <div className="max-w-full w-fit">
            {shouldShowLabel && (
              <label htmlFor={name} className="block mb-2 t16r">
                {translatedLabel}
              </label>
            )}
            <div
              className="flex items-center w-fit max-w-full h-[54px] px-4 py-2 cursor-pointer backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl"
              onClick={() => {
                const checkbox = document.getElementById(name)
                const newCheckedState = !checkbox?.checked
                if (checkbox) checkbox.checked = newCheckedState
                onChange &&
                  onChange({
                    target: {
                      name: name,
                      checked: newCheckedState,
                      value: newCheckedState,
                      type: type,
                    },
                  })
              }}
            >
              <input
                type={type}
                id={name}
                name={name}
                onChange={handleChange}
                {...restProps}
                className="hidden peer"
              />
              <div
                className={`w-[34px] h-[34px] flex-shrink-0 mr-3 border-4 border-[#696969] rounded-${
                  type === 'checkbox' ? 'lg' : 'full'
                } transition-colors duration-200 ease-in-out peer-checked:bg-[#696969] peer-checked:border-[#696969]`}
              />
              <span className="truncate select-none t16r">
                {translatedLabel}
              </span>
            </div>
          </div>
        )

      case 'textarea':
        return (
          <div className="w-full max-w-xs sm:max-w-md">
            {shouldShowLabel && (
              <label htmlFor={name} className="block mb-2 t16r">
                {translatedLabel}
              </label>
            )}
            <textarea
              name={name}
              placeholder={translatedPlaceholder}
              onChange={handleChange}
              {...restProps}
              className="t16l w-full min-h-[54px] px-4 py-2 backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl"
            />
          </div>
        )

      case 'select':
        return renderCustomSelect()

      case 'date':
      case 'time':
        return (
          <div className="w-full max-w-[200px]">
            {shouldShowLabel && (
              <label htmlFor={name} className="block mb-2 t16r">
                {translatedLabel}
              </label>
            )}
            <input
              type={type}
              name={name}
              onChange={handleChange}
              {...restProps}
              className="t16l w-full h-[54px] px-4 py-2 backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl appearance-none"
            />
          </div>
        )

      case 'otp':
        return (
          <div>
            {shouldShowLabel && (
              <label htmlFor={name} className="block mb-2 t16r">
                {translatedLabel}
              </label>
            )}
            <div className="flex flex-wrap space-x-2 gap-y-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  name={`${name}[${idx}]`}
                  onChange={handleChange}
                  {...restProps}
                  className="t24s w-[calc(16.666%-4px)] min-w-[40px] max-w-[54px] aspect-square px-0 py-0 backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl text-center"
                />
              ))}
            </div>
          </div>
        )

      case 'document':
        return (
          <div className="w-full max-w-xs sm:max-w-md">
            {shouldShowLabel && (
              <label htmlFor={name} className="block mb-2 t16r">
                {translatedLabel}
              </label>
            )}
            <div>
              <label
                htmlFor={name}
                className="flex content-center justify-between w-full h-[54px] px-4 py-2 cursor-pointer backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl"
              >
                <span className="flex flex-col justify-center mr-2 overflow-hidden truncate t16r">
                  {t('components.inputs.addDocument')}
                </span>
                <NoteAddIcon fontSize="large" className="flex-shrink-0" />
              </label>
              <input
                id={name}
                type="file"
                name={name}
                accept={restProps.accept}
                onChange={handleFileChange}
                className="hidden"
                {...restProps}
              />
            </div>
          </div>
        )

      default:
        return (
          <Input
            name={name}
            placeholder={translatedPlaceholder}
            onChange={handleChange}
            {...restProps}
            className="w-full px-4 py-2 border rounded-lg"
          />
        )
    }
  }

  return renderInput()
}

export default DynamicInput
