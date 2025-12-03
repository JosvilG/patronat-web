import { Timestamp } from 'firebase/firestore'

/**
 *
 * @returns {Array}
 *
 */

export const createFormFieldsModel = () => [
  {
    fieldId: 'nombre',
    label: 'pages.events.eventParticipationForm.fields.nombre',
    type: 'text',
    required: true,
    order: 1,
    createdAt: Timestamp.now(),
  },
  {
    fieldId: 'tematica',
    label: 'pages.events.eventParticipationForm.fields.tematica',
    type: 'text',
    required: true,
    order: 2,
    createdAt: Timestamp.now(),
  },
  {
    fieldId: 'responsable1',
    label: 'pages.events.eventParticipationForm.fields.responsable1',
    type: 'text',
    required: true,
    order: 3,
    createdAt: Timestamp.now(),
  },
  {
    fieldId: 'responsable2',
    label: 'pages.events.eventParticipationForm.fields.responsable2',
    type: 'text',
    required: false,
    order: 4,
    createdAt: Timestamp.now(),
  },
  {
    fieldId: 'dni1',
    label: 'pages.events.eventParticipationForm.fields.dni1',
    type: 'text',
    required: true,
    order: 5,
    createdAt: Timestamp.now(),
  },
  {
    fieldId: 'dni2',
    label: 'pages.events.eventParticipationForm.fields.dni2',
    type: 'text',
    required: false,
    order: 6,
    createdAt: Timestamp.now(),
  },
  {
    fieldId: 'telefono1',
    label: 'pages.events.eventParticipationForm.fields.telefono1',
    type: 'phone',
    required: true,
    order: 7,
    createdAt: Timestamp.now(),
  },
  {
    fieldId: 'telefono2',
    label: 'pages.events.eventParticipationForm.fields.telefono2',
    type: 'phone',
    required: false,
    order: 8,
    createdAt: Timestamp.now(),
  },
  {
    fieldId: 'ubicacion',
    label: 'pages.events.eventParticipationForm.fields.ubicacion',
    type: 'text',
    required: false,
    order: 9,
    createdAt: Timestamp.now(),
  },
]

/**
 *
 * @param {Object} fieldData
 * @returns {Object}
 */
export const createFormFieldModel = (fieldData = {}) => {
  return {
    fieldId: '',
    label: 'pages.events.eventParticipationForm.fields.default',
    type: 'text',
    required: false,
    order: 0,
    createdAt: Timestamp.now(),
    ...fieldData,
  }
}

/**
 *
 * @param {Array} fieldIds
 * @returns {Array}
 */
export const createCustomFormModel = (fieldIds = []) => {
  if (!fieldIds.length) return createFormFieldsModel()

  const allFields = createFormFieldsModel()
  return allFields.filter((field) => fieldIds.includes(field.fieldId))
}
