import DynamicButton from '../components/Buttons'

const meta = {
  title: 'Application/Buttons/DynamicButton',
  component: DynamicButton,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['large', 'medium', 'small', 'x-small'],
    },
    state: {
      control: 'select',
      options: ['normal', 'disabled', 'highlighted'],
    },
    type: {
      control: 'select',
      options: [
        'default',
        'delete',
        'edit',
        'view',
        'save',
        'cancel',
        'confirm',
        'add',
        'loading',
        'submit',
        'download',
        'personAdd',
        'personDown',
        'payment',
        'done',
        'play',
        'pause',
        'score',
      ],
    },
  },
}

export default meta

export const Primary = {
  args: {
    children: 'Acción principal',
    size: 'medium',
    state: 'normal',
    type: 'confirm',
  },
}

export const Disabled = {
  args: {
    ...Primary.args,
    children: 'Deshabilitado',
    state: 'disabled',
  },
}

export const IconOnly = {
  args: {
    size: 'x-small',
    state: 'normal',
    type: 'edit',
  },
}
