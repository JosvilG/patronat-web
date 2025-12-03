import React, { useState } from 'react'
import PropTypes from 'prop-types'
import DynamicButton from './Buttons'
import DOMPurify from 'dompurify'

const DynamicItems = ({ items, extraClass }) => {
  const [expandedIndex, setExpandedIndex] = useState(null)

  // Función para validar URLs
  const validateUrl = (url) => {
    if (!url || typeof url !== 'string') return false

    try {
      const parsed = new URL(url)
      return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
      return false
    }
  }

  return (
    <div className="pb-[1.25rem]">
      {items.map((item, index) => (
        <div
          key={index}
          className={`relative w-full min-w-full sm:min-w-[80%] max-w-[100%] ${extraClass}`}
        >
          <div
            className={`flex items-center justify-between px-[1.5rem] sm:px-[1rem] py-[0.5rem] h-fit text-[#252525] hover:text-gray-700 max-w-[100%] ${
              index !== items.length - 1 && item.type !== 'eventData'
                ? 'border-b border-[#252525]'
                : ''
            }`}
          >
            {item.icon && (
              <div className="t16l flex flex-row justify-center items-center h-auto min-h-[2.5rem] w-[3.5rem] sm:w-[4.75rem] text-[#252525] hover:text-gray-700">
                {typeof item.icon === 'string' ? (
                  validateUrl(item.icon) ? (
                    <img
                      src={item.icon}
                      alt="icon"
                      className="w-[1.25rem] h-[1.25rem] sm:w-[1.5rem] sm:h-[1.5rem]"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.target.src = '/path/to/default-icon.png'
                      }}
                    />
                  ) : (
                    <div className="w-[1.25rem] h-[1.25rem] sm:w-[1.5rem] sm:h-[1.5rem] bg-gray-200">
                      !
                    </div>
                  )
                ) : (
                  item.icon
                )}
              </div>
            )}

            <div
              className={`flex ${
                item.type === 'eventData' ? 'flex-row' : 'flex-col'
              } flex-1 max-w-[calc(100%-4rem)] sm:max-w-[calc(100%-5.75rem)]`}
            >
              <span
                className="t16b text-base text-[#252525] max-w-[60%] sm:max-w-none truncate overflow-hidden whitespace-nowrap mr-[0.5rem] sm:mr-[1rem]"
                title={DOMPurify.sanitize(item.title)}
              >
                {DOMPurify.sanitize(item.title)}
              </span>
              {item.description && (
                <span
                  className="overflow-hidden text-sm truncate t16r whitespace-nowrap max-w-[80%] sm:max-w-none"
                  title={item.description}
                >
                  {item.description}
                </span>
              )}
            </div>

            {item.badge && (
              <div className="t16l flex flex-row items-center h-auto min-h-[2.5rem] w-[3.5rem] sm:w-[4.75rem] text-[#252525] hover:text-gray-700 overflow-hidden text-ellipsis">
                {item.badge}
              </div>
            )}

            {item.haveChevron && (
              <DynamicButton
                type="button"
                size="small"
                state="normal"
                onClick={() => {
                  if (item.link && validateUrl(item.link)) {
                    window.location.href = item.link
                  } else if (item.action && typeof item.action === 'function') {
                    item.action()
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-[1.25rem] h-[1.25rem]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </DynamicButton>
            )}

            {item.expandable && (
              <DynamicButton
                type="button"
                size="small"
                state="normal"
                onClick={() =>
                  setExpandedIndex((prev) => (prev === index ? null : index))
                }
              >
                {expandedIndex === index ? 'Collapse' : 'Expand'}
              </DynamicButton>
            )}
          </div>

          {item.extraContent && (
            <div className="px-[0.5rem] sm:px-[1rem]">{item.extraContent}</div>
          )}

          {item.expandable && expandedIndex === index && (
            <div className="t16l mt-[0.5rem] px-[0.5rem] sm:px-[1rem] text-[#252525]">
              {item.expandableContent}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

DynamicItems.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      icon: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
      badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      expandable: PropTypes.bool,
      expandableContent: PropTypes.node,
      haveChevron: PropTypes.bool,
      link: PropTypes.string,
      action: PropTypes.func,
      type: PropTypes.string,
      extraContent: PropTypes.node,
    })
  ).isRequired,
  extraClass: PropTypes.string,
}

export default DynamicItems
