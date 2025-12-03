import React, { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import DynamicButton from '../components/Buttons'
import { cards } from '../data/dashboardCards'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '../contexts/AuthContext'

export default function Dashboard() {
  const { t } = useTranslation()
  const { userData } = useContext(AuthContext)
  const [pendingCrews, setPendingCrews] = useState(0)
  const [unreadChats, setUnreadChats] = useState(0)
  const viewDictionary = 'dashboard'

  useEffect(() => {
    const fetchPendingCrews = async () => {
      try {
        const q = query(
          collection(db, 'crews'),
          where('status', '==', 'Pendiente')
        )
        const querySnapshot = await getDocs(q)
        setPendingCrews(querySnapshot.size)
      } catch (error) {
        // Error al buscar peñas pendientes
      }
    }

    fetchPendingCrews()
  }, [])

  // Efecto para buscar chats no leídos (solo para administradores)
  useEffect(() => {
    // Solo ejecutar si el usuario es administrador
    if (userData?.role !== 'admin') return

    // Crear consulta para chats activos
    const activeChatsQuery = query(
      collection(db, 'chats'),
      where('isActive', '==', true)
    )

    // Establecer listener en tiempo real para chats activos
    const unsubscribeActiveChats = onSnapshot(activeChatsQuery, (snapshot) => {
      // Para cada chat activo, necesitamos un listener para sus mensajes no leídos
      let activeSubscriptions = []
      let unreadChatsCount = 0

      // Si no hay chats activos, actualizar el contador a 0
      if (snapshot.empty) {
        setUnreadChats(0)
        return
      }

      // Para cada chat, configurar un listener de mensajes no leídos
      snapshot.forEach((chatDoc) => {
        const chatId = chatDoc.id

        // Consulta para mensajes no leídos del usuario
        const unreadMessagesQuery = query(
          collection(db, `chats/${chatId}/messages`),
          where('sender', '==', 'user'),
          where('isRead', '==', false)
        )

        // Listener para mensajes no leídos de este chat
        const unsubscribeMessages = onSnapshot(
          unreadMessagesQuery,
          (messagesSnapshot) => {
            // Si este chat tiene mensajes no leídos y no está ya contado
            if (messagesSnapshot.size > 0) {
              unreadChatsCount++
            }

            // Actualizar el contador global de chats no leídos
            setUnreadChats(unreadChatsCount)
          }
        )

        // Guardar la función para cancelar la suscripción después
        activeSubscriptions.push(unsubscribeMessages)
      })

      // Devolver función para limpiar todas las suscripciones
      return () => {
        activeSubscriptions.forEach((unsubscribe) => unsubscribe())
      }
    })

    // Limpiar la suscripción principal cuando el componente se desmonte
    return () => {
      unsubscribeActiveChats()
    }
  }, [userData])

  // Función auxiliar para verificar si un botón está relacionado con chat de soporte
  const isChatRelated = (actionId) => {
    return (
      actionId === 'support-chat' ||
      actionId === 'admin-chat' ||
      actionId === 'chat' ||
      actionId === 'admin-chat-panel'
    )
  }

  return (
    <div className="px-[4%] sm:px-5 pb-[4vh] min-h-dvh">
      <h1 className="mb-[5vh] sm:mb-10 text-center t24b sm:t64b">
        {t(`${viewDictionary}.title`)}
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="overflow-hidden transition-all duration-300 border border-gray-200 shadow-lg rounded-2xl hover:shadow-xl hover:scale-[1.01] hover:border-gray-300 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]"
          >
            <div className="items-center p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="text-4xl sm:text-5xl">{card.icon || '📄'}</div>
                <div className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full sm:px-3">
                  {card.actions
                    ? t(`${viewDictionary}.actionsCount`, {
                        count: card.actions.length,
                      })
                    : ''}
                </div>
              </div>

              <h2 className="mb-2 text-xl font-bold text-gray-800 sm:text-2xl">
                {t(card.titleKey)}
              </h2>
              <p className="mb-4 text-sm text-gray-600 sm:mb-6 sm:text-base">
                {t(card.descriptionKey)}
              </p>

              {card.actions && (
                <div className="flex flex-col gap-2 mt-4 -ml-2 sm:mt-6 sm:-ml-4 w-fit">
                  {card.actions.map((action) => (
                    <Link key={action.id} to={action.route} className="block">
                      <div className="relative">
                        <DynamicButton
                          size="medium"
                          state="normal"
                          type="button"
                        >
                          {t(action.titleKey)}
                        </DynamicButton>
                        {/* Notificación de chat - verificar cualquier ID relacionado con chat */}
                        {isChatRelated(action.id) &&
                          unreadChats > 0 &&
                          userData?.role === 'admin' && (
                            <div className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 mt-2 mr-4 text-xs font-bold text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                              {unreadChats}
                            </div>
                          )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {!card.actions && card.route && (
                <Link to={card.route} className="block mt-3 sm:mt-4">
                  <div className="relative">
                    <DynamicButton
                      type="view"
                      state="normal"
                      size="medium"
                      className="w-full"
                    >
                      {t(`${viewDictionary}.accessButton`)}
                    </DynamicButton>

                    {/* Notificación para el botón de acceso directo relacionado con chat */}
                    {isChatRelated(card.id) &&
                      unreadChats > 0 &&
                      userData?.role === 'admin' && (
                        <div className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 mt-2 mr-4 text-xs font-bold text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                          {unreadChats}
                        </div>
                      )}
                  </div>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
