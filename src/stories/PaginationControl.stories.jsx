import { useState } from 'react'
import PaginationControl from '../components/Pagination'

const meta = {
  title: 'Application/Navigation/PaginationControl',
  component: PaginationControl,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
}

export default meta

const Template = (args) => {
  const [page, setPage] = useState(args.page ?? 1)

  return (
    <PaginationControl
      {...args}
      page={page}
      onChange={(_, newPage) => setPage(newPage)}
    />
  )
}

export const Default = {
  render: Template,
  args: {
    page: 1,
    count: 5,
    totalItems: 100,
    itemsPerPage: 20,
    itemName: 'elementos',
    scrollToTop: false,
  },
}

export const Large = {
  render: Template,
  args: {
    ...Default.args,
    size: 'large',
  },
}
