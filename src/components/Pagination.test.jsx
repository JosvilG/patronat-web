import { render, screen } from '@testing-library/react'
import PaginationControl from './Pagination'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key, options) => options?.defaultValue ?? _key,
  }),
}))

describe('PaginationControl', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn()
  })

  it('shows the default range information', () => {
    render(
      <PaginationControl
        page={2}
        count={5}
        totalItems={42}
        itemsPerPage={10}
        onChange={jest.fn()}
      />
    )

    expect(screen.getByText('11-20 de 42 elementos')).toBeInTheDocument()
  })

  it('uses the provided item name label', () => {
    render(
      <PaginationControl
        page={1}
        count={1}
        totalItems={5}
        itemsPerPage={5}
        itemName="Documentos"
        onChange={jest.fn()}
      />
    )

    expect(screen.getByText('1-5 de 5 Documentos')).toBeInTheDocument()
  })
})
