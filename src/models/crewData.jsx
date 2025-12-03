import { Timestamp } from 'firebase/firestore'

export const createCrewModel = () => ({
  title: '',
  description: '',
  registrationDate: new Date().toISOString().split('T')[0],
  updateDate: new Date().toISOString().split('T')[0],
  numberOfMembers: 0,
  membersNames: [],
  responsable: '',
  status: 'Pendiente',
  createdAt: Timestamp.now(),
})
