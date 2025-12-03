import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase/firebase'

/**
 * Custom hook para obtener los miembros del staff desde Firebase
 *
 * Recupera usuarios que tienen el campo isStaff establecido como true
 * y los ordena según su posición en la jerarquía
 *
 * @returns {Object} Estado y datos de los miembros del staff ordenados
 */
const useStaffMembers = () => {
  const [staffMembers, setStaffMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStaffMembers = async () => {
      try {
        // Crear una consulta que filtre usuarios donde isStaff es true
        const staffQuery = query(
          collection(db, 'users'),
          where('isStaff', '==', true)
        )

        const querySnapshot = await getDocs(staffQuery)

        // Transformar los documentos en objetos de staff
        const staffList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Definir el orden de las posiciones
        const positionOrder = {
          Presidente: 1,
          President: 1,
          Presidenta: 1,
          'Vice-presidente': 2,
          'Vice-president': 2,
          'Vice-presidenta': 2,
          Secretaria: 3,
          Secretari: 3,
          'Vice-secretaria': 4,
          Tresorer: 5,
          Tresorera: 5,
          'Vice-tresorera': 6,
          'Vice-tresorer': 6,
          Vocal: 7,
        }

        // Ordenar los miembros del staff según la jerarquía de posiciones
        const sortedStaffList = staffList.sort((a, b) => {
          const posA = positionOrder[a.position] || 999
          const posB = positionOrder[b.position] || 999
          return posA - posB
        })

        setStaffMembers(sortedStaffList)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStaffMembers()
  }, [])

  return { staffMembers, loading, error }
}

export default useStaffMembers
