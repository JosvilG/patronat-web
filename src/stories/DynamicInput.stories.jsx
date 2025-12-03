import { useState } from 'react'
import DynamicInput from '../components/Inputs'

const meta = {
  title: 'Application/Forms/DynamicInput',
  component: DynamicInput,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: [
        'text',
        'users',
        'email',
        'password',
        'number',
        'dni',
        'phone',
        'checkbox',
        'radio',
        'textarea',
        'select',
        'document',
        'date',
        'time',
      ],
    },
  },
}

export default meta

const Template = (args) => {
  const [value, setValue] = useState(args.value ?? '')

  return (
    <div className="max-w-md">
      <DynamicInput
        {...args}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <p className="mt-4 text-sm text-gray-500">Valor: {String(value)}</p>
    </div>
  )
}

export const TextField = {
  render: Template,
  args: {
    name: 'fullName',
    type: 'text',
    textId: 'Nombre y apellidos',
    placeholder: 'Introduce un nombre',
  },
}

export const SelectField = {
  render: Template,
  args: {
    name: 'category',
    type: 'select',
    textId: 'Categoría',
    options: [
      { label: 'General', value: 'general' },
      { label: 'VIP', value: 'vip' },
      { label: 'Staff', value: 'staff' },
    ],
  },
}

export const DocumentField = {
  render: Template,
  args: {
    name: 'dniFile',
    type: 'document',
    textId: 'Documento acreditativo',
    accept: '.pdf,.jpg,.png',
  },
}
