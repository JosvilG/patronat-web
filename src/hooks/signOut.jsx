import { useNavigate } from 'react-router-dom'
import { getAuth, signOut } from 'firebase/auth'
import log from 'loglevel'

export const useSignOut = () => {
  const navigate = useNavigate()
  const auth = getAuth()

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/')
      localStorage.removeItem('language')
    } catch (err) {
      log.error('Error al cerrar sesión:', err)
    }
  }

  return handleSignOut
}
