import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'

/**
 * Custom hook to fetch and filter users from Firebase
 *
 * This hook manages the fetching of users from Firestore and provides
 * filtering functionality based on user search input.
 *
 * @returns {Object} User data and filtering state
 */
const useFetchUsers = () => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch users on component mount
  useEffect(() => {
    /**
     * Fetches user data from Firebase Firestore
     * Transforms the raw user data to include full names and
     * populates both the complete and filtered user lists
     */
    const fetchUsers = async () => {
      try {
        // Get all user documents from Firestore
        const usersSnap = await getDocs(collection(db, 'users'))

        // Transform user documents to include a formatted name
        const usersList = usersSnap.docs.map((docSnap) => {
          const data = docSnap.data()
          return {
            id: docSnap.id,
            name: `${data.firstName} ${data.lastName}`,
            ...data,
          }
        })

        // Update state with fetched users
        setUsers(usersList)
        setFilteredUsers(usersList)
      } catch (err) {
        // Handle and store any errors
        setError(err)
      } finally {
        // Set loading to false regardless of outcome
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // Filter users whenever search term or users list changes
  useEffect(() => {
    if (search.trim()) {
      // Filter users based on case-insensitive name matching
      setFilteredUsers(
        users.filter((user) =>
          user.name.toLowerCase().includes(search.toLowerCase())
        )
      )
    } else {
      // Show all users when search is empty
      setFilteredUsers(users)
    }
  }, [search, users])

  return { users, filteredUsers, search, setSearch, loading, error }
}

export default useFetchUsers
