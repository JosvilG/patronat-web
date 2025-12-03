import React from 'react'
import { Pagination, Stack, Typography, Box } from '@mui/material'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

/**
 * Control de paginación accesible basado en MUI que muestra botones y rango actual.
 *
 * @param {Object} props
 * @param {number} props.page - Página actualmente seleccionada.
 * @param {number} props.count - Número total de páginas.
 * @param {number} props.totalItems - Número total de registros disponibles.
 * @param {number} props.itemsPerPage - Registros que caben en cada página.
 * @param {Function} props.onChange - Callback que delega el cambio de página.
 * @param {boolean} [props.showItemCount=true] - Controla la visualización del resumen.
 * @param {'small'|'medium'|'large'} [props.size='medium'] - Tamaño del componente MUI.
 * @param {string} [props.className] - Clases extra para el contenedor.
 * @param {boolean} [props.scrollToTop=true] - Si debe llevar la vista al inicio al cambiar.
 * @param {string} [props.itemName] - Etiqueta localizada para referirse a los elementos.
 * @returns {JSX.Element}
 */
const PaginationControl = ({
  page,
  count,
  totalItems,
  itemsPerPage,
  onChange,
  showItemCount = true,
  size = 'medium',
  className = '',
  scrollToTop = true,
  itemName,
}) => {
  const { t } = useTranslation()
  const handlePageChange = (event, newPage) => {
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    onChange(event, newPage)
  }

  const hasPaginationData =
    showItemCount && totalItems > 0 && itemsPerPage > 0 && count > 0

  const getItemLabel = () => {
    if (itemName) {
      return t(itemName, { defaultValue: itemName })
    }

    return t('components.pagination.items', {
      defaultValue: 'elementos',
    })
  }

  const renderRangeText = () => {
    if (!hasPaginationData) return null

    const safePage = Math.min(Math.max(page, 1), count)
    const start = (safePage - 1) * itemsPerPage + 1
    const end = Math.min(totalItems, start + itemsPerPage - 1)
    const itemLabel = getItemLabel()

    const defaultRange = `${start}-${end} de ${totalItems} ${itemLabel}`

    return t('components.pagination.range', {
      start,
      end,
      total: totalItems,
      itemName: itemLabel,
      defaultValue: defaultRange,
    })
  }

  return (
    <Box className={className || 'my-4'}>
      {count > 1 && (
        <Stack spacing={2} alignItems="center">
          <Pagination
            page={page}
            count={count}
            onChange={handlePageChange}
            size={size}
            showFirstButton
            showLastButton
            siblingCount={1}
          />
        </Stack>
      )}

      {/* Información de rango de elementos */}
      {hasPaginationData && (
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          className="mt-2"
        >
          {renderRangeText()}
        </Typography>
      )}
    </Box>
  )
}

PaginationControl.propTypes = {
  page: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  totalItems: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  showItemCount: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
  scrollToTop: PropTypes.bool,
  itemName: PropTypes.string,
}

export default PaginationControl
